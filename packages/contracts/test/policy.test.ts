import { describe, expect, it } from "vitest";
import {
  gateAV1ConfigurationSchema,
  policyCapacityUnitSchema,
  policyDecisionSchema,
  policyEvaluationInputSchema,
  policyOperatingModeSchema,
  policyUncertaintySchema,
} from "../src/index";

const configuration = {
  policyVersion: "gate-a-v1",
  configurationVersion: "gate-a-v1",
  normalizationRuleVersion: "exact-whitelist-v1",
  mandatoryStopListVersion: "gate-a-stop-v1",
  capacityBasisPointsPerCycle: 10_000,
  correctionFloorShareBasisPoints: 1_500,
  validationFloorShareBasisPoints: 1_500,
  fullModeMinimumBasisPoints: 6_000,
  conservationModeMinimumBasisPoints: 3_500,
  lowModeMinimumBasisPoints: 1_500,
  deferHorizonSeconds: 86_400,
  maximumObservationAgeSeconds: 1_800,
  boundedUncertaintyNumerator: 5,
  boundedUncertaintyDenominator: 4,
  modeRestrictivenessOrder: ["FULL", "CONSERVATION", "LOW", "CRITICAL"],
  decisionRestrictivenessOrder: [
    "PROCEED",
    "DEFER",
    "NARROW",
    "STOP / PRESERVE",
  ],
} as const;

const bucket = {
  bucketId: "five-hour",
  providerId: "manual-codex",
  capacityWindowId: "five-hour-window",
  resetCycleId: "five-hour-cycle",
  availableCapacity: { amount: "78.005", unit: "PERCENT" as const },
  observedAt: "2026-08-25T11:50:00.000Z",
  reset: { kind: "NONE" as const },
  correctionReserve: {},
  validationReserve: {},
  implementationDemand: {
    amount: "0.2",
    unit: "NORMALIZED_FRACTION" as const,
  },
  uncertainty: "KNOWN" as const,
};

const input = {
  evaluationTime: "2026-08-25T12:00:00.000Z",
  configuration,
  requiredBucketAuthority: {
    actorReference: "founder",
    recordedAt: "2026-08-25T11:45:00.000Z",
  },
  minimumCoherentScope: {
    actorReference: "founder",
    recordedAt: "2026-08-25T11:45:00.000Z",
    scopeTrancheId: "t003",
    attestedValue: true,
  },
  requiredCapacityBuckets: [bucket],
  knownCapacityActivities: [],
  activeMandatoryStopIds: [],
};

describe("T003 policy contracts", () => {
  it.each(["BASIS_POINTS", "PERCENT", "NORMALIZED_FRACTION"])(
    "accepts normalization unit %s",
    (unit) => {
      expect(policyCapacityUnitSchema.parse(unit)).toBe(unit);
    },
  );

  it.each(["FULL", "CONSERVATION", "LOW", "CRITICAL"])(
    "accepts operating mode %s",
    (mode) => {
      expect(policyOperatingModeSchema.parse(mode)).toBe(mode);
    },
  );

  it.each(["PROCEED", "DEFER", "NARROW", "STOP / PRESERVE"])(
    "accepts policy decision %s",
    (decision) => {
      expect(policyDecisionSchema.parse(decision)).toBe(decision);
    },
  );

  it.each(["KNOWN", "UNCERTAIN_BUT_BOUNDED", "UNKNOWN_OR_INVALID"])(
    "accepts uncertainty %s",
    (uncertainty) => {
      expect(policyUncertaintySchema.parse(uncertainty)).toBe(uncertainty);
    },
  );

  it("accepts complete exact multi-bucket input", () => {
    expect(policyEvaluationInputSchema.parse(input)).toEqual(input);
  });

  it("retains sourceTimezone as explicit factual reset evidence", () => {
    const sourceTimezone = "provider-supplied-zone-label";
    const result = policyEvaluationInputSchema.parse({
      ...input,
      requiredCapacityBuckets: [
        {
          ...bucket,
          reset: {
            kind: "CONFIRMED",
            resetsAt: "2026-08-26T06:00:00.000-06:00",
            sourceTimezone,
            normalizedUtc: "2026-08-26T12:00:00.000Z",
          },
        },
      ],
    });
    expect(result.requiredCapacityBuckets[0].reset).toMatchObject({
      sourceTimezone,
    });
  });

  it("rejects an empty sourceTimezone while retaining strict reset timestamps", () => {
    const reset = {
      kind: "CONFIRMED",
      resetsAt: "not-a-timestamp",
      sourceTimezone: "",
      normalizedUtc: "not-a-timestamp",
    };
    const result = policyEvaluationInputSchema.safeParse({
      ...input,
      requiredCapacityBuckets: [{ ...bucket, reset }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining([
          "requiredCapacityBuckets.0.reset.sourceTimezone",
          "requiredCapacityBuckets.0.reset.resetsAt",
          "requiredCapacityBuckets.0.reset.normalizedUtc",
        ]),
      );
    }
  });

  it.each(["01", ".5", "1e2", "-1", "NaN", "Infinity"])(
    "rejects non-canonical decimal %s",
    (amount) => {
      expect(
        policyEvaluationInputSchema.safeParse({
          ...input,
          requiredCapacityBuckets: [
            { ...bucket, availableCapacity: { amount, unit: "BASIS_POINTS" } },
          ],
        }).success,
      ).toBe(false);
    },
  );

  it("rejects numeric raw evidence before binary floating-point use", () => {
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        requiredCapacityBuckets: [
          { ...bucket, availableCapacity: { amount: 0.1, unit: "PERCENT" } },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects empty and duplicate required bucket evidence", () => {
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        requiredCapacityBuckets: [],
      }).success,
    ).toBe(false);
    const duplicate = { ...bucket, bucketId: "weekly" };
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        requiredCapacityBuckets: [bucket, duplicate],
      }).success,
    ).toBe(false);
  });

  it("rejects duplicate IDs and unknown activity bucket references", () => {
    const second = {
      ...bucket,
      providerId: "other",
      capacityWindowId: "weekly",
      resetCycleId: "weekly-cycle",
    };
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        requiredCapacityBuckets: [bucket, second],
      }).success,
    ).toBe(false);
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        knownCapacityActivities: [
          {
            eventId: "run-1",
            occurredAt: "2026-08-25T11:55:00.000Z",
            affectedBucketIds: ["unknown"],
            source: "recorded-run",
          },
        ],
      }).success,
    ).toBe(false);

    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        knownCapacityActivities: [
          {
            eventId: "run-1",
            occurredAt: "2026-08-25T11:55:00.000Z",
            affectedBucketIds: ["five-hour", "five-hour"],
            source: "recorded-run",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it.each([
    ["missing bucket authority", { requiredBucketAuthority: undefined }],
    ["missing demand", { implementationDemand: undefined }],
    [
      "negative demand",
      { implementationDemand: { amount: "-1", unit: "BASIS_POINTS" } },
    ],
    [
      "unsupported unit",
      { implementationDemand: { amount: "1", unit: "TOKENS" } },
    ],
    ["invalid observation timestamp", { observedAt: "yesterday" }],
  ])("rejects %s", (_name, change) => {
    const candidate =
      "requiredBucketAuthority" in change
        ? { ...input, ...change }
        : {
            ...input,
            requiredCapacityBuckets: [{ ...bucket, ...change }],
          };
    expect(policyEvaluationInputSchema.safeParse(candidate).success).toBe(
      false,
    );
  });

  it("rejects caller attempts to supply a scalar or AI proposal", () => {
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        globalCapacityBasisPoints: 8_000,
      }).success,
    ).toBe(false);
    expect(
      policyEvaluationInputSchema.safeParse({
        ...input,
        proposedRequiredBuckets: { source: "AI", bucketIds: ["weekly"] },
      }).success,
    ).toBe(false);
  });

  it("rejects unknown, case-variant, and incomplete configuration", () => {
    expect(policyCapacityUnitSchema.safeParse("percent").success).toBe(false);
    expect(policyDecisionSchema.safeParse("STOP").success).toBe(false);
    expect(
      gateAV1ConfigurationSchema.safeParse({
        ...configuration,
        boundedUncertaintyNumerator: 1.25,
      }).success,
    ).toBe(false);
    const incomplete = Object.fromEntries(
      Object.entries(configuration).filter(([key]) => key !== "policyVersion"),
    );
    expect(gateAV1ConfigurationSchema.safeParse(incomplete).success).toBe(
      false,
    );
  });
});
