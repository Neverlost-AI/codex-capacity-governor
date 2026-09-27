/// <reference types="node" />
import { createHash } from "node:crypto";
import {
  composedInputSchema,
  preflightDraftSchema,
  projectSchema,
  type ComposedAttempt,
  type ComposedInput,
} from "@capacity-governor/contracts";
import { GATE_A_V1_CONFIGURATION } from "@capacity-governor/policy-engine";
import { GATE_B_V1_CONFIGURATION } from "@capacity-governor/forecast-engine";
import {
  createComposedService,
  type ComposedRepository,
} from "../src/composed";
export const TIME = "2026-09-26T12:00:00.000Z";
export const PROJECT = "00000000-0000-4000-8000-000000000001";
export const DRAFT = "00000000-0000-4000-8000-000000000002";
export const TRANCHE = "00000000-0000-4000-8000-000000000003";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const inputFixture = (): ComposedInput =>
  composedInputSchema.parse({
    projectId: PROJECT,
    preflightDraftId: DRAFT,
    repositoryReference: "repo/manual",
    title: "Reviewed local scope",
    brief: "A bounded application change",
    explicitExclusions: ["Execution"],
    acceptanceCriteria: ["Reviewed immutable evidence"],
    minimumCoherentScope: false,
    workItems: [
      {
        workItemId: "work-1",
        label: "Application logic",
        category: "APPLICATION_LOGIC",
        complexity: "MEDIUM",
        contextLoad: "MEDIUM",
        repositoryCondition: "STABLE",
        dependencyChange: "EXISTING_ONLY",
        validationBurden: "STANDARD",
        novelty: "SOME_NEW_PATTERN",
        correctionExposure: "MEDIUM",
      },
    ],
    buckets: [
      {
        bucketId: "short",
        providerId: "manual-codex",
        capacityWindowId: "5-hour",
        resetCycleId: "cycle-1",
        availableCapacity: { amount: "7800", unit: "BASIS_POINTS" },
        observedAt: TIME,
        reset: { kind: "NONE" },
        profile: {
          status: "COMPLETE",
          evidenceReference: "accepted gate-b-v1 profile manually reviewed",
        },
      },
    ],
    knownCapacityActivities: [],
    activeMandatoryStopIds: [],
  });
export const draftFixture = () =>
  preflightDraftSchema.parse({
    id: DRAFT,
    projectId: PROJECT,
    tranche: {
      id: TRANCHE,
      projectId: PROJECT,
      title: "Legacy draft",
      brief: "Legacy structural evidence",
      explicitExclusions: ["Forecast"],
      acceptanceCriteria: ["Retain values"],
    },
    availableBudget: {
      amount: 58,
      unit: "unconvertible legacy units",
      source: "manual",
    },
    reset: { timezone: "America/Denver" },
    assumptions: [],
    openQuestions: [],
  });
export const harness = () => {
  const records = new Map<string, unknown>();
  let failSave = false;
  let counter = 10;
  let clock = TIME;
  const project = projectSchema.parse({
    id: PROJECT,
    name: "Manual project",
    createdAt: TIME,
    updatedAt: TIME,
  });
  const draft = draftFixture();
  const composed: ComposedRepository = {
    async save(attempt) {
      if (failSave) throw new Error("Injected atomic failure");
      const existing = [...records.values()].find(
        (value) =>
          (value as ComposedAttempt).revision.id === attempt.revision.id,
      );
      if (existing) return existing as ComposedAttempt;
      records.set(attempt.id, JSON.parse(JSON.stringify(attempt)));
      return attempt;
    },
    async find(id) {
      return records.get(id) ?? null;
    },
    async list(projectId) {
      return [...records.values()].filter(
        (value) =>
          (value as ComposedAttempt).revision.input.projectId === projectId,
      );
    },
  };
  const projects = {
    async findById(id: string) {
      return id === PROJECT ? project : null;
    },
    async create() {},
    async list() {
      return [project];
    },
  };
  const preflightDrafts = {
    async findById(id: string) {
      return id === DRAFT ? draft : null;
    },
    async findByProjectId() {
      return draft;
    },
    async save() {},
  };
  const dependencies = {
    projects,
    preflightDrafts,
    composed,
    createId: () =>
      `00000000-0000-4000-8000-${String(counter++).padStart(12, "0")}`,
    now: () => new Date(clock),
    digest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  };
  return {
    service: createComposedService(dependencies),
    dependencies,
    records,
    draft,
    setFailSave(value: boolean) {
      failSave = value;
    },
    setClock(value: string) {
      clock = value;
    },
  };
};
