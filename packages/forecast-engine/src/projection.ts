import {
  forecastEvaluationSchema,
  policyRawQuantitySchema,
  policyUncertaintySchema,
  type ForecastPolicyProjection,
} from "@capacity-governor/contracts";
import { isConsistentForecastV1 } from "./validation";

/** Forms demand/uncertainty evidence only; Gate A alone decides authorization. */
export const projectForecastToPolicyDemandV1 = (
  forecast: unknown,
  bucketId: string,
): ForecastPolicyProjection => {
  const parsed = forecastEvaluationSchema.safeParse(forecast);
  if (!parsed.success || !bucketId || !isConsistentForecastV1(parsed.data)) {
    return {
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
      reasonId: "PROJECTION_INVALID_FORECAST",
      bucketId: bucketId || "<missing>",
    };
  }
  const bucketResult = parsed.data.bucketResults.find(
    (result) => result.bucket.bucketId === bucketId,
  );
  if (!bucketResult)
    return {
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
      reasonId: "PROJECTION_BUCKET_NOT_FOUND",
      bucketId,
    };
  const expectedBasisPoints = bucketResult.roundedRange.expectedBasisPoints;
  if (
    expectedBasisPoints >
    parsed.data.configuration.gateAV1MaximumDemandBasisPoints
  ) {
    return {
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
      reasonId: "PROJECTION_ABOVE_ONE_CYCLE",
      bucketId,
      expectedBasisPoints,
    };
  }
  const uncertainty =
    bucketResult.confidence === "HIGH"
      ? "KNOWN"
      : bucketResult.confidence === "MEDIUM"
        ? "UNCERTAIN_BUT_BOUNDED"
        : "UNKNOWN_OR_INVALID";
  const expectedDemand = {
    amount: String(expectedBasisPoints),
    unit: "BASIS_POINTS" as const,
  };
  // The actual T003 boundary is authoritative for composability, not a duplicate shape.
  if (
    !policyRawQuantitySchema.safeParse(expectedDemand).success ||
    !policyUncertaintySchema.safeParse(uncertainty).success
  ) {
    return {
      kind: "NOT_COMPOSABLE",
      authorizesWork: false,
      reasonId: "PROJECTION_INVALID_FORECAST",
      bucketId,
      expectedBasisPoints,
    };
  }
  return {
    kind: "POLICY_DEMAND_EVIDENCE",
    authorizesWork: false,
    bucket: bucketResult.bucket,
    scopeTrancheId: parsed.data.scopeTrancheId,
    expectedDemand,
    uncertainty,
    confidence: bucketResult.confidence,
    planningRange: bucketResult.roundedRange,
    methodVersion: parsed.data.configuration.methodVersion,
    configurationVersion: parsed.data.configuration.configurationVersion,
    requiredBucketAuthority: parsed.data.requiredBucketAuthority,
  };
};
