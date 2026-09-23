import { describe, expect, it, vi } from "vitest";
import type {
  PolicyEvaluation,
  PolicyEvaluationInput,
  PolicyEvaluationOutcome,
  PolicyOperatingMode,
  RequiredCapacityBucket,
} from "@capacity-governor/contracts";
import {
  policyBucketResultSchema,
  policyEvaluationOutcomeSchema,
} from "@capacity-governor/contracts";
import { evaluatePolicyV1 } from "../src/index";
import { makeBucket, makeInput, quantity } from "./fixtures";

const evaluation = (input: unknown): PolicyEvaluation => {
  const outcome = evaluatePolicyV1(input);
  expect(outcome.kind).toBe("POLICY_EVALUATION");
  if (outcome.kind !== "POLICY_EVALUATION") {
    throw new Error(`Expected policy evaluation: ${JSON.stringify(outcome)}`);
  }
  return outcome;
};

const rejection = (input: unknown): PolicyEvaluationOutcome => {
  const outcome = evaluatePolicyV1(input);
  expect(outcome.kind).toBe("INPUT_REJECTION");
  return outcome;
};

const withBucket = (
  overrides: Partial<RequiredCapacityBucket>,
  inputOverrides: Partial<PolicyEvaluationInput> = {},
) => makeInput([makeBucket("five-hour", overrides)], inputOverrides);

const confirmedReset = (
  resetsAt: string,
  expectedAmount?: string,
): Extract<RequiredCapacityBucket["reset"], { kind: "CONFIRMED" }> => ({
  kind: "CONFIRMED",
  resetsAt,
  sourceTimezone: "UTC",
  normalizedUtc: resetsAt,
  ...(expectedAmount
    ? { expectedPostResetAvailability: quantity(expectedAmount) }
    : {}),
});

describe("Gate A V1 exact normalization and allocation", () => {
  it("owns normalization and applies directional rounding exactly", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("58.005", "PERCENT"),
        implementationDemand: quantity("0.58005", "NORMALIZED_FRACTION"),
      }),
    ).bucketResults[0];

    expect(result.availableBasisPoints).toBe(5_800);
    expect(result.suppliedDemandBasisPoints).toBe(5_801);
    expect(result.roundingEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "five-hour:available",
          direction: "DOWN",
          numerator: "5800500",
          denominator: "1000",
          resultBasisPoints: 5_800,
        }),
        expect.objectContaining({
          operation: "five-hour:demand",
          direction: "UP",
          resultBasisPoints: 5_801,
        }),
      ]),
    );
  });

  it("normalizes basis-point decimals without binary floating point", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("7800.999"),
        implementationDemand: quantity("1.001"),
      }),
    ).bucketResults[0];
    expect(result.availableBasisPoints).toBe(7_800);
    expect(result.suppliedDemandBasisPoints).toBe(2);
  });

  it("fails closed when a caller normalization claim disagrees", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: {
          ...quantity("80", "PERCENT"),
          claimedNormalizedBasisPoints: 7_999,
        },
      }),
    );
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain("STOP_NORMALIZATION_CLAIM_MISMATCH");
  });

  it("accepts an exact caller normalization claim only as provenance", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: {
          ...quantity("80", "PERCENT"),
          claimedNormalizedBasisPoints: 8_000,
        },
      }),
    );
    expect(result.aggregateDecision).toBe("PROCEED");
    expect(result.stopIds).not.toContain("STOP_NORMALIZATION_CLAIM_MISMATCH");
  });

  it.each([
    ["BASIS_POINTS", "10000"],
    ["PERCENT", "100"],
    ["NORMALIZED_FRACTION", "1"],
  ] as const)(
    "accepts exact current availability maximum in %s",
    (unit, amount) => {
      const result = evaluation(
        withBucket({
          availableCapacity: quantity(amount, unit),
          implementationDemand: quantity("0"),
        }),
      );
      expect(result.bucketResults[0].availableBasisPoints).toBe(10_000);
    },
  );

  it.each([
    ["BASIS_POINTS", "10000.1"],
    ["PERCENT", "100.001"],
    ["NORMALIZED_FRACTION", "1.00001"],
  ] as const)(
    "rejects immediately-over-maximum current availability in %s before rounding",
    (unit, amount) => {
      const result = rejection(
        withBucket({ availableCapacity: quantity(amount, unit) }),
      );
      if (result.kind === "INPUT_REJECTION") {
        expect(result.authorizesWork).toBe(false);
        expect(result.issues[0]).toMatchObject({
          validationId: "INPUT_INVALID_VALUE",
          bucketId: "five-hour",
          path: ["requiredCapacityBuckets", 0, "availableCapacity", "amount"],
        });
      }
    },
  );

  it.each([
    ["BASIS_POINTS", "10000"],
    ["PERCENT", "100"],
    ["NORMALIZED_FRACTION", "1"],
  ] as const)(
    "accepts exact post-reset availability maximum in %s",
    (unit, amount) => {
      const result = evaluation(
        withBucket({
          availableCapacity: quantity("5000"),
          implementationDemand: quantity("4000"),
          reset: {
            ...confirmedReset("2026-08-26T11:00:00.000Z"),
            expectedPostResetAvailability: quantity(amount, unit),
          },
        }),
      );
      expect(result.bucketResults[0].postReset?.availableBasisPoints).toBe(
        10_000,
      );
    },
  );

  it.each([
    ["BASIS_POINTS", "10000.1"],
    ["PERCENT", "100.001"],
    ["NORMALIZED_FRACTION", "1.00001"],
  ] as const)(
    "rejects immediately-over-maximum post-reset availability in %s before rounding",
    (unit, amount) => {
      const result = rejection(
        withBucket({
          reset: {
            ...confirmedReset("2026-08-26T11:00:00.000Z"),
            expectedPostResetAvailability: quantity(amount, unit),
          },
        }),
      );
      if (result.kind === "INPUT_REJECTION") {
        expect(result.issues[0]).toMatchObject({
          validationId: "INPUT_INVALID_VALUE",
          path: [
            "requiredCapacityBuckets",
            0,
            "reset",
            "expectedPostResetAvailability",
            "amount",
          ],
        });
      }
    },
  );

  it("calculates exact 15 percent reserve floors", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("3333"),
        implementationDemand: quantity("100"),
      }),
    ).bucketResults[0];
    expect(result.correctionReserveBasisPoints).toBe(500);
    expect(result.validationReserveBasisPoints).toBe(500);
    expect(result.implementationAllocationBasisPoints).toBe(2_333);
    expect(result.roundingEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          numerator: "4999500",
          denominator: "10000",
          direction: "UP",
          resultBasisPoints: 500,
        }),
      ]),
    );
  });

  it("honors normalized manual minimums and higher target shares", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("5000"),
        correctionReserve: {
          manualMinimum: quantity("9", "PERCENT"),
        },
        validationReserve: { targetShareBasisPoints: 2_000 },
      }),
    ).bucketResults[0];
    expect(result.correctionReserveBasisPoints).toBe(900);
    expect(result.validationReserveBasisPoints).toBe(1_000);
    expect(result.implementationAllocationBasisPoints).toBe(3_100);
  });

  it("normalizes reserve minimums with upward rounding and retains raw evidence", () => {
    const result = evaluation(
      withBucket({
        correctionReserve: {
          manualMinimum: quantity("7.001", "PERCENT"),
          targetShareBasisPoints: 1_000,
        },
        validationReserve: {
          manualMinimum: quantity("0.07001", "NORMALIZED_FRACTION"),
          targetShareBasisPoints: 1_000,
        },
      }),
    ).bucketResults[0];
    expect(result.correctionReserveBasisPoints).toBe(1_200);
    expect(result.validationReserveBasisPoints).toBe(1_200);
    expect(result.correctionReserve?.manualMinimum).toEqual(
      quantity("7.001", "PERCENT"),
    );
    expect(result.validationReserve?.manualMinimum).toEqual(
      quantity("0.07001", "NORMALIZED_FRACTION"),
    );
    expect(result.implementationDemand).toEqual(quantity("2000"));
    expect(result.roundingEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "five-hour:correction-minimum",
          direction: "UP",
          resultBasisPoints: 701,
        }),
        expect.objectContaining({
          operation: "five-hour:validation-minimum",
          direction: "UP",
          resultBasisPoints: 701,
        }),
      ]),
    );
  });

  it("ignores reserve targets below the versioned floor", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("3333"),
        correctionReserve: { targetShareBasisPoints: 1_499 },
        validationReserve: { targetShareBasisPoints: 0 },
      }),
    ).bucketResults[0];
    expect(result.correctionReserveBasisPoints).toBe(500);
    expect(result.validationReserveBasisPoints).toBe(500);
  });

  it("uses the exact 5/4 bounded-uncertainty multiplier", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("9000"),
        implementationDemand: quantity("1"),
        uncertainty: "UNCERTAIN_BUT_BOUNDED",
      }),
    ).bucketResults[0];
    expect(result.adjustedDemandBasisPoints).toBe(2);
    expect(result.rawMode).toBe("FULL");
    expect(result.mode).toBe("CONSERVATION");
    expect(result.ruleIds).toContain("RULE_UNCERTAINTY_BOUNDED_MARGIN");
  });
});

describe("Gate A V1 mode, freshness, and stop boundaries", () => {
  it.each<[number, PolicyOperatingMode]>([
    [6_000, "FULL"],
    [5_999, "CONSERVATION"],
    [3_500, "CONSERVATION"],
    [3_499, "LOW"],
    [1_500, "LOW"],
    [1_499, "CRITICAL"],
    [0, "CRITICAL"],
    [10_000, "FULL"],
  ])("classifies %i bp as %s", (amount, expectedMode) => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity(String(amount)),
        implementationDemand: quantity("0"),
      }),
    );
    expect(result.bucketResults[0].mode).toBe(expectedMode);
    expect(result.aggregateMode).toBe(expectedMode);
  });

  it("keeps an observation valid at exactly 30 minutes", () => {
    const result = evaluation(
      withBucket({ observedAt: "2026-08-25T11:30:00.000Z" }),
    );
    expect(result.stopIds).not.toContain("STOP_STALE_OBSERVATION_AGE");
    expect(result.aggregateDecision).toBe("PROCEED");
  });

  it("stales an observation immediately after the 30-minute boundary", () => {
    const result = evaluation(
      withBucket({ observedAt: "2026-08-25T11:29:59.999Z" }),
    );
    expect(result.stopIds).toContain("STOP_STALE_OBSERVATION_AGE");
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
  });

  it("stales only buckets affected by known post-observation activity", () => {
    const fiveHour = makeBucket("five-hour");
    const weekly = makeBucket("weekly");
    const result = evaluation(
      makeInput([weekly, fiveHour], {
        knownCapacityActivities: [
          {
            eventId: "run-1",
            occurredAt: "2026-08-25T11:55:00.000Z",
            affectedBucketIds: ["five-hour"],
            source: "recorded-run",
          },
        ],
      }),
    );
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(
      result.bucketResults.find((item) => item.bucketId === "five-hour")
        ?.stopIds,
    ).toContain("STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION");
    expect(
      result.bucketResults.find((item) => item.bucketId === "weekly")?.stopIds,
    ).not.toContain("STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION");
  });

  it("returns evaluable STOP/PRESERVE for unknown uncertainty", () => {
    const result = evaluatePolicyV1(
      withBucket({ uncertainty: "UNKNOWN_OR_INVALID" }),
    );
    expect(result.kind).toBe("POLICY_EVALUATION");
    if (result.kind === "POLICY_EVALUATION") {
      expect(result.aggregateMode).toBe("FULL");
      expect(result.aggregateDecision).toBe("STOP / PRESERVE");
      expect(result.stopIds).toContain("STOP_UNKNOWN_OR_INVALID_UNCERTAINTY");
    }
  });

  it("returns a typed rejection without a fabricated mode or decision", () => {
    const result = evaluatePolicyV1({ configuration: {} });
    expect(result).toMatchObject({
      kind: "INPUT_REJECTION",
      authorizesWork: false,
    });
    expect(result).not.toHaveProperty("aggregateMode");
    expect(result).not.toHaveProperty("aggregateDecision");
    if (result.kind === "INPUT_REJECTION") {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(
        result.issues.every((issue) => issue.validationId.startsWith("INPUT_")),
      ).toBe(true);
    }
  });

  it("gives mandatory stops precedence over otherwise qualifying defer", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("5000"),
        implementationDemand: quantity("4000"),
        observedAt: "2026-08-25T11:29:59.999Z",
        reset: confirmedReset("2026-08-26T12:00:00.000Z", "7000"),
      }),
    );
    expect(result.bucketResults[0].postReset?.sufficient).toBe(true);
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain("STOP_STALE_OBSERVATION_AGE");
  });

  it("stops on an external mandatory condition", () => {
    const result = evaluation(
      makeInput(undefined, { activeMandatoryStopIds: ["repository-hold"] }),
    );
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain("STOP_EXTERNAL_MANDATORY_CONDITION");
  });

  it("stops when a reset passed after the retained observation", () => {
    const result = evaluation(
      withBucket({
        observedAt: "2026-08-25T11:45:00.000Z",
        reset: confirmedReset("2026-08-25T11:55:00.000Z", "9000"),
      }),
    );
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain(
      "STOP_RESET_PASSED_WITHOUT_FRESH_OBSERVATION",
    );
  });

  it("stops on inconsistent confirmed-reset timestamp evidence", () => {
    const result = evaluation(
      withBucket({
        reset: {
          kind: "CONFIRMED",
          resetsAt: "2026-08-26T05:00:00.000-06:00",
          sourceTimezone: "America/Denver",
          normalizedUtc: "2026-08-26T12:00:00.000Z",
          expectedPostResetAvailability: quantity("9000"),
        },
      }),
    );
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain("STOP_INVALID_RESET_EVIDENCE");
  });

  it("does not consult Intl when retaining source timezone evidence", () => {
    const sourceTimezone = "provider-supplied-zone-label";
    const dateTimeFormat = vi
      .spyOn(Intl, "DateTimeFormat")
      .mockImplementation(() => {
        throw new Error("Intl timezone data must not be consulted");
      });
    try {
      const result = evaluation(
        withBucket({
          reset: {
            kind: "CONFIRMED",
            resetsAt: "2026-08-26T06:00:00.000-06:00",
            sourceTimezone,
            normalizedUtc: "2026-08-26T12:00:00.000Z",
            expectedPostResetAvailability: quantity("9000"),
          },
        }),
      );
      expect(result.bucketResults[0].reset).toMatchObject({ sourceTimezone });
      expect(result.stopIds).not.toContain("STOP_INVALID_RESET_EVIDENCE");
    } finally {
      dateTimeFormat.mockRestore();
    }
  });

  it("stops when reserves exhaust current capacity", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("1000"),
        implementationDemand: quantity("0"),
        correctionReserve: { manualMinimum: quantity("600") },
        validationReserve: { manualMinimum: quantity("400") },
      }),
    );
    expect(result.stopIds).toContain("STOP_RESERVES_EXHAUST_CAPACITY");
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
  });

  it("stops when required validation cannot be protected", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("2000"),
        implementationDemand: quantity("0"),
        validationReserve: { manualMinimum: quantity("3000") },
      }),
    );
    expect(result.stopIds).toContain("STOP_VALIDATION_RESERVE_UNPROTECTED");
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
  });

  it("stops new implementation in CRITICAL mode", () => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("1499"),
        implementationDemand: quantity("0"),
      }),
    );
    expect(result.aggregateMode).toBe("CRITICAL");
    expect(result.aggregateDecision).toBe("STOP / PRESERVE");
    expect(result.stopIds).toContain("STOP_CRITICAL_MODE");
  });

  it.each([["future observation", { observedAt: "2026-08-25T12:00:00.001Z" }]])(
    "stops on a policy invariant: %s",
    (_name, overrides) => {
      const result = evaluation(withBucket(overrides));
      expect(result.aggregateDecision).toBe("STOP / PRESERVE");
      expect(result.stopIds).toContain("STOP_POLICY_INVARIANT");
    },
  );

  it("rejects an observation 0.0001 ms in the future", () => {
    const result = rejection(
      withBucket({ observedAt: "2026-08-25T12:00:00.0000001Z" }),
    );
    if (result.kind === "INPUT_REJECTION") {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            validationId: "INPUT_INVALID_VALUE",
            path: ["requiredCapacityBuckets", 0, "observedAt"],
          }),
        ]),
      );
    }
  });

  it("rejects a reset 24 hours plus 0.0009 ms away", () => {
    const timestamp = "2026-08-26T12:00:00.0000009Z";
    const result = rejection(
      withBucket({
        availableCapacity: quantity("5000"),
        implementationDemand: quantity("4000"),
        reset: {
          kind: "CONFIRMED",
          resetsAt: timestamp,
          sourceTimezone: "UTC",
          normalizedUtc: timestamp,
          expectedPostResetAvailability: quantity("7000"),
        },
      }),
    );
    if (result.kind === "INPUT_REJECTION") {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ["requiredCapacityBuckets", 0, "reset", "resetsAt"],
          }),
        ]),
      );
    }
  });

  it("rejects distinct reset instants inside the same millisecond", () => {
    const result = rejection(
      withBucket({
        reset: {
          kind: "CONFIRMED",
          resetsAt: "2026-08-26T11:00:00.0000001Z",
          sourceTimezone: "UTC",
          normalizedUtc: "2026-08-26T11:00:00.0000002Z",
          expectedPostResetAvailability: quantity("7000"),
        },
      }),
    );
    expect(result.kind).toBe("INPUT_REJECTION");
  });

  it("rejects unsafe normalization arithmetic without throwing", () => {
    const result = rejection(
      withBucket({ availableCapacity: quantity("9".repeat(128)) }),
    );
    if (result.kind === "INPUT_REJECTION") {
      expect(result.authorizesWork).toBe(false);
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ validationId: "INPUT_INVALID_VALUE" }),
        ]),
      );
    }
  });
});

describe("Gate A V1 reset, defer, and aggregate decisions", () => {
  const blockedBucket = (
    bucketId: string,
    resetsAt: string,
    postResetAmount = "7000",
  ) =>
    makeBucket(bucketId, {
      availableCapacity: quantity("5000"),
      implementationDemand: quantity("4000"),
      reset: confirmedReset(resetsAt, postResetAmount),
    });

  it("accepts a qualifying reset at exactly 24 hours", () => {
    const result = evaluation(
      makeInput([blockedBucket("five-hour", "2026-08-26T12:00:00.000Z")]),
    );
    expect(result.bucketResults[0].deferEligible).toBe(true);
    expect(result.aggregateDecision).toBe("DEFER");
    expect(result.ruleIds).toContain("RULE_DEFER_ALL_BLOCKERS_QUALIFY");
  });

  it("rejects defer at 24 hours plus one millisecond", () => {
    const result = evaluation(
      makeInput([blockedBucket("five-hour", "2026-08-26T12:00:00.001Z")]),
    );
    expect(result.bucketResults[0].deferEligible).toBe(false);
    expect(result.aggregateDecision).toBe("NARROW");
  });

  it("recalculates PRA reserves and allocation from A_post", () => {
    const result = evaluation(
      makeInput([
        blockedBucket("five-hour", "2026-08-26T11:00:00.000Z", "6000"),
      ]),
    );
    const bucket = result.bucketResults[0];
    expect(bucket.correctionReserveBasisPoints).toBe(750);
    expect(bucket.validationReserveBasisPoints).toBe(750);
    expect(bucket.postReset).toMatchObject({
      availableBasisPoints: 6_000,
      correctionReserveBasisPoints: 900,
      validationReserveBasisPoints: 900,
      implementationAllocationBasisPoints: 4_200,
      sufficient: true,
    });
    expect(result.aggregateDecision).toBe("DEFER");
  });

  it("normalizes fractional PRA downward before post-reset recalculation", () => {
    const result = evaluation(
      makeInput([
        makeBucket("five-hour", {
          availableCapacity: quantity("5000"),
          implementationDemand: quantity("4000"),
          reset: {
            kind: "CONFIRMED",
            resetsAt: "2026-08-26T11:00:00.000Z",
            sourceTimezone: "UTC",
            normalizedUtc: "2026-08-26T11:00:00.000Z",
            expectedPostResetAvailability: quantity("60.009", "PERCENT"),
          },
        }),
      ]),
    );
    expect(result.bucketResults[0].postReset).toMatchObject({
      availableBasisPoints: 6_000,
      correctionReserveBasisPoints: 900,
      validationReserveBasisPoints: 900,
      implementationAllocationBasisPoints: 4_200,
      sufficient: true,
    });
    expect(result.bucketResults[0].roundingEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "five-hour:post-reset-availability",
          direction: "DOWN",
          resultBasisPoints: 6_000,
        }),
      ]),
    );
  });

  it("does not reuse pre-reset reserves for post-reset affordability", () => {
    const result = evaluation(
      makeInput([
        makeBucket("five-hour", {
          availableCapacity: quantity("5000"),
          implementationDemand: quantity("4300"),
          reset: confirmedReset("2026-08-26T11:00:00.000Z", "6000"),
        }),
      ]),
    );
    expect(result.bucketResults[0].postReset).toMatchObject({
      implementationAllocationBasisPoints: 4_200,
      sufficient: false,
    });
    expect(result.aggregateDecision).toBe("NARROW");
  });

  it("requires every blocking bucket to qualify for defer", () => {
    const result = evaluation(
      makeInput([
        blockedBucket("five-hour", "2026-08-26T11:00:00.000Z"),
        makeBucket("weekly", {
          availableCapacity: quantity("5000"),
          implementationDemand: quantity("4000"),
          reset: { kind: "UNCERTAIN" },
        }),
      ]),
    );
    expect(result.blockingBucketIds).toEqual(["five-hour", "weekly"]);
    expect(result.aggregateDecision).toBe("NARROW");
  });

  it.each([
    [{ kind: "NONE" } as const],
    [{ kind: "UNCERTAIN" } as const],
    [{ kind: "ROLLING" } as const],
  ])("does not infer defer evidence from reset kind $kind", (reset) => {
    const result = evaluation(
      withBucket({
        availableCapacity: quantity("5000"),
        implementationDemand: quantity("4000"),
        reset,
      }),
    );
    expect(result.bucketResults[0].deferEligible).toBe(false);
    expect(result.aggregateDecision).toBe("NARROW");
  });

  it("does not require a healthy non-blocking bucket to reset", () => {
    const result = evaluation(
      makeInput([
        blockedBucket("five-hour", "2026-08-26T11:00:00.000Z"),
        makeBucket("weekly", { reset: { kind: "NONE" } }),
      ]),
    );
    expect(result.blockingBucketIds).toEqual(["five-hour"]);
    expect(result.aggregateDecision).toBe("DEFER");
  });

  it("aggregates DEFER plus NARROW to NARROW", () => {
    const deferBucket = blockedBucket("five-hour", "2026-08-26T11:00:00.000Z");
    const lowNotAttested = makeBucket("weekly", {
      availableCapacity: quantity("3000"),
      implementationDemand: quantity("1000"),
    });
    const result = evaluation(
      makeInput([deferBucket, lowNotAttested], {
        minimumCoherentScope: {
          actorReference: "founder",
          recordedAt: "2026-08-25T11:45:00.000Z",
          scopeTrancheId: "t003-fixture",
          provenance: {
            kind: "UPSTREAM_TRUSTED_BOUNDARY",
            evidenceReference: "fixture-attestation",
          },
          attestedValue: false,
        },
      }),
    );
    expect(
      result.bucketResults.map((bucket) => bucket.candidateDecision),
    ).toEqual(["DEFER", "NARROW"]);
    expect(result.aggregateDecision).toBe("NARROW");
  });

  it("allows LOW proceed only with minimum-coherent-scope attestation", () => {
    const bucket = makeBucket("five-hour", {
      availableCapacity: quantity("3000"),
      implementationDemand: quantity("1000"),
    });
    const attested = evaluation(makeInput([bucket]));
    const notAttested = evaluation(
      makeInput([bucket], {
        minimumCoherentScope: {
          actorReference: "founder",
          recordedAt: "2026-08-25T11:45:00.000Z",
          scopeTrancheId: "t003-fixture",
          provenance: {
            kind: "UPSTREAM_TRUSTED_BOUNDARY",
            evidenceReference: "fixture-attestation",
          },
          attestedValue: false,
        },
      }),
    );
    expect(attested.aggregateDecision).toBe("PROCEED");
    expect(attested.scopeTrancheId).toBe("t003-fixture");
    expect(attested.minimumCoherentScope.provenance).toEqual({
      kind: "UPSTREAM_TRUSTED_BOUNDARY",
      evidenceReference: "fixture-attestation",
    });
    expect(attested.requiredBucketAuthority.scopeTrancheId).toBe(
      "t003-fixture",
    );
    expect(notAttested.aggregateDecision).toBe("NARROW");
  });

  it.each(["requiredBucketAuthority", "minimumCoherentScope"] as const)(
    "rejects future-dated %s evidence",
    (field) => {
      const input = makeInput();
      const result = rejection({
        ...input,
        [field]: {
          ...input[field],
          recordedAt: "2026-08-25T12:00:00.001Z",
        },
      });
      if (result.kind === "INPUT_REJECTION") {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              validationId: "INPUT_FUTURE_EVIDENCE",
              path: [field, "recordedAt"],
            }),
          ]),
        );
      }
    },
  );

  it.each(["requiredBucketAuthority", "minimumCoherentScope"] as const)(
    "rejects %s evidence from another evaluation context",
    (field) => {
      const input = makeInput();
      const result = rejection({
        ...input,
        [field]: {
          ...input[field],
          scopeTrancheId: "different-tranche",
        },
      });
      if (result.kind === "INPUT_REJECTION") {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              validationId: "INPUT_EVIDENCE_CONTEXT_MISMATCH",
              path: [field, "scopeTrancheId"],
            }),
          ]),
        );
      }
    },
  );

  it.each(["requiredBucketAuthority", "minimumCoherentScope"] as const)(
    "does not treat the actor string alone as authenticated %s evidence",
    (field) => {
      const input = makeInput();
      const evidence: Record<string, unknown> = { ...input[field] };
      delete evidence.provenance;
      const result = rejection({ ...input, [field]: evidence });
      if (result.kind === "INPUT_REJECTION") {
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: [field, "provenance"],
            }),
          ]),
        );
      }
    },
  );

  it.each([
    ["omits a required bucket", ["five-hour"]],
    ["adds an unrelated bucket", ["five-hour", "weekly", "unrelated"]],
    ["duplicates an authority bucket", ["five-hour", "weekly", "weekly"]],
  ] as const)("rejects authority that %s", (_name, requiredBucketIds) => {
    const input = makeInput([makeBucket("five-hour"), makeBucket("weekly")]);
    const result = rejection({
      ...input,
      requiredBucketAuthority: {
        ...input.requiredBucketAuthority,
        requiredBucketIds,
      },
    });
    if (result.kind === "INPUT_REJECTION") {
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            validationId: "INPUT_AUTHORIZED_BUCKET_SET_MISMATCH",
            path: ["requiredBucketAuthority", "requiredBucketIds"],
          }),
        ]),
      );
    }
  });

  it("does not substitute a healthy bucket for a blocking bucket", () => {
    const result = evaluation(
      makeInput([
        makeBucket("five-hour", {
          availableCapacity: quantity("10000"),
          implementationDemand: quantity("100"),
        }),
        makeBucket("weekly", {
          availableCapacity: quantity("4000"),
          implementationDemand: quantity("3000"),
        }),
      ]),
    );
    expect(result.bucketResults[0].currentAffordable).toBe(true);
    expect(result.bucketResults[1].currentAffordable).toBe(false);
    expect(result.aggregateDecision).toBe("NARROW");
  });
  it("rejects contradictory serialized aggregate authorization and stop evidence", () => {
    const valid = evaluation(makeInput());
    expect(
      policyEvaluationOutcomeSchema.safeParse({
        ...valid,
        authorizesWork: false,
      }).success,
    ).toBe(false);
    expect(
      policyEvaluationOutcomeSchema.safeParse({
        ...valid,
        aggregateDecision: "NARROW",
        authorizesWork: false,
      }).success,
    ).toBe(false);
    expect(
      policyEvaluationOutcomeSchema.safeParse({
        ...valid,
        aggregateDecision: "STOP / PRESERVE",
        activeMandatoryStopIds: ["external-stop"],
        stopIds: ["STOP_EXTERNAL_MANDATORY_CONDITION"],
        authorizesWork: true,
      }).success,
    ).toBe(false);
    expect(
      policyEvaluationOutcomeSchema.safeParse({
        ...valid,
        requiredBucketAuthority: {
          ...valid.requiredBucketAuthority,
          requiredBucketIds: ["another-bucket"],
        },
      }).success,
    ).toBe(false);
  });

  it("rejects contradictory serialized bucket candidates at both schema boundaries", () => {
    const valid = evaluation(makeInput());
    const bucket = valid.bucketResults[0];
    const contradictions = [
      { ...bucket, blocking: true },
      { ...bucket, deferEligible: true },
      { ...bucket, candidateDecision: "DEFER" },
      {
        ...bucket,
        candidateDecision: "PROCEED",
        currentAffordable: false,
        blocking: true,
      },
      { ...bucket, stopIds: ["STOP_POLICY_INVARIANT"] },
      { ...bucket, candidateDecision: "NARROW" },
      { ...bucket, candidateDecision: "STOP / PRESERVE" },
      {
        ...bucket,
        adjustedDemandBasisPoints:
          bucket.implementationAllocationBasisPoints + 1,
      },
      {
        ...bucket,
        implementationAllocationBasisPoints:
          bucket.implementationAllocationBasisPoints + 1,
      },
      { ...bucket, mode: "CRITICAL" },
      {
        ...bucket,
        candidateDecision: "NARROW",
        currentAffordable: false,
        blocking: true,
        implementationAllocationBasisPoints: 0,
      },
    ];
    for (const contradiction of contradictions) {
      expect(policyBucketResultSchema.safeParse(contradiction).success).toBe(
        false,
      );
      expect(
        policyEvaluationOutcomeSchema.safeParse({
          ...valid,
          bucketResults: [contradiction],
        }).success,
      ).toBe(false);
    }
  });

  it("rejects contradictory serialized post-reset affordability evidence", () => {
    const valid = evaluation(
      withBucket({
        availableCapacity: quantity("5000"),
        implementationDemand: quantity("4000"),
        reset: confirmedReset("2026-08-26T11:00:00.000Z", "7000"),
      }),
    );
    const bucket = valid.bucketResults[0];
    expect(bucket.postReset?.sufficient).toBe(true);
    if (!bucket.postReset) {
      throw new Error("Expected post-reset evidence");
    }
    const contradictions = [
      { ...bucket, postReset: { ...bucket.postReset, sufficient: false } },
      { ...bucket, reset: { kind: "NONE" } },
      {
        ...bucket,
        postReset: {
          ...bucket.postReset,
          implementationAllocationBasisPoints:
            bucket.postReset.implementationAllocationBasisPoints + 1,
        },
      },
    ];
    for (const contradiction of contradictions) {
      expect(policyBucketResultSchema.safeParse(contradiction).success).toBe(
        false,
      );
      expect(
        policyEvaluationOutcomeSchema.safeParse({
          ...valid,
          bucketResults: [contradiction],
        }).success,
      ).toBe(false);
    }
  });

  it("rejects LOW authorization when the bound attestation is false", () => {
    const low = evaluation(
      withBucket({
        availableCapacity: quantity("3000"),
        implementationDemand: quantity("1000"),
      }),
    );
    expect(low.aggregateDecision).toBe("PROCEED");
    expect(
      policyEvaluationOutcomeSchema.safeParse({
        ...low,
        minimumCoherentScope: {
          ...low.minimumCoherentScope,
          attestedValue: false,
        },
      }).success,
    ).toBe(false);
  });
});

describe("Gate A V1 determinism and explainability", () => {
  it("round-trips successful and rejected outcomes through runtime schemas", () => {
    const success = evaluatePolicyV1(makeInput());
    const failure = evaluatePolicyV1({ configuration: {} });
    expect(policyEvaluationOutcomeSchema.parse(success)).toEqual(success);
    expect(policyEvaluationOutcomeSchema.parse(failure)).toEqual(failure);
  });

  it("retains injected versioned orders and complete configuration", () => {
    const result = evaluation(makeInput());
    expect(result.configuration.modeRestrictivenessOrder).toEqual([
      "FULL",
      "CONSERVATION",
      "LOW",
      "CRITICAL",
    ]);
    expect(result.configuration.decisionRestrictivenessOrder).toEqual([
      "PROCEED",
      "DEFER",
      "NARROW",
      "STOP / PRESERVE",
    ]);
  });

  it("returns deeply immutable evaluation evidence", () => {
    const result = evaluation(makeInput());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.configuration)).toBe(true);
    expect(Object.isFrozen(result.bucketResults)).toBe(true);
    expect(Object.isFrozen(result.bucketResults[0].roundingEvidence)).toBe(
      true,
    );
  });

  it("always selects the most restrictive bucket mode", () => {
    const result = evaluation(
      makeInput([
        makeBucket("five-hour", { availableCapacity: quantity("8000") }),
        makeBucket("weekly", { availableCapacity: quantity("3000") }),
      ]),
    );
    expect(result.bucketResults.map((bucket) => bucket.mode)).toEqual([
      "FULL",
      "LOW",
    ]);
    expect(result.aggregateMode).toBe("LOW");
  });
  it("is deeply repeatable for identical input", () => {
    const input = makeInput([
      makeBucket("weekly"),
      makeBucket("five-hour", {
        uncertainty: "UNCERTAIN_BUT_BOUNDED",
      }),
    ]);
    expect(evaluatePolicyV1(input)).toEqual(evaluatePolicyV1(input));
  });

  it("is independent of bucket, activity, and affected-ID input order", () => {
    const fiveHour = makeBucket("five-hour");
    const weekly = makeBucket("weekly");
    const activities = [
      {
        eventId: "b-event",
        occurredAt: "2026-08-25T11:40:00.000Z",
        affectedBucketIds: ["weekly", "five-hour"],
        source: "recorded-run",
      },
      {
        eventId: "a-event",
        occurredAt: "2026-08-25T11:30:00.000Z",
        affectedBucketIds: ["five-hour"],
        source: "recorded-run",
      },
    ];
    const forward = evaluatePolicyV1(
      makeInput([fiveHour, weekly], { knownCapacityActivities: activities }),
    );
    const reversed = evaluatePolicyV1(
      makeInput([weekly, fiveHour], {
        knownCapacityActivities: [
          activities[1],
          { ...activities[0], affectedBucketIds: ["five-hour", "weekly"] },
        ],
      }),
    );
    expect(reversed).toEqual(forward);
  });

  it("canonicalizes composed and decomposed identifiers by UTF-16 code units", () => {
    const composed = "é";
    const decomposed = "e\u0301";
    const first = makeBucket(composed);
    const second = makeBucket(decomposed);
    const activities = [
      {
        eventId: composed,
        occurredAt: "2026-08-25T11:49:00.000Z",
        affectedBucketIds: [composed, decomposed],
        source: "recorded-run",
      },
      {
        eventId: decomposed,
        occurredAt: "2026-08-25T11:48:00.000Z",
        affectedBucketIds: [decomposed],
        source: "recorded-run",
      },
    ];
    const forward = evaluation(
      makeInput([first, second], { knownCapacityActivities: activities }),
    );
    const reversed = evaluation(
      makeInput([second, first], {
        knownCapacityActivities: [
          activities[1],
          { ...activities[0], affectedBucketIds: [decomposed, composed] },
        ],
      }),
    );
    expect(reversed).toEqual(forward);
    expect(forward.bucketResults.map((bucket) => bucket.bucketId)).toEqual([
      decomposed,
      composed,
    ]);
    expect(
      forward.bucketResults[0].affectingKnownActivities.map(
        (activity) => activity.eventId,
      ),
    ).toEqual([decomposed, composed]);
  });

  it("retains stable bucket-specific rule and stop identifiers", () => {
    const result = evaluation(
      withBucket({
        observedAt: "2026-08-25T11:29:59.999Z",
        uncertainty: "UNKNOWN_OR_INVALID",
      }),
    );
    expect(result.stopIds).toEqual([
      "STOP_STALE_OBSERVATION_AGE",
      "STOP_UNKNOWN_OR_INVALID_UNCERTAINTY",
    ]);
    expect(result.bucketResults[0].ruleIds).toEqual(
      expect.arrayContaining([
        "RULE_NORMALIZATION_EXACT_WHITELIST",
        "RULE_DECISION_STOP_PRESERVE",
        "RULE_MODE_FULL",
      ]),
    );
    expect(result.limitingBucketIds).toEqual(["five-hour"]);
  });
});
