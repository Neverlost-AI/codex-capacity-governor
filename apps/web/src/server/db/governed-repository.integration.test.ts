import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq, sql } from "drizzle-orm";
import {
  createApplicationService,
  createComposedService,
  createGovernedService,
} from "@capacity-governor/application";
import {
  canonicalizeComposed,
  governedOutcomeInputSchema,
  projectSchema,
} from "@capacity-governor/contracts";
import { GATE_A_V1_CONFIGURATION } from "@capacity-governor/policy-engine";
import { GATE_B_V1_CONFIGURATION } from "@capacity-governor/forecast-engine";
import {
  createDatabaseConnection,
  type DatabaseConnection,
  type AppDatabase,
} from "./database";
import { createRepositories } from "./repositories";
import { createComposedRepository } from "./composed-repository";
import { createGovernedRepository } from "./governed-repository";
import * as schema from "./schema";
import {
  inputFixture,
  draftFixture,
  PROJECT,
  DRAFT,
  TIME,
  digest,
} from "../../../../../packages/application/test/composed-fixture";

let connection: DatabaseConnection | undefined;
let client: PGlite | undefined;
afterEach(async () => {
  await connection?.close();
  connection = undefined;
  await client?.close();
  client = undefined;
});
const seed = async (db: AppDatabase) => {
  const repos = createRepositories(db);
  await repos.projects.create(
    projectSchema.parse({
      id: PROJECT,
      name: "Legacy project",
      createdAt: TIME,
      updatedAt: TIME,
    }),
  );
  await repos.preflightDrafts.save(draftFixture());
  return repos;
};
const composed = (db: AppDatabase) =>
  createComposedService({
    ...createRepositories(db),
    composed: createComposedRepository(db),
    createId: randomUUID,
    now: () => new Date(TIME),
    digest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  });
const governed = (db: AppDatabase) =>
  createGovernedService({
    ...createRepositories(db),
    composed: createComposedRepository(db),
    governed: createGovernedRepository(db),
    createId: randomUUID,
    now: () => new Date(TIME),
    digest,
  });
const attempt = async (db: AppDatabase) => {
  const app = composed(db);
  const revision = await app.prepare(inputFixture());
  return app.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
};
const observation = () =>
  governedOutcomeInputSchema.parse({
    runOutcome: "COMPLETED",
    validationResult: "PASSED",
    adherence: "FOLLOWED",
    unexpectedFailures: [],
    deferredWork: [],
    usage: [
      {
        bucketId: "short",
        providerId: "manual-codex",
        capacityWindowId: "5-hour",
        resetCycleId: "cycle-1",
        bucketProfileVersion: "gate-b-bucket-profile-v1",
        category: "IMPLEMENTATION",
        rawValue: "14",
        rawUnit: "PERCENT",
        sourceReference: "manual evidence",
        observedAt: TIME,
        reviewed: true,
        exactCycleOnly: "YES",
      },
    ],
  });

describe("T006 additive governed repository", () => {
  it("migrates populated legacy rows without changing UNGUIDED history or T005 attempts", async () => {
    client = new PGlite();
    for (const filename of [
      "0000_sudden_doctor_octopus.sql",
      "0001_sparkling_tyger_tiger.sql",
      "0002_dark_ken_ellis.sql",
    ])
      await client.exec(readFileSync(`apps/web/drizzle/${filename}`, "utf8"));
    const db = drizzle(client, { schema }) as unknown as AppDatabase;
    const repos = await seed(db);
    const legacy = createApplicationService({
      ...repos,
      createId: randomUUID,
      now: () => new Date(TIME),
    });
    const run = await legacy.createDevelopmentRun({
      projectId: PROJECT,
      preflightDraftId: DRAFT,
    });
    await legacy.recordRunOutcome({
      runId: run.id,
      runOutcome: "PARTIAL",
      validationResult: "INCONCLUSIVE",
      actualConsumption: [
        { category: "OTHER", amount: 2, unit: "raw credits", source: "manual" },
      ],
      unexpectedFailures: [],
      deferredWork: [],
    });
    const before = await legacy.getRunHistory(run.id);
    const prior = await attempt(db);
    await client.exec(
      readFileSync(
        "apps/web/drizzle/0003_useful_professor_monster.sql",
        "utf8",
      ),
    );
    expect(await legacy.getRunHistory(run.id)).toEqual(before);
    expect(
      (await legacy.getRunHistory(run.id)).observations[0].actualConsumption[0]
        .unit,
    ).toBe("raw credits");
    expect(await composed(db).reopen(PROJECT, prior.id)).toEqual(prior);
    const link = await governed(db).create(
      PROJECT,
      prior.id,
      "local-session:test",
      "confirmation",
    );
    const first = await governed(db).record(
      link.id,
      observation(),
      "local-session:test",
    );
    expect((await governed(db).reopen(link.id)).observations).toEqual([first]);
    expect(await legacy.getRunHistory(run.id)).toEqual(before);
  });
  it("enforces one link, one initial, one successor and atomic usage writes", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    const prior = await attempt(connection.db);
    const service = governed(connection.db);
    const link = await service.create(
      PROJECT,
      prior.id,
      "local-session:test",
      "confirmation",
    );
    await expect(
      service.create(PROJECT, prior.id, "local-session:test", "replay"),
    ).rejects.toThrow();
    const first = await service.record(
      link.id,
      observation(),
      "local-session:test",
    );
    await expect(
      service.record(link.id, observation(), "local-session:test"),
    ).rejects.toThrow("Initial outcome");
    const amended = await service.amend(
      link.id,
      first.id,
      "Corrected value",
      {
        ...observation(),
        usage: [{ ...observation().usage[0], rawValue: "13" }],
      },
      "local-session:test",
    );
    await expect(
      service.amend(
        link.id,
        first.id,
        "stale",
        observation(),
        "local-session:test",
      ),
    ).rejects.toThrow("Stale amendment");
    expect((await service.reopen(link.id)).observations).toEqual([
      first,
      amended,
    ]);
    expect(
      await connection.db.select().from(schema.governedBucketUsage),
    ).toHaveLength(2);
    await connection.db.execute(
      sql.raw(
        "CREATE FUNCTION reject_t006_usage() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected usage failure'; END; $$;",
      ),
    );
    await connection.db.execute(
      sql.raw(
        "CREATE TRIGGER reject_t006_usage BEFORE INSERT ON governed_bucket_usage FOR EACH ROW EXECUTE FUNCTION reject_t006_usage();",
      ),
    );
    await expect(
      service.amend(
        link.id,
        amended.id,
        "Should roll back",
        observation(),
        "local-session:test",
      ),
    ).rejects.toThrow();
    expect((await service.reopen(link.id)).observations).toEqual([
      first,
      amended,
    ]);
    await connection.db.execute(
      sql.raw("DROP TRIGGER reject_t006_usage ON governed_bucket_usage;"),
    );
    await connection.db.execute(sql.raw("DROP FUNCTION reject_t006_usage();"));
    const tampered = structuredClone(amended);
    if (
      tampered.comparisons[0].comparison.kind !== "COMPARABLE_FULL_COMPLETION"
    )
      throw new Error("Expected comparable fixture");
    tampered.comparisons[0].comparison.rangeHit = false;
    await connection.db
      .update(schema.governedOutcomeVersions)
      .set({ snapshot: tampered })
      .where(eq(schema.governedOutcomeVersions.id, amended.id));
    await expect(service.reopen(link.id)).rejects.toThrow("integrity mismatch");
  });
});
