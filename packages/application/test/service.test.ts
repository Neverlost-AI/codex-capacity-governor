import type {
  DevelopmentRun,
  OutcomeObservationWithConsumption,
  PreflightDraft,
  Project,
} from "@capacity-governor/contracts";
import { describe, expect, it, vi } from "vitest";
import type { ApplicationDependencies } from "../src/ports";
import {
  createApplicationService,
  DevelopmentRunNotFoundError,
  DuplicateInitialOutcomeError,
  PreflightDraftNotFoundError,
  ProjectNotFoundError,
  ProjectPreflightMismatchError,
  StaleOutcomeAmendmentError,
} from "../src/service";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";
const preflightId = "496ca42f-3e77-4332-ad25-d845b9b27125";
const trancheId = "42235782-83d5-48d8-9e72-3146e452d9dd";
const runId = "fb50937a-c42f-467d-9dc4-b87bcb147581";
const outcomeId = "75f920b4-df73-48f0-93ee-658ed018f9fa";
const consumptionId = "c71dcc29-bd58-4ca7-b48e-87bed1927247";
const amendedOutcomeId = "60d901d8-cc05-4891-a8a7-dcc76f184ff7";
const now = new Date("2026-08-14T07:00:00.000Z");

const createHarness = (additionalIds: string[] = []) => {
  const projects = new Map<string, Project>();
  const drafts = new Map<string, PreflightDraft>();
  const runs = new Map<string, DevelopmentRun>();
  const outcomes = new Map<string, OutcomeObservationWithConsumption[]>();
  const ids = [projectId, preflightId, trancheId, ...additionalIds];
  const dependencies: ApplicationDependencies = {
    createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
    now: () => now,
    projects: {
      create: vi.fn(async (project) => void projects.set(project.id, project)),
      findById: vi.fn(async (id) => projects.get(id) ?? null),
      list: vi.fn(async () => [...projects.values()]),
    },
    preflightDrafts: {
      findById: vi.fn(
        async (id) =>
          [...drafts.values()].find((draft) => draft.id === id) ?? null,
      ),
      findByProjectId: vi.fn(async (id) => drafts.get(id) ?? null),
      save: vi.fn(async (draft) => void drafts.set(draft.projectId, draft)),
    },
    developmentRuns: {
      create: vi.fn(async (run) => void runs.set(run.id, run)),
      findById: vi.fn(async (id) => runs.get(id) ?? null),
      listByProjectId: vi.fn(async (id) =>
        [...runs.values()].filter((run) => run.projectId === id),
      ),
    },
    runOutcomes: {
      createInitial: vi.fn(async (observation, actualConsumption) => {
        if (outcomes.get(observation.runId)?.length) return false;
        outcomes.set(observation.runId, [{ observation, actualConsumption }]);
        return true;
      }),
      appendAmendment: vi.fn(
        async (
          expectedCurrentObservationId,
          observation,
          actualConsumption,
        ) => {
          const history = outcomes.get(observation.runId) ?? [];
          if (history.at(-1)?.observation.id !== expectedCurrentObservationId) {
            return false;
          }
          history.push({ observation, actualConsumption });
          outcomes.set(observation.runId, history);
          return true;
        },
      ),
      findLatestByRunId: vi.fn(async (id) => outcomes.get(id)?.at(-1) ?? null),
      listHistoryByRunId: vi.fn(async (id) => outcomes.get(id) ?? []),
    },
  };
  return {
    dependencies,
    drafts,
    projects,
    runs,
    service: createApplicationService(dependencies),
  };
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

  it("creates an explicitly unguided run for a matching project and preflight", async () => {
    const { service } = createHarness([runId]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await expect(
      service.createDevelopmentRun({
        projectId,
        preflightDraftId: preflight.id,
      }),
    ).resolves.toEqual({
      id: runId,
      projectId,
      preflightDraftId: preflight.id,
      guidanceKind: "UNGUIDED",
      createdAt: now.toISOString(),
    });
  });

  it("rejects missing and mismatched preflight associations", async () => {
    const missing = createHarness([runId]);
    await expect(
      missing.service.createDevelopmentRun({
        projectId,
        preflightDraftId: preflightId,
      }),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);

    const { drafts, service } = createHarness([runId]);
    await service.createProject({ name: "Governor" });
    await expect(
      service.createDevelopmentRun({
        projectId,
        preflightDraftId: preflightId,
      }),
    ).rejects.toBeInstanceOf(PreflightDraftNotFoundError);

    const preflight = await service.savePreflightDraft(draftInput);
    drafts.set(projectId, { ...preflight, projectId: trancheId });
    await expect(
      service.createDevelopmentRun({
        projectId,
        preflightDraftId: preflight.id,
      }),
    ).rejects.toBeInstanceOf(ProjectPreflightMismatchError);
  });

  it("keeps an unguided run visible before an outcome exists", async () => {
    const { service } = createHarness([runId]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    await expect(service.listProjectRuns(projectId)).resolves.toEqual([
      {
        run: expect.objectContaining({ id: runId, guidanceKind: "UNGUIDED" }),
        latestOutcome: null,
      },
    ]);
  });

  it("records factual outcome evidence without deriving semantics", async () => {
    const { service } = createHarness([runId, outcomeId, consumptionId]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    const recorded = await service.recordRunOutcome({
      runId,
      runOutcome: "PARTIAL",
      validationResult: "FAILED",
      actualConsumption: [
        {
          category: "IMPLEMENTATION",
          amount: 12,
          unit: "displayed units",
          source: "manual",
        },
      ],
      remainingCapacity: {
        amount: 48,
        unit: "displayed units",
        observedAt: "2026-08-14T01:00:00-06:00",
        source: "manual",
      },
      unexpectedFailures: ["Build runner stopped"],
      deferredWork: ["Follow-up documentation"],
      notes: "Recorder selected both factual statuses independently.",
    });
    expect(recorded.observation).toMatchObject({
      id: outcomeId,
      runOutcome: "PARTIAL",
      validationResult: "FAILED",
      unexpectedFailures: ["Build runner stopped"],
      deferredWork: ["Follow-up documentation"],
    });
    expect(recorded.actualConsumption[0]).toMatchObject({
      id: consumptionId,
      category: "IMPLEMENTATION",
      source: "manual",
    });
  });

  it("preserves the original observation when appending an amendment", async () => {
    const { service } = createHarness([runId, outcomeId, amendedOutcomeId]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    await service.recordRunOutcome({
      runId,
      runOutcome: "FAILED",
      validationResult: "NOT_RUN",
      actualConsumption: [],
      unexpectedFailures: ["Initial observation"],
      deferredWork: [],
    });
    await service.amendRunOutcome({
      runId,
      expectedCurrentObservationId: outcomeId,
      amendmentReason: "Validation evidence arrived later",
      runOutcome: "PARTIAL",
      validationResult: "INCONCLUSIVE",
      actualConsumption: [],
      unexpectedFailures: [],
      deferredWork: ["One remaining check"],
    });
    const history = await service.getRunHistory(runId);
    expect(history.observations).toHaveLength(2);
    expect(history.observations[0]?.observation.id).toBe(outcomeId);
    expect(history.currentOutcome?.observation).toMatchObject({
      id: amendedOutcomeId,
      supersedesObservationId: outcomeId,
      amendmentReason: "Validation evidence arrived later",
    });
    await expect(
      service.amendRunOutcome({
        runId,
        expectedCurrentObservationId: outcomeId,
        amendmentReason: "Stale correction",
        runOutcome: "COMPLETED",
        validationResult: "PASSED",
        actualConsumption: [],
        unexpectedFailures: [],
        deferredWork: [],
      }),
    ).rejects.toBeInstanceOf(StaleOutcomeAmendmentError);
  });

  it("rejects duplicate outcomes and outcomes for missing runs", async () => {
    const { service } = createHarness([runId, outcomeId, amendedOutcomeId]);
    await expect(
      service.recordRunOutcome({
        runId,
        runOutcome: "COMPLETED",
        validationResult: "PASSED",
        actualConsumption: [],
        unexpectedFailures: [],
        deferredWork: [],
      }),
    ).rejects.toBeInstanceOf(DevelopmentRunNotFoundError);

    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    const input = {
      runId,
      runOutcome: "COMPLETED" as const,
      validationResult: "PASSED" as const,
      actualConsumption: [],
      unexpectedFailures: [],
      deferredWork: [],
    };
    await service.recordRunOutcome(input);
    await expect(service.recordRunOutcome(input)).rejects.toBeInstanceOf(
      DuplicateInitialOutcomeError,
    );
  });

  it("rejects an amendment predecessor from a different run", async () => {
    const secondRunId = "04877823-b6d4-4b1d-bde2-91bd4f18f3dc";
    const secondOutcomeId = "9fa31c3a-e5cb-48d5-9cd8-ff7247281bc1";
    const { service } = createHarness([
      runId,
      secondRunId,
      outcomeId,
      secondOutcomeId,
      amendedOutcomeId,
    ]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    const evidence = {
      runOutcome: "COMPLETED" as const,
      validationResult: "NOT_RUN" as const,
      actualConsumption: [],
      unexpectedFailures: [],
      deferredWork: [],
    };
    await service.recordRunOutcome({ ...evidence, runId });
    await service.recordRunOutcome({ ...evidence, runId: secondRunId });

    await expect(
      service.amendRunOutcome({
        ...evidence,
        runId: secondRunId,
        expectedCurrentObservationId: outcomeId,
        amendmentReason: "Wrong run predecessor",
      }),
    ).rejects.toBeInstanceOf(StaleOutcomeAmendmentError);
  });

  it("surfaces outcome repository failures without reporting a record", async () => {
    const { dependencies, service } = createHarness([runId, outcomeId]);
    await service.createProject({ name: "Governor" });
    const preflight = await service.savePreflightDraft(draftInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflight.id,
    });
    dependencies.runOutcomes.createInitial = vi
      .fn()
      .mockRejectedValue(new Error("transaction unavailable"));

    await expect(
      service.recordRunOutcome({
        runId,
        runOutcome: "COMPLETED",
        validationResult: "NOT_RUN",
        actualConsumption: [],
        unexpectedFailures: [],
        deferredWork: [],
      }),
    ).rejects.toThrow("transaction unavailable");
  });
});
