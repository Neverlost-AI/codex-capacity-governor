import type { ForecastEvaluation } from "@capacity-governor/contracts";
import { evaluateForecastV1 } from "./forecast";
import { codeUnitCompare } from "./exact";

const canonicalObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalObject);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort(codeUnitCompare)
      .map((key) => [
        key,
        canonicalObject((value as Record<string, unknown>)[key]),
      ]),
  );
};

/** Replay the one authoritative forecast calculation, not duplicated confidence/range rules.
 * This checks internal evidence consistency, not authenticity of upstream review claims.
 * Each bucket must retain the same complete candidate set and canonical output arrays.
 */
export const isConsistentForecastV1 = (
  forecast: ForecastEvaluation,
): boolean => {
  const reproduced = evaluateForecastV1({
    scopeTrancheId: forecast.scopeTrancheId,
    projectId: forecast.projectId,
    repositoryId: forecast.repositoryId,
    evaluationTime: forecast.evaluationTime,
    configuration: forecast.configuration,
    requiredBucketAuthority: forecast.requiredBucketAuthority,
    workItems: forecast.scoredItems.map((item) => item.workItem),
    requiredBuckets: forecast.bucketResults.map((result) => result.bucket),
    calibrationCandidates: forecast.bucketResults[0].consideredCandidates.map(
      (entry) => entry.candidate,
    ),
  });
  return (
    reproduced.kind === "FORECAST_EVALUATION" &&
    JSON.stringify(canonicalObject(reproduced)) ===
      JSON.stringify(canonicalObject(forecast))
  );
};
