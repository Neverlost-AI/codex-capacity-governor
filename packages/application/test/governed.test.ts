import { describe, expect, it } from "vitest";
import {
  canonicalizeComposed,
  type GovernedLink,
  type GovernedObservation,
  type GovernedOutcomeInput,
  type GovernedUsageInput,
} from "@capacity-governor/contracts";
import {
  createGovernedService,
  normalizeManualUsage,
  type GovernedRepository,
} from "../src/governed";
import {
  digest,
  harness,
  inputFixture,
  PROJECT,
  TIME,
} from "./composed-fixture";

const input = (usage: GovernedUsageInput[] = []): GovernedOutcomeInput => ({
  runOutcome: "COMPLETED",
  validationResult: "PASSED",
  adherence: "FOLLOWED",
  unexpectedFailures: [],
  deferredWork: [],
  usage,
});
const actual = (rawValue = "14"): GovernedUsageInput => ({
  bucketId: "short",
  providerId: "manual-codex",
  capacityWindowId: "5-hour",
  resetCycleId: "cycle-1",
  bucketProfileVersion: "gate-b-bucket-profile-v1",
  category: "IMPLEMENTATION",
  rawValue,
  rawUnit: "PERCENT",
  sourceReference: "manually reviewed usage",
  observedAt: TIME,
  reviewed: true,
  exactCycleOnly: "YES",
});
const setup = async (
  change?: (input: ReturnType<typeof inputFixture>) => void,
) => {
  const h = harness();
  const scope = inputFixture();
  change?.(scope);
  const revision = await h.service.prepare(scope);
  const attempt = await h.service.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
  const links = new Map<string, GovernedLink>();
  const observations = new Map<string, GovernedObservation[]>();
  let failAppend = false;
  const governed: GovernedRepository = {
    async create(link) {
      if (
        [...links.values()].some((value) => value.attemptId === link.attemptId)
      )
        throw new Error("unique attempt");
      links.set(link.id, link);
    },
    async findByAttempt(id) {
      return (
        [...links.values()].find((value) => value.attemptId === id) ?? null
      );
    },
    async find(id) {
      return links.get(id) ?? null;
    },
    async list(projectId) {
      return [...links.values()].filter((link) => link.projectId === projectId);
    },
    async append(value, predecessorId) {
      if (failAppend) throw new Error("injected failure");
      const items = observations.get(value.runId) ?? [];
      if (
        items.at(-1)?.id !== predecessorId ||
        value.predecessorId !== predecessorId
      )
        return false;
      items.push(value);
      observations.set(value.runId, items);
      return true;
    },
    async observations(runId) {
      return observations.get(runId) ?? [];
    },
  };
  const service = createGovernedService({ ...h.dependencies, governed });
  return {
    h,
    attempt,
    service,
    links,
    observations,
    setFailAppend(value: boolean) {
      failAppend = value;
    },
  };
};

describe("T006 exact manual normalization", () => {
  it.each([
    ["1", "PERCENT", "100"],
    ["100", "BASIS_POINTS", "100"],
    ["0", "PERCENT", "0"],
    ["0.001", "PERCENT", "0.1"],
    ["100.001", "PERCENT", "10000.1"],
    ["0.0001", "BASIS_POINTS", "0.0001"],
  ] as const)("normalizes %s %s to exact %s bp", (raw, unit, expected) => {
    expect(normalizeManualUsage(raw, unit)).toBe(expected);
  });
});

describe("T006 governed link, outcome and comparison", () => {
  it.each([
    ["NARROW", "2200"],
    ["STOP / PRESERVE", "1300"],
  ] as const)(
    "admits a saved %s reference without turning it into permission",
    async (decision, amount) => {
      const { attempt, service } = await setup((scope) => {
        scope.buckets[0].availableCapacity.amount = amount;
      });
      const link = await service.create(
        PROJECT,
        attempt.id,
        "local-session:test",
        "confirmation",
      );
      expect(link.decision).toBe(decision);
      expect(link.authorizesWork).toBe(false);
    },
  );
  it("admits DEFER as non-authorizing and rejects input-rejected/non-composable attempts", async () => {
    const deferred = await setup((scope) => {
      scope.buckets[0].availableCapacity.amount = "2000";
      scope.buckets[0].reset = {
        kind: "CONFIRMED",
        resetsAt: "2026-09-27T12:00:00.000Z",
        normalizedUtc: "2026-09-27T12:00:00.000Z",
        sourceTimezone: "literal source label",
        expectedPostResetAvailability: {
          amount: "10000",
          unit: "BASIS_POINTS",
        },
      };
    });
    const link = await deferred.service.create(
      PROJECT,
      deferred.attempt.id,
      "local-session:test",
      "confirmation",
    );
    expect(link).toMatchObject({ decision: "DEFER", authorizesWork: false });
    const rejected = await setup((scope) => {
      scope.buckets[0].availableCapacity.amount = "10001";
    });
    expect(rejected.attempt.policy?.kind).toBe("INPUT_REJECTION");
    await expect(
      rejected.service.review(PROJECT, rejected.attempt.id),
    ).rejects.toThrow("cannot establish");
    const nonComposable = await setup((scope) => {
      scope.workItems = Array.from({ length: 9 }, (_, index) => ({
        ...scope.workItems[0],
        workItemId: `item-${index}`,
      }));
    });
    expect(nonComposable.attempt.projections[0].kind).toBe("NOT_COMPOSABLE");
    await expect(
      nonComposable.service.review(PROJECT, nonComposable.attempt.id),
    ).rejects.toThrow("cannot establish");
  });
  it("links one eligible saved attempt and preserves one bounded run across prompts, tests, fixes and handoffs", async () => {
    const { attempt, service, links } = await setup();
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation-1",
    );
    expect(link.decision).toBe("PROCEED");
    expect(link.authorizesWork).toBe(true);
    const result = await service.record(
      link.id,
      input([actual()]),
      "local-session:test",
    );
    expect(result.comparisons[0].comparison).toMatchObject({
      kind: "COMPARABLE_FULL_COMPLETION",
      actualBasisPoints: "1400",
      expectedBasisPoints: 1200,
      signedError: {
        sign: "POSITIVE",
        magnitude: { numerator: "200", denominator: "1" },
      },
      rangeHit: true,
      calibrationRatio: { numerator: "7", denominator: "6" },
    });
    // These are activities within the same bounded attempt, never extra link requests.
    for (const activity of [
      "coding",
      "testing",
      "fixes",
      "prompt",
      "agent handoff",
    ])
      expect((await service.reopen(link.id)).link.id, activity).toBe(link.id);
    expect(links.size).toBe(1);
    await expect(
      service.create(PROJECT, attempt.id, "local-session:test", "second"),
    ).rejects.toThrow("already linked");
    const amendment = await service.amend(
      link.id,
      result.id,
      "Corrected factual reading",
      input([actual("13")]),
      "local-session:test",
    );
    expect(amendment.comparisons[0].comparison).toMatchObject({
      actualBasisPoints: "1300",
      rangeHit: true,
    });
    const history = await service.reopen(link.id);
    expect(history.observations).toHaveLength(2);
    expect(history.observations[0]).toEqual(result);
    await expect(
      service.amend(link.id, result.id, "stale", input(), "local-session:test"),
    ).rejects.toThrow("Stale amendment");
  });
  it("keeps correction separate; partial/failed implementation is only a lower bound", async () => {
    const { attempt, service } = await setup();
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation-1",
    );
    const correction: GovernedUsageInput = {
      ...actual("3"),
      category: "CORRECTION",
    };
    const first = await service.record(
      link.id,
      { ...input([correction]), runOutcome: "PARTIAL" },
      "local-session:test",
    );
    expect(first.comparisons[0]).toMatchObject({
      comparison: { kind: "UNAVAILABLE" },
      unavailableDetail: "MISSING_IMPLEMENTATION",
    });
    const second = await service.amend(
      link.id,
      first.id,
      "Added observed implementation",
      { ...input([actual("2"), correction]), runOutcome: "FAILED" },
      "local-session:test",
    );
    expect(second.comparisons[0].comparison).toMatchObject({
      kind: "NOT_COMPARABLE_FULL_COMPLETION",
      evidenceRole: "LOWER_BOUND_ONLY",
      observedActualBasisPoints: "200",
    });
  });
  it("retains incompatible cycle facts and typed unavailable reasons, never substitutes across buckets", async () => {
    const { attempt, service } = await setup();
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation-1",
    );
    const first = await service.record(
      link.id,
      input([{ ...actual(), resetCycleId: "later-cycle" }]),
      "local-session:test",
    );
    expect(first.usage[0].rawValue).toBe("14");
    expect(first.comparisons[0]).toMatchObject({
      comparison: { kind: "UNAVAILABLE" },
      unavailableDetail: "BUCKET_OR_PROFILE_MISMATCH",
    });
    const next = await service.amend(
      link.id,
      first.id,
      "Cycle ambiguity",
      input([{ ...actual(), exactCycleOnly: "UNKNOWN" }]),
      "local-session:test",
    );
    expect(next.comparisons[0].unavailableDetail).toBe(
      "CROSS_RESET_OR_UNRELATED",
    );
  });
  it("rejects future observations and ignores browser-authored normalization", async () => {
    const { attempt, service } = await setup();
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation",
    );
    await expect(
      service.record(
        link.id,
        input([{ ...actual(), observedAt: "2026-09-26T12:00:00.001Z" }]),
        "local-session:test",
      ),
    ).rejects.toThrow("Future usage observation");
    const forgedUsage = { ...actual("1"), normalizedBasisPoints: "999999" };
    const saved = await service.record(
      link.id,
      input([forgedUsage]),
      "local-session:test",
    );
    expect(saved.usage[0].normalizedBasisPoints).toBe("100");
  });
  it("rejects sub-millisecond future usage and remaining snapshots, including on reopen", async () => {
    const { attempt, service, observations } = await setup();
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation",
    );
    const subMillisecondFuture = "2026-09-26T12:00:00.0001+00:00";
    await expect(
      service.record(
        link.id,
        input([{ ...actual(), observedAt: subMillisecondFuture }]),
        "local-session:test",
      ),
    ).rejects.toThrow("Future usage observation");
    await expect(
      service.record(
        link.id,
        {
          ...input(),
          remainingCapacity: {
            amount: 10,
            unit: "manual capacity units",
            observedAt: subMillisecondFuture,
            source: "manual",
          },
        },
        "local-session:test",
      ),
    ).rejects.toThrow("Future remaining observation");
    expect(observations.has(link.id)).toBe(false);

    const earlierWithOffset = "2026-09-26T05:59:59.999999-06:00";
    const sameInstant = "2026-09-26T12:00:00.000000+00:00";
    const saved = await service.record(
      link.id,
      {
        ...input([{ ...actual(), observedAt: earlierWithOffset }]),
        remainingCapacity: {
          amount: 10,
          unit: "manual capacity units",
          observedAt: sameInstant,
          source: "manual",
        },
      },
      "local-session:test",
    );
    expect(saved.usage[0].observedAt).toBe(earlierWithOffset);
    expect(saved.remainingCapacity?.observedAt).toBe(sameInstant);
    observations.set(link.id, [
      {
        ...saved,
        usage: [{ ...saved.usage[0], observedAt: subMillisecondFuture }],
      },
    ]);
    await expect(service.reopen(link.id)).rejects.toThrow(
      "Governed outcome evidence integrity mismatch",
    );
    observations.set(link.id, [
      {
        ...saved,
        remainingCapacity: {
          amount: 10,
          unit: "manual capacity units",
          observedAt: subMillisecondFuture,
          source: "manual",
        },
      },
    ]);
    await expect(service.reopen(link.id)).rejects.toThrow(
      "Governed outcome evidence integrity mismatch",
    );
  });
  it("restrictive decision never becomes FOLLOWED or authorizing; failure leaves no partial outcome", async () => {
    const { attempt, service, setFailAppend, observations } = await setup(
      (scope) => {
        scope.buckets[0].availableCapacity.amount = "1300";
      },
    );
    const link = await service.create(
      PROJECT,
      attempt.id,
      "local-session:test",
      "confirmation-1",
    );
    expect(link.authorizesWork).toBe(false);
    await expect(
      service.record(link.id, input(), "local-session:test"),
    ).rejects.toThrow("FOLLOWED requires");
    setFailAppend(true);
    await expect(
      service.record(
        link.id,
        { ...input(), adherence: "NOT_FOLLOWED" },
        "local-session:test",
      ),
    ).rejects.toThrow("injected failure");
    expect(observations.size).toBe(0);
    setFailAppend(false);
    expect(
      (
        await service.record(
          link.id,
          { ...input(), adherence: "UNKNOWN" },
          "local-session:test",
        )
      ).adherence,
    ).toBe("UNKNOWN");
  });
});
