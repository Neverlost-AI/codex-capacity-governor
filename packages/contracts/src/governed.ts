import { z } from "zod";
import { composedAttemptSchema } from "./composed";
import { forecastErrorComparisonSchema } from "./forecast";
import { policyDecisionSchema } from "./policy";

const text = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const identifierSchema = z.uuid();
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const runOutcomeSchema = z.enum(["COMPLETED", "PARTIAL", "FAILED"]);
const validationResultSchema = z.enum([
  "NOT_RUN",
  "PASSED",
  "PARTIAL",
  "FAILED",
  "INCONCLUSIVE",
]);
const remainingCapacitySnapshotSchema = z.object({
  amount: z.number().finite().nonnegative(),
  unit: text,
  observedAt: isoDateTimeSchema,
  source: z.literal("manual"),
});
const decimal = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/);
export const governedAdherenceSchema = z.enum([
  "FOLLOWED",
  "PARTIALLY_FOLLOWED",
  "NOT_FOLLOWED",
  "UNKNOWN",
]);
export const governedUsageInputSchema = z.object({
  bucketId: text,
  providerId: text,
  capacityWindowId: text,
  resetCycleId: text,
  bucketProfileVersion: text,
  category: z.enum(["IMPLEMENTATION", "CORRECTION", "VALIDATION"]),
  rawValue: decimal,
  rawUnit: z.enum(["PERCENT", "BASIS_POINTS"]),
  sourceReference: text,
  observedAt: isoDateTimeSchema,
  reviewed: z.literal(true),
  exactCycleOnly: z.enum(["YES", "NO", "UNKNOWN"]),
});
export type GovernedUsageInput = z.infer<typeof governedUsageInputSchema>;

export const governedOutcomeInputSchema = z
  .object({
    runOutcome: runOutcomeSchema,
    validationResult: validationResultSchema,
    adherence: governedAdherenceSchema,
    adherenceExplanation: text.optional(),
    unexpectedFailures: z.array(text),
    deferredWork: z.array(text),
    notes: text.optional(),
    remainingCapacity: remainingCapacitySnapshotSchema.optional(),
    usage: z.array(governedUsageInputSchema).superRefine((usage, context) => {
      const seen = new Set<string>();
      usage.forEach((entry, index) => {
        const key = JSON.stringify([entry.bucketId, entry.category]);
        if (seen.has(key))
          context.addIssue({
            code: "custom",
            message: "Duplicate bucket/category",
            path: [index],
          });
        seen.add(key);
      });
    }),
  })
  .superRefine((outcome, context) => {
    if (
      outcome.adherence === "PARTIALLY_FOLLOWED" &&
      !outcome.adherenceExplanation
    )
      context.addIssue({
        code: "custom",
        message: "Explain partial adherence",
        path: ["adherenceExplanation"],
      });
  });
export type GovernedOutcomeInput = z.infer<typeof governedOutcomeInputSchema>;

export const governedLinkSchema = z.object({
  id: identifierSchema,
  projectId: identifierSchema,
  preflightDraftId: identifierSchema.optional(),
  attemptId: identifierSchema,
  revisionId: identifierSchema,
  receiptId: identifierSchema,
  receiptDigest: z.string().regex(/^[a-f0-9]{64}$/),
  resultFamily: z.literal("POLICY_EVALUATION"),
  bucketIdentities: z.array(
    z.object({
      bucketId: text,
      providerId: text,
      capacityWindowId: text,
      resetCycleId: text,
    }),
  ),
  decision: policyDecisionSchema,
  authorizesWork: z.boolean(),
  actorReference: text,
  confirmedAt: isoDateTimeSchema,
  confirmationReference: text,
});
export type GovernedLink = z.infer<typeof governedLinkSchema>;

export const governedUsageSchema = governedUsageInputSchema
  .omit({ reviewed: true })
  .extend({
    normalizedBasisPoints: decimal,
    reviewedBy: text,
    reviewedAt: isoDateTimeSchema,
    normalizationVersion: z.literal("manual-percent-bp-v1"),
  });
export type GovernedUsage = z.infer<typeof governedUsageSchema>;
export const governedComparisonSchema = z.object({
  bucketId: text,
  comparison: forecastErrorComparisonSchema,
  unavailableDetail: z
    .enum([
      "MISSING_IMPLEMENTATION",
      "CROSS_RESET_OR_UNRELATED",
      "BUCKET_OR_PROFILE_MISMATCH",
    ])
    .optional(),
});
export const governedObservationSchema = z
  .object({
    ...governedOutcomeInputSchema.shape,
    id: identifierSchema,
    runId: identifierSchema,
    predecessorId: identifierSchema.optional(),
    amendmentReason: text.optional(),
    recordedAt: isoDateTimeSchema,
    reviewerActorReference: text,
    usage: z.array(governedUsageSchema),
    comparisons: z.array(governedComparisonSchema),
  })
  .superRefine((observation, context) => {
    if (
      observation.adherence === "PARTIALLY_FOLLOWED" &&
      !observation.adherenceExplanation
    )
      context.addIssue({
        code: "custom",
        message: "Explain partial adherence",
        path: ["adherenceExplanation"],
      });
    if (
      (observation.predecessorId === undefined) !==
      (observation.amendmentReason === undefined)
    )
      context.addIssue({
        code: "custom",
        message: "Amendment predecessor and reason must pair",
      });
  });
export type GovernedObservation = z.infer<typeof governedObservationSchema>;
export const governedHistorySchema = z.object({
  link: governedLinkSchema,
  attempt: composedAttemptSchema,
  observations: z.array(governedObservationSchema),
});
export type GovernedHistory = z.infer<typeof governedHistorySchema>;
