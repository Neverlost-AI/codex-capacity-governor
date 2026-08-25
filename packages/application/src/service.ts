import {
  createProjectInputSchema,
  preflightDraftSchema,
  projectSchema,
  savePreflightDraftInputSchema,
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

export interface ProjectWithPreflight {
  project: Project;
  preflightDraft: PreflightDraft | null;
}

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
});

export type ApplicationService = ReturnType<typeof createApplicationService>;
