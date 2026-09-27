import type {
  ForecastCalibrationCandidate,
  ForecastEvaluationInput,
} from "@capacity-governor/contracts";
import { GATE_B_V1_CONFIGURATION } from "../src/configuration";

export const reviewedItem = {
  workItemId: "item-a",
  label: "Reviewed application logic",
  category: "APPLICATION_LOGIC",
  complexity: "MEDIUM",
  contextLoad: "MEDIUM",
  repositoryCondition: "STABLE",
  dependencyChange: "EXISTING_ONLY",
  validationBurden: "STANDARD",
  novelty: "SOME_NEW_PATTERN",
  correctionExposure: "MEDIUM",
  reviewedCharacterization: {
    kind: "UPSTREAM_REVIEWED_CHARACTERIZATION",
    scopeTrancheId: "tranche-4",
    source: "manual",
    actorReference: "reviewer-1",
    evidenceReference: "review-1",
    reviewedAt: "2026-09-22T11:00:00.000Z",
  },
} as const;

export const fiveHourBucket = {
  bucketId: "five-hour",
  providerId: "manual-codex",
  capacityWindowId: "five-hour-window",
  resetCycleId: "cycle-current",
  bucketProfileVersion: "gate-b-bucket-profile-v1",
  profileEvidence: {
    status: "COMPLETE",
    evidenceReference: "profile-review-five-hour",
  },
} as const;

export const weeklyBucket = {
  bucketId: "weekly",
  providerId: "manual-codex",
  capacityWindowId: "weekly-window",
  resetCycleId: "cycle-current",
  bucketProfileVersion: "gate-b-bucket-profile-v1",
  profileEvidence: {
    status: "COMPLETE",
    evidenceReference: "profile-review-weekly",
  },
} as const;

export const forecastInput = (): ForecastEvaluationInput => ({
  scopeTrancheId: "tranche-4",
  projectId: "project-1",
  repositoryId: "repo-1",
  evaluationTime: "2026-09-23T12:00:00.000Z",
  configuration: JSON.parse(JSON.stringify(GATE_B_V1_CONFIGURATION)),
  requiredBucketAuthority: {
    kind: "UPSTREAM_TRUSTED_BOUNDARY",
    scopeTrancheId: "tranche-4",
    projectId: "project-1",
    repositoryId: "repo-1",
    actorReference: "reviewer-1",
    recordedAt: "2026-09-22T11:00:00.000Z",
    evidenceReference: "bucket-review-1",
    requiredBucketIds: ["five-hour", "weekly"],
  },
  workItems: [{ ...reviewedItem }],
  requiredBuckets: [{ ...fiveHourBucket }, { ...weeklyBucket }],
  calibrationCandidates: [],
});

export const candidate = (
  candidateId: string,
  actual: string,
  expected = 1_000,
): ForecastCalibrationCandidate => ({
  candidateId,
  runId: `run-${candidateId}`,
  projectId: "project-1",
  repositoryId: "repo-1",
  bucket: {
    bucketId: fiveHourBucket.bucketId,
    providerId: fiveHourBucket.providerId,
    capacityWindowId: fiveHourBucket.capacityWindowId,
    resetCycleId: `historical-${candidateId}`,
    bucketProfileVersion: fiveHourBucket.bucketProfileVersion,
  },
  methodVersion: "gate-b-v1",
  configurationVersion: "gate-b-v1",
  originalRange: {
    lowBasisPoints: Math.min(800, expected),
    expectedBasisPoints: expected,
    highBasisPoints: Math.max(1_500, expected),
  },
  runOutcome: "COMPLETED",
  normalizedActualImplementation: {
    category: "IMPLEMENTATION",
    amountBasisPoints: actual,
    bucketId: "five-hour",
    bucketProfileVersion: "gate-b-bucket-profile-v1",
    reviewedNormalizationReference: `normalized-${candidateId}`,
  },
  recordedAt: "2026-09-22T12:00:00.000Z",
  currentEvidence: true,
  evidenceReference: `observation-${candidateId}`,
});
