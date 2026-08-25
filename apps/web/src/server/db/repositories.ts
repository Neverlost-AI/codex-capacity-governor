import {
  actualCapacityConsumptionSchema,
  developmentRunSchema,
  outcomeObservationWithConsumptionSchema,
  preflightDraftSchema,
  projectSchema,
  runOutcomeObservationSchema,
  type ActualCapacityConsumption,
  type DevelopmentRun,
  type OutcomeObservationWithConsumption,
  type PreflightDraft,
  type Project,
  type ReservePreference,
} from "@capacity-governor/contracts";
import type {
  DevelopmentRunRepository,
  PreflightDraftRepository,
  ProjectRepository,
  RunOutcomeRepository,
} from "@capacity-governor/application";
import { asc, desc, eq, inArray } from "drizzle-orm";
import type { AppDatabase } from "./database";
import {
  actualCapacityConsumptions,
  developmentRuns,
  preflightDrafts,
  projects,
  runOutcomeObservations,
} from "./schema";

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

const mapDevelopmentRun = (
  row: typeof developmentRuns.$inferSelect,
): DevelopmentRun =>
  developmentRunSchema.parse({
    ...row,
    createdAt: toIso(row.createdAt),
  });

const mapOutcomeObservation = (
  row: typeof runOutcomeObservations.$inferSelect,
) =>
  runOutcomeObservationSchema.parse({
    id: row.id,
    runId: row.runId,
    supersedesObservationId: row.supersedesObservationId ?? undefined,
    runOutcome: row.runOutcome,
    validationResult: row.validationResult,
    unexpectedFailures: row.unexpectedFailures,
    deferredWork: row.deferredWork,
    notes: row.notes ?? undefined,
    remainingCapacity:
      row.remainingCapacityAmount === null ||
      row.remainingCapacityUnit === null ||
      row.remainingCapacityObservedAt === null ||
      row.remainingCapacitySource === null
        ? undefined
        : {
            amount: row.remainingCapacityAmount,
            unit: row.remainingCapacityUnit,
            observedAt: toIso(row.remainingCapacityObservedAt),
            source: row.remainingCapacitySource,
          },
    amendmentReason: row.amendmentReason ?? undefined,
    recordedAt: toIso(row.recordedAt),
  });

const mapConsumption = (
  row: typeof actualCapacityConsumptions.$inferSelect,
): ActualCapacityConsumption =>
  actualCapacityConsumptionSchema.parse({
    ...row,
    recordedAt: toIso(row.recordedAt),
  });

const orderOutcomeRows = (
  rows: Array<typeof runOutcomeObservations.$inferSelect>,
): Array<typeof runOutcomeObservations.$inferSelect> => {
  if (rows.length < 2) return rows;
  const root = rows.find((row) => row.supersedesObservationId === null);
  if (!root) return rows;
  const byPredecessor = new Map(
    rows
      .filter((row) => row.supersedesObservationId !== null)
      .map((row) => [row.supersedesObservationId as string, row]),
  );
  const ordered = [root];
  let current = root;
  while (byPredecessor.has(current.id)) {
    current = byPredecessor.get(current.id)!;
    ordered.push(current);
  }
  return ordered.length === rows.length ? ordered : rows;
};

const loadOutcomeHistory = async (
  db: AppDatabase,
  runId: string,
): Promise<OutcomeObservationWithConsumption[]> => {
  const observationRows = await db
    .select()
    .from(runOutcomeObservations)
    .where(eq(runOutcomeObservations.runId, runId))
    .orderBy(
      asc(runOutcomeObservations.recordedAt),
      asc(runOutcomeObservations.id),
    );
  if (!observationRows.length) return [];

  const consumptionRows = await db
    .select()
    .from(actualCapacityConsumptions)
    .where(
      inArray(
        actualCapacityConsumptions.outcomeObservationId,
        observationRows.map((row) => row.id),
      ),
    )
    .orderBy(
      asc(actualCapacityConsumptions.recordedAt),
      asc(actualCapacityConsumptions.category),
    );
  const consumptionByObservation = new Map<
    string,
    ActualCapacityConsumption[]
  >();
  consumptionRows.forEach((row) => {
    const values = consumptionByObservation.get(row.outcomeObservationId) ?? [];
    values.push(mapConsumption(row));
    consumptionByObservation.set(row.outcomeObservationId, values);
  });

  return orderOutcomeRows(observationRows).map((row) =>
    outcomeObservationWithConsumptionSchema.parse({
      observation: mapOutcomeObservation(row),
      actualConsumption: consumptionByObservation.get(row.id) ?? [],
    }),
  );
};

const observationValues = (
  observation: Parameters<RunOutcomeRepository["createInitial"]>[0],
): typeof runOutcomeObservations.$inferInsert => ({
  id: observation.id,
  runId: observation.runId,
  supersedesObservationId: observation.supersedesObservationId ?? null,
  runOutcome: observation.runOutcome,
  validationResult: observation.validationResult,
  unexpectedFailures: observation.unexpectedFailures,
  deferredWork: observation.deferredWork,
  notes: observation.notes ?? null,
  remainingCapacityAmount: observation.remainingCapacity?.amount ?? null,
  remainingCapacityUnit: observation.remainingCapacity?.unit ?? null,
  remainingCapacityObservedAt: observation.remainingCapacity
    ? new Date(observation.remainingCapacity.observedAt)
    : null,
  remainingCapacitySource: observation.remainingCapacity?.source ?? null,
  amendmentReason: observation.amendmentReason ?? null,
  recordedAt: new Date(observation.recordedAt),
});

const consumptionValues = (
  entries: ActualCapacityConsumption[],
): Array<typeof actualCapacityConsumptions.$inferInsert> =>
  entries.map((entry) => ({
    ...entry,
    recordedAt: new Date(entry.recordedAt),
  }));

const isUniqueViolation = (error: unknown): boolean => {
  let current: unknown = error;
  const visited = new Set<unknown>();
  while (current !== null && current !== undefined && !visited.has(current)) {
    visited.add(current);
    if (
      typeof current === "object" &&
      "code" in current &&
      (current as { code?: string }).code === "23505"
    ) {
      return true;
    }
    if (String(current).toLowerCase().includes("unique constraint")) {
      return true;
    }
    current =
      typeof current === "object" && "cause" in current
        ? (current as { cause?: unknown }).cause
        : undefined;
  }
  return false;
};

export const createRepositories = (
  db: AppDatabase,
): {
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
  developmentRuns: DevelopmentRunRepository;
  runOutcomes: RunOutcomeRepository;
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
    async findById(id) {
      const rows = await db
        .select()
        .from(preflightDrafts)
        .where(eq(preflightDrafts.id, id))
        .limit(1);
      return rows[0] ? mapPreflight(rows[0]) : null;
    },
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
  developmentRuns: {
    async create(run) {
      await db.insert(developmentRuns).values({
        ...run,
        createdAt: new Date(run.createdAt),
      });
    },
    async findById(id) {
      const rows = await db
        .select()
        .from(developmentRuns)
        .where(eq(developmentRuns.id, id))
        .limit(1);
      return rows[0] ? mapDevelopmentRun(rows[0]) : null;
    },
    async listByProjectId(projectId) {
      const rows = await db
        .select()
        .from(developmentRuns)
        .where(eq(developmentRuns.projectId, projectId))
        .orderBy(desc(developmentRuns.createdAt), desc(developmentRuns.id));
      return rows.map(mapDevelopmentRun);
    },
  },
  runOutcomes: {
    async createInitial(observation, actualConsumption) {
      try {
        return await db.transaction(async (transaction) => {
          const existing = await transaction
            .select({ id: runOutcomeObservations.id })
            .from(runOutcomeObservations)
            .where(eq(runOutcomeObservations.runId, observation.runId))
            .limit(1);
          if (existing.length) return false;
          await transaction
            .insert(runOutcomeObservations)
            .values(observationValues(observation));
          if (actualConsumption.length) {
            await transaction
              .insert(actualCapacityConsumptions)
              .values(consumptionValues(actualConsumption));
          }
          return true;
        });
      } catch (error) {
        if (isUniqueViolation(error)) return false;
        throw error;
      }
    },
    async appendAmendment(
      expectedCurrentObservationId,
      observation,
      actualConsumption,
    ) {
      try {
        return await db.transaction(async (transaction) => {
          const rows = await transaction
            .select({
              id: runOutcomeObservations.id,
              supersedesObservationId:
                runOutcomeObservations.supersedesObservationId,
            })
            .from(runOutcomeObservations)
            .where(eq(runOutcomeObservations.runId, observation.runId));
          const supersededIds = new Set(
            rows
              .map((row) => row.supersedesObservationId)
              .filter((id): id is string => id !== null),
          );
          const current = rows.find((row) => !supersededIds.has(row.id));
          if (!current || current.id !== expectedCurrentObservationId) {
            return false;
          }
          await transaction
            .insert(runOutcomeObservations)
            .values(observationValues(observation));
          if (actualConsumption.length) {
            await transaction
              .insert(actualCapacityConsumptions)
              .values(consumptionValues(actualConsumption));
          }
          return true;
        });
      } catch (error) {
        if (isUniqueViolation(error)) return false;
        throw error;
      }
    },
    async findLatestByRunId(runId) {
      const history = await loadOutcomeHistory(db, runId);
      return history.at(-1) ?? null;
    },
    async listHistoryByRunId(runId) {
      return loadOutcomeHistory(db, runId);
    },
  },
});
