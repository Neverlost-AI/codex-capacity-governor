import { z } from "zod";
import {
  policyRawQuantitySchema,
  policyTimestampSchema,
  policyUncertaintySchema,
} from "./policy";

const text = z.string().trim().min(1);
const id = z.string().min(1);
const natural = z.number().int().nonnegative().safe();
const positive = z.number().int().positive().safe();
const decimal = z
  .string()
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/)
  .max(128);
const unique = (values: string[]) => new Set(values).size === values.length;

export const forecastMethodVersionSchema = z.literal("gate-b-v1");
export const forecastConfigurationVersionSchema = z.literal("gate-b-v1");
export const forecastBucketProfileVersionSchema = z.literal(
  "gate-b-bucket-profile-v1",
);
export const forecastConfidenceSchema = z.enum(["HIGH", "MEDIUM", "LOW"]);
export const forecastWorkCategorySchema = z.enum([
  "DOCUMENTATION_CONFIG",
  "TESTING_ONLY",
  "FRONTEND_UI",
  "APPLICATION_LOGIC",
  "DATA_PERSISTENCE",
  "INTEGRATION",
  "REFACTOR_ARCHITECTURE",
]);
export const forecastComplexitySchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "UNKNOWN",
]);
export const forecastContextSchema = z.enum([
  "SMALL",
  "MEDIUM",
  "LARGE",
  "UNKNOWN",
]);
export const forecastRepositorySchema = z.enum([
  "STABLE",
  "MIXED",
  "UNFAMILIAR",
  "UNKNOWN",
]);
export const forecastDependencySchema = z.enum([
  "NONE",
  "EXISTING_ONLY",
  "NEW_OR_CHANGED",
  "UNKNOWN",
]);
export const forecastValidationSchema = z.enum([
  "LIGHT",
  "STANDARD",
  "EXTENSIVE",
  "UNKNOWN",
]);
export const forecastNoveltySchema = z.enum([
  "FAMILIAR",
  "SOME_NEW_PATTERN",
  "HIGH_NOVELTY",
  "UNKNOWN",
]);
export const forecastCorrectionSchema = z.enum([
  "LOW",
  "MEDIUM",
  "HIGH",
  "UNKNOWN",
]);

const provenance = z
  .object({
    kind: z.literal("UPSTREAM_REVIEWED_CHARACTERIZATION"),
    scopeTrancheId: id,
    source: text,
    actorReference: text,
    evidenceReference: text,
    reviewedAt: policyTimestampSchema,
  })
  .strict();

export const forecastWorkItemSchema = z
  .object({
    workItemId: id,
    label: text,
    category: forecastWorkCategorySchema,
    complexity: forecastComplexitySchema,
    contextLoad: forecastContextSchema,
    repositoryCondition: forecastRepositorySchema,
    dependencyChange: forecastDependencySchema,
    validationBurden: forecastValidationSchema,
    novelty: forecastNoveltySchema,
    correctionExposure: forecastCorrectionSchema,
    reviewedCharacterization: provenance,
  })
  .strict();
export type ForecastWorkItem = z.infer<typeof forecastWorkItemSchema>;

export const forecastBucketSchema = z
  .object({
    bucketId: id,
    providerId: id,
    capacityWindowId: id,
    resetCycleId: id,
    bucketProfileVersion: forecastBucketProfileVersionSchema,
    profileEvidence: z.discriminatedUnion("status", [
      z
        .object({ status: z.literal("COMPLETE"), evidenceReference: text })
        .strict(),
      z
        .object({
          status: z.literal("ACCEPTED_INCOMPLETE"),
          acceptedForV1Forecast: z.literal(true),
          actorReference: text,
          evidenceReference: text,
          recordedAt: policyTimestampSchema,
        })
        .strict(),
    ]),
  })
  .strict();
export type ForecastBucket = z.infer<typeof forecastBucketSchema>;

const ratio = (numerator: number, denominator: number) =>
  z
    .object({
      numerator: z.literal(numerator),
      denominator: z.literal(denominator),
    })
    .strict();

export const gateBV1ConfigurationSchema = z
  .object({
    methodVersion: forecastMethodVersionSchema,
    configurationVersion: forecastConfigurationVersionSchema,
    bucketProfileVersion: forecastBucketProfileVersionSchema,
    categoryBase: z
      .object({
        DOCUMENTATION_CONFIG: z.literal(1),
        TESTING_ONLY: z.literal(2),
        FRONTEND_UI: z.literal(3),
        APPLICATION_LOGIC: z.literal(4),
        DATA_PERSISTENCE: z.literal(5),
        INTEGRATION: z.literal(6),
        REFACTOR_ARCHITECTURE: z.literal(7),
      })
      .strict(),
    complexity: z
      .object({
        LOW: z.literal(0),
        MEDIUM: z.literal(2),
        HIGH: z.literal(4),
        UNKNOWN: z.literal(4),
      })
      .strict(),
    contextLoad: z
      .object({
        SMALL: z.literal(0),
        MEDIUM: z.literal(1),
        LARGE: z.literal(2),
        UNKNOWN: z.literal(2),
      })
      .strict(),
    repositoryCondition: z
      .object({
        STABLE: z.literal(0),
        MIXED: z.literal(1),
        UNFAMILIAR: z.literal(2),
        UNKNOWN: z.literal(2),
      })
      .strict(),
    dependencyChange: z
      .object({
        NONE: z.literal(0),
        EXISTING_ONLY: z.literal(1),
        NEW_OR_CHANGED: z.literal(3),
        UNKNOWN: z.literal(3),
      })
      .strict(),
    validationBurden: z
      .object({
        LIGHT: z.literal(0),
        STANDARD: z.literal(1),
        EXTENSIVE: z.literal(2),
        UNKNOWN: z.literal(2),
      })
      .strict(),
    novelty: z
      .object({
        FAMILIAR: z.literal(0),
        SOME_NEW_PATTERN: z.literal(2),
        HIGH_NOVELTY: z.literal(4),
        UNKNOWN: z.literal(4),
      })
      .strict(),
    correctionExposure: z
      .object({
        LOW: z.literal(0),
        MEDIUM: z.literal(1),
        HIGH: z.literal(3),
        UNKNOWN: z.literal(3),
      })
      .strict(),
    basisPointsPerWorkPoint: z.literal(100),
    gateAV1MaximumDemandBasisPoints: z.literal(10_000),
    publicPrecisionBasisPoints: z.literal(100),
    rangeMultipliers: z
      .object({
        HIGH: z
          .object({
            low: ratio(9, 10),
            expected: ratio(1, 1),
            high: ratio(11, 10),
          })
          .strict(),
        MEDIUM: z
          .object({
            low: ratio(3, 4),
            expected: ratio(1, 1),
            high: ratio(5, 4),
          })
          .strict(),
        LOW: z
          .object({
            low: ratio(1, 2),
            expected: ratio(1, 1),
            high: ratio(3, 2),
          })
          .strict(),
      })
      .strict(),
    minimumCalibrationHistory: z.literal(3),
    minimumHighConfidenceHistory: z.literal(5),
    historyRecencyDays: z.literal(90),
    ratioConsistencyFactor: z.literal(2),
    confidenceRestrictivenessOrder: z.tuple([
      z.literal("HIGH"),
      z.literal("MEDIUM"),
      z.literal("LOW"),
    ]),
  })
  .strict();
export type GateBV1Configuration = z.infer<typeof gateBV1ConfigurationSchema>;

export const forecastCalibrationCandidateSchema = z
  .object({
    candidateId: id,
    runId: id,
    projectId: id,
    repositoryId: id,
    bucket: forecastBucketSchema
      .omit({ profileEvidence: true })
      .extend({ bucketProfileVersion: text }),
    methodVersion: text,
    configurationVersion: text,
    originalRange: z
      .object({
        lowBasisPoints: natural,
        expectedBasisPoints: natural,
        highBasisPoints: natural,
      })
      .strict()
      .refine(
        (range) =>
          range.lowBasisPoints <= range.expectedBasisPoints &&
          range.expectedBasisPoints <= range.highBasisPoints,
        "INPUT_UNORDERED_ORIGINAL_RANGE",
      )
      .optional(),
    runOutcome: z.enum(["COMPLETED", "PARTIAL", "FAILED"]),
    normalizedActualImplementation: z
      .object({
        category: z.literal("IMPLEMENTATION"),
        amountBasisPoints: decimal,
        bucketId: id,
        bucketProfileVersion: text,
        reviewedNormalizationReference: text,
      })
      .strict()
      .optional(),
    recordedAt: policyTimestampSchema,
    currentEvidence: z.boolean(),
    evidenceReference: text,
  })
  .strict();
export type ForecastCalibrationCandidate = z.infer<
  typeof forecastCalibrationCandidateSchema
>;

export const forecastEvaluationInputSchema = z
  .object({
    scopeTrancheId: id,
    projectId: id,
    repositoryId: id,
    evaluationTime: policyTimestampSchema,
    configuration: gateBV1ConfigurationSchema,
    requiredBucketAuthority: z
      .object({
        kind: z.literal("UPSTREAM_TRUSTED_BOUNDARY"),
        scopeTrancheId: id,
        projectId: id,
        repositoryId: id,
        actorReference: text,
        recordedAt: policyTimestampSchema,
        evidenceReference: text,
        requiredBucketIds: z
          .array(id)
          .min(1)
          .refine(unique, "INPUT_DUPLICATE_BUCKET_AUTHORITY_ID"),
      })
      .strict(),
    workItems: z
      .array(forecastWorkItemSchema)
      .min(1)
      .refine(
        (items) => unique(items.map((item) => item.workItemId)),
        "INPUT_DUPLICATE_WORK_ITEM_ID",
      ),
    requiredBuckets: z
      .array(forecastBucketSchema)
      .min(1)
      .refine(
        (buckets) => unique(buckets.map((bucket) => bucket.bucketId)),
        "INPUT_DUPLICATE_BUCKET_ID",
      ),
    calibrationCandidates: z
      .array(forecastCalibrationCandidateSchema)
      .refine(
        (candidates) =>
          unique(candidates.map((candidate) => candidate.candidateId)),
        "INPUT_DUPLICATE_CANDIDATE_ID",
      ),
  })
  .strict()
  .superRefine((input, context) => {
    const requiredIds = input.requiredBuckets.map((bucket) => bucket.bucketId);
    const authorityIds = input.requiredBucketAuthority.requiredBucketIds;
    if (
      input.requiredBucketAuthority.scopeTrancheId !== input.scopeTrancheId ||
      input.requiredBucketAuthority.projectId !== input.projectId ||
      input.requiredBucketAuthority.repositoryId !== input.repositoryId ||
      requiredIds.length !== authorityIds.length ||
      requiredIds.some((bucketId) => !authorityIds.includes(bucketId))
    ) {
      context.addIssue({
        code: "custom",
        message: "INPUT_BUCKET_AUTHORITY_MISMATCH",
        path: ["requiredBucketAuthority"],
      });
    }
    if (
      input.requiredBuckets.some(
        (bucket) =>
          bucket.bucketProfileVersion !==
          input.configuration.bucketProfileVersion,
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "INPUT_BUCKET_PROFILE_MISMATCH",
        path: ["requiredBuckets"],
      });
    }
    const evaluatedAt = Date.parse(input.evaluationTime);
    if (Date.parse(input.requiredBucketAuthority.recordedAt) > evaluatedAt) {
      context.addIssue({
        code: "custom",
        message: "INPUT_FUTURE_AUTHORITY",
        path: ["requiredBucketAuthority", "recordedAt"],
      });
    }
    input.workItems.forEach((item, index) => {
      if (
        item.reviewedCharacterization.scopeTrancheId !== input.scopeTrancheId
      ) {
        context.addIssue({
          code: "custom",
          message: "INPUT_CHARACTERIZATION_SCOPE_MISMATCH",
          path: [
            "workItems",
            index,
            "reviewedCharacterization",
            "scopeTrancheId",
          ],
        });
      }
      if (Date.parse(item.reviewedCharacterization.reviewedAt) > evaluatedAt) {
        context.addIssue({
          code: "custom",
          message: "INPUT_FUTURE_REVIEW",
          path: ["workItems", index, "reviewedCharacterization", "reviewedAt"],
        });
      }
    });
    input.requiredBuckets.forEach((bucket, index) => {
      if (
        bucket.profileEvidence.status === "ACCEPTED_INCOMPLETE" &&
        Date.parse(bucket.profileEvidence.recordedAt) > evaluatedAt
      ) {
        context.addIssue({
          code: "custom",
          message: "INPUT_FUTURE_PROFILE_ACCEPTANCE",
          path: ["requiredBuckets", index, "profileEvidence", "recordedAt"],
        });
      }
    });
  });
export type ForecastEvaluationInput = z.infer<
  typeof forecastEvaluationInputSchema
>;

export const forecastExactFractionSchema = z
  .object({
    numerator: z.string().regex(/^\d+$/),
    denominator: z.string().regex(/^[1-9]\d*$/),
  })
  .strict();
export type ForecastExactFraction = z.infer<typeof forecastExactFractionSchema>;

export const forecastValidationIssueSchema = z
  .object({
    id: text,
    path: z.array(z.union([z.string(), z.number()])),
    received: z
      .union([z.string(), z.number(), z.boolean(), z.null()])
      .optional(),
  })
  .strict();

export const forecastInputRejectionSchema = z
  .object({
    kind: z.literal("INPUT_REJECTION"),
    authorizesWork: z.literal(false),
    scopeTrancheId: z.string().optional(),
    issues: z.array(forecastValidationIssueSchema).min(1),
  })
  .strict();

const scoredItem = z
  .object({
    workItem: forecastWorkItemSchema,
    categoryBase: natural,
    factorAdders: z
      .object({
        complexity: natural,
        contextLoad: natural,
        repositoryCondition: natural,
        dependencyChange: natural,
        validationBurden: natural,
        novelty: natural,
        correctionExposure: natural,
      })
      .strict(),
    itemScore: positive,
  })
  .strict();

const consideredCandidate = z
  .object({
    candidate: forecastCalibrationCandidateSchema,
    included: z.boolean(),
    reasonIds: z.array(text),
    ratio: forecastExactFractionSchema.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.included !==
      (value.reasonIds.length === 0 && value.ratio !== undefined)
    ) {
      context.addIssue({
        code: "custom",
        message: "Inclusion, reasons and ratio must agree",
      });
    }
  });

export const forecastBucketResultSchema = z
  .object({
    bucket: forecastBucketSchema,
    baselineExpected: forecastExactFractionSchema,
    consideredCandidates: z.array(consideredCandidate),
    includedHistoryCount: natural,
    medianRatio: forecastExactFractionSchema.optional(),
    adjustedExpected: forecastExactFractionSchema,
    confidence: forecastConfidenceSchema,
    rawRange: z
      .object({
        low: forecastExactFractionSchema,
        expected: forecastExactFractionSchema,
        high: forecastExactFractionSchema,
      })
      .strict(),
    roundedRange: z
      .object({
        lowBasisPoints: natural,
        expectedBasisPoints: natural,
        highBasisPoints: natural,
      })
      .strict(),
    assumptions: z.array(text),
    unknowns: z.array(text),
  })
  .strict()
  .superRefine((value, context) => {
    const range = value.roundedRange;
    if (
      range.lowBasisPoints > range.expectedBasisPoints ||
      range.expectedBasisPoints > range.highBasisPoints
    ) {
      context.addIssue({
        code: "custom",
        message: "Forecast range is unordered",
        path: ["roundedRange"],
      });
    }
    if (
      value.includedHistoryCount !==
      value.consideredCandidates.filter((candidate) => candidate.included)
        .length
    ) {
      context.addIssue({
        code: "custom",
        message: "Included history count disagrees",
        path: ["includedHistoryCount"],
      });
    }
  });
export type ForecastBucketResult = z.infer<typeof forecastBucketResultSchema>;

export const forecastEvaluationSchema = z
  .object({
    kind: z.literal("FORECAST_EVALUATION"),
    authorizesWork: z.literal(false),
    scopeTrancheId: id,
    projectId: id,
    repositoryId: id,
    evaluationTime: policyTimestampSchema,
    configuration: gateBV1ConfigurationSchema,
    requiredBucketAuthority:
      forecastEvaluationInputSchema.shape.requiredBucketAuthority,
    scoredItems: z.array(scoredItem).min(1),
    totalWorkScore: positive,
    bucketResults: z.array(forecastBucketResultSchema).min(1),
    overallConfidence: forecastConfidenceSchema,
    assumptions: z.array(text),
    unknowns: z.array(text),
  })
  .strict();
export type ForecastEvaluation = z.infer<typeof forecastEvaluationSchema>;
export const forecastEvaluationOutcomeSchema = z.discriminatedUnion("kind", [
  forecastInputRejectionSchema,
  forecastEvaluationSchema,
]);
export type ForecastEvaluationOutcome = z.infer<
  typeof forecastEvaluationOutcomeSchema
>;

export const forecastPolicyProjectionSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("POLICY_DEMAND_EVIDENCE"),
      authorizesWork: z.literal(false),
      bucket: forecastBucketSchema,
      scopeTrancheId: id,
      expectedDemand: policyRawQuantitySchema,
      uncertainty: policyUncertaintySchema,
      confidence: forecastConfidenceSchema,
      planningRange: forecastBucketResultSchema.shape.roundedRange,
      methodVersion: forecastMethodVersionSchema,
      configurationVersion: forecastConfigurationVersionSchema,
      requiredBucketAuthority:
        forecastEvaluationInputSchema.shape.requiredBucketAuthority,
    })
    .strict(),
  z
    .object({
      kind: z.literal("NOT_COMPOSABLE"),
      authorizesWork: z.literal(false),
      reasonId: z.enum([
        "PROJECTION_INVALID_FORECAST",
        "PROJECTION_BUCKET_NOT_FOUND",
        "PROJECTION_ABOVE_ONE_CYCLE",
      ]),
      bucketId: id,
      expectedBasisPoints: natural.optional(),
    })
    .strict(),
]);
export type ForecastPolicyProjection = z.infer<
  typeof forecastPolicyProjectionSchema
>;

export const forecastErrorComparisonSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("COMPARABLE_FULL_COMPLETION"),
      candidateId: id,
      bucketId: id,
      actualBasisPoints: decimal,
      expectedBasisPoints: positive,
      signedError: z
        .object({
          sign: z.enum(["NEGATIVE", "ZERO", "POSITIVE"]),
          magnitude: forecastExactFractionSchema,
        })
        .strict(),
      absoluteError: forecastExactFractionSchema,
      rangeHit: z.boolean(),
      calibrationRatio: forecastExactFractionSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("NOT_COMPARABLE_FULL_COMPLETION"),
      evidenceRole: z.literal("LOWER_BOUND_ONLY"),
      candidateId: id,
      bucketId: id,
      runOutcome: z.enum(["PARTIAL", "FAILED"]),
      observedActualBasisPoints: decimal.optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("UNAVAILABLE"),
      candidateId: id,
      bucketId: id,
      reasonId: z.enum([
        "COMPARISON_MISSING_RANGE",
        "COMPARISON_ZERO_EXPECTED",
        "COMPARISON_ACTUAL_UNAVAILABLE_OR_INCOMPATIBLE",
        "COMPARISON_SUPERSEDED_OR_INVALID",
      ]),
    })
    .strict(),
]);
export type ForecastErrorComparison = z.infer<
  typeof forecastErrorComparisonSchema
>;
