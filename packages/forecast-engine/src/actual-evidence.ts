import type { ForecastCalibrationCandidate } from "@capacity-governor/contracts";

/** Review/currency evidence is supplied upstream; no raw-unit inference occurs here. */
export const hasCompatibleActual = (
  candidate: ForecastCalibrationCandidate,
): boolean => {
  const actual = candidate.normalizedActualImplementation;
  return (
    actual !== undefined &&
    actual.bucketId === candidate.bucket.bucketId &&
    actual.bucketProfileVersion === candidate.bucket.bucketProfileVersion
  );
};
