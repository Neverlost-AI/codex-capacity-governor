import type { GateBV1Configuration } from "@capacity-governor/contracts";

/** Decision 0003's complete injected V1 method. A different value is a new policy decision. */
export const GATE_B_V1_CONFIGURATION = {
  methodVersion: "gate-b-v1",
  configurationVersion: "gate-b-v1",
  bucketProfileVersion: "gate-b-bucket-profile-v1",
  categoryBase: {
    DOCUMENTATION_CONFIG: 1,
    TESTING_ONLY: 2,
    FRONTEND_UI: 3,
    APPLICATION_LOGIC: 4,
    DATA_PERSISTENCE: 5,
    INTEGRATION: 6,
    REFACTOR_ARCHITECTURE: 7,
  },
  complexity: { LOW: 0, MEDIUM: 2, HIGH: 4, UNKNOWN: 4 },
  contextLoad: { SMALL: 0, MEDIUM: 1, LARGE: 2, UNKNOWN: 2 },
  repositoryCondition: { STABLE: 0, MIXED: 1, UNFAMILIAR: 2, UNKNOWN: 2 },
  dependencyChange: {
    NONE: 0,
    EXISTING_ONLY: 1,
    NEW_OR_CHANGED: 3,
    UNKNOWN: 3,
  },
  validationBurden: { LIGHT: 0, STANDARD: 1, EXTENSIVE: 2, UNKNOWN: 2 },
  novelty: { FAMILIAR: 0, SOME_NEW_PATTERN: 2, HIGH_NOVELTY: 4, UNKNOWN: 4 },
  correctionExposure: { LOW: 0, MEDIUM: 1, HIGH: 3, UNKNOWN: 3 },
  basisPointsPerWorkPoint: 100,
  gateAV1MaximumDemandBasisPoints: 10_000,
  publicPrecisionBasisPoints: 100,
  rangeMultipliers: {
    HIGH: {
      low: { numerator: 9, denominator: 10 },
      expected: { numerator: 1, denominator: 1 },
      high: { numerator: 11, denominator: 10 },
    },
    MEDIUM: {
      low: { numerator: 3, denominator: 4 },
      expected: { numerator: 1, denominator: 1 },
      high: { numerator: 5, denominator: 4 },
    },
    LOW: {
      low: { numerator: 1, denominator: 2 },
      expected: { numerator: 1, denominator: 1 },
      high: { numerator: 3, denominator: 2 },
    },
  },
  minimumCalibrationHistory: 3,
  minimumHighConfidenceHistory: 5,
  historyRecencyDays: 90,
  ratioConsistencyFactor: 2,
  confidenceRestrictivenessOrder: ["HIGH", "MEDIUM", "LOW"],
} as const satisfies GateBV1Configuration;
