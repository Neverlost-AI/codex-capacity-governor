import {
  canonicalizeComposed,
  composedInputSchema,
  composedRevisionSchema,
  composedAttemptSchema,
  confirmationReceiptSchema,
  type ComposedRevision,
  type ComposedAttempt,
  type ConfirmationReceipt,
  type GateAV1Configuration,
  type GateBV1Configuration,
} from "@capacity-governor/contracts";
import {
  evaluateForecastV1,
  projectForecastToPolicyDemandV1,
} from "@capacity-governor/forecast-engine";
import { evaluatePolicyV1 } from "@capacity-governor/policy-engine";
import type { ProjectRepository, PreflightDraftRepository } from "./ports";

export interface ComposedRepository {
  save(attempt: ComposedAttempt): Promise<ComposedAttempt>;
  find(id: string): Promise<unknown | null>;
  list(projectId: string): Promise<unknown[]>;
}
export interface ComposedDependencies {
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
  composed: ComposedRepository;
  createId(): string;
  now(): Date;
  digest(content: string): string;
  forecastConfiguration: GateBV1Configuration;
  policyConfiguration: GateAV1Configuration;
}
export class EvidenceIntegrityError extends Error {
  constructor() {
    super(
      "Stored preflight evidence failed integrity validation. It is not current guidance.",
    );
    this.name = "EvidenceIntegrityError";
  }
}

/** Rebuild real engine inputs solely from the immutable server review and receipt. */
export const evaluateComposedSnapshot = (
  revision: ComposedRevision,
  receipt: ConfirmationReceipt,
  evaluationTime: string,
) => {
  const evidenceReference = receipt.id;
  const authority = {
    scopeTrancheId: revision.id,
    actorReference: receipt.actorReference,
    recordedAt: receipt.recordedAt,
    requiredBucketIds: receipt.buckets.map((bucket) => bucket.bucketId),
  };
  const forecast = evaluateForecastV1({
    scopeTrancheId: revision.id,
    projectId: revision.input.projectId,
    repositoryId: revision.input.repositoryReference,
    evaluationTime,
    configuration: revision.forecastConfiguration,
    requiredBucketAuthority: {
      ...authority,
      kind: "UPSTREAM_TRUSTED_BOUNDARY",
      projectId: revision.input.projectId,
      repositoryId: revision.input.repositoryReference,
      evidenceReference,
    },
    workItems: revision.input.workItems.map((item) => ({
      ...item,
      reviewedCharacterization: {
        kind: "UPSTREAM_REVIEWED_CHARACTERIZATION",
        scopeTrancheId: revision.id,
        source: "manual local paired session",
        actorReference: receipt.actorReference,
        evidenceReference,
        reviewedAt: receipt.recordedAt,
      },
    })),
    requiredBuckets: revision.input.buckets.map((bucket) => ({
      bucketId: bucket.bucketId,
      providerId: bucket.providerId,
      capacityWindowId: bucket.capacityWindowId,
      resetCycleId: bucket.resetCycleId,
      bucketProfileVersion: revision.forecastConfiguration.bucketProfileVersion,
      profileEvidence:
        bucket.profile.status === "COMPLETE"
          ? bucket.profile
          : {
              ...bucket.profile,
              acceptedForV1Forecast: true,
              actorReference: receipt.actorReference,
              recordedAt: receipt.recordedAt,
            },
    })),
    calibrationCandidates: [],
  });
  const projections =
    forecast.kind === "FORECAST_EVALUATION"
      ? revision.input.buckets.map((bucket) =>
          projectForecastToPolicyDemandV1(forecast, bucket.bucketId),
        )
      : [];
  if (
    forecast.kind === "INPUT_REJECTION" ||
    projections.some((projection) => projection.kind === "NOT_COMPOSABLE")
  )
    return { forecast, projections };
  const policy = evaluatePolicyV1({
    scopeTrancheId: revision.id,
    evaluationTime,
    configuration: revision.policyConfiguration,
    requiredBucketAuthority: {
      ...authority,
      provenance: { kind: "UPSTREAM_TRUSTED_BOUNDARY", evidenceReference },
    },
    minimumCoherentScope: {
      scopeTrancheId: revision.id,
      actorReference: receipt.actorReference,
      recordedAt: receipt.recordedAt,
      attestedValue: receipt.minimumCoherentScope,
      provenance: { kind: "UPSTREAM_TRUSTED_BOUNDARY", evidenceReference },
    },
    requiredCapacityBuckets: revision.input.buckets.map(
      ({ profile: _profile, ...bucket }) => {
        // Forecast-only profile evidence must not enter the Gate A input.
        void _profile;
        const projected = projections.find(
          (projection) =>
            projection.kind === "POLICY_DEMAND_EVIDENCE" &&
            projection.bucket.bucketId === bucket.bucketId,
        );
        if (!projected || projected.kind !== "POLICY_DEMAND_EVIDENCE")
          throw new EvidenceIntegrityError();
        return {
          ...bucket,
          implementationDemand: projected.expectedDemand,
          uncertainty: projected.uncertainty,
        };
      },
    ),
    knownCapacityActivities: revision.input.knownCapacityActivities,
    activeMandatoryStopIds: revision.input.activeMandatoryStopIds,
  });
  return { forecast, projections, policy };
};
export const createComposedService = (dependencies: ComposedDependencies) => {
  const validate = (record: unknown): ComposedAttempt => {
    const parsed = composedAttemptSchema.safeParse(record);
    if (!parsed.success) throw new EvidenceIntegrityError();
    const attempt = parsed.data;
    if (
      dependencies.digest(canonicalizeComposed(attempt.revision)) !==
        attempt.receipt.canonicalDigest ||
      canonicalizeComposed(
        evaluateComposedSnapshot(
          attempt.revision,
          attempt.receipt,
          attempt.evaluationTime,
        ),
      ) !==
        canonicalizeComposed({
          forecast: attempt.forecast,
          projections: attempt.projections,
          ...(attempt.policy ? { policy: attempt.policy } : {}),
        })
    )
      throw new EvidenceIntegrityError();
    return attempt;
  };
  return {
    async prepare(input: unknown): Promise<ComposedRevision> {
      const parsed = composedInputSchema.parse(input);
      const project = await dependencies.projects.findById(parsed.projectId);
      const draft = parsed.preflightDraftId
        ? await dependencies.preflightDrafts.findById(parsed.preflightDraftId)
        : undefined;
      if (!project || (parsed.preflightDraftId && (!draft || draft.projectId !== project.id)))
        throw new Error("Project/draft ownership mismatch");
      if (parsed.predecessorRevisionId) {
        const previous = (await dependencies.composed.list(project.id))
          .map(validate)
          .find(
            (attempt) => attempt.revision.id === parsed.predecessorRevisionId,
          );
        if (!previous || previous.revision.input.preflightDraftId !== parsed.preflightDraftId)
          throw new Error("Predecessor ownership mismatch");
      }
      return composedRevisionSchema.parse({
        id: dependencies.createId(),
        parentTrancheId: draft?.tranche.id ?? dependencies.createId(),
        input: parsed,
        forecastConfiguration: JSON.parse(
          JSON.stringify(dependencies.forecastConfiguration),
        ),
        policyConfiguration: JSON.parse(
          JSON.stringify(dependencies.policyConfiguration),
        ),
      });
    },
    async confirm(
      revision: ComposedRevision,
      actorReference: string,
      digest: string,
    ): Promise<ComposedAttempt> {
      const parsed = composedRevisionSchema.parse(revision);
      if (dependencies.digest(canonicalizeComposed(parsed)) !== digest)
        throw new EvidenceIntegrityError();
      const project = await dependencies.projects.findById(
        parsed.input.projectId,
      );
      const draft = parsed.input.preflightDraftId
        ? await dependencies.preflightDrafts.findById(parsed.input.preflightDraftId)
        : undefined;
      if (
        !project ||
        (parsed.input.preflightDraftId &&
          (!draft ||
            draft.projectId !== project.id ||
            draft.tranche.id !== parsed.parentTrancheId))
      )
        throw new Error("Project/draft ownership mismatch");
      const evaluationTime = dependencies.now().toISOString();
      const receipt = confirmationReceiptSchema.parse({
        id: dependencies.createId(),
        revisionId: parsed.id,
        canonicalDigest: digest,
        canonicalizationVersion: "sorted-json-v1",
        accessBoundaryVersion: "local-pairing-v1",
        actorReference,
        recordedAt: evaluationTime,
        confirmedWorkInputs: true,
        confirmedRequiredBuckets: true,
        minimumCoherentScope: parsed.input.minimumCoherentScope,
        buckets: parsed.input.buckets.map(
          ({ bucketId, providerId, capacityWindowId, resetCycleId }) => ({
            bucketId,
            providerId,
            capacityWindowId,
            resetCycleId,
          }),
        ),
      });
      const attempt = validate({
        id: dependencies.createId(),
        revision: parsed,
        receipt,
        evaluationTime,
        recordedAt: evaluationTime,
        ...evaluateComposedSnapshot(parsed, receipt, evaluationTime),
      });
      return validate(await dependencies.composed.save(attempt));
    },
    async reopen(
      projectId: string,
      attemptId: string,
    ): Promise<ComposedAttempt> {
      const record = await dependencies.composed.find(attemptId);
      if (!record) throw new Error("Saved attempt not found");
      const attempt = validate(record);
      if (attempt.revision.input.projectId !== projectId)
        throw new Error("Saved attempt ownership mismatch");
      return attempt;
    },
    async list(projectId: string): Promise<ComposedAttempt[]> {
      return (await dependencies.composed.list(projectId)).map((record) => {
        const attempt = validate(record);
        if (attempt.revision.input.projectId !== projectId)
          throw new EvidenceIntegrityError();
        return attempt;
      });
    },
  };
};
