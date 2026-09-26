import { describe, expect, it } from "vitest";
import {
  forecastEvaluationInputSchema,
  forecastEvaluationSchema,
  forecastErrorComparisonSchema,
  type ForecastCalibrationCandidate,
  type ForecastEvaluation,
  type ForecastEvaluationInput,
} from "@capacity-governor/contracts";
import {
  compareForecastWithRunV1,
  evaluateForecastV1,
  projectForecastToPolicyDemandV1,
} from "../src/index";
import { candidate, forecastInput, reviewedItem } from "./fixtures";

const evaluate = (input = forecastInput()): ForecastEvaluation => {
  const result = evaluateForecastV1(input);
  if (result.kind !== "FORECAST_EVALUATION")
    throw new Error(JSON.stringify(result));
  return result;
};
const mutable = (forecast: ForecastEvaluation): ForecastEvaluation =>
  JSON.parse(JSON.stringify(forecast));
const fiveDistinct = (): ForecastEvaluationInput => {
  const input = forecastInput();
  input.calibrationCandidates = Array.from({ length: 5 }, (_, index) =>
    candidate(`distinct-${index}`, "1200"),
  );
  return input;
};

describe("review blocker 1: independent historical observations", () => {
  it.each(["runId", "evidenceReference"] as const)(
    "rejects five candidate aliases sharing %s, even across claimed historical reset cycles",
    (identity) => {
      const input = fiveDistinct();
      input.calibrationCandidates.forEach((entry) => {
        entry[identity] = "same-observation";
      });
      expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(
        false,
      );
      const result = evaluateForecastV1(input);
      expect(result.kind).toBe("INPUT_REJECTION");
      expect(result.authorizesWork).toBe(false);
    },
  );
  it("allows five genuinely distinct eligible observations to produce HIGH", () => {
    const result = evaluate(fiveDistinct());
    expect(result.bucketResults[0].includedHistoryCount).toBe(5);
    expect(result.bucketResults[0].confidence).toBe("HIGH");
  });
  it("allows one run/evidence to describe independent five-hour and weekly buckets", () => {
    const input = forecastInput();
    const first = candidate("five-hour-observation", "1200");
    const second = candidate("weekly-observation", "900");
    second.runId = first.runId;
    second.evidenceReference = first.evidenceReference;
    const weekly = input.requiredBuckets[1];
    second.bucket = {
      bucketId: weekly.bucketId,
      providerId: weekly.providerId,
      capacityWindowId: weekly.capacityWindowId,
      bucketProfileVersion: weekly.bucketProfileVersion,
      resetCycleId: "historical-weekly",
    };
    second.normalizedActualImplementation!.bucketId = "weekly";
    input.calibrationCandidates = [first, second];
    expect(
      evaluate(input).bucketResults.map(
        (bucket) => bucket.includedHistoryCount,
      ),
    ).toEqual([1, 1]);
  });
  it("cannot hide aliases by changing the presentation bucket ID or profile", () => {
    const input = forecastInput();
    const first = candidate("first", "1200");
    const alias = candidate("alias", "1200");
    alias.runId = first.runId;
    alias.bucket.bucketId = "different-label";
    alias.bucket.bucketProfileVersion = "older-profile";
    input.calibrationCandidates = [first, alias];
    expect(evaluateForecastV1(input).kind).toBe("INPUT_REJECTION");
  });
  it("retains a superseded observation and its distinct current amendment without counting both", () => {
    const input = forecastInput();
    const current = candidate("current", "1200");
    const original = {
      ...candidate("original", "1100"),
      runId: current.runId,
      currentEvidence: false,
    };
    input.calibrationCandidates = [original, current];
    const result = evaluate(input).bucketResults[0];
    expect(result.includedHistoryCount).toBe(1);
    expect(
      result.consideredCandidates.find(
        (entry) => entry.candidate.candidateId === "original",
      )?.reasonIds,
    ).toContain("HISTORY_SUPERSEDED_OR_INVALID");
    expect(result.confidence).toBe("MEDIUM");
  });
});

describe("review blocker 2: projection semantic consistency", () => {
  it("rejects the structurally valid zero-history MEDIUM forecast relabeled HIGH", () => {
    const forecast = mutable(evaluate());
    forecast.bucketResults[0].confidence = "HIGH";
    expect(forecastEvaluationSchema.safeParse(forecast).success).toBe(true);
    expect(
      projectForecastToPolicyDemandV1(forecast, "five-hour"),
    ).toMatchObject({
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
    });
  });
  it.each([
    [
      "overall confidence",
      (forecast: ForecastEvaluation) => {
        forecast.overallConfidence = "HIGH";
      },
    ],
    [
      "rounded range",
      (forecast: ForecastEvaluation) => {
        forecast.bucketResults[0].roundedRange.highBasisPoints += 100;
      },
    ],
    [
      "raw range",
      (forecast: ForecastEvaluation) => {
        forecast.bucketResults[0].rawRange.high.numerator = "1501";
      },
    ],
    [
      "item score",
      (forecast: ForecastEvaluation) => {
        forecast.scoredItems[0].itemScore += 1;
      },
    ],
    [
      "unknown evidence",
      (forecast: ForecastEvaluation) => {
        forecast.bucketResults[0].unknowns.push(
          "UNKNOWN_FACTOR:item-a:novelty",
        );
      },
    ],
  ] as const)("rejects contradictory %s", (_label, mutate) => {
    const forecast = mutable(evaluate());
    mutate(forecast);
    expect(forecastEvaluationSchema.safeParse(forecast).success).toBe(true);
    expect(projectForecastToPolicyDemandV1(forecast, "five-hour").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });
  it("rejects UNKNOWN characterization promoted to MEDIUM even with its evidence lists hidden", () => {
    const input = forecastInput();
    input.workItems[0].novelty = "UNKNOWN";
    const forecast = mutable(evaluate(input));
    forecast.bucketResults.forEach((bucket) => {
      bucket.confidence = "MEDIUM";
      bucket.unknowns = [];
    });
    forecast.overallConfidence = "MEDIUM";
    forecast.unknowns = [];
    expect(projectForecastToPolicyDemandV1(forecast, "five-hour").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });
  it("rejects a forged HIGH history set made from aliases", () => {
    const forecast = mutable(evaluate(fiveDistinct()));
    forecast.bucketResults.forEach((bucket) =>
      bucket.consideredCandidates.forEach((entry) => {
        entry.candidate.runId = "same-run";
      }),
    );
    expect(projectForecastToPolicyDemandV1(forecast, "five-hour").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });
  it("rejects tampered included ratios even when counts and structural schema still agree", () => {
    const forecast = mutable(evaluate(fiveDistinct()));
    forecast.bucketResults[0].consideredCandidates[0].ratio = {
      numerator: "9",
      denominator: "1",
    };
    expect(forecastEvaluationSchema.safeParse(forecast).success).toBe(true);
    expect(projectForecastToPolicyDemandV1(forecast, "five-hour").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });
  it.each(["HIGH", "MEDIUM", "LOW"] as const)(
    "preserves genuine %s projection",
    (confidence) => {
      const input = confidence === "HIGH" ? fiveDistinct() : forecastInput();
      if (confidence === "LOW") input.workItems[0].novelty = "UNKNOWN";
      const forecast = evaluate(input);
      const result = projectForecastToPolicyDemandV1(forecast, "five-hour");
      expect(result).toMatchObject({
        kind: "POLICY_DEMAND_EVIDENCE",
        confidence,
      });
    },
  );
  it("ignores object-key insertion order but requires canonical array evidence", () => {
    const forecast = evaluate();
    const reordered = Object.fromEntries(Object.entries(forecast).reverse());
    expect(projectForecastToPolicyDemandV1(reordered, "five-hour").kind).toBe(
      "POLICY_DEMAND_EVIDENCE",
    );
  });
});

describe("review blocker 3: actual validity precedes lower-bound classification", () => {
  it.each(["PARTIAL", "FAILED"] as const)(
    "requires presence, currency and compatibility for %s",
    (runOutcome) => {
      const valid = { ...candidate(runOutcome, "400"), runOutcome };
      const invalid: ForecastCalibrationCandidate[] = [
        { ...valid, normalizedActualImplementation: undefined },
        { ...valid, currentEvidence: false },
        {
          ...valid,
          normalizedActualImplementation: {
            ...valid.normalizedActualImplementation!,
            bucketId: "other",
          },
        },
        {
          ...valid,
          normalizedActualImplementation: {
            ...valid.normalizedActualImplementation!,
            bucketProfileVersion: "other",
          },
        },
      ];
      for (const entry of invalid) {
        const result = compareForecastWithRunV1(entry);
        expect(result.kind).toBe("UNAVAILABLE");
        expect("observedActualBasisPoints" in result).toBe(false);
        expect(forecastErrorComparisonSchema.safeParse(result).success).toBe(
          true,
        );
      }
      const result = compareForecastWithRunV1({
        ...valid,
        originalRange: undefined,
      });
      expect(result).toMatchObject({
        kind: "NOT_COMPARABLE_FULL_COMPLETION",
        evidenceRole: "LOWER_BOUND_ONLY",
        observedActualBasisPoints: "400",
      });
    },
  );
  it("does not permit a lower-bound outcome without observed actual consumption", () => {
    expect(
      forecastErrorComparisonSchema.safeParse({
        kind: "NOT_COMPARABLE_FULL_COMPLETION",
        evidenceRole: "LOWER_BOUND_ONLY",
        candidateId: "partial",
        bucketId: "five-hour",
        runOutcome: "PARTIAL",
      }).success,
    ).toBe(false);
  });
});

describe("review blocker 4: composite required bucket identity", () => {
  it("rejects identical provider/window/reset tuples with different bucket IDs", () => {
    const input = forecastInput();
    input.requiredBuckets[1] = {
      ...input.requiredBuckets[0],
      bucketId: "weekly",
    };
    expect(forecastEvaluationInputSchema.safeParse(input).success).toBe(false);
    expect(evaluateForecastV1(input).kind).toBe("INPUT_REJECTION");
    const forged = mutable(evaluate());
    forged.bucketResults[1].bucket = {
      ...forged.bucketResults[0].bucket,
      bucketId: "weekly",
    };
    expect(projectForecastToPolicyDemandV1(forged, "five-hour").kind).toBe(
      "NOT_COMPOSABLE",
    );
  });
  it.each(["providerId", "capacityWindowId", "resetCycleId"] as const)(
    "allows distinct %s in a required-bucket tuple",
    (field) => {
      const input = forecastInput();
      input.requiredBuckets[1] = {
        ...input.requiredBuckets[0],
        bucketId: "weekly",
        [field]: "different",
      };
      expect(evaluate(input).bucketResults).toHaveLength(2);
    },
  );
  it("preserves historical reset-cycle compatibility rather than requiring the current cycle", () => {
    const input = forecastInput();
    input.calibrationCandidates = [candidate("prior-cycle", "1200")];
    expect(input.calibrationCandidates[0].bucket.resetCycleId).not.toBe(
      input.requiredBuckets[0].resetCycleId,
    );
    expect(evaluate(input).bucketResults[0].includedHistoryCount).toBe(1);
  });
});

it("preserves the four reviewed arithmetic examples", () => {
  const cold = forecastInput();
  expect(evaluate(cold).bucketResults[0].roundedRange).toEqual({
    lowBasisPoints: 900,
    expectedBasisPoints: 1200,
    highBasisPoints: 1500,
  });
  const history = forecastInput();
  history.calibrationCandidates = [
    candidate("a", "1100"),
    candidate("b", "1250"),
    candidate("c", "1400"),
  ];
  expect(evaluate(history).bucketResults[0].roundedRange).toEqual({
    lowBasisPoints: 1100,
    expectedBasisPoints: 1500,
    highBasisPoints: 1900,
  });
  const unknown = forecastInput();
  unknown.workItems[0].novelty = "UNKNOWN";
  expect(evaluate(unknown).bucketResults[0].roundedRange).toEqual({
    lowBasisPoints: 700,
    expectedBasisPoints: 1400,
    highBasisPoints: 2100,
  });
  const above = forecastInput();
  above.workItems = Array.from({ length: 12 }, (_, index) => ({
    ...reviewedItem,
    workItemId: `item-${index}`,
  }));
  expect(
    evaluate(above).bucketResults[0].roundedRange.expectedBasisPoints,
  ).toBe(14400);
});
