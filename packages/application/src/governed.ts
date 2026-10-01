import {
  canonicalizeComposed,
  composedAttemptSchema,
  governedHistorySchema,
  governedLinkSchema,
  governedObservationSchema,
  governedOutcomeInputSchema,
  type ComposedAttempt,
  type GovernedHistory,
  type GovernedLink,
  type GovernedObservation,
  type GovernedOutcomeInput,
  type GovernedUsage,
} from "@capacity-governor/contracts";
import { compareForecastWithRunV1 } from "@capacity-governor/forecast-engine";
import { evaluateComposedSnapshot, type ComposedRepository } from "./composed";
import type { PreflightDraftRepository, ProjectRepository } from "./ports";

const identity = (value: {
  bucketId: string;
  providerId: string;
  capacityWindowId: string;
  resetCycleId: string;
}) =>
  JSON.stringify([
    value.bucketId,
    value.providerId,
    value.capacityWindowId,
    value.resetCycleId,
  ]);
const sortedIdentities = (
  values: {
    bucketId: string;
    providerId: string;
    capacityWindowId: string;
    resetCycleId: string;
  }[],
) => values.map(identity).sort();

/** Compare ISO instants without discarding fractional precision below a millisecond. */
const isTimestampAfter = (observedAt: string, recordedAt: string): boolean => {
  const parts = (value: string) => {
    const match = /^(.+:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
    if (!match) throw new Error("Invalid observation timestamp");
    const wholeSecond = Date.parse(`${match[1]}${match[3]}`);
    if (!Number.isFinite(wholeSecond))
      throw new Error("Invalid observation timestamp");
    return { wholeSecond, fraction: match[2] ?? "" };
  };
  const observed = parts(observedAt);
  const recorded = parts(recordedAt);
  if (observed.wholeSecond !== recorded.wholeSecond)
    return observed.wholeSecond > recorded.wholeSecond;
  const length = Math.max(observed.fraction.length, recorded.fraction.length);
  return (
    observed.fraction.padEnd(length, "0") >
    recorded.fraction.padEnd(length, "0")
  );
};

/** Exact decimal multiplication by 100. Never passes a factual amount through Number. */
export const normalizeManualUsage = (
  raw: string,
  unit: "PERCENT" | "BASIS_POINTS",
): string => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(raw) || raw.length > 128)
    throw new Error("Invalid nonnegative decimal");
  if (unit !== "PERCENT" && unit !== "BASIS_POINTS")
    throw new Error("Unsupported unit");
  const [whole, fractional = ""] = raw.split(".");
  const scale = fractional.length;
  const numerator =
    BigInt(whole + fractional) * (unit === "PERCENT" ? 100n : 1n);
  const padded = numerator.toString().padStart(scale + 1, "0");
  if (!scale) return padded;
  const normalized = `${padded.slice(0, -scale)}.${padded.slice(-scale)}`;
  return normalized.replace(/\.0+$|(?<=\.[0-9]*[1-9])0+$/g, "");
};

export interface GovernedRepository {
  create(link: GovernedLink): Promise<void>;
  findByAttempt(attemptId: string): Promise<unknown | null>;
  find(runId: string): Promise<unknown | null>;
  list(projectId: string): Promise<unknown[]>;
  append(
    observation: GovernedObservation,
    expectedPredecessorId?: string,
  ): Promise<boolean>;
  observations(runId: string): Promise<unknown[]>;
}
export interface GovernedDependencies {
  governed: GovernedRepository;
  composed: ComposedRepository;
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
  createId(): string;
  now(): Date;
  digest(content: string): string;
}
type EligibleAttempt = ComposedAttempt & {
  forecast: Extract<
    ComposedAttempt["forecast"],
    { kind: "FORECAST_EVALUATION" }
  >;
  policy: Extract<
    NonNullable<ComposedAttempt["policy"]>,
    { kind: "POLICY_EVALUATION" }
  >;
};
export const eligibleGovernedAttempt = (
  attempt: ComposedAttempt,
): attempt is EligibleAttempt =>
  attempt.forecast.kind === "FORECAST_EVALUATION" &&
  attempt.policy?.kind === "POLICY_EVALUATION";

const comparisonsFor = (
  link: GovernedLink,
  attempt: ComposedAttempt,
  runOutcome: GovernedObservation["runOutcome"],
  usage: GovernedUsage[],
  observationId: string,
  recordedAt: string,
): GovernedObservation["comparisons"] => {
  const issued = attempt.forecast;
  if (issued.kind !== "FORECAST_EVALUATION")
    throw new Error("Issued forecast unavailable");
  return issued.bucketResults.map((forecast) => {
    const bucket = forecast.bucket;
    const actual = usage.find(
      (item) =>
        item.bucketId === bucket.bucketId && item.category === "IMPLEMENTATION",
    );
    const compatible =
      actual &&
      identity(actual) === identity(bucket) &&
      actual.bucketProfileVersion === bucket.bucketProfileVersion &&
      actual.exactCycleOnly === "YES";
    const candidate = {
      candidateId: `${observationId}:${bucket.bucketId}`,
      runId: link.id,
      projectId: link.projectId,
      repositoryId: attempt.revision.input.repositoryReference,
      bucket: {
        bucketId: bucket.bucketId,
        providerId: bucket.providerId,
        capacityWindowId: bucket.capacityWindowId,
        resetCycleId: bucket.resetCycleId,
        bucketProfileVersion: bucket.bucketProfileVersion,
      },
      methodVersion: issued.configuration.methodVersion,
      configurationVersion: issued.configuration.configurationVersion,
      originalRange: forecast.roundedRange,
      runOutcome,
      normalizedActualImplementation: compatible
        ? {
            category: "IMPLEMENTATION" as const,
            amountBasisPoints: actual.normalizedBasisPoints,
            bucketId: bucket.bucketId,
            bucketProfileVersion: bucket.bucketProfileVersion,
            reviewedNormalizationReference: `${observationId}:${bucket.bucketId}:IMPLEMENTATION`,
          }
        : undefined,
      recordedAt,
      currentEvidence: true,
      evidenceReference: observationId,
    };
    return {
      bucketId: bucket.bucketId,
      comparison: compareForecastWithRunV1(candidate),
      ...(actual && !compatible
        ? {
            unavailableDetail:
              actual.exactCycleOnly !== "YES"
                ? ("CROSS_RESET_OR_UNRELATED" as const)
                : ("BUCKET_OR_PROFILE_MISMATCH" as const),
          }
        : !actual
          ? { unavailableDetail: "MISSING_IMPLEMENTATION" as const }
          : {}),
    };
  });
};

export const createGovernedService = (dependencies: GovernedDependencies) => {
  const attemptFor = async (projectId: string, attemptId: string) => {
    const raw = await dependencies.composed.find(attemptId);
    if (!raw) throw new Error("Saved attempt not found");
    // The composed service is the authoritative integrity reader; this service also
    // checks the immutable digest and all link identities before recording.
    const attempt = composedAttemptSchema.parse(raw);
    if (
      attempt.revision.input.projectId !== projectId ||
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
      throw new Error("Attempt ownership or digest mismatch");
    const project = await dependencies.projects.findById(projectId);
    const draft = attempt.revision.input.preflightDraftId
      ? await dependencies.preflightDrafts.findById(
          attempt.revision.input.preflightDraftId,
        )
      : undefined;
    if (
      !project ||
      (attempt.revision.input.preflightDraftId &&
        (!draft ||
          draft.projectId !== projectId ||
          draft.tranche.id !== attempt.revision.parentTrancheId))
    )
      throw new Error("Project/draft mismatch");
    return attempt;
  };
  const verifiedLink = async (
    raw: unknown,
  ): Promise<{ link: GovernedLink; attempt: ComposedAttempt }> => {
    const link = governedLinkSchema.parse(raw);
    const attempt = await attemptFor(link.projectId, link.attemptId);
    if (!eligibleGovernedAttempt(attempt))
      throw new Error("Ineligible linked attempt");
    if (
      link.revisionId !== attempt.revision.id ||
      link.receiptId !== attempt.receipt.id ||
      link.receiptDigest !== attempt.receipt.canonicalDigest ||
      link.preflightDraftId !== attempt.revision.input.preflightDraftId ||
      canonicalizeComposed(sortedIdentities(link.bucketIdentities)) !==
        canonicalizeComposed(sortedIdentities(attempt.receipt.buckets)) ||
      link.decision !== attempt.policy.aggregateDecision ||
      link.authorizesWork !== attempt.policy.authorizesWork
    )
      throw new Error("Governed link integrity mismatch");
    return { link, attempt };
  };
  const observation = (
    link: GovernedLink,
    attempt: ComposedAttempt,
    input: GovernedOutcomeInput,
    actor: string,
    predecessorId?: string,
    amendmentReason?: string,
  ): GovernedObservation => {
    const parsed = governedOutcomeInputSchema.parse(input);
    const now = dependencies.now().toISOString();
    if (parsed.adherence === "FOLLOWED" && link.decision !== "PROCEED")
      throw new Error("FOLLOWED requires original PROCEED");
    if (
      parsed.remainingCapacity &&
      isTimestampAfter(parsed.remainingCapacity.observedAt, now)
    )
      throw new Error("Future remaining observation");
    const usage: GovernedUsage[] = parsed.usage.map((entry) => {
      if (isTimestampAfter(entry.observedAt, now))
        throw new Error("Future usage observation");
      const required = attempt.revision.input.buckets.find(
        (bucket) => bucket.bucketId === entry.bucketId,
      );
      if (!required) throw new Error("Usage bucket is not in linked attempt");
      return {
        bucketId: entry.bucketId,
        providerId: entry.providerId,
        capacityWindowId: entry.capacityWindowId,
        resetCycleId: entry.resetCycleId,
        bucketProfileVersion: entry.bucketProfileVersion,
        category: entry.category,
        rawValue: entry.rawValue,
        rawUnit: entry.rawUnit,
        sourceReference: entry.sourceReference,
        observedAt: entry.observedAt,
        exactCycleOnly: entry.exactCycleOnly,
        normalizedBasisPoints: normalizeManualUsage(
          entry.rawValue,
          entry.rawUnit,
        ),
        reviewedBy: actor,
        reviewedAt: now,
        normalizationVersion: "manual-percent-bp-v1",
      };
    });
    const id = dependencies.createId();
    const comparisons = comparisonsFor(
      link,
      attempt,
      parsed.runOutcome,
      usage,
      id,
      now,
    );
    return governedObservationSchema.parse({
      ...parsed,
      usage,
      id,
      runId: link.id,
      predecessorId,
      amendmentReason,
      recordedAt: now,
      reviewerActorReference: actor,
      comparisons,
    });
  };
  return {
    async review(projectId: string, attemptId: string) {
      const attempt = await attemptFor(projectId, attemptId);
      if (!eligibleGovernedAttempt(attempt))
        throw new Error("Attempt cannot establish governed run");
      if (await dependencies.governed.findByAttempt(attemptId))
        throw new Error("Attempt already linked");
      return attempt;
    },
    async create(
      projectId: string,
      attemptId: string,
      actor: string,
      confirmationReference: string,
    ) {
      const attempt = await this.review(projectId, attemptId);
      if (!eligibleGovernedAttempt(attempt))
        throw new Error("Ineligible attempt");
      const link = governedLinkSchema.parse({
        id: dependencies.createId(),
        projectId,
        preflightDraftId: attempt.revision.input.preflightDraftId,
        attemptId,
        revisionId: attempt.revision.id,
        receiptId: attempt.receipt.id,
        receiptDigest: attempt.receipt.canonicalDigest,
        resultFamily: "POLICY_EVALUATION",
        bucketIdentities: attempt.receipt.buckets,
        decision: attempt.policy.aggregateDecision,
        authorizesWork: attempt.policy.authorizesWork,
        actorReference: actor,
        confirmedAt: dependencies.now().toISOString(),
        confirmationReference,
      });
      await dependencies.governed.create(link);
      return link;
    },
    async record(runId: string, input: GovernedOutcomeInput, actor: string) {
      const raw = await dependencies.governed.find(runId);
      if (!raw) throw new Error("Governed run not found");
      const { link, attempt } = await verifiedLink(raw);
      const next = observation(link, attempt, input, actor);
      if (!(await dependencies.governed.append(next)))
        throw new Error("Initial outcome exists");
      return next;
    },
    async amend(
      runId: string,
      predecessorId: string,
      reason: string,
      input: GovernedOutcomeInput,
      actor: string,
    ) {
      if (!reason.trim()) throw new Error("Amendment reason required");
      const raw = await dependencies.governed.find(runId);
      if (!raw) throw new Error("Governed run not found");
      const { link, attempt } = await verifiedLink(raw);
      const next = observation(
        link,
        attempt,
        input,
        actor,
        predecessorId,
        reason,
      );
      if (!(await dependencies.governed.append(next, predecessorId)))
        throw new Error("Stale amendment");
      return next;
    },
    async reopen(runId: string): Promise<GovernedHistory> {
      const raw = await dependencies.governed.find(runId);
      if (!raw) throw new Error("Governed run not found");
      const { link, attempt } = await verifiedLink(raw);
      const unsorted = (await dependencies.governed.observations(runId)).map(
        (entry) => governedObservationSchema.parse(entry),
      );
      const observations: GovernedObservation[] = [];
      let previous: string | undefined;
      while (observations.length < unsorted.length) {
        const item = unsorted.find(
          (entry) =>
            entry.predecessorId === previous &&
            !observations.some((seen) => seen.id === entry.id),
        );
        if (!item) throw new Error("Outcome chain integrity mismatch");
        if (
          item.runId !== link.id ||
          item.predecessorId !== previous ||
          (previous === undefined) !== (item.amendmentReason === undefined)
        )
          throw new Error("Outcome chain integrity mismatch");
        observations.push(item);
        previous = item.id;
      }
      for (const item of observations) {
        if (
          (item.adherence === "FOLLOWED" && link.decision !== "PROCEED") ||
          (item.remainingCapacity &&
            isTimestampAfter(
              item.remainingCapacity.observedAt,
              item.recordedAt,
            )) ||
          item.usage.some(
            (entry) =>
              entry.reviewedBy !== item.reviewerActorReference ||
              entry.reviewedAt !== item.recordedAt ||
              isTimestampAfter(entry.observedAt, item.recordedAt) ||
              entry.normalizationVersion !== "manual-percent-bp-v1" ||
              entry.normalizedBasisPoints !==
                normalizeManualUsage(entry.rawValue, entry.rawUnit) ||
              !attempt.revision.input.buckets.some(
                (bucket) => bucket.bucketId === entry.bucketId,
              ),
          ) ||
          canonicalizeComposed(item.comparisons) !==
            canonicalizeComposed(
              comparisonsFor(
                link,
                attempt,
                item.runOutcome,
                item.usage,
                item.id,
                item.recordedAt,
              ),
            )
        )
          throw new Error("Governed outcome evidence integrity mismatch");
      }
      return governedHistorySchema.parse({ link, attempt, observations });
    },
    async list(projectId: string): Promise<GovernedHistory[]> {
      const rows = await dependencies.governed.list(projectId);
      return Promise.all(
        rows.map(async (row) => {
          const link = governedLinkSchema.parse(row);
          if (link.projectId !== projectId)
            throw new Error("Governed project mismatch");
          return this.reopen(link.id);
        }),
      );
    },
  };
};
