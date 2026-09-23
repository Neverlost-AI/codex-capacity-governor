import { describe, expect, it } from "vitest";
import {
  forecastEvaluationOutcomeSchema,
  forecastPolicyProjectionSchema,
  policyRawQuantitySchema,
  policyUncertaintySchema,
  type ForecastEvaluation,
  type ForecastEvaluationInput,
} from "@capacity-governor/contracts";
import {
  compareForecastWithRunV1,
  evaluateForecastV1,
  GATE_B_V1_CONFIGURATION,
  projectForecastToPolicyDemandV1,
} from "../src/index";
import { candidate, forecastInput, reviewedItem } from "./fixtures";

const evaluation = (input: ForecastEvaluationInput): ForecastEvaluation => {
  const result = evaluateForecastV1(input);
  if (result.kind !== "FORECAST_EVALUATION")
    throw new Error(JSON.stringify(result));
  return result;
};

describe("Decision 0003 scoring and cold start", () => {
  it("reproduces the reviewed 12-point / 1,200-bp MEDIUM example for two independent buckets", () => {
    const result = evaluation(forecastInput());
    expect(result.totalWorkScore).toBe(12);
    expect(result.scoredItems[0].factorAdders).toEqual({
      complexity: 2,
      contextLoad: 1,
      repositoryCondition: 0,
      dependencyChange: 1,
      validationBurden: 1,
      novelty: 2,
      correctionExposure: 1,
    });
    expect(result.bucketResults).toHaveLength(2);
    expect(result.bucketResults[0].bucket.bucketId).toBe("five-hour");
    expect(result.bucketResults[1].bucket.bucketId).toBe("weekly");
    for (const bucket of result.bucketResults) {
      expect(bucket.baselineExpected).toEqual({
        numerator: "1200",
        denominator: "1",
      });
      expect(bucket.confidence).toBe("MEDIUM");
      expect(bucket.roundedRange).toEqual({
        lowBasisPoints: 900,
        expectedBasisPoints: 1200,
        highBasisPoints: 1500,
      });
      expect(bucket.medianRatio).toBeUndefined();
    }
    expect(result.overallConfidence).toBe("MEDIUM");
    expect(forecastEvaluationOutcomeSchema.parse(result)).toEqual(result);
    expect(
      result.scoredItems[0].workItem.reviewedCharacterization.evidenceReference,
    ).toBe("review-1");
    expect(result.requiredBucketAuthority.evidenceReference).toBe(
      "bucket-review-1",
    );
  });

  it.each(Object.entries(GATE_B_V1_CONFIGURATION.categoryBase))(
    "scores category %s at %i",
    (category, base) => {
      const input = forecastInput();
      input.workItems[0].category =
        category as (typeof input.workItems)[0]["category"];
      expect(evaluation(input).scoredItems[0].categoryBase).toBe(base);
    },
  );

  it.each([
    ["complexity", GATE_B_V1_CONFIGURATION.complexity],
    ["contextLoad", GATE_B_V1_CONFIGURATION.contextLoad],
    ["repositoryCondition", GATE_B_V1_CONFIGURATION.repositoryCondition],
    ["dependencyChange", GATE_B_V1_CONFIGURATION.dependencyChange],
    ["validationBurden", GATE_B_V1_CONFIGURATION.validationBurden],
    ["novelty", GATE_B_V1_CONFIGURATION.novelty],
    ["correctionExposure", GATE_B_V1_CONFIGURATION.correctionExposure],
  ] as const)("scores every %s adder including UNKNOWN", (field, values) => {
    for (const [name, points] of Object.entries(values)) {
      const input = forecastInput();
      input.workItems[0] = { ...input.workItems[0], [field]: name };
      const result = evaluation(input);
      expect(result.scoredItems[0].factorAdders[field]).toBe(points);
      if (name === "UNKNOWN") {
        expect(result.overallConfidence).toBe("LOW");
        expect(result.unknowns).toContain(`UNKNOWN_FACTOR:item-a:${field}`);
      }
    }
  });

  it("sums multiple items exactly and rejects missing rather than inventing UNKNOWN", () => {
    const input = forecastInput();
    input.workItems.push({
      ...reviewedItem,
      workItemId: "item-b",
      category: "TESTING_ONLY",
    });
    expect(evaluation(input).totalWorkScore).toBe(22);
    const malformed: Record<string, unknown> = { ...input.workItems[0] };
    delete malformed.novelty;
    (input.workItems as unknown[])[0] = malformed;
    const rejected = evaluateForecastV1(input);
    expect(rejected.kind).toBe("INPUT_REJECTION");
    expect(rejected.authorizesWork).toBe(false);
    expect("bucketResults" in rejected).toBe(false);
    input.workItems[0] = {
      ...reviewedItem,
      novelty: "UNREVIEWED",
    } as unknown as typeof reviewedItem;
    const unsupported = evaluateForecastV1(input);
    expect(unsupported.kind).toBe("INPUT_REJECTION");
    if (unsupported.kind === "INPUT_REJECTION") {
      expect(unsupported.issues).toContainEqual({
        id: "INPUT_INVALID_VALUE",
        path: ["workItems", 0, "novelty"],
        received: "UNREVIEWED",
      });
    }
  });

  it("uses LOW range for an explicit UNKNOWN and never rounds a positive case to zero", () => {
    const input = forecastInput();
    input.workItems[0].novelty = "UNKNOWN";
    const bucket = evaluation(input).bucketResults[0];
    expect(bucket.confidence).toBe("LOW");
    expect(bucket.roundedRange).toEqual({
      lowBasisPoints: 700,
      expectedBasisPoints: 1400,
      highBasisPoints: 2100,
    });
    const tiny = forecastInput();
    tiny.calibrationCandidates = [
      candidate("a", "1"),
      candidate("b", "1"),
      candidate("c", "1"),
    ];
    const tinyRange = evaluation(tiny).bucketResults[0].roundedRange;
    expect(tinyRange).toEqual({
      lowBasisPoints: 100,
      expectedBasisPoints: 100,
      highBasisPoints: 100,
    });
  });

  it("preserves above-cycle work-point sums rather than clamping", () => {
    const input = forecastInput();
    input.workItems = Array.from({ length: 300 }, (_, index) => ({
      ...reviewedItem,
      workItemId: `item-${index}`,
    }));
    const result = evaluation(input);
    expect(result.totalWorkScore).toBe(3_600);
    expect(result.bucketResults[0].roundedRange.expectedBasisPoints).toBe(
      360_000,
    );
  });

  it("returns typed input rejection for an unsafe calibrated public amount", () => {
    const input = forecastInput();
    input.calibrationCandidates = ["a", "b", "c"].map((id) =>
      candidate(id, "999999999999999999999999999999999999999"),
    );
    const result = evaluateForecastV1(input);
    expect(result).toMatchObject({
      kind: "INPUT_REJECTION",
      authorizesWork: false,
      issues: [{ id: "INPUT_UNSAFE_RESULT", path: [] }],
    });
    expect("bucketResults" in result).toBe(false);
  });

  it("uses explicit accepted incomplete profile evidence for bucket-specific LOW confidence", () => {
    const input = forecastInput();
    input.requiredBuckets[1].profileEvidence = {
      status: "ACCEPTED_INCOMPLETE",
      acceptedForV1Forecast: true,
      actorReference: "reviewer-1",
      evidenceReference: "profile-exception-1",
      recordedAt: "2026-09-22T11:00:00.000Z",
    };
    const result = evaluation(input);
    expect(result.bucketResults.map((bucket) => bucket.confidence)).toEqual([
      "MEDIUM",
      "LOW",
    ]);
    expect(result.overallConfidence).toBe("LOW");
    expect(result.bucketResults[1].unknowns).toContain(
      "INCOMPLETE_PROFILE:weekly:profile-exception-1",
    );
  });
});

describe("completed comparable history and exact calibration", () => {
  it.each([0, 1, 2])(
    "uses unadjusted baseline for %i compatible candidates",
    (count) => {
      const input = forecastInput();
      input.calibrationCandidates = Array.from({ length: count }, (_, index) =>
        candidate(String(index), "1400"),
      );
      const bucket = evaluation(input).bucketResults[0];
      expect(bucket.includedHistoryCount).toBe(count);
      expect(bucket.adjustedExpected).toEqual({
        numerator: "1200",
        denominator: "1",
      });
      expect(bucket.medianRatio).toBeUndefined();
    },
  );

  it("uses the exact three-run median and preserves unrelated bucket cold start", () => {
    const input = forecastInput();
    input.calibrationCandidates = [
      candidate("c", "1400"),
      candidate("a", "1100"),
      candidate("b", "1250"),
    ];
    const result = evaluation(input);
    const bucket = result.bucketResults[0];
    expect(
      bucket.consideredCandidates.map((entry) => entry.candidate.candidateId),
    ).toEqual(["a", "b", "c"]);
    expect(bucket.medianRatio).toEqual({ numerator: "5", denominator: "4" });
    expect(bucket.adjustedExpected).toEqual({
      numerator: "1500",
      denominator: "1",
    });
    expect(bucket.rawRange).toEqual({
      low: { numerator: "1125", denominator: "1" },
      expected: { numerator: "1500", denominator: "1" },
      high: { numerator: "1875", denominator: "1" },
    });
    expect(bucket.roundedRange).toEqual({
      lowBasisPoints: 1100,
      expectedBasisPoints: 1500,
      highBasisPoints: 1900,
    });
    expect(result.bucketResults[1].adjustedExpected).toEqual({
      numerator: "1200",
      denominator: "1",
    });
  });

  it("uses exact middle-pair mean for even history, with fractional raw evidence", () => {
    const input = forecastInput();
    input.calibrationCandidates = [
      candidate("a", "1100"),
      candidate("b", "1200"),
      candidate("c", "1300"),
      candidate("d", "1400"),
    ];
    const bucket = evaluation(input).bucketResults[0];
    expect(bucket.medianRatio).toEqual({ numerator: "5", denominator: "4" });
    expect(bucket.confidence).toBe("MEDIUM");
    input.calibrationCandidates[1].normalizedActualImplementation!.amountBasisPoints =
      "1200.5";
    const fractional = evaluation(input).bucketResults[0];
    expect(fractional.medianRatio).toEqual({
      numerator: "5001",
      denominator: "4000",
    });
    expect(fractional.rawRange.expected).toEqual({
      numerator: "15003",
      denominator: "10",
    });
  });

  it("requires five positive consistent observations for HIGH and retains outliers", () => {
    const input = forecastInput();
    input.calibrationCandidates = ["1100", "1200", "1300", "1400", "1500"].map(
      (actual, index) => candidate(String(index), actual),
    );
    expect(evaluation(input).bucketResults[0].confidence).toBe("HIGH");
    expect(evaluation(input).bucketResults[0].roundedRange).toEqual({
      lowBasisPoints: 1400,
      expectedBasisPoints: 1600,
      highBasisPoints: 1800,
    });
    input.calibrationCandidates[4].normalizedActualImplementation!.amountBasisPoints =
      "3000";
    const result = evaluation(input).bucketResults[0];
    expect(result.confidence).toBe("MEDIUM");
    expect(result.includedHistoryCount).toBe(5);
    expect(result.consideredCandidates[4].ratio).toEqual({
      numerator: "3",
      denominator: "1",
    });
  });

  it("classifies every exclusion independently and keeps factual candidates", () => {
    const input = forecastInput();
    const variants = [
      { ...candidate("scope", "1000"), projectId: "other" },
      { ...candidate("repo", "1000"), repositoryId: "other" },
      {
        ...candidate("bucket", "1000"),
        bucket: { ...candidate("b", "1000").bucket, bucketId: "other" },
      },
      { ...candidate("method", "1000"), methodVersion: "other" },
      { ...candidate("config", "1000"), configurationVersion: "other" },
      {
        ...candidate("profile", "1000"),
        bucket: {
          ...candidate("b", "1000").bucket,
          bucketProfileVersion: "other",
        },
        normalizedActualImplementation: {
          ...candidate("b", "1000").normalizedActualImplementation!,
          bucketProfileVersion: "other",
        },
      },
      { ...candidate("partial", "400"), runOutcome: "PARTIAL" as const },
      {
        ...candidate("missing", "1000"),
        normalizedActualImplementation: undefined,
      },
      {
        ...candidate("zero", "1000"),
        originalRange: {
          lowBasisPoints: 0,
          expectedBasisPoints: 0,
          highBasisPoints: 0,
        },
      },
      { ...candidate("old", "1000"), recordedAt: "2026-06-24T11:59:59.999Z" },
      { ...candidate("superseded", "1000"), currentEvidence: false },
    ];
    input.calibrationCandidates = variants;
    const bucket = evaluation(input).bucketResults[0];
    expect(bucket.includedHistoryCount).toBe(0);
    expect(bucket.consideredCandidates).toHaveLength(variants.length);
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "missing",
      )?.reasonIds,
    ).toContain("HISTORY_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE");
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "partial",
      )?.reasonIds,
    ).toContain("HISTORY_NOT_COMPLETED");
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "old",
      )?.reasonIds,
    ).toContain("HISTORY_OUTSIDE_RECENCY");
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "superseded",
      )?.reasonIds,
    ).toContain("HISTORY_SUPERSEDED_OR_INVALID");
    for (const [candidateId, reason] of [
      ["scope", "HISTORY_SCOPE_MISMATCH"],
      ["repo", "HISTORY_SCOPE_MISMATCH"],
      ["bucket", "HISTORY_BUCKET_MISMATCH"],
      ["method", "HISTORY_METHOD_MISMATCH"],
      ["config", "HISTORY_CONFIGURATION_MISMATCH"],
      ["profile", "HISTORY_PROFILE_MISMATCH"],
      ["zero", "HISTORY_ORIGINAL_EXPECTED_UNAVAILABLE"],
    ]) {
      expect(
        bucket.consideredCandidates.find(
          (entry) => entry.candidate.candidateId === candidateId,
        )?.reasonIds,
      ).toContain(reason);
    }
  });

  it("includes exact 90-day boundary but excludes one millisecond older and future evidence", () => {
    const input = forecastInput();
    const boundary = new Date(
      Date.parse(input.evaluationTime) - 90 * 24 * 60 * 60 * 1000,
    ).toISOString();
    input.calibrationCandidates = [
      { ...candidate("exact", "1200"), recordedAt: boundary },
      {
        ...candidate("old", "1200"),
        recordedAt: new Date(Date.parse(boundary) - 1).toISOString(),
      },
      {
        ...candidate("future", "1200"),
        recordedAt: new Date(
          Date.parse(input.evaluationTime) + 1,
        ).toISOString(),
      },
    ];
    const bucket = evaluation(input).bucketResults[0];
    expect(bucket.includedHistoryCount).toBe(1);
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "old",
      )?.reasonIds,
    ).toContain("HISTORY_OUTSIDE_RECENCY");
    expect(
      bucket.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "future",
      )?.reasonIds,
    ).toContain("HISTORY_FUTURE_EVIDENCE");
  });

  it("is deeply repeatable under irrelevant input permutations including Unicode identifiers", () => {
    const input = forecastInput();
    input.workItems = [
      { ...reviewedItem, workItemId: "é" },
      { ...reviewedItem, workItemId: "e\u0301" },
    ];
    input.calibrationCandidates = [
      candidate("é", "1100"),
      candidate("e\u0301", "1300"),
    ];
    const first = evaluation(input);
    const repeated = evaluation(input);
    expect(repeated).toEqual(first);
    input.workItems.reverse();
    input.requiredBuckets.reverse();
    input.requiredBucketAuthority.requiredBucketIds.reverse();
    input.calibrationCandidates.reverse();
    expect(evaluation(input)).toEqual(first);
  });
});

describe("policy projection and full-completion comparison", () => {
  it("maps MEDIUM expected separately from Gate A uncertainty and validates both T003 schemas", () => {
    const projected = projectForecastToPolicyDemandV1(
      evaluation(forecastInput()),
      "five-hour",
    );
    expect(forecastPolicyProjectionSchema.parse(projected)).toEqual(projected);
    expect(projected.kind).toBe("POLICY_DEMAND_EVIDENCE");
    if (projected.kind !== "POLICY_DEMAND_EVIDENCE") return;
    expect(projected.expectedDemand).toEqual({
      amount: "1200",
      unit: "BASIS_POINTS",
    });
    expect(projected.uncertainty).toBe("UNCERTAIN_BUT_BOUNDED");
    expect(
      policyRawQuantitySchema.safeParse(projected.expectedDemand).success,
    ).toBe(true);
    expect(
      policyUncertaintySchema.safeParse(projected.uncertainty).success,
    ).toBe(true);
    // T003 owns this 5/4 adjustment; this multiplication only verifies the documented bridge.
    expect((Number(projected.expectedDemand.amount) * 5) / 4).toBe(1500);
  });

  it("maps HIGH to KNOWN and LOW to UNKNOWN_OR_INVALID without authorization", () => {
    const high = forecastInput();
    high.calibrationCandidates = ["1100", "1200", "1300", "1400", "1500"].map(
      (actual, index) => candidate(String(index), actual),
    );
    const highProjection = projectForecastToPolicyDemandV1(
      evaluation(high),
      "five-hour",
    );
    expect(
      highProjection.kind === "POLICY_DEMAND_EVIDENCE" &&
        highProjection.uncertainty,
    ).toBe("KNOWN");
    const low = forecastInput();
    low.workItems[0].novelty = "UNKNOWN";
    const lowProjection = projectForecastToPolicyDemandV1(
      evaluation(low),
      "five-hour",
    );
    expect(
      lowProjection.kind === "POLICY_DEMAND_EVIDENCE" &&
        lowProjection.uncertainty,
    ).toBe("UNKNOWN_OR_INVALID");
    expect(lowProjection.authorizesWork).toBe(false);
  });

  it("keeps above-cycle demand and returns typed NOT_COMPOSABLE", () => {
    const input = forecastInput();
    input.workItems = Array.from({ length: 12 }, (_, index) => ({
      ...reviewedItem,
      workItemId: `item-${index}`,
    }));
    const forecast = evaluation(input);
    expect(forecast.bucketResults[0].roundedRange.expectedBasisPoints).toBe(
      14400,
    );
    const projection = projectForecastToPolicyDemandV1(forecast, "five-hour");
    expect(projection).toEqual({
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
      reasonId: "PROJECTION_ABOVE_ONE_CYCLE",
      bucketId: "five-hour",
      expectedBasisPoints: 14400,
    });
    expect(forecastPolicyProjectionSchema.parse(projection)).toEqual(
      projection,
    );
    expect(projectForecastToPolicyDemandV1(forecast, "unknown").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });

  it("calculates exact completed signed error, range boundaries and ratio", () => {
    const below = candidate("below", "799.5");
    const comparison = compareForecastWithRunV1(below);
    expect(comparison).toMatchObject({
      kind: "COMPARABLE_FULL_COMPLETION",
      rangeHit: false,
      signedError: {
        sign: "NEGATIVE",
        magnitude: { numerator: "401", denominator: "2" },
      },
      absoluteError: { numerator: "401", denominator: "2" },
      calibrationRatio: { numerator: "1599", denominator: "2000" },
    });
    expect(compareForecastWithRunV1(candidate("low", "800"))).toMatchObject({
      rangeHit: true,
    });
    expect(compareForecastWithRunV1(candidate("high", "1500"))).toMatchObject({
      rangeHit: true,
    });
    expect(
      compareForecastWithRunV1(candidate("above", "1500.001")),
    ).toMatchObject({ rangeHit: false });
  });

  it("retains partial/failed evidence as lower-bound facts, never completion error", () => {
    for (const runOutcome of ["PARTIAL", "FAILED"] as const) {
      expect(
        compareForecastWithRunV1({
          ...candidate(runOutcome, "400"),
          runOutcome,
        }),
      ).toEqual({
        kind: "NOT_COMPARABLE_FULL_COMPLETION",
        evidenceRole: "LOWER_BOUND_ONLY",
        candidateId: runOutcome,
        bucketId: "five-hour",
        runOutcome,
        observedActualBasisPoints: "400",
      });
    }
  });

  it("returns explicit unavailable results for missing, incompatible and zero-expected evidence", () => {
    expect(
      compareForecastWithRunV1({
        ...candidate("missing", "1000"),
        normalizedActualImplementation: undefined,
      }),
    ).toMatchObject({
      kind: "UNAVAILABLE",
      reasonId: "COMPARISON_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE",
    });
    expect(
      compareForecastWithRunV1({ ...candidate("zero", "1000", 0) }),
    ).toMatchObject({
      kind: "UNAVAILABLE",
      reasonId: "COMPARISON_ZERO_EXPECTED",
    });
    expect(
      compareForecastWithRunV1({
        ...candidate("range", "1000"),
        originalRange: undefined,
      }),
    ).toMatchObject({
      kind: "UNAVAILABLE",
      reasonId: "COMPARISON_MISSING_RANGE",
    });
    expect(
      compareForecastWithRunV1({
        ...candidate("amended", "1000"),
        currentEvidence: false,
      }),
    ).toMatchObject({
      kind: "UNAVAILABLE",
      reasonId: "COMPARISON_SUPERSEDED_OR_INVALID",
    });
  });
});
