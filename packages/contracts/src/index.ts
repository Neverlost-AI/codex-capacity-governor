/** Transport-neutral draft contracts for the Governor MVP. */

export type ISODateTime = string;
export type Identifier = string;

export type InputSource = "manual" | "platform_adapter";

/**
 * A capacity value retains its source unit. Values are comparable only after an
 * approved adapter or policy configuration establishes compatible semantics.
 */
export interface CapacityQuantity {
  amount: number;
  unit: string;
  source: InputSource;
}

export interface ResetContext {
  resetsAt?: ISODateTime;
  timezone: string;
  notes?: string;
}

export interface ReservePreference {
  minimum?: CapacityQuantity;
  targetShare?: number;
}

export interface Project {
  id: Identifier;
  name: string;
  description?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface TrancheDraft {
  id: Identifier;
  projectId: Identifier;
  title: string;
  brief: string;
  explicitExclusions: string[];
  acceptanceCriteria: string[];
}

export interface PreflightDraft {
  id: Identifier;
  projectId: Identifier;
  tranche: TrancheDraft;
  availableBudget: CapacityQuantity;
  reset: ResetContext;
  correctionReserve?: ReservePreference;
  validationReserve?: ReservePreference;
  assumptions: string[];
  openQuestions: string[];
}

export type Complexity = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
export type ForecastConfidence = "LOW" | "MEDIUM" | "HIGH";

export interface TaskAssessment {
  taskId: Identifier;
  title: string;
  description: string;
  complexity: Complexity;
  risk: RiskLevel;
  dependencies: Identifier[];
  validationRequirements: string[];
  source: "manual" | "ai_assisted";
}

export interface ForecastRange {
  low: CapacityQuantity;
  expected: CapacityQuantity;
  high: CapacityQuantity;
  confidence: ForecastConfidence;
  factors: string[];
  forecastVersion: string;
}

export type OperatingMode = "FULL" | "CONSERVATION" | "LOW" | "CRITICAL";
export type PolicyDecision = "PROCEED" | "NARROW" | "DEFER" | "STOP / PRESERVE";

export interface CapacityAllocation {
  implementation: CapacityQuantity;
  correction: CapacityQuantity;
  validation: CapacityQuantity;
}

export interface GovernedExecutionPlan {
  id: Identifier;
  preflightId: Identifier;
  decision: PolicyDecision;
  mode: OperatingMode;
  forecast: ForecastRange;
  allocation: CapacityAllocation;
  reasons: string[];
  optimizationGuidance: string[];
  stopConditions: string[];
  policyVersion: string;
  createdAt: ISODateTime;
}

export type ValidationResult = "PASSED" | "FAILED" | "PARTIAL" | "NOT_RUN";

export interface ExecutionOutcome {
  id: Identifier;
  governedPlanId: Identifier;
  actualImplementation?: CapacityQuantity;
  actualCorrection?: CapacityQuantity;
  actualValidation?: CapacityQuantity;
  validationResult: ValidationResult;
  failures: string[];
  deferredWork: string[];
  notes?: string;
  recordedAt: ISODateTime;
}

export interface CalibrationObservation {
  id: Identifier;
  forecast: ForecastRange;
  outcome: ExecutionOutcome;
  recordedAt: ISODateTime;
}
