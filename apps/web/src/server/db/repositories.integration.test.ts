import {
  createApplicationService,
  DuplicateInitialOutcomeError,
  StaleOutcomeAmendmentError,
} from "@capacity-governor/application";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabaseConnection, type DatabaseConnection } from "./database";
import { createRepositories } from "./repositories";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";
const preflightId = "496ca42f-3e77-4332-ad25-d845b9b27125";
const trancheId = "42235782-83d5-48d8-9e72-3146e452d9dd";
const runId = "04877823-b6d4-4b1d-bde2-91bd4f18f3dc";
const initialObservationId = "9fa31c3a-e5cb-48d5-9cd8-ff7247281bc1";
const implementationConsumptionId = "b622a11d-a7aa-47ae-91be-58cb7852bce4";
const validationConsumptionId = "956685e4-9ff4-43e0-9502-988adfc5b894";
const amendmentObservationId = "0da839ca-12e8-412f-8e06-67efea9b30a8";
const amendmentConsumptionId = "04091c30-726b-4177-964a-a3c65fd55534";

const preflightInput = {
  projectId,
  tranche: {
    title: "Manual preflight",
    brief: "Create, save, and reopen the draft.",
    explicitExclusions: ["Forecasting", "Policy"],
    acceptanceCriteria: ["Database round-trip"],
  },
  availableBudget: {
    amount: 120.5,
    unit: "manual units",
    source: "manual" as const,
  },
  reset: {
    resetsAt: "2026-08-15T15:00:00.000Z",
    timezone: "America/Denver",
    notes: "Manually entered",
  },
  correctionReserve: {
    minimum: { amount: 12, unit: "manual units", source: "manual" as const },
    targetShare: 0.1,
  },
  validationReserve: { targetShare: 0.2 },
  assumptions: ["Budget is manually supplied"],
  openQuestions: ["None affecting T001"],
};

describe("PostgreSQL persistence adapter", () => {
  let connection: DatabaseConnection | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it("applies the additive Tranche 001, Tranche 002 and Tranche 005 schema", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const result = await connection.db.execute(sql`
      select tablename
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `);
    expect(result.rows.map((row) => row.tablename)).toEqual([
      "actual_capacity_consumptions",
      "composed_preflight_revisions",
      "development_runs",
      "preflight_drafts",
      "preflight_evaluation_attempts",
      "projects",
      "run_outcome_observations",
    ]);
  });

  it("migrates an accepted T001 database without changing its records", async () => {
    const client = new PGlite();
    try {
      const migration = (name: string) =>
        readFileSync(
          path.resolve(process.cwd(), "apps/web/drizzle", name),
          "utf8",
        );
      await client.exec(migration("0000_sudden_doctor_octopus.sql"));
      await client.exec(`
        insert into projects (id, name, description, created_at, updated_at)
        values ('${projectId}', 'Preserved project', 'T001 evidence',
          '2026-08-14T07:00:00.000Z', '2026-08-14T07:00:00.000Z');
        insert into preflight_drafts (
          id, project_id, tranche_id, tranche_title, tranche_brief,
          explicit_exclusions, acceptance_criteria, available_budget_amount,
          available_budget_unit, available_budget_source, reset_timezone,
          assumptions, open_questions, created_at, updated_at
        ) values (
          '${preflightId}', '${projectId}', '${trancheId}', 'Preserved preflight',
          'T001 remains readable', '["Forecasting"]', '["Unchanged"]', 58,
          'manual units', 'manual', 'UTC', '[]', '[]',
          '2026-08-14T07:00:00.000Z', '2026-08-14T07:00:00.000Z'
        );
      `);
      const before = await client.query(
        "select p.*, d.* from projects p join preflight_drafts d on d.project_id = p.id",
      );

      await client.exec(migration("0001_sparkling_tyger_tiger.sql"));

      const after = await client.query(
        "select p.*, d.* from projects p join preflight_drafts d on d.project_id = p.id",
      );
      expect(after.rows).toEqual(before.rows);
      expect(
        (
          await client.query(
            "select count(*)::int as count from information_schema.tables where table_schema = 'public' and table_name in ('development_runs', 'run_outcome_observations', 'actual_capacity_consumptions')",
          )
        ).rows[0],
      ).toEqual({ count: 3 });
    } finally {
      await client.close();
    }
  });

  it("round-trips a project and complete manual draft through the Drizzle adapter", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const ids = [projectId, preflightId, trancheId];
    const service = createApplicationService({
      ...createRepositories(connection.db),
      createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
      now: () => new Date("2026-08-14T07:00:00.000Z"),
    });

    await service.createProject({
      name: "Capacity Governor",
      description: "Shadow build",
    });
    const saved = await service.savePreflightDraft(preflightInput);

    const reopened = await service.getProject(projectId);
    expect(reopened.preflightDraft).toEqual(saved);
    expect(reopened.preflightDraft?.availableBudget).toEqual({
      amount: 120.5,
      unit: "manual units",
      source: "manual",
    });
    expect(reopened.preflightDraft?.validationReserve).toEqual({
      targetShare: 0.2,
    });
  });

  it("upserts one draft per project and preserves draft identities", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const ids = [projectId, preflightId, trancheId];
    const service = createApplicationService({
      ...createRepositories(connection.db),
      createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
      now: () => new Date("2026-08-14T07:00:00.000Z"),
    });
    await service.createProject({ name: "Governor" });
    const input = {
      projectId,
      tranche: {
        title: "First title",
        brief: "Bounded work",
        explicitExclusions: [],
        acceptanceCriteria: [],
      },
      availableBudget: {
        amount: 10,
        unit: "credits",
        source: "manual" as const,
      },
      reset: { timezone: "UTC" },
      assumptions: [],
      openQuestions: [],
    };
    const first = await service.savePreflightDraft(input);
    const second = await service.savePreflightDraft({
      ...input,
      tranche: { ...input.tranche, title: "Second title" },
    });
    expect(second.id).toBe(first.id);
    expect(second.tranche.id).toBe(first.tranche.id);
    expect(
      (await service.getProject(projectId)).preflightDraft?.tranche.title,
    ).toBe("Second title");
  });

  it("round-trips an unguided run and append-only outcome history", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const ids = [
      projectId,
      preflightId,
      trancheId,
      runId,
      initialObservationId,
      implementationConsumptionId,
      validationConsumptionId,
      amendmentObservationId,
      amendmentConsumptionId,
    ];
    let clock = 0;
    const service = createApplicationService({
      ...createRepositories(connection.db),
      createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
      now: () =>
        new Date(
          clock++ === 0
            ? "2026-08-24T18:00:00.000Z"
            : `2026-08-24T18:0${clock - 1}:00.000Z`,
        ),
    });

    await service.createProject({ name: "Capacity Governor" });
    await service.savePreflightDraft(preflightInput);
    const run = await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflightId,
    });
    expect(run.guidanceKind).toBe("UNGUIDED");
    expect(
      (await service.listProjectRuns(projectId))[0]?.latestOutcome,
    ).toBeNull();

    const initial = await service.recordRunOutcome({
      runId,
      runOutcome: "PARTIAL",
      validationResult: "INCONCLUSIVE",
      actualConsumption: [
        {
          category: "IMPLEMENTATION",
          amount: 12.5,
          unit: "manual units",
          source: "manual",
        },
        {
          category: "VALIDATION",
          amount: 2,
          unit: "manual units",
          source: "manual",
        },
      ],
      remainingCapacity: {
        amount: 48,
        unit: "observed units",
        observedAt: "2026-08-24T12:00:00-06:00",
        source: "manual",
      },
      unexpectedFailures: ["Network interruption"],
      deferredWork: ["Nonessential polish"],
      notes: "Factual evidence only",
    });
    expect(initial.observation.validationResult).toBe("INCONCLUSIVE");
    expect(initial.actualConsumption).toHaveLength(2);

    await service.amendRunOutcome({
      runId,
      expectedCurrentObservationId: initialObservationId,
      amendmentReason: "Corrected the implementation amount from the log",
      runOutcome: "COMPLETED",
      validationResult: "PASSED",
      actualConsumption: [
        {
          category: "IMPLEMENTATION",
          amount: 14,
          unit: "manual units",
          source: "manual",
        },
      ],
      unexpectedFailures: [],
      deferredWork: ["Documentation follow-up"],
    });

    const history = await service.getRunHistory(runId);
    expect(history.observations).toHaveLength(2);
    expect(history.observations[0]?.observation).toMatchObject({
      id: initial.observation.id,
      runOutcome: initial.observation.runOutcome,
      validationResult: initial.observation.validationResult,
      remainingCapacity: {
        amount: 48,
        unit: "observed units",
        observedAt: "2026-08-24T18:00:00.000Z",
        source: "manual",
      },
      unexpectedFailures: initial.observation.unexpectedFailures,
      deferredWork: initial.observation.deferredWork,
      notes: initial.observation.notes,
    });
    expect(history.observations[0]?.actualConsumption).toEqual(
      initial.actualConsumption,
    );
    expect(history.currentOutcome?.observation).toMatchObject({
      id: amendmentObservationId,
      supersedesObservationId: initialObservationId,
      amendmentReason: "Corrected the implementation amount from the log",
      runOutcome: "COMPLETED",
      validationResult: "PASSED",
    });
    expect(history.currentOutcome?.actualConsumption[0]?.amount).toBe(14);
  });

  it("rejects a stale amendment without changing historical evidence", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const ids = [
      projectId,
      preflightId,
      trancheId,
      runId,
      initialObservationId,
      amendmentObservationId,
      "56a05825-ac71-4602-aa25-934713c2f1f6",
    ];
    const service = createApplicationService({
      ...createRepositories(connection.db),
      createId: () => ids.shift() ?? "00000000-0000-4000-8000-000000000000",
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });
    await service.createProject({ name: "Capacity Governor" });
    await service.savePreflightDraft(preflightInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflightId,
    });
    await service.recordRunOutcome({
      runId,
      runOutcome: "COMPLETED",
      validationResult: "NOT_RUN",
      actualConsumption: [],
      unexpectedFailures: [],
      deferredWork: [],
    });
    await service.amendRunOutcome({
      runId,
      expectedCurrentObservationId: initialObservationId,
      amendmentReason: "First correction",
      runOutcome: "PARTIAL",
      validationResult: "NOT_RUN",
      actualConsumption: [],
      unexpectedFailures: [],
      deferredWork: [],
    });

    await expect(
      service.amendRunOutcome({
        runId,
        expectedCurrentObservationId: initialObservationId,
        amendmentReason: "Stale correction",
        runOutcome: "FAILED",
        validationResult: "FAILED",
        actualConsumption: [],
        unexpectedFailures: ["This must not persist"],
        deferredWork: [],
      }),
    ).rejects.toBeInstanceOf(StaleOutcomeAmendmentError);
    expect((await service.getRunHistory(runId)).observations).toHaveLength(2);
    await expect(
      service.recordRunOutcome({
        runId,
        runOutcome: "COMPLETED",
        validationResult: "PASSED",
        actualConsumption: [],
        unexpectedFailures: [],
        deferredWork: [],
      }),
    ).rejects.toBeInstanceOf(DuplicateInitialOutcomeError);
  });

  it("round-trips every status and consumption category as raw evidence", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const service = createApplicationService({
      ...createRepositories(connection.db),
      createId: randomUUID,
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });
    const project = await service.createProject({ name: "Unicode Ω project" });
    const draft = await service.savePreflightDraft({
      ...preflightInput,
      projectId: project.id,
      notes: undefined,
    });
    const outcomes = ["COMPLETED", "PARTIAL", "FAILED"] as const;
    const validations = [
      "NOT_RUN",
      "PASSED",
      "PARTIAL",
      "FAILED",
      "INCONCLUSIVE",
    ] as const;

    for (const [index, validationResult] of validations.entries()) {
      const run = await service.createDevelopmentRun({
        projectId: project.id,
        preflightDraftId: draft.id,
      });
      await service.recordRunOutcome({
        runId: run.id,
        runOutcome: outcomes[index % outcomes.length],
        validationResult,
        actualConsumption:
          index === 0
            ? ["IMPLEMENTATION", "CORRECTION", "VALIDATION", "OTHER"].map(
                (category, categoryIndex) => ({
                  category,
                  amount: categoryIndex,
                  unit: `source Ω ${categoryIndex}`,
                  source: "manual",
                }),
              )
            : [],
        remainingCapacity:
          index === 0
            ? {
                amount: 48,
                unit: "observed Ω units",
                observedAt: "2026-08-24T12:00:00-06:00",
                source: "manual",
              }
            : undefined,
        unexpectedFailures: index === 0 ? ["Unexpected Ω failure"] : [],
        deferredWork: index === 0 ? ["Deferred Ω work"] : [],
        notes: index === 0 ? "Factual Ω note" : undefined,
      });
    }

    const projectRuns = await service.listProjectRuns(project.id);
    const orderedRunIds = projectRuns.map(({ run }) => run.id);
    expect(orderedRunIds).toEqual([...orderedRunIds].sort().reverse());
    const histories = await Promise.all(
      projectRuns.map(({ run }) => service.getRunHistory(run.id)),
    );
    expect(
      new Set(
        histories.map(
          ({ currentOutcome }) => currentOutcome?.observation.validationResult,
        ),
      ),
    ).toEqual(new Set(validations));
    expect(
      new Set(
        histories.map(
          ({ currentOutcome }) => currentOutcome?.observation.runOutcome,
        ),
      ),
    ).toEqual(new Set(outcomes));
    const fullEvidence = histories.find(
      ({ currentOutcome }) => currentOutcome?.actualConsumption.length === 4,
    )?.currentOutcome;
    expect(
      fullEvidence?.actualConsumption.map(({ category }) => category),
    ).toEqual(["CORRECTION", "IMPLEMENTATION", "OTHER", "VALIDATION"]);
    expect(fullEvidence?.observation).toMatchObject({
      unexpectedFailures: ["Unexpected Ω failure"],
      deferredWork: ["Deferred Ω work"],
      notes: "Factual Ω note",
      remainingCapacity: {
        amount: 48,
        unit: "observed Ω units",
        source: "manual",
      },
    });
  });

  it("rolls back an initial observation when a child insert violates uniqueness", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const repositories = createRepositories(connection.db);
    const ids = [projectId, preflightId, trancheId, runId];
    const service = createApplicationService({
      ...repositories,
      createId: () => ids.shift() ?? randomUUID(),
      now: () => new Date("2026-08-24T18:00:00.000Z"),
    });
    await service.createProject({ name: "Capacity Governor" });
    await service.savePreflightDraft(preflightInput);
    await service.createDevelopmentRun({
      projectId,
      preflightDraftId: preflightId,
    });
    const recordedAt = "2026-08-24T18:00:00.000Z";
    const observation = {
      id: initialObservationId,
      runId,
      runOutcome: "COMPLETED" as const,
      validationResult: "PASSED" as const,
      unexpectedFailures: [],
      deferredWork: [],
      recordedAt,
    };
    const duplicateChildren = [
      implementationConsumptionId,
      validationConsumptionId,
    ].map((id) => ({
      id,
      outcomeObservationId: initialObservationId,
      category: "IMPLEMENTATION" as const,
      amount: 1,
      unit: "manual units",
      source: "manual" as const,
      recordedAt,
    }));

    await expect(
      repositories.runOutcomes.createInitial(observation, duplicateChildren),
    ).resolves.toBe(false);
    await expect(service.getRunHistory(runId)).resolves.toMatchObject({
      currentOutcome: null,
      observations: [],
    });

    await expect(
      repositories.runOutcomes.createInitial(observation, [
        {
          ...duplicateChildren[0]!,
          amount: Number.POSITIVE_INFINITY,
        },
      ]),
    ).rejects.toThrow();
    await expect(service.getRunHistory(runId)).resolves.toMatchObject({
      currentOutcome: null,
      observations: [],
    });
  });
});
