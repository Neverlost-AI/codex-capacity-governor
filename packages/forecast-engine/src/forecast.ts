import {
  forecastEvaluationInputSchema,
  type ForecastBucket,
  type ForecastBucketResult,
  type ForecastCalibrationCandidate,
  type ForecastConfidence,
  type ForecastEvaluation,
  type ForecastEvaluationInput,
  type ForecastEvaluationOutcome,
  type ForecastWorkItem,
} from "@capacity-governor/contracts";
import {
  add,
  codeUnitCompare,
  compare,
  divide,
  evidence,
  ExactArithmeticError,
  fraction,
  multiply,
  parseDecimal,
  roundToPrecision,
  safeInteger,
  type Fraction,
} from "./exact";
import { hasCompatibleActual } from "./actual-evidence";

const factorNames = [
  "complexity",
  "contextLoad",
  "repositoryCondition",
  "dependencyChange",
  "validationBurden",
  "novelty",
  "correctionExposure",
] as const;

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
};

const issuePath = (path: PropertyKey[]): Array<string | number> =>
  path.map((part) => (typeof part === "symbol" ? part.toString() : part));

const rejection = (
  input: unknown,
  issues: Array<{
    id: string;
    path: Array<string | number>;
    received?: string | number | boolean | null;
  }>,
): ForecastEvaluationOutcome => {
  const scopeTrancheId =
    typeof input === "object" &&
    input !== null &&
    "scopeTrancheId" in input &&
    typeof input.scopeTrancheId === "string"
      ? input.scopeTrancheId
      : undefined;
  return deepFreeze({
    kind: "INPUT_REJECTION",
    authorizesWork: false,
    ...(scopeTrancheId === undefined ? {} : { scopeTrancheId }),
    issues: issues.sort(
      (left, right) =>
        codeUnitCompare(
          JSON.stringify(left.path),
          JSON.stringify(right.path),
        ) || codeUnitCompare(left.id, right.id),
    ),
  });
};

const inputIssue = (
  id: string,
  path: Array<string | number>,
  received?: string | number | boolean | null,
) => ({ id, path, ...(received === undefined ? {} : { received }) });

const safeReceivedScalar = (
  input: unknown,
  path: Array<string | number>,
): string | number | boolean | null | undefined => {
  const safeFields = new Set<string>([
    "category",
    ...factorNames,
    "bucketId",
    "bucketProfileVersion",
    "methodVersion",
    "configurationVersion",
    "evaluationTime",
    "recordedAt",
  ]);
  if (!safeFields.has(String(path[path.length - 1]))) return undefined;
  let value = input;
  for (const part of path) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<string | number, unknown>)[part];
  }
  if (typeof value === "string") return value.length <= 128 ? value : undefined;
  if (typeof value === "number")
    return Number.isFinite(value) ? value : undefined;
  return typeof value === "boolean" || value === null ? value : undefined;
};

const validInput = (
  input: unknown,
): ForecastEvaluationInput | ForecastEvaluationOutcome => {
  const parsed = forecastEvaluationInputSchema.safeParse(input);
  if (!parsed.success) {
    return rejection(
      input,
      parsed.error.issues.map((issue) => {
        const id =
          issue.code === "custom" && issue.message.startsWith("INPUT_")
            ? issue.message
            : issue.code === "invalid_type"
              ? "INPUT_INVALID_TYPE"
              : issue.code === "invalid_format"
                ? "INPUT_INVALID_FORMAT"
                : issue.code === "unrecognized_keys"
                  ? "INPUT_UNRECOGNIZED_KEY"
                  : "INPUT_INVALID_VALUE";
        const path = issuePath(issue.path);
        return inputIssue(id, path, safeReceivedScalar(input, path));
      }),
    );
  }
  return parsed.data;
};

const sameBucketClass = (
  candidate: Pick<
    ForecastBucket,
    "bucketId" | "providerId" | "capacityWindowId"
  >,
  required: ForecastBucket,
): boolean =>
  candidate.bucketId === required.bucketId &&
  candidate.providerId === required.providerId &&
  candidate.capacityWindowId === required.capacityWindowId;

const reasonsFor = (
  candidate: ForecastCalibrationCandidate,
  bucket: ForecastBucket,
  input: ForecastEvaluationInput,
): string[] => {
  const reasons: string[] = [];
  if (
    candidate.projectId !== input.projectId ||
    candidate.repositoryId !== input.repositoryId
  )
    reasons.push("HISTORY_SCOPE_MISMATCH");
  if (!sameBucketClass(candidate.bucket, bucket))
    reasons.push("HISTORY_BUCKET_MISMATCH");
  if (candidate.methodVersion !== input.configuration.methodVersion)
    reasons.push("HISTORY_METHOD_MISMATCH");
  if (
    candidate.configurationVersion !== input.configuration.configurationVersion
  )
    reasons.push("HISTORY_CONFIGURATION_MISMATCH");
  if (candidate.bucket.bucketProfileVersion !== bucket.bucketProfileVersion)
    reasons.push("HISTORY_PROFILE_MISMATCH");
  if (candidate.runOutcome !== "COMPLETED")
    reasons.push("HISTORY_NOT_COMPLETED");
  if (!hasCompatibleActual(candidate))
    reasons.push("HISTORY_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE");
  if (
    !candidate.originalRange ||
    candidate.originalRange.expectedBasisPoints === 0
  )
    reasons.push("HISTORY_ORIGINAL_EXPECTED_UNAVAILABLE");
  const age =
    Date.parse(input.evaluationTime) - Date.parse(candidate.recordedAt);
  if (age < 0) reasons.push("HISTORY_FUTURE_EVIDENCE");
  if (age > input.configuration.historyRecencyDays * 24 * 60 * 60 * 1000)
    reasons.push("HISTORY_OUTSIDE_RECENCY");
  if (!candidate.currentEvidence) reasons.push("HISTORY_SUPERSEDED_OR_INVALID");
  return reasons.sort(codeUnitCompare);
};

const historyFor = (bucket: ForecastBucket, input: ForecastEvaluationInput) => {
  const consideredCandidates = [...input.calibrationCandidates]
    .sort((left, right) => codeUnitCompare(left.candidateId, right.candidateId))
    .map((candidate) => {
      const reasonIds = reasonsFor(candidate, bucket, input);
      if (reasonIds.length !== 0)
        return { candidate, included: false as const, reasonIds };
      const ratio = divide(
        parseDecimal(
          candidate.normalizedActualImplementation!.amountBasisPoints,
        ),
        fraction(BigInt(candidate.originalRange!.expectedBasisPoints)),
      );
      return {
        candidate,
        included: true as const,
        reasonIds,
        ratio: evidence(ratio),
      };
    });
  const ratios = consideredCandidates.flatMap((entry) =>
    entry.included
      ? [
          fraction(
            BigInt(entry.ratio.numerator),
            BigInt(entry.ratio.denominator),
          ),
        ]
      : [],
  );
  ratios.sort(compare);
  const middle = Math.floor(ratios.length / 2);
  const median =
    ratios.length < input.configuration.minimumCalibrationHistory
      ? undefined
      : ratios.length % 2 === 1
        ? ratios[middle]
        : divide(add(ratios[middle - 1], ratios[middle]), fraction(2n));
  return { consideredCandidates, ratios, median };
};

const confidenceFor = (
  unknowns: string[],
  ratios: Fraction[],
  minimumHigh: number,
  consistency: number,
): ForecastConfidence => {
  if (unknowns.length !== 0) return "LOW";
  if (ratios.length < minimumHigh) return "MEDIUM";
  const minimum = ratios[0];
  const maximum = ratios[ratios.length - 1];
  return minimum.numerator > 0n &&
    compare(maximum, multiply(minimum, fraction(BigInt(consistency)))) <= 0
    ? "HIGH"
    : "MEDIUM";
};

const scoreItems = (input: ForecastEvaluationInput) => {
  const unknowns: string[] = [];
  const scoredItems = [...input.workItems]
    .sort((left, right) => codeUnitCompare(left.workItemId, right.workItemId))
    .map((workItem: ForecastWorkItem) => {
      const factorAdders = {
        complexity: input.configuration.complexity[workItem.complexity],
        contextLoad: input.configuration.contextLoad[workItem.contextLoad],
        repositoryCondition:
          input.configuration.repositoryCondition[workItem.repositoryCondition],
        dependencyChange:
          input.configuration.dependencyChange[workItem.dependencyChange],
        validationBurden:
          input.configuration.validationBurden[workItem.validationBurden],
        novelty: input.configuration.novelty[workItem.novelty],
        correctionExposure:
          input.configuration.correctionExposure[workItem.correctionExposure],
      };
      factorNames.forEach((name) => {
        if (workItem[name] === "UNKNOWN")
          unknowns.push(`UNKNOWN_FACTOR:${workItem.workItemId}:${name}`);
      });
      const categoryBase = input.configuration.categoryBase[workItem.category];
      const itemScore = safeInteger(
        BigInt(categoryBase) +
          Object.values(factorAdders).reduce(
            (sum, value) => sum + BigInt(value),
            0n,
          ),
      );
      return { workItem, categoryBase, factorAdders, itemScore };
    });
  const totalWorkScore = safeInteger(
    scoredItems.reduce((sum, item) => sum + BigInt(item.itemScore), 0n),
  );
  return { scoredItems, totalWorkScore, unknowns };
};

const rangeFor = (
  expected: Fraction,
  confidence: ForecastConfidence,
  input: ForecastEvaluationInput,
) => {
  const multipliers = input.configuration.rangeMultipliers[confidence];
  const low = multiply(
    expected,
    fraction(
      BigInt(multipliers.low.numerator),
      BigInt(multipliers.low.denominator),
    ),
  );
  const high = multiply(
    expected,
    fraction(
      BigInt(multipliers.high.numerator),
      BigInt(multipliers.high.denominator),
    ),
  );
  const precision = input.configuration.publicPrecisionBasisPoints;
  return {
    rawRange: {
      low: evidence(low),
      expected: evidence(expected),
      high: evidence(high),
    },
    roundedRange: {
      lowBasisPoints: roundToPrecision(low, precision, "DOWN"),
      expectedBasisPoints: roundToPrecision(expected, precision, "UP"),
      highBasisPoints: roundToPrecision(high, precision, "UP"),
    },
  };
};

const evaluateBucket = (
  bucket: ForecastBucket,
  input: ForecastEvaluationInput,
  score: ReturnType<typeof scoreItems>,
): ForecastBucketResult => {
  const baseline = fraction(
    BigInt(score.totalWorkScore) *
      BigInt(input.configuration.basisPointsPerWorkPoint),
  );
  const history = historyFor(bucket, input);
  const adjustedExpected = history.median
    ? multiply(baseline, history.median)
    : baseline;
  const profileUnknowns =
    bucket.profileEvidence.status === "ACCEPTED_INCOMPLETE"
      ? [
          `INCOMPLETE_PROFILE:${bucket.bucketId}:${bucket.profileEvidence.evidenceReference}`,
        ]
      : [];
  const confidence = confidenceFor(
    [...score.unknowns, ...profileUnknowns],
    history.ratios,
    input.configuration.minimumHighConfidenceHistory,
    input.configuration.ratioConsistencyFactor,
  );
  const assumptions = [
    "ASSUMPTION_V1_WORK_POINT_SCALE",
    `ASSUMPTION_RANGE_BAND_${confidence}`,
    `ASSUMPTION_PROFILE_${bucket.bucketProfileVersion}`,
    history.median
      ? "ASSUMPTION_MEDIAN_HISTORY_ADJUSTMENT"
      : "ASSUMPTION_COLD_START_BASELINE",
  ];
  const unknowns = [
    ...score.unknowns,
    ...profileUnknowns,
    ...history.consideredCandidates.flatMap((entry) =>
      entry.reasonIds.map(
        (reason) => `${reason}:${entry.candidate.candidateId}`,
      ),
    ),
  ].sort(codeUnitCompare);
  return {
    bucket,
    baselineExpected: evidence(baseline),
    consideredCandidates: history.consideredCandidates,
    includedHistoryCount: history.ratios.length,
    ...(history.median ? { medianRatio: evidence(history.median) } : {}),
    adjustedExpected: evidence(adjustedExpected),
    confidence,
    ...rangeFor(adjustedExpected, confidence, input),
    assumptions,
    unknowns,
  };
};

/** Pure, non-authorizing Gate B V1 forecast. No system time, IO, or policy evaluation. */
export const evaluateForecastV1 = (
  rawInput: unknown,
): ForecastEvaluationOutcome => {
  const input = validInput(rawInput);
  if ("kind" in input) return input;
  try {
    const score = scoreItems(input);
    const bucketResults = [...input.requiredBuckets]
      .sort((left, right) => codeUnitCompare(left.bucketId, right.bucketId))
      .map((bucket) => evaluateBucket(bucket, input, score));
    const overallConfidence =
      input.configuration.confidenceRestrictivenessOrder[
        Math.max(
          ...bucketResults.map((result) =>
            input.configuration.confidenceRestrictivenessOrder.indexOf(
              result.confidence,
            ),
          ),
        )
      ];
    const result: ForecastEvaluation = {
      kind: "FORECAST_EVALUATION",
      authorizesWork: false,
      scopeTrancheId: input.scopeTrancheId,
      projectId: input.projectId,
      repositoryId: input.repositoryId,
      evaluationTime: input.evaluationTime,
      configuration: input.configuration,
      requiredBucketAuthority: {
        ...input.requiredBucketAuthority,
        requiredBucketIds: [
          ...input.requiredBucketAuthority.requiredBucketIds,
        ].sort(codeUnitCompare),
      },
      scoredItems: score.scoredItems,
      totalWorkScore: score.totalWorkScore,
      bucketResults,
      overallConfidence,
      assumptions: [
        ...new Set(bucketResults.flatMap((bucket) => bucket.assumptions)),
      ].sort(codeUnitCompare),
      unknowns: [
        ...new Set(bucketResults.flatMap((bucket) => bucket.unknowns)),
      ].sort(codeUnitCompare),
    };
    return deepFreeze(result);
  } catch (error) {
    if (error instanceof ExactArithmeticError) {
      return rejection(rawInput, [inputIssue(`INPUT_${error.id}`, [])]);
    }
    throw error;
  }
};
