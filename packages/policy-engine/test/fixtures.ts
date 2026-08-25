import type {
  PolicyEvaluationInput,
  RequiredCapacityBucket,
} from "@capacity-governor/contracts";
import { GATE_A_V1_CONFIGURATION } from "../src/index";

export const EVALUATION_TIME = "2026-08-25T12:00:00.000Z";

export const quantity = (
  amount: string,
  unit: "BASIS_POINTS" | "PERCENT" | "NORMALIZED_FRACTION" = "BASIS_POINTS",
) => ({ amount, unit });

export const makeBucket = (
  bucketId: string,
  overrides: Partial<RequiredCapacityBucket> = {},
): RequiredCapacityBucket => ({
  bucketId,
  providerId: "manual-codex",
  capacityWindowId: `${bucketId}-window`,
  resetCycleId: `${bucketId}-cycle`,
  availableCapacity: quantity("8000"),
  observedAt: "2026-08-25T11:50:00.000Z",
  reset: { kind: "NONE" },
  correctionReserve: {},
  validationReserve: {},
  implementationDemand: quantity("2000"),
  uncertainty: "KNOWN",
  ...overrides,
});

export const makeInput = (
  buckets: RequiredCapacityBucket[] = [makeBucket("five-hour")],
  overrides: Partial<PolicyEvaluationInput> = {},
): PolicyEvaluationInput => ({
  evaluationTime: EVALUATION_TIME,
  configuration: { ...GATE_A_V1_CONFIGURATION },
  requiredBucketAuthority: {
    actorReference: "founder",
    recordedAt: "2026-08-25T11:45:00.000Z",
  },
  minimumCoherentScope: {
    actorReference: "founder",
    recordedAt: "2026-08-25T11:45:00.000Z",
    scopeTrancheId: "t003-fixture",
    attestedValue: true,
  },
  requiredCapacityBuckets: buckets,
  knownCapacityActivities: [],
  activeMandatoryStopIds: [],
  ...overrides,
});
