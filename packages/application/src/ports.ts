import type { PreflightDraft, Project } from "@capacity-governor/contracts";

export interface ProjectRepository {
  create(project: Project): Promise<void>;
  findById(id: string): Promise<Project | null>;
  list(): Promise<Project[]>;
}

export interface PreflightDraftRepository {
  findByProjectId(projectId: string): Promise<PreflightDraft | null>;
  save(draft: PreflightDraft): Promise<void>;
}

export interface ApplicationRepositories {
  projects: ProjectRepository;
  preflightDrafts: PreflightDraftRepository;
}

export interface ApplicationDependencies extends ApplicationRepositories {
  createId: () => string;
  now: () => Date;
}
