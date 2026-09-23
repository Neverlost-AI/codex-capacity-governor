import { z } from "zod";

export * from "./policy";
export * from "./forecast";

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

export const guidanceKindSchema = z.literal("UNGUIDED");
export type GuidanceKind = z.infer<typeof guidanceKindSchema>;

export const runOutcomeSchema = z.enum(["COMPLETED", "PARTIAL", "FAILED"]);
export type RunOutcome = z.infer<typeof runOutcomeSchema>;

export const validationResultSchema = z.enum([
  "NOT_RUN",
  "PASSED",
  "PARTIAL",
  "FAILED",
  "INCONCLUSIVE",
]);
export type ValidationResult = z.infer<typeof validationResultSchema>;

export const actualConsumptionCategorySchema = z.enum([
  "IMPLEMENTATION",
  "CORRECTION",
  "VALIDATION",
  "OTHER",
]);
export type ActualConsumptionCategory = z.infer<
  typeof actualConsumptionCategorySchema
>;

export const developmentRunSchema = z.object({
  id: identifierSchema,
  projectId: identifierSchema,
  preflightDraftId: identifierSchema,
  guidanceKind: guidanceKindSchema,
  createdAt: isoDateTimeSchema,
});
export type DevelopmentRun = z.infer<typeof developmentRunSchema>;

export const createDevelopmentRunInputSchema = developmentRunSchema.pick({
  projectId: true,
  preflightDraftId: true,
});
export type CreateDevelopmentRunInput = z.infer<
  typeof createDevelopmentRunInputSchema
>;

export const remainingCapacitySnapshotSchema = z.object({
  amount: z.number().finite().nonnegative(),
  unit: requiredText,
  observedAt: isoDateTimeSchema,
  source: z.literal("manual"),
});
export type RemainingCapacitySnapshot = z.infer<
  typeof remainingCapacitySnapshotSchema
>;

export const actualCapacityConsumptionInputSchema = z.object({
  category: actualConsumptionCategorySchema,
  amount: z.number().finite().nonnegative(),
  unit: requiredText,
  source: z.literal("manual"),
});
export type ActualCapacityConsumptionInput = z.infer<
  typeof actualCapacityConsumptionInputSchema
>;

export const actualCapacityConsumptionSchema =
  actualCapacityConsumptionInputSchema.extend({
    id: identifierSchema,
    outcomeObservationId: identifierSchema,
    recordedAt: isoDateTimeSchema,
  });
export type ActualCapacityConsumption = z.infer<
  typeof actualCapacityConsumptionSchema
>;

const outcomeEvidenceSchema = z.object({
  runOutcome: runOutcomeSchema,
  validationResult: validationResultSchema,
  unexpectedFailures: z.array(requiredText),
  deferredWork: z.array(requiredText),
  notes: optionalText,
  remainingCapacity: remainingCapacitySnapshotSchema.optional(),
  actualConsumption: z
    .array(actualCapacityConsumptionInputSchema)
    .max(4)
    .superRefine((entries, context) => {
      const seen = new Set<ActualConsumptionCategory>();
      entries.forEach((entry, index) => {
        if (seen.has(entry.category)) {
          context.addIssue({
            code: "custom",
            message: "Each consumption category may be recorded only once",
            path: [index, "category"],
          });
        }
        seen.add(entry.category);
      });
    }),
});

export const recordRunOutcomeInputSchema = outcomeEvidenceSchema.extend({
  runId: identifierSchema,
});
export type RecordRunOutcomeInput = z.infer<typeof recordRunOutcomeInputSchema>;

export const amendRunOutcomeInputSchema = outcomeEvidenceSchema.extend({
  runId: identifierSchema,
  expectedCurrentObservationId: identifierSchema,
  amendmentReason: requiredText,
});
export type AmendRunOutcomeInput = z.infer<typeof amendRunOutcomeInputSchema>;

export const runOutcomeObservationSchema = outcomeEvidenceSchema
  .omit({ actualConsumption: true })
  .extend({
    id: identifierSchema,
    runId: identifierSchema,
    supersedesObservationId: identifierSchema.optional(),
    amendmentReason: requiredText.optional(),
    recordedAt: isoDateTimeSchema,
  })
  .superRefine((observation, context) => {
    const isAmendment = observation.supersedesObservationId !== undefined;
    if (isAmendment !== (observation.amendmentReason !== undefined)) {
      context.addIssue({
        code: "custom",
        message:
          "An amendment must include both a predecessor and an amendment reason",
        path: ["amendmentReason"],
      });
    }
  });
export type RunOutcomeObservation = z.infer<typeof runOutcomeObservationSchema>;

export const outcomeObservationWithConsumptionSchema = z.object({
  observation: runOutcomeObservationSchema,
  actualConsumption: z.array(actualCapacityConsumptionSchema),
});
export type OutcomeObservationWithConsumption = z.infer<
  typeof outcomeObservationWithConsumptionSchema
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

export type ExecutionOutcome = RunOutcomeObservation;

export interface CalibrationObservation {
  id: Identifier;
  forecast: ForecastRange;
  outcome: ExecutionOutcome;
  recordedAt: ISODateTime;
}
