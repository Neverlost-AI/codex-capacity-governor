import {
  actualCapacityConsumptionSchema,
  amendRunOutcomeInputSchema,
  createDevelopmentRunInputSchema,
  createProjectInputSchema,
  developmentRunSchema,
  preflightDraftSchema,
  projectSchema,
  recordRunOutcomeInputSchema,
  runOutcomeObservationSchema,
  savePreflightDraftInputSchema,
  type ActualCapacityConsumption,
  type DevelopmentRun,
  type OutcomeObservationWithConsumption,
  type PreflightDraft,
  type Project,
} from "@capacity-governor/contracts";
import type { ApplicationDependencies } from "./ports";

export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project ${projectId} was not found`);
    this.name = "ProjectNotFoundError";
  }
}

export class PreflightDraftNotFoundError extends Error {
  constructor(preflightDraftId: string) {
    super(`Preflight draft ${preflightDraftId} was not found`);
    this.name = "PreflightDraftNotFoundError";
  }
}

export class ProjectPreflightMismatchError extends Error {
  constructor(projectId: string, preflightDraftId: string) {
    super(
      `Preflight draft ${preflightDraftId} does not belong to project ${projectId}`,
    );
    this.name = "ProjectPreflightMismatchError";
  }
}

export class DevelopmentRunNotFoundError extends Error {
  constructor(runId: string) {
    super(`Development run ${runId} was not found`);
    this.name = "DevelopmentRunNotFoundError";
  }
}

export class DuplicateInitialOutcomeError extends Error {
  constructor(runId: string) {
    super(`Development run ${runId} already has an outcome`);
    this.name = "DuplicateInitialOutcomeError";
  }
}

export class StaleOutcomeAmendmentError extends Error {
  constructor(runId: string) {
    super(`Development run ${runId} has a newer outcome observation`);
    this.name = "StaleOutcomeAmendmentError";
  }
}

export interface ProjectWithPreflight {
  project: Project;
  preflightDraft: PreflightDraft | null;
}

export interface DevelopmentRunSummary {
  run: DevelopmentRun;
  latestOutcome: OutcomeObservationWithConsumption | null;
}

export interface DevelopmentRunHistory {
  run: DevelopmentRun;
  currentOutcome: OutcomeObservationWithConsumption | null;
  observations: OutcomeObservationWithConsumption[];
}

const createConsumptionRecords = (
  input: Array<{
    category: "IMPLEMENTATION" | "CORRECTION" | "VALIDATION" | "OTHER";
    amount: number;
    unit: string;
    source: "manual";
  }>,
  outcomeObservationId: string,
  recordedAt: string,
  createId: () => string,
): ActualCapacityConsumption[] =>
  input.map((entry) =>
    actualCapacityConsumptionSchema.parse({
      ...entry,
      id: createId(),
      outcomeObservationId,
      recordedAt,
    }),
  );

export const createApplicationService = (
  dependencies: ApplicationDependencies,
) => ({
  async createProject(input: unknown): Promise<Project> {
    const parsed = createProjectInputSchema.parse(input);
    const now = dependencies.now().toISOString();
    const project = projectSchema.parse({
      ...parsed,
      id: dependencies.createId(),
      createdAt: now,
      updatedAt: now,
    });

    await dependencies.projects.create(project);
    return project;
  },

  async listProjects(): Promise<Project[]> {
    return dependencies.projects.list();
  },

  async getProject(projectId: string): Promise<ProjectWithPreflight> {
    const project = await dependencies.projects.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }

    return {
      project,
      preflightDraft:
        await dependencies.preflightDrafts.findByProjectId(projectId),
    };
  },

  async savePreflightDraft(input: unknown): Promise<PreflightDraft> {
    const parsed = savePreflightDraftInputSchema.parse(input);
    const project = await dependencies.projects.findById(parsed.projectId);
    if (!project) {
      throw new ProjectNotFoundError(parsed.projectId);
    }

    const existing = await dependencies.preflightDrafts.findByProjectId(
      parsed.projectId,
    );
    const draft = preflightDraftSchema.parse({
      ...parsed,
      id: existing?.id ?? dependencies.createId(),
      tranche: {
        ...parsed.tranche,
        id: existing?.tranche.id ?? dependencies.createId(),
        projectId: parsed.projectId,
      },
    });

    await dependencies.preflightDrafts.save(draft);
    return draft;
  },

  async createDevelopmentRun(input: unknown): Promise<DevelopmentRun> {
    const parsed = createDevelopmentRunInputSchema.parse(input);
    const project = await dependencies.projects.findById(parsed.projectId);
    if (!project) {
      throw new ProjectNotFoundError(parsed.projectId);
    }
    const preflight = await dependencies.preflightDrafts.findById(
      parsed.preflightDraftId,
    );
    if (!preflight) {
      throw new PreflightDraftNotFoundError(parsed.preflightDraftId);
    }
    if (preflight.projectId !== parsed.projectId) {
      throw new ProjectPreflightMismatchError(
        parsed.projectId,
        parsed.preflightDraftId,
      );
    }

    const run = developmentRunSchema.parse({
      ...parsed,
      id: dependencies.createId(),
      guidanceKind: "UNGUIDED",
      createdAt: dependencies.now().toISOString(),
    });
    await dependencies.developmentRuns.create(run);
    return run;
  },

  async recordRunOutcome(
    input: unknown,
  ): Promise<OutcomeObservationWithConsumption> {
    const parsed = recordRunOutcomeInputSchema.parse(input);
    const run = await dependencies.developmentRuns.findById(parsed.runId);
    if (!run) {
      throw new DevelopmentRunNotFoundError(parsed.runId);
    }

    const recordedAt = dependencies.now().toISOString();
    const observationId = dependencies.createId();
    const observation = runOutcomeObservationSchema.parse({
      ...parsed,
      actualConsumption: undefined,
      id: observationId,
      recordedAt,
    });
    const actualConsumption = createConsumptionRecords(
      parsed.actualConsumption,
      observationId,
      recordedAt,
      dependencies.createId,
    );

    const created = await dependencies.runOutcomes.createInitial(
      observation,
      actualConsumption,
    );
    if (!created) {
      throw new DuplicateInitialOutcomeError(parsed.runId);
    }
    return { observation, actualConsumption };
  },

  async amendRunOutcome(
    input: unknown,
  ): Promise<OutcomeObservationWithConsumption> {
    const parsed = amendRunOutcomeInputSchema.parse(input);
    const run = await dependencies.developmentRuns.findById(parsed.runId);
    if (!run) {
      throw new DevelopmentRunNotFoundError(parsed.runId);
    }

    const recordedAt = dependencies.now().toISOString();
    const observationId = dependencies.createId();
    const observation = runOutcomeObservationSchema.parse({
      ...parsed,
      actualConsumption: undefined,
      expectedCurrentObservationId: undefined,
      id: observationId,
      supersedesObservationId: parsed.expectedCurrentObservationId,
      recordedAt,
    });
    const actualConsumption = createConsumptionRecords(
      parsed.actualConsumption,
      observationId,
      recordedAt,
      dependencies.createId,
    );

    const appended = await dependencies.runOutcomes.appendAmendment(
      parsed.expectedCurrentObservationId,
      observation,
      actualConsumption,
    );
    if (!appended) {
      throw new StaleOutcomeAmendmentError(parsed.runId);
    }
    return { observation, actualConsumption };
  },

  async listProjectRuns(projectId: string): Promise<DevelopmentRunSummary[]> {
    const project = await dependencies.projects.findById(projectId);
    if (!project) {
      throw new ProjectNotFoundError(projectId);
    }
    const runs = await dependencies.developmentRuns.listByProjectId(projectId);
    return Promise.all(
      runs.map(async (run) => ({
        run,
        latestOutcome: await dependencies.runOutcomes.findLatestByRunId(run.id),
      })),
    );
  },

  async getRunHistory(runId: string): Promise<DevelopmentRunHistory> {
    const run = await dependencies.developmentRuns.findById(runId);
    if (!run) {
      throw new DevelopmentRunNotFoundError(runId);
    }
    const observations =
      await dependencies.runOutcomes.listHistoryByRunId(runId);
    return {
      run,
      currentOutcome: observations.at(-1) ?? null,
      observations,
    };
  },
});

export type ApplicationService = ReturnType<typeof createApplicationService>;
