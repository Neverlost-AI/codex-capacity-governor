import { randomUUID } from "node:crypto";
import {
  canonicalizeComposed,
  governedLinkSchema,
  governedObservationSchema,
} from "@capacity-governor/contracts";
import type { GovernedRepository } from "@capacity-governor/application";
import { asc, eq, sql } from "drizzle-orm";
import type { AppDatabase } from "./database";
import {
  hasGovernedRunAccess,
  hasProjectAccess,
  localOwnerKey,
} from "./ownership";
import {
  governedBucketUsage,
  governedOutcomeVersions,
  governedRuns,
  composedPreflightRevisions,
  preflightEvaluationAttempts,
} from "./schema";

export const createGovernedRepository = (
  db: AppDatabase,
  ownerKey = localOwnerKey,
): GovernedRepository => {
  const readLink = (row: typeof governedRuns.$inferSelect) => {
    const link = governedLinkSchema.parse(row.snapshot);
    if (
      link.id !== row.id ||
      link.projectId !== row.projectId ||
      link.attemptId !== row.attemptId ||
      link.confirmedAt !== row.confirmedAt.toISOString()
    )
      throw new Error("Governed link storage mismatch");
    return link;
  };
  const readObservation = async (
    row: typeof governedOutcomeVersions.$inferSelect,
  ) => {
    const item = governedObservationSchema.parse(row.snapshot);
    if (
      item.id !== row.id ||
      item.runId !== row.runId ||
      (item.predecessorId ?? null) !== row.predecessorId ||
      item.recordedAt !== row.recordedAt.toISOString()
    )
      throw new Error("Governed outcome storage mismatch");
    const usage = await db
      .select()
      .from(governedBucketUsage)
      .where(eq(governedBucketUsage.outcomeId, item.id));
    const compact = (value: (typeof item.usage)[number]) =>
      canonicalizeComposed([
        value.bucketId,
        value.providerId,
        value.capacityWindowId,
        value.resetCycleId,
        value.category,
        value.rawValue,
        value.rawUnit,
        value.normalizedBasisPoints,
      ]);
    const stored = usage
      .map((value) =>
        canonicalizeComposed([
          value.bucketId,
          value.providerId,
          value.capacityWindowId,
          value.resetCycleId,
          value.category,
          value.rawValue,
          value.rawUnit,
          value.normalizedBasisPoints,
        ]),
      )
      .sort();
    if (
      canonicalizeComposed(stored) !==
      canonicalizeComposed(item.usage.map(compact).sort())
    )
      throw new Error("Governed usage storage mismatch");
    return item;
  };
  return {
    async create(value) {
      const link = governedLinkSchema.parse(value);
      if (!(await hasProjectAccess(db, ownerKey, link.projectId)))
        throw new Error("Project unavailable for owner");
      const [parent] = await db
        .select({ projectId: composedPreflightRevisions.projectId })
        .from(preflightEvaluationAttempts)
        .innerJoin(
          composedPreflightRevisions,
          eq(
            preflightEvaluationAttempts.revisionId,
            composedPreflightRevisions.id,
          ),
        )
        .where(eq(preflightEvaluationAttempts.id, link.attemptId));
      if (parent?.projectId !== link.projectId)
        throw new Error("Attempt unavailable for owner/project");
      await db.insert(governedRuns).values({
        id: link.id,
        projectId: link.projectId,
        attemptId: link.attemptId,
        confirmedAt: new Date(link.confirmedAt),
        snapshot: link,
      });
    },
    async findByAttempt(attemptId) {
      const [row] = await db
        .select()
        .from(governedRuns)
        .where(eq(governedRuns.attemptId, attemptId));
      return row && (await hasProjectAccess(db, ownerKey, row.projectId))
        ? readLink(row)
        : null;
    },
    async find(runId) {
      const [row] = await db
        .select()
        .from(governedRuns)
        .where(eq(governedRuns.id, runId));
      return row && (await hasProjectAccess(db, ownerKey, row.projectId))
        ? readLink(row)
        : null;
    },
    async list(projectId) {
      if (!(await hasProjectAccess(db, ownerKey, projectId))) return [];
      const rows = await db
        .select()
        .from(governedRuns)
        .where(eq(governedRuns.projectId, projectId))
        .orderBy(asc(governedRuns.confirmedAt));
      return rows.map(readLink);
    },
    async append(value, expectedPredecessorId) {
      const item = governedObservationSchema.parse(value);
      if (!(await hasGovernedRunAccess(db, ownerKey, item.runId)))
        throw new Error("Governed run unavailable for owner");
      return db.transaction(async (tx) => {
        // Serialize concurrent outcomes for this run without locking an immutable
        // evidence row: SELECT FOR UPDATE would require UPDATE on governed_runs.
        // The transaction-scoped advisory lock is keyed by the stable run UUID;
        // unique indexes remain the final one-initial/one-successor guard.
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext('capacity-governor-outcome'), hashtext(${item.runId}))`,
        );
        const [run] = await tx
          .select({ id: governedRuns.id })
          .from(governedRuns)
          .where(eq(governedRuns.id, item.runId));
        if (!run) throw new Error("Governed run missing");
        const versions = await tx
          .select({
            id: governedOutcomeVersions.id,
            predecessorId: governedOutcomeVersions.predecessorId,
          })
          .from(governedOutcomeVersions)
          .where(eq(governedOutcomeVersions.runId, item.runId));
        const predecessors = new Set(
          versions
            .map((row) => row.predecessorId)
            .filter((id): id is string => id !== null),
        );
        const current = versions.find((row) => !predecessors.has(row.id));
        if (
          (current?.id ?? undefined) !== expectedPredecessorId ||
          item.predecessorId !== expectedPredecessorId
        )
          return false;
        await tx.insert(governedOutcomeVersions).values({
          id: item.id,
          runId: item.runId,
          predecessorId: item.predecessorId ?? null,
          recordedAt: new Date(item.recordedAt),
          snapshot: item,
        });
        if (item.usage.length)
          await tx.insert(governedBucketUsage).values(
            item.usage.map((entry) => ({
              id: randomUUID(),
              outcomeId: item.id,
              bucketId: entry.bucketId,
              providerId: entry.providerId,
              capacityWindowId: entry.capacityWindowId,
              resetCycleId: entry.resetCycleId,
              category: entry.category,
              rawValue: entry.rawValue,
              rawUnit: entry.rawUnit,
              normalizedBasisPoints: entry.normalizedBasisPoints,
            })),
          );
        return true;
      });
    },
    async observations(runId) {
      if (!(await hasGovernedRunAccess(db, ownerKey, runId))) return [];
      const rows = await db
        .select()
        .from(governedOutcomeVersions)
        .where(eq(governedOutcomeVersions.runId, runId))
        .orderBy(
          asc(governedOutcomeVersions.recordedAt),
          asc(governedOutcomeVersions.id),
        );
      return Promise.all(rows.map(readObservation));
    },
  };
};
