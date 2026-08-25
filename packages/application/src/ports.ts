import type {
  ActualCapacityConsumption,
  DevelopmentRun,
  OutcomeObservationWithConsumption,
  PreflightDraft,
  Project,
  RunOutcomeObservation,
} from "@capacity-governor/contracts";

export interface ProjectRepository {
  create(project: Project): Promise<void>;
  findById(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
}

export interface PreflightDraftRepository {
  findById(id: string): Promise<PreflightDraft | null>;
  findByProjectId(projectId: string): Promise<PreflightDraft | null>;
  save(draft: PreflightDraft): Promise<void>;
}

export interface DevelopmentRunRepository {
  create(run: DevelopmentRun): Promise<void>;
  findById(id: string): Promise<DevelopmentRun | null>;
  listByProjectId(projectId: string): Promise<DevelopmentRun[]>;
}

export interface RunOutcomeRepository {
  createInitial(
    observation: RunOutcomeObservation,
    actualConsumption: ActualCapacityConsumption[],
  ): Promise<boolean>;
  appendAmendment(
    expectedCurrentObservationId: string,
    observation: RunOutcomeObservation,
    actualConsumption: ActualCapacityConsumption[],
  ): Promise<boolean>;
  findLatestByRunId(
    runId: string,
  ): Promise<OutcomeObservationWithConsumption | null>;
  listHistoryByRunId(
    runId: string,
  ): Promise<OutcomeObservationWithConsumption[]>;
}

export interface ApplicationRepositories {
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
  developmentRuns: DevelopmentRunRepository;
  runOutcomes: RunOutcomeRepository;
}

export interface ApplicationDependencies extends ApplicationRepositories {
  createId: () => string;
  now: () => Date;
}
