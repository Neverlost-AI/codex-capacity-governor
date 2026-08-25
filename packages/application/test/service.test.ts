import type { PreflightDraft, Project } from "@capacity-governor/contracts";
import { describe, expect, it, vi } from "vitest";
import type { ApplicationDependencies } from "../src/ports";
import { createApplicationService, ProjectNotFoundError } from "../src/service";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";
const preflightId = "496ca42f-3e77-4332-ad25-d845b9b27125";
const trancheId = "42235782-83d5-48d8-9e72-3146e452d9dd";
const now = new Date("2026-08-14T07:00:00.000Z");

const createHarness = () => {
  const projects = new Map<string, Project>();
  const drafts = new Map<string, PreflightDraft>();
  const ids = [projectId, preflightId, trancheId];
  const dependencies: ApplicationDependencies = {
    createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
    now: () => now,
    projects: {
      create: vi.fn(async (project) => void projects.set(project.id, project)),
      findById: vi.fn(async (id) => projects.get(id) ?? null),
      list: vi.fn(async () => [...projects.values()]),
    },
    preflightDrafts: {
      findByProjectId: vi.fn(async (id) => drafts.get(id) ?? null),
      save: vi.fn(async (draft) => void drafts.set(draft.projectId, draft)),
    },
  };
  return { dependencies, service: createApplicationService(dependencies) };
};

const draftInput = {
  projectId,
  tranche: {
    title: "Manual preflight",
    brief: "Bounded work",
    explicitExclusions: ["Forecasting"],
    acceptanceCriteria: ["Reopens"],
  },
  availableBudget: {
    amount: 80,
    unit: "manual units",
    source: "manual" as const,
  },
  reset: { timezone: "America/Denver" },
  assumptions: [],
  openQuestions: [],
};

describe("application service", () => {
  it("creates a validated project with injected identity and time", async () => {
    const { service } = createHarness();
    const project = await service.createProject({
      name: " Capacity Governor ",
      description: " Demo ",
    });
    expect(project).toEqual({
      id: projectId,
      name: "Capacity Governor",
      description: "Demo",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
  });

  it("lists repository projects", async () => {
    const { service } = createHarness();
    await service.createProject({ name: "Governor" });
    await expect(service.listProjects()).resolves.toHaveLength(1);
  });

  it("rejects a draft for a missing project", async () => {
    const { service } = createHarness();
    await expect(service.savePreflightDraft(draftInput)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("creates and reopens an associated preflight draft", async () => {
    const { service } = createHarness();
    await service.createProject({ name: "Governor" });
    const saved = await service.savePreflightDraft(draftInput);
    expect(saved.id).toBe(preflightId);
    expect(saved.tranche.id).toBe(trancheId);
    expect(saved.tranche.projectId).toBe(projectId);
    await expect(service.getProject(projectId)).resolves.toEqual({
      project: expect.objectContaining({ id: projectId }),
      preflightDraft: saved,
    });
  });

  it("updates a draft without changing its identities", async () => {
    const { service } = createHarness();
    await service.createProject({ name: "Governor" });
    const first = await service.savePreflightDraft(draftInput);
    const second = await service.savePreflightDraft({
      ...draftInput,
      tranche: { ...draftInput.tranche, title: "Updated title" },
    });
    expect(second.id).toBe(first.id);
    expect(second.tranche.id).toBe(first.tranche.id);
    expect(second.tranche.title).toBe("Updated title");
  });

  it("surfaces repository failures instead of fabricating success", async () => {
    const { dependencies, service } = createHarness();
    dependencies.projects.create = vi
      .fn()
      .mockRejectedValue(new Error("database unavailable"));
    await expect(service.createProject({ name: "Governor" })).rejects.toThrow(
      "database unavailable",
    );
  });
});
