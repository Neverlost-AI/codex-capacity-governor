import { describe, it, expect } from "vitest";
import {
  composedInputSchema,
  composedRevisionSchema,
  confirmationReceiptSchema,
  canonicalizeComposed,
  composedAttemptSchema,
} from "../src/composed";
import {
  inputFixture,
  harness,
  digest,
  TIME,
} from "../../application/test/composed-fixture";
import { evaluateForecastV1 } from "../../forecast-engine/src/index";
describe("composed transport-neutral boundaries", () => {
  it("accepts direct input while preserving the legacy draft reference when supplied", () => {
    const legacy = inputFixture();
    const direct = { ...legacy };
    delete direct.preflightDraftId;
    expect(composedInputSchema.parse(direct).preflightDraftId).toBeUndefined();
    expect(composedInputSchema.parse(legacy).preflightDraftId).toBe(legacy.preflightDraftId);
    expect(composedInputSchema.safeParse({ ...legacy, preflightDraftId: null }).success).toBe(false);
  });
  it("rejects projection set/composite/scope and rejected-forecast scope substitution", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const attempt = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    for (const field of [
      "bucketId",
      "providerId",
      "capacityWindowId",
      "resetCycleId",
      "scopeTrancheId",
      "authority",
    ]) {
      const altered = JSON.parse(JSON.stringify(attempt));
      if (field === "scopeTrancheId")
        altered.projections[0].scopeTrancheId = "another-revision";
      else if (field === "authority")
        altered.projections[0].requiredBucketAuthority.actorReference =
          "another-actor";
      else altered.projections[0].bucket[field] = "different-context";
      expect(composedAttemptSchema.safeParse(altered).success).toBe(false);
    }
    const rejection = evaluateForecastV1({});
    expect(rejection.kind).toBe("INPUT_REJECTION");
    const { policy: excluded, ...base } = attempt;
    void excluded;
    expect(
      composedAttemptSchema.safeParse({
        ...base,
        forecast: { ...rejection, scopeTrancheId: "other-revision" },
        projections: [],
      }).success,
    ).toBe(false);
    const input = inputFixture();
    input.workItems = Array.from({ length: 9 }, (_, index) => ({
      ...input.workItems[0],
      workItemId: `item-${index}`,
    }));
    const large = await h.service.prepare(input);
    const saved = await h.service.confirm(
      large,
      "local-session:test",
      digest(canonicalizeComposed(large)),
    );
    const altered = JSON.parse(JSON.stringify(saved));
    altered.projections[0].bucketId = "other-bucket";
    expect(composedAttemptSchema.safeParse(altered).success).toBe(false);
  });
  it.each([
    "PROCEED",
    "NARROW",
    "DEFER",
    "STOP / PRESERVE",
    "NOT_COMPOSABLE",
    "INPUT_REJECTION",
  ])("round-trips actual composed %s evidence", async (family) => {
    const input = inputFixture();
    if (family === "NARROW" || family === "DEFER")
      input.buckets[0].availableCapacity.amount = "2000";
    if (family === "DEFER")
      input.buckets[0].reset = {
        kind: "CONFIRMED",
        resetsAt: "2026-09-26T13:00:00.000Z",
        normalizedUtc: "2026-09-26T13:00:00.000Z",
        sourceTimezone: "literal UTC",
        expectedPostResetAvailability: {
          amount: "10000",
          unit: "BASIS_POINTS",
        },
      };
    if (family === "STOP / PRESERVE") input.workItems[0].novelty = "UNKNOWN";
    if (family === "NOT_COMPOSABLE")
      input.workItems = Array.from({ length: 9 }, (_, index) => ({
        ...input.workItems[0],
        workItemId: `item-${index}`,
      }));
    if (family === "INPUT_REJECTION")
      input.buckets[0].availableCapacity.amount = "10001";
    const h = harness();
    const revision = await h.service.prepare(input);
    const attempt = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(
      composedAttemptSchema.parse(JSON.parse(JSON.stringify(attempt))),
    ).toEqual(attempt);
    if (family === "NOT_COMPOSABLE") {
      expect(attempt.projections[0].kind).toBe(family);
      expect(attempt.policy).toBeUndefined();
    } else if (family === "INPUT_REJECTION")
      expect(attempt.policy?.kind).toBe(family);
    else {
      if (attempt.policy?.kind !== "POLICY_EVALUATION")
        throw new Error("Expected actual policy evidence");
      expect(attempt.policy.aggregateDecision).toBe(family);
    }
  });
  it("round-trips typed real forecast rejection with no projected or policy authority", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const original = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    const rejection = evaluateForecastV1({});
    expect(rejection.kind).toBe("INPUT_REJECTION");
    const { policy: excludedPolicy, ...base } = original;
    void excludedPolicy;
    const record = { ...base, forecast: rejection, projections: [] };
    expect(
      composedAttemptSchema.parse(JSON.parse(JSON.stringify(record))),
    ).toEqual(record);
    // A valid transport family is not a way to replace the recorded real output.
    h.records.set(original.id, record);
    await expect(
      h.service.reopen(original.revision.input.projectId, original.id),
    ).rejects.toThrow("integrity");
  });
  it("preserves exact raw decimals, factual strings/offsets and canonicalizes independently of object key order", () => {
    const input = inputFixture();
    input.repositoryReference = " repo/é ";
    input.buckets[0].availableCapacity.amount = "78.000";
    input.buckets[0].availableCapacity.unit = "PERCENT";
    input.buckets[0].observedAt = "2026-09-26T06:00:00.000-06:00";
    input.buckets[0].reset = {
      kind: "CONFIRMED",
      resetsAt: "2026-09-26T13:00:00+00:00",
      normalizedUtc: "2026-09-26T13:00:00.000Z",
      sourceTimezone: " factual display zone ",
    };
    const parsed = composedInputSchema.parse(input);
    expect(parsed).toEqual(input);
    expect(canonicalizeComposed({ z: "é", a: ["b", "a"] })).toBe(
      canonicalizeComposed({ a: ["b", "a"], z: "é" }),
    );
    expect(canonicalizeComposed(["a", "b"])).not.toBe(
      canonicalizeComposed(["b", "a"]),
    );
  });
  it.each([
    "reviewedCharacterization",
    "actorReference",
    "recordedAt",
    "trusted",
    "forecast",
    "mode",
    "decision",
  ])("rejects browser authority field %s", (field) => {
    const input = inputFixture();
    expect(
      composedInputSchema.safeParse({ ...input, [field]: true }).success,
    ).toBe(false);
  });
  it.each([
    "complexity",
    "contextLoad",
    "repositoryCondition",
    "dependencyChange",
    "validationBurden",
    "novelty",
    "correctionExposure",
  ])("missing factor %s is not UNKNOWN", (field) => {
    const input = inputFixture();
    const value = JSON.parse(JSON.stringify(input));
    delete value.workItems[0][field];
    expect(composedInputSchema.safeParse(value).success).toBe(false);
  });
  it("requires explicit minimum-scope answer and rejects duplicate IDs/composite identities", () => {
    const input = inputFixture();
    const omitted = JSON.parse(JSON.stringify(input));
    delete omitted.minimumCoherentScope;
    expect(composedInputSchema.safeParse(omitted).success).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        workItems: [input.workItems[0], input.workItems[0]],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        buckets: [input.buckets[0], { ...input.buckets[0], bucketId: "alias" }],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        buckets: [
          input.buckets[0],
          { ...input.buckets[0], capacityWindowId: "weekly" },
        ],
      }).success,
    ).toBe(false);
  });
  it("rejects sub-millisecond evidence, unsupported units and whitespace-aliased bucket identity", () => {
    const input = inputFixture();
    expect(
      composedInputSchema.safeParse({
        ...input,
        buckets: [
          { ...input.buckets[0], observedAt: "2026-09-26T12:00:00.0001Z" },
        ],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        buckets: [
          {
            ...input.buckets[0],
            availableCapacity: { amount: "58", unit: "credits" },
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        buckets: [{ ...input.buckets[0], bucketId: " short " }],
      }).success,
    ).toBe(false);
  });
  it("rejects duplicate activity IDs/affected IDs and unknown affected bucket", () => {
    const input = inputFixture();
    const event = {
      eventId: "activity",
      occurredAt: TIME,
      affectedBucketIds: ["short"],
      source: "manual",
    };
    expect(
      composedInputSchema.safeParse({
        ...input,
        knownCapacityActivities: [event, event],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        knownCapacityActivities: [
          { ...event, affectedBucketIds: ["short", "short"] },
        ],
      }).success,
    ).toBe(false);
    expect(
      composedInputSchema.safeParse({
        ...input,
        knownCapacityActivities: [{ ...event, affectedBucketIds: ["unknown"] }],
      }).success,
    ).toBe(false);
  });
  it("valid snapshots round-trip; future/context/set receipts cannot authorize", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const attempt = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(
      composedRevisionSchema.parse(JSON.parse(JSON.stringify(revision))),
    ).toEqual(revision);
    expect(
      confirmationReceiptSchema.parse(
        JSON.parse(JSON.stringify(attempt.receipt)),
      ),
    ).toEqual(attempt.receipt);
    for (const receipt of [
      {
        ...attempt.receipt,
        revisionId: "00000000-0000-4000-8000-000000000099",
      },
      { ...attempt.receipt, recordedAt: "2026-09-26T12:00:00.001Z" },
      {
        ...attempt.receipt,
        buckets: [{ ...attempt.receipt.buckets[0], resetCycleId: "other" }],
      },
      { ...attempt.receipt, minimumCoherentScope: true },
    ])
      expect(
        composedAttemptSchema.safeParse({ ...attempt, receipt }).success,
      ).toBe(false);
  });
  it("non-composable or rejected forecasts cannot carry fabricated policy fields", async () => {
    const h = harness();
    const revision = await h.service.prepare(inputFixture());
    const attempt = await h.service.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(
      composedAttemptSchema.safeParse({
        ...attempt,
        projections: [
          {
            kind: "NOT_COMPOSABLE",
            authorizesWork: false,
            bucketId: "short",
            reasonId: "PROJECTION_INVALID_FORECAST",
          },
        ],
      }).success,
    ).toBe(false);
    expect(
      composedAttemptSchema.safeParse({
        ...attempt,
        forecast: {
          kind: "INPUT_REJECTION",
          authorizesWork: false,
          issues: [{ id: "INPUT_REQUIRED", path: [] }],
        },
      }).success,
    ).toBe(false);
  });
});
