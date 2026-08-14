import { z } from "zod";

/** Transport-neutral contracts for the Governor. */

export type ISODateTime = string;
export type Identifier = string;

const requiredText = z.string().trim().min(1, "Required");
const optionalText = z.string().trim().optional();

export const identifierSchema = z.uuid();
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const inputSourceSchema = z.enum(["manual", "platform_adapter"]);
export type InputSource = z.infer<typeof inputSourceSchema>;

/**
 * A capacity value retains its source unit. Values are comparable only after an
 * approved adapter or policy configuration establishes compatible semantics.
 */
export const capacityQuantitySchema = z.object({
  amount: z.number().finite().nonnegative(),
  unit: requiredText,
  source: inputSourceSchema,
});
export type CapacityQuantity = z.infer<typeof capacityQuantitySchema>;

export const manualCapacityQuantitySchema = capacityQuantitySchema.extend({
  source: z.literal("manual"),
});

const isTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const resetContextSchema = z.object({
  resetsAt: isoDateTimeSchema.optional(),
  timezone: requiredText.refine(isTimeZone, "Use a valid IANA timezone"),
  notes: optionalText,
});
export type ResetContext = z.infer<typeof resetContextSchema>;

export const reservePreferenceSchema = z.object({
  minimum: manualCapacityQuantitySchema.optional(),
  targetShare: z.number().finite().min(0).max(1).optional(),
});
export type ReservePreference = z.infer<typeof reservePreferenceSchema>;

export const projectSchema = z.object({
  id: identifierSchema,
  name: requiredText,
  description: optionalText,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = projectSchema.pick({
  name: true,
  description: true,
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const trancheDraftSchema = z.object({
  id: identifierSchema,
  projectId: identifierSchema,
  title: requiredText,
  brief: requiredText,
  explicitExclusions: z.array(requiredText),
  acceptanceCriteria: z.array(requiredText),
});
export type TrancheDraft = z.infer<typeof trancheDraftSchema>;

export const trancheDraftInputSchema = trancheDraftSchema.omit({
  id: true,
  projectId: true,
});
export type TrancheDraftInput = z.infer<typeof trancheDraftInputSchema>;

export const preflightDraftSchema = z.object({
  id: identifierSchema,
  projectId: identifierSchema,
  tranche: trancheDraftSchema,
  availableBudget: manualCapacityQuantitySchema,
  reset: resetContextSchema,
  correctionReserve: reservePreferenceSchema.optional(),
  validationReserve: reservePreferenceSchema.optional(),
  assumptions: z.array(requiredText),
  openQuestions: z.array(requiredText),
});
export type PreflightDraft = z.infer<typeof preflightDraftSchema>;

export const savePreflightDraftInputSchema = preflightDraftSchema
  .omit({ id: true })
  .extend({ tranche: trancheDraftInputSchema });
export type SavePreflightDraftInput = z.infer<
  typeof savePreflightDraftInputSchema
>;

// Later-tranche vocabulary remains compile-time-only. Its presence is not
// implementation authority and does not settle founder-controlled semantics.
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
