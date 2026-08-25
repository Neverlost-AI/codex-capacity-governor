import type { GateAV1Configuration } from "@capacity-governor/contracts";

export const GATE_A_V1_CONFIGURATION = {
  policyVersion: "gate-a-v1",
  configurationVersion: "gate-a-v1",
  normalizationRuleVersion: "exact-whitelist-v1",
  mandatoryStopListVersion: "gate-a-stop-v1",
  capacityBasisPointsPerCycle: 10_000,
  correctionFloorShareBasisPoints: 1_500,
  validationFloorShareBasisPoints: 1_500,
  fullModeMinimumBasisPoints: 6_000,
  conservationModeMinimumBasisPoints: 3_500,
  lowModeMinimumBasisPoints: 1_500,
  deferHorizonSeconds: 86_400,
  maximumObservationAgeSeconds: 1_800,
  boundedUncertaintyNumerator: 5,
  boundedUncertaintyDenominator: 4,
  modeRestrictivenessOrder: ["FULL", "CONSERVATION", "LOW", "CRITICAL"],
  decisionRestrictivenessOrder: [
    "PROCEED",
    "DEFER",
    "NARROW",
    "STOP / PRESERVE",
  ],
} as const satisfies GateAV1Configuration;
