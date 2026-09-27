import {
  canonicalizeComposed,
  composedAttemptSchema,
} from "@capacity-governor/contracts";
import {
  EvidenceIntegrityError,
  type ComposedRepository,
} from "@capacity-governor/application";
import { eq, asc } from "drizzle-orm";
import type { AppDatabase } from "./database";
import {
  composedPreflightRevisions as revisions,
  preflightEvaluationAttempts as attempts,
  preflightDrafts,
} from "./schema";

export const createComposedRepository = (
  db: AppDatabase,
): ComposedRepository => {
  const map = (row: {
    attempt: typeof attempts.$inferSelect;
    revision: typeof revisions.$inferSelect;
  }) => {
    const parsed = composedAttemptSchema.safeParse(row.attempt.snapshot);
    if (
      !parsed.success ||
      parsed.data.id !== row.attempt.id ||
      parsed.data.revision.id !== row.attempt.revisionId ||
      parsed.data.recordedAt !== row.attempt.recordedAt.toISOString() ||
      canonicalizeComposed(parsed.data.revision) !==
        canonicalizeComposed(row.revision.snapshot) ||
      parsed.data.receipt.canonicalDigest !== row.revision.canonicalDigest ||
      parsed.data.revision.input.projectId !== row.revision.projectId ||
      parsed.data.revision.input.preflightDraftId !==
        row.revision.preflightDraftId
    )
      throw new EvidenceIntegrityError();
    return parsed.data;
  };
  return {
    async save(value) {
      const attempt = composedAttemptSchema.parse(value);
      return db.transaction(async (tx) => {
        const [draft] = await tx
          .select()
          .from(preflightDrafts)
          .where(
            eq(preflightDrafts.id, attempt.revision.input.preflightDraftId),
          );
        if (
          !draft ||
          draft.projectId !== attempt.revision.input.projectId ||
          draft.trancheId !== attempt.revision.parentTrancheId
        )
          throw new Error("Project/draft ownership mismatch");
        const inserted = await tx
          .insert(revisions)
          .values({
            id: attempt.revision.id,
            projectId: attempt.revision.input.projectId,
            preflightDraftId: attempt.revision.input.preflightDraftId,
            canonicalDigest: attempt.receipt.canonicalDigest,
            snapshot: attempt.revision,
          })
          .onConflictDoNothing()
          .returning();
        if (!inserted.length) {
          const [existing] = await tx
            .select({ attempt: attempts, revision: revisions })
            .from(attempts)
            .innerJoin(revisions, eq(attempts.revisionId, revisions.id))
            .where(eq(revisions.id, attempt.revision.id));
          if (!existing) throw new EvidenceIntegrityError();
          const saved = map(existing);
          if (
            saved.receipt.actorReference !== attempt.receipt.actorReference ||
            saved.receipt.canonicalDigest !== attempt.receipt.canonicalDigest ||
            canonicalizeComposed(saved.revision) !==
              canonicalizeComposed(attempt.revision)
          )
            throw new EvidenceIntegrityError();
          return saved;
        }
        await tx.insert(attempts).values({
          id: attempt.id,
          revisionId: attempt.revision.id,
          recordedAt: new Date(attempt.recordedAt),
          snapshot: attempt,
        });
        return attempt;
      });
    },
    async find(id) {
      const [row] = await db
        .select({ attempt: attempts, revision: revisions })
        .from(attempts)
        .innerJoin(revisions, eq(attempts.revisionId, revisions.id))
        .where(eq(attempts.id, id));
      return row ? map(row) : null;
    },
    async list(projectId) {
      return (
        await db
          .select({ attempt: attempts, revision: revisions })
          .from(attempts)
          .innerJoin(revisions, eq(attempts.revisionId, revisions.id))
          .where(eq(revisions.projectId, projectId))
          .orderBy(asc(attempts.recordedAt))
      ).map(map);
    },
  };
};
