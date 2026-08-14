import { createApplicationService } from "@capacity-governor/application";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { createDatabaseConnection, type DatabaseConnection } from "./database";
import { createRepositories } from "./repositories";

const projectId = "d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2";
const preflightId = "496ca42f-3e77-4332-ad25-d845b9b27125";
const trancheId = "42235782-83d5-48d8-9e72-3146e452d9dd";

describe("PostgreSQL persistence adapter", () => {
  let connection: DatabaseConnection | undefined;

  afterEach(async () => {
    await connection?.close();
    connection = undefined;
  });

  it("applies a migration containing only the two Tranche 001 tables", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    const result = await connection.db.execute(sql`
      select tablename
      from pg_tables
      where schemaname = 'public'
      order by tablename
    `);
    expect(result.rows.map((row) => row.tablename)).toEqual([
      "preflight_drafts",
      "projects",
    ]);
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
    const saved = await service.savePreflightDraft({
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
        source: "manual",
      },
      reset: {
        resetsAt: "2026-08-15T15:00:00.000Z",
        timezone: "America/Denver",
        notes: "Manually entered",
      },
      correctionReserve: {
        minimum: { amount: 12, unit: "manual units", source: "manual" },
        targetShare: 0.1,
      },
      validationReserve: { targetShare: 0.2 },
      assumptions: ["Budget is manually supplied"],
      openQuestions: ["None affecting T001"],
    });

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
});
