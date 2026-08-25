import { z } from "zod";

const requiredText = z.string().trim().min(1, "Required");
const exactNonnegativeDecimal = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, "Use a canonical nonnegative decimal")
  .max(128, "Decimal evidence is too long");
const isoDateTime = z.iso.datetime({ offset: true });

const isTimeZone = (value: string): boolean => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const policyCapacityUnitSchema = z.enum([
  "BASIS_POINTS",
  "PERCENT",
  "NORMALIZED_FRACTION",
]);
export type PolicyCapacityUnit = z.infer<typeof policyCapacityUnitSchema>;

export const policyRawQuantitySchema = z
  .object({
    amount: exactNonnegativeDecimal,
    unit: policyCapacityUnitSchema,
    claimedNormalizedBasisPoints: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional(),
  })
  .strict();
export type PolicyRawQuantity = z.infer<typeof policyRawQuantitySchema>;

export const policyUncertaintySchema = z.enum([
  "KNOWN",
  "UNCERTAIN_BUT_BOUNDED",
  "UNKNOWN_OR_INVALID",
]);
export type PolicyUncertainty = z.infer<typeof policyUncertaintySchema>;

export const policyOperatingModeSchema = z.enum([
  "FULL",
  "CONSERVATION",
  "LOW",
  "CRITICAL",
]);
export type PolicyOperatingMode = z.infer<typeof policyOperatingModeSchema>;

export const policyDecisionSchema = z.enum([
  "PROCEED",
  "DEFER",
  "NARROW",
  "STOP / PRESERVE",
]);
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;

export const bucketAuthoritySchema = z
  .object({
    actorReference: requiredText,
    recordedAt: isoDateTime,
  })
  .strict();
export type BucketAuthority = z.infer<typeof bucketAuthoritySchema>;

export const minimumCoherentScopeAttestationSchema = z
  .object({
    actorReference: requiredText,
    recordedAt: isoDateTime,
    scopeTrancheId: requiredText,
    attestedValue: z.boolean(),
  })
  .strict();
export type MinimumCoherentScopeAttestation = z.infer<
  typeof minimumCoherentScopeAttestationSchema
>;

export const knownCapacityActivitySchema = z
  .object({
    eventId: requiredText,
    occurredAt: isoDateTime,
    affectedBucketIds: z.array(requiredText).min(1),
    source: requiredText,
  })
  .strict();
export type KnownCapacityActivity = z.infer<typeof knownCapacityActivitySchema>;

const noResetSchema = z.object({ kind: z.literal("NONE") }).strict();
const uncertainResetSchema = z
  .object({
    kind: z.literal("UNCERTAIN"),
    notes: requiredText.optional(),
  })
  .strict();
const rollingResetSchema = z
  .object({
    kind: z.literal("ROLLING"),
    notes: requiredText.optional(),
  })
  .strict();
const confirmedResetSchema = z
  .object({
    kind: z.literal("CONFIRMED"),
    resetsAt: isoDateTime,
    sourceTimezone: requiredText.refine(
      isTimeZone,
      "Use a valid IANA timezone",
    ),
    normalizedUtc: z.iso.datetime({ offset: true }),
    expectedPostResetAvailability: policyRawQuantitySchema.optional(),
  })
  .strict();

export const bucketResetEvidenceSchema = z.discriminatedUnion("kind", [
  noResetSchema,
  uncertainResetSchema,
  rollingResetSchema,
  confirmedResetSchema,
]);
export type BucketResetEvidence = z.infer<typeof bucketResetEvidenceSchema>;

export const policyReserveInputSchema = z
  .object({
    manualMinimum: policyRawQuantitySchema.optional(),
    targetShareBasisPoints: z.number().int().min(0).max(10_000).optional(),
  })
  .strict();
export type PolicyReserveInput = z.infer<typeof policyReserveInputSchema>;

export const requiredCapacityBucketSchema = z
  .object({
    bucketId: requiredText,
    providerId: requiredText,
    capacityWindowId: requiredText,
    resetCycleId: requiredText,
    availableCapacity: policyRawQuantitySchema,
    observedAt: isoDateTime,
    reset: bucketResetEvidenceSchema,
    correctionReserve: policyReserveInputSchema.optional(),
    validationReserve: policyReserveInputSchema.optional(),
    implementationDemand: policyRawQuantitySchema,
    uncertainty: policyUncertaintySchema,
  })
  .strict();
export type RequiredCapacityBucket = z.infer<
  typeof requiredCapacityBucketSchema
>;

export const gateAV1ConfigurationSchema = z
  .object({
    policyVersion: z.literal("gate-a-v1"),
    configurationVersion: z.literal("gate-a-v1"),
    normalizationRuleVersion: z.literal("exact-whitelist-v1"),
    mandatoryStopListVersion: z.literal("gate-a-stop-v1"),
    capacityBasisPointsPerCycle: z.literal(10_000),
    correctionFloorShareBasisPoints: z.literal(1_500),
    validationFloorShareBasisPoints: z.literal(1_500),
    fullModeMinimumBasisPoints: z.literal(6_000),
    conservationModeMinimumBasisPoints: z.literal(3_500),
    lowModeMinimumBasisPoints: z.literal(1_500),
    deferHorizonSeconds: z.literal(86_400),
    maximumObservationAgeSeconds: z.literal(1_800),
    boundedUncertaintyNumerator: z.literal(5),
    boundedUncertaintyDenominator: z.literal(4),
    modeRestrictivenessOrder: z.tuple([
      z.literal("FULL"),
      z.literal("CONSERVATION"),
      z.literal("LOW"),
      z.literal("CRITICAL"),
    ]),
    decisionRestrictivenessOrder: z.tuple([
      z.literal("PROCEED"),
      z.literal("DEFER"),
      z.literal("NARROW"),
      z.literal("STOP / PRESERVE"),
    ]),
  })
  .strict();
export type GateAV1Configuration = z.infer<typeof gateAV1ConfigurationSchema>;

export const policyEvaluationInputSchema = z
  .object({
    evaluationTime: isoDateTime,
    configuration: gateAV1ConfigurationSchema,
    requiredBucketAuthority: bucketAuthoritySchema,
    minimumCoherentScope: minimumCoherentScopeAttestationSchema,
    requiredCapacityBuckets: z.array(requiredCapacityBucketSchema).min(1),
    knownCapacityActivities: z.array(knownCapacityActivitySchema),
    activeMandatoryStopIds: z.array(requiredText),
  })
  .strict()
  .superRefine((input, context) => {
    const bucketIds = new Set<string>();
    const compositeIds = new Set<string>();

    input.requiredCapacityBuckets.forEach((bucket, index) => {
      if (bucketIds.has(bucket.bucketId)) {
        context.addIssue({
          code: "custom",
          message: "INPUT_DUPLICATE_BUCKET_ID",
          path: ["requiredCapacityBuckets", index, "bucketId"],
        });
      }
      bucketIds.add(bucket.bucketId);

      const composite = [
        bucket.providerId,
        bucket.capacityWindowId,
        bucket.resetCycleId,
      ].join("\u0000");
      if (compositeIds.has(composite)) {
        context.addIssue({
          code: "custom",
          message: "INPUT_DUPLICATE_BUCKET_IDENTITY",
          path: ["requiredCapacityBuckets", index],
        });
      }
      compositeIds.add(composite);
    });

    const eventIds = new Set<string>();
    input.knownCapacityActivities.forEach((activity, index) => {
      if (eventIds.has(activity.eventId)) {
        context.addIssue({
          code: "custom",
          message: "INPUT_DUPLICATE_ACTIVITY_ID",
          path: ["knownCapacityActivities", index, "eventId"],
        });
      }
      eventIds.add(activity.eventId);

      const affectedBucketIds = new Set<string>();

      activity.affectedBucketIds.forEach((bucketId, bucketIndex) => {
        if (affectedBucketIds.has(bucketId)) {
          context.addIssue({
            code: "custom",
            message: "INPUT_DUPLICATE_ACTIVITY_BUCKET",
            path: [
              "knownCapacityActivities",
              index,
              "affectedBucketIds",
              bucketIndex,
            ],
          });
        }
        affectedBucketIds.add(bucketId);
        if (!bucketIds.has(bucketId)) {
          context.addIssue({
            code: "custom",
            message: "INPUT_UNKNOWN_ACTIVITY_BUCKET",
            path: [
              "knownCapacityActivities",
              index,
              "affectedBucketIds",
              bucketIndex,
            ],
          });
        }
      });
    });
  });
export type PolicyEvaluationInput = z.infer<typeof policyEvaluationInputSchema>;

export const policyValidationIdSchema = z.enum([
  "INPUT_REQUIRED",
  "INPUT_INVALID_TYPE",
  "INPUT_INVALID_FORMAT",
  "INPUT_INVALID_VALUE",
  "INPUT_UNRECOGNIZED_KEY",
  "INPUT_DUPLICATE_BUCKET_ID",
  "INPUT_DUPLICATE_BUCKET_IDENTITY",
  "INPUT_DUPLICATE_ACTIVITY_ID",
  "INPUT_DUPLICATE_ACTIVITY_BUCKET",
  "INPUT_UNKNOWN_ACTIVITY_BUCKET",
]);
export type PolicyValidationId = z.infer<typeof policyValidationIdSchema>;

export const policyRuleIdSchema = z.enum([
  "RULE_NORMALIZATION_EXACT_WHITELIST",
  "RULE_CORRECTION_RESERVE_PROTECTED",
  "RULE_VALIDATION_RESERVE_PROTECTED",
  "RULE_UNCERTAINTY_KNOWN",
  "RULE_UNCERTAINTY_BOUNDED_MARGIN",
  "RULE_UNCERTAINTY_MODE_CAP",
  "RULE_MODE_FULL",
  "RULE_MODE_CONSERVATION",
  "RULE_MODE_LOW",
  "RULE_MODE_CRITICAL",
  "RULE_CURRENT_AFFORDABLE",
  "RULE_CURRENT_BLOCKED",
  "RULE_DEFER_ALL_BLOCKERS_QUALIFY",
  "RULE_DEFER_BUCKET_QUALIFIES",
  "RULE_DEFER_BUCKET_DOES_NOT_QUALIFY",
  "RULE_DECISION_PROCEED",
  "RULE_DECISION_DEFER",
  "RULE_DECISION_NARROW",
  "RULE_DECISION_STOP_PRESERVE",
  "RULE_LOW_MINIMUM_COHERENT_SCOPE",
  "RULE_LOW_SCOPE_NOT_ATTESTED",
  "RULE_AGGREGATE_MOST_RESTRICTIVE_MODE",
  "RULE_AGGREGATE_MOST_RESTRICTIVE_DECISION",
]);
export type PolicyRuleId = z.infer<typeof policyRuleIdSchema>;

export const policyStopIdSchema = z.enum([
  "STOP_EXTERNAL_MANDATORY_CONDITION",
  "STOP_NORMALIZATION_CLAIM_MISMATCH",
  "STOP_STALE_OBSERVATION_AGE",
  "STOP_KNOWN_ACTIVITY_AFTER_OBSERVATION",
  "STOP_RESET_PASSED_WITHOUT_FRESH_OBSERVATION",
  "STOP_INVALID_RESET_EVIDENCE",
  "STOP_UNKNOWN_OR_INVALID_UNCERTAINTY",
  "STOP_RESERVES_EXHAUST_CAPACITY",
  "STOP_VALIDATION_RESERVE_UNPROTECTED",
  "STOP_CRITICAL_MODE",
  "STOP_POLICY_INVARIANT",
]);
export type PolicyStopId = z.infer<typeof policyStopIdSchema>;

export const policyInputIssueSchema = z
  .object({
    validationId: policyValidationIdSchema,
    path: z.array(z.union([z.string(), z.number().int()])),
    bucketId: z.string().optional(),
    received: z
      .union([z.string(), z.number(), z.boolean(), z.null()])
      .optional(),
  })
  .strict();
export type PolicyInputIssue = z.infer<typeof policyInputIssueSchema>;

export const policyInputRejectionSchema = z
  .object({
    kind: z.literal("INPUT_REJECTION"),
    authorizesWork: z.literal(false),
    issues: z.array(policyInputIssueSchema).min(1),
  })
  .strict();
export type PolicyInputRejection = z.infer<typeof policyInputRejectionSchema>;

export const policyRoundingEvidenceSchema = z
  .object({
    operation: requiredText,
    direction: z.enum(["DOWN", "UP", "EXACT"]),
    numerator: z.string().regex(/^\d+$/),
    denominator: z.string().regex(/^[1-9]\d*$/),
    resultBasisPoints: z.number().int(),
  })
  .strict();
export type PolicyRoundingEvidence = z.infer<
  typeof policyRoundingEvidenceSchema
>;

export const policyPostResetResultSchema = z
  .object({
    availableBasisPoints: z.number().int().min(0).max(10_000),
    correctionReserveBasisPoints: z.number().int().min(0).max(10_000),
    validationReserveBasisPoints: z.number().int().min(0).max(10_000),
    implementationAllocationBasisPoints: z.number().int(),
    sufficient: z.boolean(),
    roundingEvidence: z.array(policyRoundingEvidenceSchema),
  })
  .strict();
export type PolicyPostResetResult = z.infer<typeof policyPostResetResultSchema>;

export const policyBucketResultSchema = z
  .object({
    bucketId: requiredText,
    providerId: requiredText,
    capacityWindowId: requiredText,
    resetCycleId: requiredText,
    availableCapacity: policyRawQuantitySchema,
    implementationDemand: policyRawQuantitySchema,
    correctionReserve: policyReserveInputSchema.optional(),
    validationReserve: policyReserveInputSchema.optional(),
    observedAt: isoDateTime,
    affectingKnownActivities: z.array(knownCapacityActivitySchema),
    reset: bucketResetEvidenceSchema,
    uncertainty: policyUncertaintySchema,
    availableBasisPoints: z.number().int().min(0).max(10_000),
    correctionReserveBasisPoints: z.number().int().min(0).max(10_000),
    validationReserveBasisPoints: z.number().int().min(0).max(10_000),
    implementationAllocationBasisPoints: z.number().int(),
    suppliedDemandBasisPoints: z.number().int().min(0).max(10_000),
    adjustedDemandBasisPoints: z.number().int().min(0),
    rawMode: policyOperatingModeSchema,
    mode: policyOperatingModeSchema,
    currentAffordable: z.boolean(),
    blocking: z.boolean(),
    deferEligible: z.boolean(),
    candidateDecision: policyDecisionSchema,
    postReset: policyPostResetResultSchema.optional(),
    ruleIds: z.array(policyRuleIdSchema),
    stopIds: z.array(policyStopIdSchema),
    roundingEvidence: z.array(policyRoundingEvidenceSchema),
  })
  .strict();
export type PolicyBucketResult = z.infer<typeof policyBucketResultSchema>;

export const policyEvaluationSchema = z
  .object({
    kind: z.literal("POLICY_EVALUATION"),
    authorizesWork: z.boolean(),
    evaluationTime: isoDateTime,
    configuration: gateAV1ConfigurationSchema,
    requiredBucketAuthority: bucketAuthoritySchema,
    minimumCoherentScope: minimumCoherentScopeAttestationSchema,
    bucketResults: z.array(policyBucketResultSchema).min(1),
    aggregateMode: policyOperatingModeSchema,
    aggregateDecision: policyDecisionSchema,
    limitingBucketIds: z.array(requiredText).min(1),
    blockingBucketIds: z.array(requiredText),
    ruleIds: z.array(policyRuleIdSchema),
    stopIds: z.array(policyStopIdSchema),
    activeMandatoryStopIds: z.array(requiredText),
  })
  .strict();
export type PolicyEvaluation = z.infer<typeof policyEvaluationSchema>;

export const policyEvaluationOutcomeSchema = z.discriminatedUnion("kind", [
  policyInputRejectionSchema,
  policyEvaluationSchema,
]);
export type PolicyEvaluationOutcome = z.infer<
  typeof policyEvaluationOutcomeSchema
>;
