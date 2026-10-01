import { afterEach, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { sql } from "drizzle-orm";
import {
  createApplicationService,
  createComposedService,
  EvidenceIntegrityError,
} from "@capacity-governor/application";
import {
  canonicalizeComposed,
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
      name: "Legacy fixture",
      createdAt: TIME,
      updatedAt: TIME,
    }),
  );
  await repos.preflightDrafts.save(draftFixture());
  return repos;
};
const service = (db: AppDatabase) =>
  createComposedService({
    ...createRepositories(db),
    composed: createComposedRepository(db),
    createId: randomUUID,
    now: () => new Date(TIME),
    digest,
    forecastConfiguration: GATE_B_V1_CONFIGURATION,
    policyConfiguration: GATE_A_V1_CONFIGURATION,
  });
const saved = async (db: AppDatabase) => {
  const app = service(db);
  const revision = await app.prepare(inputFixture());
  return app.confirm(
    revision,
    "local-session:test",
    digest(canonicalizeComposed(revision)),
  );
};
describe("T005 additive PostgreSQL snapshot repository", () => {
  it("migrates existing evaluations and stores a direct review without a draft", async () => {
    client = new PGlite();
    for (const filename of [
      "0000_sudden_doctor_octopus.sql",
      "0001_sparkling_tyger_tiger.sql",
      "0002_dark_ken_ellis.sql",
      "0003_useful_professor_monster.sql",
      "0004_mute_black_bolt.sql",
    ])
      await client.exec(readFileSync(`apps/web/drizzle/${filename}`, "utf8"));
    const db = drizzle(client, { schema }) as unknown as AppDatabase;
    await seed(db);
    const historical = await saved(db);
    await client.exec(readFileSync("apps/web/drizzle/0005_mighty_black_tarantula.sql", "utf8"));
    expect(await service(db).reopen(PROJECT, historical.id)).toEqual(historical);
    const direct = inputFixture();
    delete (direct as { preflightDraftId?: string }).preflightDraftId;
    direct.title = "Direct reviewed work";
    const revision = await service(db).prepare(direct);
    const attempt = await service(db).confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(attempt.revision.input.preflightDraftId).toBeUndefined();
    expect(await service(db).reopen(PROJECT, attempt.id)).toEqual(attempt);
    expect((await service(db).list(PROJECT)).map((item) => item.id)).toEqual([
      historical.id,
      attempt.id,
    ]);
  });
  it("migrates populated T001/T002 tables without conversion/backfill/history change", async () => {
    client = new PGlite();
    for (const filename of [
      "0000_sudden_doctor_octopus.sql",
      "0001_sparkling_tyger_tiger.sql",
      // The current repository adapter is owner-scoped; T007's additive owner
      // column is applied before exercising it against old T001/T002 evidence.
      "0004_mute_black_bolt.sql",
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
    const outcome = await legacy.recordRunOutcome({
      runId: run.id,
      runOutcome: "PARTIAL",
      validationResult: "INCONCLUSIVE",
      actualConsumption: [
        {
          category: "OTHER",
          amount: 2,
          unit: "raw manual units",
          source: "manual",
        },
      ],
      unexpectedFailures: ["Recorded failure"],
      deferredWork: ["Recorded future work"],
    });
    const before = await legacy.getRunHistory(run.id);
    await client.exec(
      readFileSync("apps/web/drizzle/0002_dark_ken_ellis.sql", "utf8"),
    );
    expect(await legacy.getRunHistory(run.id)).toEqual(before);
    expect((await legacy.getProject(PROJECT)).preflightDraft).toEqual(
      draftFixture(),
    );
    expect(outcome.actualConsumption[0].unit).toBe("raw manual units");
    expect(await service(db).list(PROJECT)).toEqual([]);
    const attempt = await saved(db);
    expect(await service(db).reopen(PROJECT, attempt.id)).toEqual(attempt);
  });
  it("round-trips complete configuration/inputs/outputs/receipt and keeps corrected evidence append-only", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    const first = await saved(connection.db);
    const app = service(connection.db);
    const input = inputFixture();
    input.brief = "Corrected scope";
    input.predecessorRevisionId = first.revision.id;
    const revision = await app.prepare(input);
    const second = await app.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(second.id).not.toBe(first.id);
    expect(await app.reopen(PROJECT, first.id)).toEqual(first);
    expect(await app.list(PROJECT)).toHaveLength(2);
    expect(
      await createComposedRepository(connection.db).find(first.id),
    ).toEqual(first);
  });
  it("wrong project/draft association and saved ownership are denied", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    const other = randomUUID();
    await createRepositories(connection.db).projects.create({
      id: other,
      name: "Other",
      createdAt: TIME,
      updatedAt: TIME,
    });
    const app = service(connection.db);
    await expect(
      app.prepare({ ...inputFixture(), projectId: other }),
    ).rejects.toThrow("ownership");
    const attempt = await saved(connection.db);
    await expect(app.reopen(other, attempt.id)).rejects.toThrow("ownership");
  });
  it("atomic insert failure rolls back revision and attempt; safe retry saves actual result", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    await connection.db.execute(
      sql.raw(
        "CREATE FUNCTION reject_t005_attempt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected atomic failure'; END; $$;",
      ),
    );
    await connection.db.execute(
      sql.raw(
        "CREATE TRIGGER reject_t005_attempt BEFORE INSERT ON preflight_evaluation_attempts FOR EACH ROW EXECUTE FUNCTION reject_t005_attempt();",
      ),
    );
    const app = service(connection.db);
    const revision = await app.prepare(inputFixture());
    await expect(
      app.confirm(
        revision,
        "local-session:test",
        digest(canonicalizeComposed(revision)),
      ),
    ).rejects.toThrow();
    expect(
      await connection.db.select().from(schema.composedPreflightRevisions),
    ).toEqual([]);
    expect(
      await connection.db.select().from(schema.preflightEvaluationAttempts),
    ).toEqual([]);
    await connection.db.execute(
      sql.raw(
        "DROP TRIGGER reject_t005_attempt ON preflight_evaluation_attempts;",
      ),
    );
    await connection.db.execute(
      sql.raw("DROP FUNCTION reject_t005_attempt();"),
    );
    const attempt = await app.confirm(
      revision,
      "local-session:test",
      digest(canonicalizeComposed(revision)),
    );
    expect(await app.reopen(PROJECT, attempt.id)).toEqual(attempt);
  });
  it("concurrent duplicate submissions/retry create exactly one immutable attempt", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    const app = service(connection.db);
    const revision = await app.prepare(inputFixture());
    const operation = () =>
      app.confirm(
        revision,
        "local-session:test",
        digest(canonicalizeComposed(revision)),
      );
    const [first, second] = await Promise.all([operation(), operation()]);
    expect(second.id).toBe(first.id);
    expect((await operation()).id).toBe(first.id);
    expect(await app.list(PROJECT)).toHaveLength(1);
    await expect(
      app.confirm(
        revision,
        "local-session:other",
        digest(canonicalizeComposed(revision)),
      ),
    ).rejects.toThrow();
    expect(await app.reopen(PROJECT, first.id)).toEqual(first);
  });
  it("stored shape/context/output tampering is a visible integrity error, not repair", async () => {
    connection = await createDatabaseConnection("pglite://memory");
    await seed(connection.db);
    const attempt = await saved(connection.db);
    await connection.db.execute(
      sql`UPDATE preflight_evaluation_attempts SET snapshot = jsonb_set(snapshot,'{policy,bucketResults,0,adjustedDemandBasisPoints}','1400') WHERE id = ${attempt.id}`,
    );
    await expect(
      service(connection.db).reopen(PROJECT, attempt.id),
    ).rejects.toBeInstanceOf(EvidenceIntegrityError);
  });
});
