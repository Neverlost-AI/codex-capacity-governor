import { describe, it, expect } from "vitest";
import {
  canonicalizeComposed,
  composedAttemptSchema,
  type ComposedInput,
} from "@capacity-governor/contracts";
import { EvidenceIntegrityError } from "../src/composed";
import { projectForecastToPolicyDemandV1 } from "@capacity-governor/forecast-engine";
import {
  harness,
  inputFixture,
  digest,
  TIME,
  PROJECT,
} from "./composed-fixture";
const evaluate = async (input: ComposedInput) => {
  const h = harness();
  const revision = await h.service.prepare(input);
  const attempt = await h.service.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
  return { ...h, revision, attempt };
};
const policy = (attempt: Awaited<ReturnType<typeof evaluate>>["attempt"]) => {
  if (attempt.policy?.kind !== "POLICY_EVALUATION")
    throw new Error("Expected policy evaluation");
  return attempt.policy;
};
describe("complete manual preflight composition with real engines", () => {
  it("prepares and confirms direct reviewed work without a legacy draft", async () => {
    const input = inputFixture();
    delete input.preflightDraftId;
    const { revision, attempt, service } = await evaluate(input);
    expect(revision.input.preflightDraftId).toBeUndefined();
    expect(revision.parentTrancheId).toBeDefined();
    expect(policy(attempt).aggregateDecision).toBe("PROCEED");
    expect(await service.reopen(PROJECT, attempt.id)).toEqual(attempt);
  });
  it("inconsistent forecast is typed NOT_COMPOSABLE, never trusted browser output", async () => {
    const { attempt } = await evaluate(inputFixture());
    const corrupted = JSON.parse(JSON.stringify(attempt.forecast));
    corrupted.bucketResults[0].roundedRange.expectedBasisPoints = 1300;
    expect(projectForecastToPolicyDemandV1(corrupted, "short")).toMatchObject({
      kind: "NOT_COMPOSABLE",
      reasonId: "PROJECTION_INVALID_FORECAST",
      authorizesWork: false,
    });
  });
  it("retains 12-point 900/1200/1500 MEDIUM; Gate A applies uncertainty exactly once", async () => {
    const { attempt, service } = await evaluate(inputFixture());
    expect(attempt.forecast.kind).toBe("FORECAST_EVALUATION");
    if (attempt.forecast.kind !== "FORECAST_EVALUATION") throw new Error();
    expect(attempt.forecast.bucketResults[0].roundedRange).toEqual({
      lowBasisPoints: 900,
      expectedBasisPoints: 1200,
      highBasisPoints: 1500,
    });
    expect(attempt.forecast.overallConfidence).toBe("MEDIUM");
    expect(attempt.forecast.bucketResults[0].consideredCandidates).toEqual([]);
    expect(policy(attempt).aggregateDecision).toBe("PROCEED");
    expect(policy(attempt).bucketResults[0]).toMatchObject({
      availableBasisPoints: 7800,
      correctionReserveBasisPoints: 1170,
      validationReserveBasisPoints: 1170,
      implementationAllocationBasisPoints: 5460,
      suppliedDemandBasisPoints: 1200,
      adjustedDemandBasisPoints: 1500,
    });
    expect(await service.reopen(PROJECT, attempt.id)).toEqual(attempt);
    expect(
      composedAttemptSchema.parse(JSON.parse(JSON.stringify(attempt))),
    ).toEqual(attempt);
  });
  it("never converts legacy scalar units/reset/reserves or edits legacy evidence", async () => {
    const h = harness();
    const before = canonicalizeComposed(h.draft);
    await h.service.prepare(inputFixture());
    expect(canonicalizeComposed(h.draft)).toBe(before);
    expect(h.draft.availableBudget.unit).toBe("unconvertible legacy units");
  });
  it("healthy short window cannot relax critical weekly window", async () => {
    const input = inputFixture();
    input.buckets.push({
      ...input.buckets[0],
      bucketId: "weekly",
      capacityWindowId: "weekly",
      availableCapacity: { amount: "1300", unit: "BASIS_POINTS" },
    });
    const { attempt } = await evaluate(input);
    expect(policy(attempt)).toMatchObject({
      aggregateDecision: "STOP / PRESERVE",
      aggregateMode: "CRITICAL",
    });
    expect(policy(attempt).bucketResults).toHaveLength(2);
  });
  it("explicit UNKNOWN remains LOW planning evidence and evaluable uncertainty stop", async () => {
    const input = inputFixture();
    input.workItems[0].novelty = "UNKNOWN";
    const { attempt } = await evaluate(input);
    expect(
      attempt.forecast.kind === "FORECAST_EVALUATION" &&
        attempt.forecast.overallConfidence,
    ).toBe("LOW");
    expect(policy(attempt).bucketResults[0].uncertainty).toBe(
      "UNKNOWN_OR_INVALID",
    );
    expect(policy(attempt).aggregateDecision).toBe("STOP / PRESERVE");
    expect(
      await evaluate({
        ...input,
        buckets: input.buckets.map((bucket) => ({
          ...bucket,
          profile: {
            status: "ACCEPTED_INCOMPLETE",
            evidenceReference: "explicit accepted incomplete",
          },
        })),
      }),
    ).toBeDefined();
  });
  it.each([
    ["2200", false, "NARROW"],
    ["2200", true, "PROCEED"],
    ["2000", true, "NARROW"],
  ] as const)(
    "LOW capacity %s minimum=%s yields %s",
    async (amount, minimum, decision) => {
      const input = inputFixture();
      input.buckets[0].availableCapacity.amount = amount;
      input.minimumCoherentScope = minimum;
      expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
        decision,
      );
    },
  );
  it.each([
    ["2026-09-27T12:00:00.000Z", "DEFER"],
    ["2026-09-27T12:00:00.001Z", "NARROW"],
  ] as const)(
    "exact defer horizon %s yields %s",
    async (resetsAt, decision) => {
      const input = inputFixture();
      input.buckets[0].availableCapacity.amount = "2000";
      input.buckets[0].reset = {
        kind: "CONFIRMED",
        resetsAt,
        normalizedUtc: resetsAt,
        sourceTimezone: "literal source label",
        expectedPostResetAvailability: {
          amount: "10000",
          unit: "BASIS_POINTS",
        },
      };
      expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
        decision,
      );
    },
  );
  it("missing post-reset evidence never defaults full and defer+narrow aggregates narrow", async () => {
    const input = inputFixture();
    input.buckets[0].availableCapacity.amount = "2000";
    input.buckets[0].reset = {
      kind: "CONFIRMED",
      resetsAt: "2026-09-26T13:00:00.000Z",
      normalizedUtc: "2026-09-26T13:00:00.000Z",
      sourceTimezone: "factual zone",
      expectedPostResetAvailability: { amount: "10000", unit: "BASIS_POINTS" },
    };
    input.buckets.push({
      ...input.buckets[0],
      bucketId: "weekly",
      capacityWindowId: "weekly",
      reset: { kind: "NONE" },
    });
    const p = policy((await evaluate(input)).attempt);
    expect(p.bucketResults.map((bucket) => bucket.candidateDecision)).toEqual([
      "DEFER",
      "NARROW",
    ]);
    expect(p.aggregateDecision).toBe("NARROW");
    delete input.buckets[0].reset.expectedPostResetAvailability;
    expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
      "NARROW",
    );
  });
  it.each([
    ["2026-09-26T11:30:00.000Z", "PROCEED"],
    ["2026-09-26T11:29:59.999Z", "STOP / PRESERVE"],
  ] as const)(
    "observation %s at freshness boundary yields %s",
    async (observedAt, decision) => {
      const input = inputFixture();
      input.buckets[0].observedAt = observedAt;
      expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
        decision,
      );
    },
  );
  it("known activity stales only affected bucket", async () => {
    const input = inputFixture();
    input.buckets[0].observedAt = "2026-09-26T11:59:00.000Z";
    input.buckets.push({
      ...input.buckets[0],
      bucketId: "weekly",
      capacityWindowId: "weekly",
    });
    input.knownCapacityActivities = [
      {
        eventId: "run-known",
        occurredAt: "2026-09-26T11:59:01.000Z",
        affectedBucketIds: ["short"],
        source: "manual",
      },
    ];
    const p = policy((await evaluate(input)).attempt);
    expect(p.aggregateDecision).toBe("STOP / PRESERVE");
    expect(p.bucketResults[0].stopIds.length).toBeGreaterThan(0);
    expect(p.bucketResults[1].stopIds).toEqual([]);
  });
  it("passed reset requires fresh observation and explicit reserve infeasibility wins", async () => {
    const input = inputFixture();
    input.buckets[0].observedAt = "2026-09-26T11:59:00.000Z";
    input.buckets[0].reset = {
      kind: "CONFIRMED",
      resetsAt: "2026-09-26T11:59:30.000Z",
      normalizedUtc: "2026-09-26T11:59:30.000Z",
      sourceTimezone: "not an IANA validation claim",
    };
    expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
      "STOP / PRESERVE",
    );
    input.buckets[0].reset = { kind: "NONE" };
    input.buckets[0].correctionReserve = {
      manualMinimum: { amount: "7000", unit: "BASIS_POINTS" },
    };
    expect(policy((await evaluate(input)).attempt).aggregateDecision).toBe(
      "STOP / PRESERVE",
    );
  });
  it("above-cycle forecast remains unclamped and has no fictional policy result", async () => {
    const input = inputFixture();
    input.workItems = Array.from({ length: 9 }, (_, index) => ({
      ...input.workItems[0],
      workItemId: `item-${index}`,
    }));
    const { attempt, service } = await evaluate(input);
    expect(
      attempt.forecast.kind === "FORECAST_EVALUATION" &&
        attempt.forecast.bucketResults[0].roundedRange.expectedBasisPoints,
    ).toBe(10800);
    expect(attempt.projections[0]).toMatchObject({
      kind: "NOT_COMPOSABLE",
      reasonId: "PROJECTION_ABOVE_ONE_CYCLE",
    });
    expect(attempt.policy).toBeUndefined();
    expect(await service.reopen(PROJECT, attempt.id)).toEqual(attempt);
  });
  it("unsupported range retains typed policy input rejection, not a mode/decision", async () => {
    const input = inputFixture();
    input.buckets[0].availableCapacity.amount = "10001";
    const { attempt } = await evaluate(input);
    expect(attempt.policy?.kind).toBe("INPUT_REJECTION");
    expect(attempt.policy).not.toHaveProperty("aggregateMode");
    expect(attempt.policy).not.toHaveProperty("aggregateDecision");
  });
  it("save failure does not return a saved result and safe retry retains prior evidence", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    h.setFailSave(true);
    await expect(
      h.service.confirm(
        revision,
        "local-session:test",
        digest(canonicalizeComposed(revision)),
      ),
    ).rejects.toThrow("Injected atomic failure");
    expect(h.records.size).toBe(0);
    h.setFailSave(false);
    const saved = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(h.records.size).toBe(1);
    expect(await h.service.reopen(PROJECT, saved.id)).toEqual(saved);
  });
  it("confirmation does not refresh observations; new revision keeps prior attempt immutable", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    h.setClock("2026-09-26T12:30:00.001Z");
    const saved = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(saved.revision.input.buckets[0].observedAt).toBe(TIME);
    expect(policy(saved).aggregateDecision).toBe("STOP / PRESERVE");
    const next = inputFixture();
    next.buckets[0].observedAt = "2026-09-26T12:30:00.001Z";
    next.predecessorRevisionId = revision.id;
    const corrected = await h.service.prepare(next);
    await h.service.confirm(
      corrected,
      "local-session:test",
      digest(canonicalizeComposed(corrected)),
    );
    expect(h.records.size).toBe(2);
    expect(await h.service.reopen(PROJECT, saved.id)).toEqual(saved);
  });
  it("wrong project/draft ownership or predecessor is rejected", async () => {
    const h = harness();
    await expect(
      h.service.prepare({
        ...inputFixture(),
        projectId: "00000000-0000-4000-8000-000000000099",
      }),
    ).rejects.toThrow("ownership");
    await expect(
      h.service.prepare({
        ...inputFixture(),
        predecessorRevisionId: "00000000-0000-4000-8000-000000000099",
      }),
    ).rejects.toThrow("Predecessor");
  });
  it("rejects linking a new direct review to another direct revision as a correction", async () => {
    const h = harness();
    const first = inputFixture();
    delete first.preflightDraftId;
    const revision = await h.service.prepare(first);
    await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    const unrelated = inputFixture();
    delete unrelated.preflightDraftId;
    unrelated.title = "Different direct work";
    unrelated.predecessorRevisionId = revision.id;
    await expect(h.service.prepare(unrelated)).rejects.toThrow(
      "Predecessor is unavailable for direct preflights",
    );
    expect(h.records.size).toBe(1);
  });
  it.each(["digest", "forecast", "policy", "receipt", "bucket"])(
    "stored %s tamper is visible integrity failure",
    async (field) => {
      const { attempt, service, records } = await evaluate(inputFixture());
      const altered = JSON.parse(JSON.stringify(attempt));
      if (field === "digest") altered.receipt.canonicalDigest = "0".repeat(64);
      if (field === "forecast")
        altered.forecast.bucketResults[0].roundedRange.expectedBasisPoints = 1300;
      if (field === "policy")
        altered.policy.bucketResults[0].adjustedDemandBasisPoints = 1400;
      if (field === "receipt") altered.receipt.actorReference = "other-session";
      if (field === "bucket")
        altered.revision.input.buckets[0].capacityWindowId = "changed-window";
      records.set(attempt.id, altered);
      await expect(service.reopen(PROJECT, attempt.id)).rejects.toBeInstanceOf(
        EvidenceIntegrityError,
      );
    },
  );
});
