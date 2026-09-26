import {
  forecastCalibrationCandidateSchema,
  type ForecastCalibrationCandidate,
  type ForecastErrorComparison,
} from "@capacity-governor/contracts";
import { compare, evidence, fraction, parseDecimal } from "./exact";
import { hasCompatibleActual } from "./actual-evidence";

/** Full-completion comparison for one original candidate, never a quality aggregate. */
export const compareForecastWithRunV1 = (
  candidateInput: ForecastCalibrationCandidate,
): ForecastErrorComparison => {
  const candidate = forecastCalibrationCandidateSchema.parse(candidateInput);
  if (!candidate.currentEvidence) {
    return {
      kind: "UNAVAILABLE",
      candidateId: candidate.candidateId,
      bucketId: candidate.bucket.bucketId,
      reasonId: "COMPARISON_SUPERSEDED_OR_INVALID",
    };
  }
  if (!hasCompatibleActual(candidate)) {
    return {
      kind: "UNAVAILABLE",
      candidateId: candidate.candidateId,
      bucketId: candidate.bucket.bucketId,
      reasonId: "COMPARISON_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE",
    };
  }
  const actual = candidate.normalizedActualImplementation!;
  if (candidate.runOutcome !== "COMPLETED") {
    return {
      kind: "NOT_COMPARABLE_FULL_COMPLETION",
      evidenceRole: "LOWER_BOUND_ONLY",
      candidateId: candidate.candidateId,
      bucketId: candidate.bucket.bucketId,
      runOutcome: candidate.runOutcome,
      observedActualBasisPoints: actual.amountBasisPoints,
    };
  }
  const range = candidate.originalRange;
  if (!range)
    return {
      kind: "UNAVAILABLE",
      candidateId: candidate.candidateId,
      bucketId: candidate.bucket.bucketId,
      reasonId: "COMPARISON_MISSING_RANGE",
    };
  if (range.expectedBasisPoints === 0)
    return {
      kind: "UNAVAILABLE",
      candidateId: candidate.candidateId,
      bucketId: candidate.bucket.bucketId,
      reasonId: "COMPARISON_ZERO_EXPECTED",
    };
  const actualFraction = parseDecimal(actual.amountBasisPoints);
  const expected = fraction(BigInt(range.expectedBasisPoints));
  const signComparison = compare(actualFraction, expected);
  const differenceNumerator =
    actualFraction.numerator - expected.numerator * actualFraction.denominator;
  const absoluteError = fraction(
    differenceNumerator < 0n ? -differenceNumerator : differenceNumerator,
    actualFraction.denominator,
  );
  const ratio = fraction(
    actualFraction.numerator,
    actualFraction.denominator * expected.numerator,
  );
  return {
    kind: "COMPARABLE_FULL_COMPLETION",
    candidateId: candidate.candidateId,
    bucketId: candidate.bucket.bucketId,
    actualBasisPoints: actual.amountBasisPoints,
    expectedBasisPoints: range.expectedBasisPoints,
    signedError: {
      sign:
        signComparison < 0
          ? "NEGATIVE"
          : signComparison > 0
            ? "POSITIVE"
            : "ZERO",
      magnitude: evidence(absoluteError),
    },
    absoluteError: evidence(absoluteError),
    rangeHit:
      compare(actualFraction, fraction(BigInt(range.lowBasisPoints))) >= 0 &&
      compare(actualFraction, fraction(BigInt(range.highBasisPoints))) <= 0,
    calibrationRatio: evidence(ratio),
  };
};
