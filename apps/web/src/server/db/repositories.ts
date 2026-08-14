import {
  preflightDraftSchema,
  projectSchema,
  type PreflightDraft,
  type Project,
  type ReservePreference,
} from "@capacity-governor/contracts";
import type {
  PreflightDraftRepository,
  ProjectRepository,
} from "@capacity-governor/application";
import { desc, eq } from "drizzle-orm";
import type { AppDatabase } from "./database";
import { preflightDrafts, projects } from "./schema";

const toIso = (value: Date): string => value.toISOString();

const mapProject = (row: typeof projects.$inferSelect): Project =>
  projectSchema.parse({
    ...row,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    description: row.description ?? undefined,
  });

const mapReserve = (
  amount: number | null,
  unit: string | null,
  targetShare: number | null,
): ReservePreference | undefined => {
  if (amount === null && unit === null && targetShare === null) {
    return undefined;
  }
  return {
    minimum:
      amount === null || unit === null
        ? undefined
        : { amount, unit, source: "manual" as const },
    targetShare: targetShare ?? undefined,
  };
};

const mapPreflight = (
  row: typeof preflightDrafts.$inferSelect,
): PreflightDraft =>
  preflightDraftSchema.parse({
    id: row.id,
    projectId: row.projectId,
    tranche: {
      id: row.trancheId,
      projectId: row.projectId,
      title: row.trancheTitle,
      brief: row.trancheBrief,
      explicitExclusions: row.explicitExclusions,
      acceptanceCriteria: row.acceptanceCriteria,
    },
    availableBudget: {
      amount: row.availableBudgetAmount,
      unit: row.availableBudgetUnit,
      source: row.availableBudgetSource,
    },
    reset: {
      resetsAt: row.resetAt ? toIso(row.resetAt) : undefined,
      timezone: row.resetTimezone,
      notes: row.resetNotes ?? undefined,
    },
    correctionReserve: mapReserve(
      row.correctionMinimumAmount,
      row.correctionMinimumUnit,
      row.correctionTargetShare,
    ),
    validationReserve: mapReserve(
      row.validationMinimumAmount,
      row.validationMinimumUnit,
      row.validationTargetShare,
    ),
    assumptions: row.assumptions,
    openQuestions: row.openQuestions,
  });

export const createRepositories = (
  db: AppDatabase,
): {
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
} => ({
  projects: {
    async create(project) {
      await db.insert(projects).values({
        ...project,
        description: project.description ?? null,
        createdAt: new Date(project.createdAt),
        updatedAt: new Date(project.updatedAt),
      });
    },
    async findById(id) {
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.id, id))
        .limit(1);
      return rows[0] ? mapProject(rows[0]) : null;
    },
    async list() {
      const rows = await db
        .select()
        .from(projects)
        .orderBy(desc(projects.updatedAt));
      return rows.map(mapProject);
    },
  },
  preflightDrafts: {
    async findByProjectId(projectId) {
      const rows = await db
        .select()
        .from(preflightDrafts)
        .where(eq(preflightDrafts.projectId, projectId))
        .limit(1);
      return rows[0] ? mapPreflight(rows[0]) : null;
    },
    async save(draft) {
      const now = new Date();
      const values: typeof preflightDrafts.$inferInsert = {
        id: draft.id,
        projectId: draft.projectId,
        trancheId: draft.tranche.id,
        trancheTitle: draft.tranche.title,
        trancheBrief: draft.tranche.brief,
        explicitExclusions: draft.tranche.explicitExclusions,
        acceptanceCriteria: draft.tranche.acceptanceCriteria,
        availableBudgetAmount: draft.availableBudget.amount,
        availableBudgetUnit: draft.availableBudget.unit,
        availableBudgetSource: draft.availableBudget.source,
        resetAt: draft.reset.resetsAt ? new Date(draft.reset.resetsAt) : null,
        resetTimezone: draft.reset.timezone,
        resetNotes: draft.reset.notes ?? null,
        correctionMinimumAmount:
          draft.correctionReserve?.minimum?.amount ?? null,
        correctionMinimumUnit: draft.correctionReserve?.minimum?.unit ?? null,
        correctionTargetShare: draft.correctionReserve?.targetShare ?? null,
        validationMinimumAmount:
          draft.validationReserve?.minimum?.amount ?? null,
        validationMinimumUnit: draft.validationReserve?.minimum?.unit ?? null,
        validationTargetShare: draft.validationReserve?.targetShare ?? null,
        assumptions: draft.assumptions,
        openQuestions: draft.openQuestions,
        createdAt: now,
        updatedAt: now,
      };

      await db
        .insert(preflightDrafts)
        .values(values)
        .onConflictDoUpdate({
          target: preflightDrafts.projectId,
          set: {
            trancheTitle: values.trancheTitle,
            trancheBrief: values.trancheBrief,
            explicitExclusions: values.explicitExclusions,
            acceptanceCriteria: values.acceptanceCriteria,
            availableBudgetAmount: values.availableBudgetAmount,
            availableBudgetUnit: values.availableBudgetUnit,
            availableBudgetSource: values.availableBudgetSource,
            resetAt: values.resetAt,
            resetTimezone: values.resetTimezone,
            resetNotes: values.resetNotes,
            correctionMinimumAmount: values.correctionMinimumAmount,
            correctionMinimumUnit: values.correctionMinimumUnit,
            correctionTargetShare: values.correctionTargetShare,
            validationMinimumAmount: values.validationMinimumAmount,
            validationMinimumUnit: values.validationMinimumUnit,
            validationTargetShare: values.validationTargetShare,
            assumptions: values.assumptions,
            openQuestions: values.openQuestions,
            updatedAt: now,
          },
        });

      await db
        .update(projects)
        .set({ updatedAt: now })
        .where(eq(projects.id, draft.projectId));
    },
  },
});
