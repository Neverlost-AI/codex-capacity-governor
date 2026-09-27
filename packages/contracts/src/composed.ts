import { z } from "zod";
import {
  forecastWorkItemSchema,
  gateBV1ConfigurationSchema,
  forecastEvaluationOutcomeSchema,
  forecastPolicyProjectionSchema,
} from "./forecast";
import {
  requiredCapacityBucketSchema,
  knownCapacityActivitySchema,
  gateAV1ConfigurationSchema,
  policyTimestampSchema,
  policyEvaluationOutcomeSchema,
  bucketResetEvidenceSchema,
} from "./policy";

// Factual strings are preserved verbatim. Canonicalization does not trim or normalize Unicode.
const text = z
  .string()
  .min(1)
  .refine((value) => value.trim().length > 0);
const identity = text.refine(
  (value) => value.trim() === value,
  "Identity must not contain surrounding whitespace",
);
const reset = z.discriminatedUnion("kind", [
  bucketResetEvidenceSchema.options[0],
  bucketResetEvidenceSchema.options[1].extend({ notes: text.optional() }),
  bucketResetEvidenceSchema.options[2].extend({ notes: text.optional() }),
  bucketResetEvidenceSchema.options[3].extend({ sourceTimezone: text }),
]);
export const composedInputSchema = z
  .object({
    projectId: z.uuid(),
    preflightDraftId: z.uuid(),
    repositoryReference: text,
    title: text,
    brief: text,
    explicitExclusions: z.array(text),
    acceptanceCriteria: z.array(text).min(1),
    workItems: z
      .array(
        forecastWorkItemSchema
          .omit({ reviewedCharacterization: true })
          .extend({ label: text, workItemId: identity }),
      )
      .min(1),
    buckets: z
      .array(
        requiredCapacityBucketSchema
          .omit({ implementationDemand: true, uncertainty: true })
          .extend({
            bucketId: identity,
            providerId: identity,
            capacityWindowId: identity,
            resetCycleId: identity,
            reset,
            profile: z
              .object({
                status: z.enum(["COMPLETE", "ACCEPTED_INCOMPLETE"]),
                evidenceReference: text,
              })
              .strict(),
          }),
      )
      .min(1),
    knownCapacityActivities: z.array(
      knownCapacityActivitySchema.extend({
        eventId: identity,
        affectedBucketIds: z.array(identity).min(1),
        source: text,
      }),
    ),
    activeMandatoryStopIds: z.array(identity),
    minimumCoherentScope: z.boolean(),
    predecessorRevisionId: z.uuid().optional(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const unique = (values: string[], path: string) => {
      if (new Set(values).size !== values.length)
        ctx.addIssue({
          code: "custom",
          path: [path],
          message: "Duplicate identity",
        });
    };
    unique(
      input.workItems.map((item) => item.workItemId),
      "workItems",
    );
    unique(
      input.buckets.map((bucket) => bucket.bucketId),
      "buckets",
    );
    unique(
      input.buckets.map((bucket) =>
        JSON.stringify([
          bucket.providerId,
          bucket.capacityWindowId,
          bucket.resetCycleId,
        ]),
      ),
      "buckets",
    );
    unique(
      input.knownCapacityActivities.map((event) => event.eventId),
      "knownCapacityActivities",
    );
    for (const event of input.knownCapacityActivities) {
      unique(event.affectedBucketIds, "knownCapacityActivities");
      if (
        event.affectedBucketIds.some(
          (id) => !input.buckets.some((bucket) => bucket.bucketId === id),
        )
      )
        ctx.addIssue({
          code: "custom",
          path: ["knownCapacityActivities"],
          message: "Unknown affected bucket",
        });
    }
  });
export type ComposedInput = z.infer<typeof composedInputSchema>;
export const composedRevisionSchema = z
  .object({
    id: z.uuid(),
    parentTrancheId: z.uuid(),
    input: composedInputSchema,
    forecastConfiguration: gateBV1ConfigurationSchema,
    policyConfiguration: gateAV1ConfigurationSchema,
  })
  .strict();
export type ComposedRevision = z.infer<typeof composedRevisionSchema>;
export const confirmationReceiptSchema = z
  .object({
    id: z.uuid(),
    revisionId: z.uuid(),
    canonicalDigest: z.string().regex(/^[a-f0-9]{64}$/),
    canonicalizationVersion: z.literal("sorted-json-v1"),
    accessBoundaryVersion: z.literal("local-pairing-v1"),
    actorReference: text,
    recordedAt: policyTimestampSchema,
    confirmedWorkInputs: z.literal(true),
    confirmedRequiredBuckets: z.literal(true),
    minimumCoherentScope: z.boolean(),
    buckets: z
      .array(
        z
          .object({
            bucketId: text,
            providerId: text,
            capacityWindowId: text,
            resetCycleId: text,
          })
          .strict(),
      )
      .min(1),
  })
  .strict();
export type ConfirmationReceipt = z.infer<typeof confirmationReceiptSchema>;
export const composedAttemptSchema = z
  .object({
    id: z.uuid(),
    revision: composedRevisionSchema,
    receipt: confirmationReceiptSchema,
    evaluationTime: policyTimestampSchema,
    recordedAt: policyTimestampSchema,
    forecast: forecastEvaluationOutcomeSchema,
    projections: z.array(forecastPolicyProjectionSchema),
    policy: policyEvaluationOutcomeSchema.optional(),
  })
  .strict()
  .superRefine((attempt, ctx) => {
    const { revision, receipt } = attempt;
    const identities = (buckets: ConfirmationReceipt["buckets"]) =>
      buckets
        .map((bucket) =>
          JSON.stringify([
            bucket.bucketId,
            bucket.providerId,
            bucket.capacityWindowId,
            bucket.resetCycleId,
          ]),
        )
        .sort();
    if (
      receipt.revisionId !== revision.id ||
      JSON.stringify(identities(receipt.buckets)) !==
        JSON.stringify(identities(revision.input.buckets)) ||
      receipt.minimumCoherentScope !== revision.input.minimumCoherentScope ||
      Date.parse(receipt.recordedAt) > Date.parse(attempt.evaluationTime) ||
      Date.parse(attempt.evaluationTime) > Date.parse(attempt.recordedAt)
    )
      ctx.addIssue({
        code: "custom",
        message: "Receipt/context/time mismatch",
      });
    if (attempt.forecast.kind === "INPUT_REJECTION") {
      if (
        attempt.forecast.scopeTrancheId !== undefined &&
        attempt.forecast.scopeTrancheId !== revision.id
      )
        ctx.addIssue({
          code: "custom",
          message: "Rejected forecast scope mismatch",
        });
      if (attempt.policy || attempt.projections.length)
        ctx.addIssue({
          code: "custom",
          message: "Rejected forecast cannot have policy/projections",
        });
    } else {
      for (const projection of attempt.projections) {
        const bucketId =
          projection.kind === "NOT_COMPOSABLE"
            ? projection.bucketId
            : projection.bucket.bucketId;
        const original = revision.input.buckets.find(
          (bucket) => bucket.bucketId === bucketId,
        );
        if (
          !original ||
          (projection.kind === "POLICY_DEMAND_EVIDENCE" &&
            (projection.scopeTrancheId !== revision.id ||
              JSON.stringify(identities([projection.bucket])) !==
                JSON.stringify(identities([original])) ||
              canonicalizeComposed(projection.requiredBucketAuthority) !==
                canonicalizeComposed(attempt.forecast.requiredBucketAuthority)))
        )
          ctx.addIssue({
            code: "custom",
            message: "Projection identity/scope/authority mismatch",
          });
      }
      if (
        attempt.forecast.scopeTrancheId !== revision.id ||
        attempt.forecast.evaluationTime !== attempt.evaluationTime ||
        JSON.stringify(
          identities(
            attempt.forecast.bucketResults.map((result) => result.bucket),
          ),
        ) !== JSON.stringify(identities(revision.input.buckets))
      )
        ctx.addIssue({ code: "custom", message: "Forecast context mismatch" });
      if (
        attempt.projections.length !== revision.input.buckets.length ||
        new Set(
          attempt.projections.map((projection) =>
            projection.kind === "NOT_COMPOSABLE"
              ? projection.bucketId
              : projection.bucket.bucketId,
          ),
        ).size !== revision.input.buckets.length
      )
        ctx.addIssue({ code: "custom", message: "Projection bucket mismatch" });
      if (
        attempt.projections.some(
          (projection) => projection.kind === "NOT_COMPOSABLE",
        )
          ? !!attempt.policy
          : !attempt.policy
      )
        ctx.addIssue({
          code: "custom",
          message: "Composition family mismatch",
        });
      if (
        attempt.policy?.kind === "POLICY_EVALUATION" &&
        (attempt.policy.scopeTrancheId !== revision.id ||
          attempt.policy.evaluationTime !== attempt.evaluationTime ||
          JSON.stringify(identities(attempt.policy.bucketResults)) !==
            JSON.stringify(identities(revision.input.buckets)) ||
          canonicalizeComposed(attempt.policy.configuration) !==
            canonicalizeComposed(revision.policyConfiguration) ||
          attempt.policy.requiredBucketAuthority.actorReference !==
            receipt.actorReference ||
          attempt.policy.minimumCoherentScope.actorReference !==
            receipt.actorReference ||
          attempt.policy.minimumCoherentScope.attestedValue !==
            receipt.minimumCoherentScope ||
          attempt.policy.requiredBucketAuthority.provenance
            .evidenceReference !== receipt.id ||
          attempt.policy.minimumCoherentScope.provenance.evidenceReference !==
            receipt.id)
      )
        ctx.addIssue({
          code: "custom",
          message: "Policy context/receipt/configuration mismatch",
        });
    }
  });
export type ComposedAttempt = z.infer<typeof composedAttemptSchema>;

/** sorted-json-v1: recursively sort object keys by UTF-16 code-unit ordering;
 * preserve arrays, exact strings/numbers/booleans/null; omit absent undefined keys.
 * Inputs are validated JSON records, never runtime objects or secret tokens. */
export const canonicalizeComposed = (value: unknown): string => {
  if (Array.isArray(value))
    return `[${value.map(canonicalizeComposed).join(",")}]`;
  if (value !== null && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(
        ([key, item]) => `${JSON.stringify(key)}:${canonicalizeComposed(item)}`,
      )
      .join(",")}}`;
  return JSON.stringify(value);
};
