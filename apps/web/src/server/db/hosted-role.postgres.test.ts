import { randomUUID } from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { createServer } from "node:net";
import { describe, expect, it } from "vitest";
import { Pool } from "pg";
import { sql } from "drizzle-orm";
import {
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
  draftFixture,
  inputFixture,
  PROJECT,
  TIME,
  digest,
} from "../../../../../packages/application/test/composed-fixture";
import { createDatabaseConnection } from "./database";
import { createRepositories } from "./repositories";
import { createComposedRepository } from "./composed-repository";
import { createGovernedRepository } from "./governed-repository";

const execFileAsync = promisify(execFile);
const pgBin =
  process.env.CAPACITY_GOVERNOR_PG_BIN ??
  (process.platform === "win32" ? "C:/Program Files/PostgreSQL/17/bin" : "");
const executable = (name: string) =>
  path.join(pgBin, `${name}${process.platform === "win32" ? ".exe" : ""}`);
const havePostgres =
  process.env.CAPACITY_GOVERNOR_RUN_REAL_POSTGRES === "1" &&
  Boolean(pgBin) &&
  ["initdb", "pg_ctl", "pg_dump", "pg_restore", "psql"].every((name) =>
    existsSync(executable(name)),
  );

const admin = "governor_test_admin";
const freePort = async () => {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
};
const run = async (name: string, args: string[]) =>
  execFileAsync(executable(name), args, {
    timeout: 120_000,
    maxBuffer: 2_000_000,
    env: { ...process.env, PGPASSWORD: "" },
  });
// On Windows pg_ctl's background postgres process inherits piped stdio from
// execFile, so its callback waits for the server rather than pg_ctl to exit.
const runPgCtl = async (args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(executable("pg_ctl"), args, {
      stdio: "ignore",
      windowsHide: true,
      env: { ...process.env, PGPASSWORD: "" },
    });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Disposable pg_ctl exited ${code}`)),
    );
  });
const url = (port: number, user = admin) =>
  `postgresql://${user}@127.0.0.1:${port}/postgres`;
const evidenceTables = [
  "actual_capacity_consumptions",
  "composed_preflight_revisions",
  "development_runs",
  "governed_bucket_usage",
  "governed_outcome_versions",
  "governed_runs",
  "hosted_governed_reviews",
  "hosted_login_states",
  "hosted_preflight_reviews",
  "hosted_sessions",
  "preflight_drafts",
  "preflight_evaluation_attempts",
  "projects",
  "run_outcome_observations",
] as const;
const cleanupClusters = async (
  root: string,
  clusters: Array<{ data: string; started: boolean }>,
) => {
  for (const cluster of clusters.reverse()) {
    if (cluster.started)
      await runPgCtl(["-D", cluster.data, "-m", "immediate", "-w", "stop"]);
  }
  const realRoot = await realpath(root);
  const realTemp = await realpath(tmpdir());
  if (
    !realRoot.startsWith(`${realTemp}${path.sep}`) ||
    !path.basename(realRoot).startsWith("cg-hosted-pg17-")
  )
    throw new Error("Unsafe disposable cluster cleanup target");
  await rm(realRoot, { recursive: true, force: true });
};

describe.skipIf(!havePostgres)(
  "isolated PostgreSQL 17 Governor role and recovery",
  () => {
    it("provisions as a non-superuser CREATEROLE operator with only the PostgreSQL creator membership", async () => {
      const root = await mkdtemp(path.join(tmpdir(), "cg-hosted-pg17-"));
      const port = await freePort();
      const cluster = { data: path.join(root, "operator"), started: false };
      try {
        await run("initdb", [
          "-D",
          cluster.data,
          "-U",
          admin,
          "-A",
          "trust",
          "--no-instructions",
        ]);
        await runPgCtl([
          "-D",
          cluster.data,
          "-l",
          path.join(root, `${port}.log`),
          "-o",
          `-h 127.0.0.1 -p ${port}`,
          "-w",
          "start",
        ]);
        cluster.started = true;
        const privileged = new Pool({ connectionString: url(port), max: 1 });
        try {
          await privileged.query(
            "CREATE ROLE governor_operator LOGIN CREATEROLE NOINHERIT",
          );
          await privileged.query(
            "ALTER DATABASE postgres OWNER TO governor_operator",
          );
          await privileged.query(
            "ALTER SCHEMA public OWNER TO governor_operator",
          );
        } finally {
          await privileged.end();
        }
        const migrated = await createDatabaseConnection(
          url(port, "governor_operator"),
        );
        await migrated.close();
        const operator = new Pool({
          connectionString: url(port, "governor_operator"),
          max: 1,
        });
        const provision = () =>
          run("psql", [
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-h",
            "127.0.0.1",
            "-p",
            String(port),
            "-U",
            "governor_operator",
            "-d",
            "postgres",
            "-f",
            path.resolve("scripts/provision-hosted-app-role.sql"),
          ]);
        try {
          await provision();
          const membership = await operator.query(`SELECT
            member.rolname AS member_role,
            parent.rolname AS granted_role,
            m.admin_option,
            m.inherit_option,
            m.set_option
          FROM pg_auth_members m
          JOIN pg_roles member ON member.oid = m.member
          JOIN pg_roles parent ON parent.oid = m.roleid
          WHERE member.rolname = 'capacity_governor_app'
             OR parent.rolname = 'capacity_governor_app'`);
          expect(membership.rows).toEqual([
            {
              member_role: "governor_operator",
              granted_role: "capacity_governor_app",
              admin_option: true,
              inherit_option: false,
              set_option: false,
            },
          ]);
          expect(
            (
              await operator.query(
                "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'",
              )
            ).rows[0].count,
          ).toBe(36);
          await provision();
          await operator.query("CREATE ROLE authenticated");
          await operator.query(
            "GRANT capacity_governor_app TO authenticated WITH INHERIT TRUE, SET TRUE",
          );
          expect(
            (
              await operator.query(
                "SELECT has_table_privilege('authenticated', 'public.projects', 'SELECT') AS can_read",
              )
            ).rows[0].can_read,
          ).toBe(true);
          await expect(provision()).rejects.toThrow(
            /unexpected attributes or memberships/,
          );
          expect(
            (
              await operator.query(
                "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'",
              )
            ).rows[0].count,
          ).toBe(36);
          await operator.query(
            "REVOKE capacity_governor_app FROM authenticated",
          );
          await provision();
          await operator.query(
            "GRANT capacity_governor_app TO governor_operator WITH INHERIT TRUE, SET FALSE",
          );
          await expect(provision()).rejects.toThrow(
            /unexpected attributes or memberships/,
          );
        } finally {
          await operator.end();
        }
      } finally {
        await cleanupClusters(root, [cluster]);
      }
    }, 180_000);

    it("keeps outcome evidence immutable under the actual role and restores without Supabase roles", async () => {
      const root = await mkdtemp(path.join(tmpdir(), "cg-hosted-pg17-"));
      const sourcePort = await freePort();
      let restorePort = await freePort();
      while (restorePort === sourcePort) restorePort = await freePort();
      const clusters = [
        { data: path.join(root, "source"), port: sourcePort, started: false },
        { data: path.join(root, "restore"), port: restorePort, started: false },
      ];
      const archive = path.join(root, "governor.dump");
      try {
        for (const cluster of clusters) {
          await run("initdb", [
            "-D",
            cluster.data,
            "-U",
            admin,
            "-A",
            "trust",
            "--no-instructions",
          ]);
          // The disposable trust cluster listens only on loopback.
          await runPgCtl([
            "-D",
            cluster.data,
            "-l",
            path.join(root, `${cluster.port}.log`),
            "-o",
            `-h 127.0.0.1 -p ${cluster.port}`,
            "-w",
            "start",
          ]);
          cluster.started = true;
          const identity = new Pool({
            connectionString: url(cluster.port),
            max: 1,
          });
          try {
            const { rows } = await identity.query(
              "SELECT current_setting('data_directory') AS data_directory",
            );
            expect(path.resolve(rows[0].data_directory).toLowerCase()).toBe(
              path.resolve(cluster.data).toLowerCase(),
            );
          } finally {
            await identity.end();
          }
        }

        const source = clusters[0];
        const target = clusters[1];
        const migrated = await createDatabaseConnection(url(source.port));
        await migrated.close();
        const privileged = new Pool({
          connectionString: url(source.port),
          max: 1,
        });
        try {
          await privileged.query(
            "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role",
          );
          await privileged.query(
            "CREATE ROLE capacity_governor_app NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD NULL",
          );
          await privileged.query(
            "GRANT capacity_governor_app TO authenticated",
          );
          await expect(
            run("psql", [
              "-X",
              "-v",
              "ON_ERROR_STOP=1",
              "-h",
              "127.0.0.1",
              "-p",
              String(source.port),
              "-U",
              admin,
              "-d",
              "postgres",
              "-f",
              path.resolve("scripts/provision-hosted-app-role.sql"),
            ]),
          ).rejects.toThrow(/exited|Command failed/);
          expect(
            (
              await privileged.query(
                "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'",
              )
            ).rows[0].count,
          ).toBe(0);
          await privileged.query(
            "REVOKE capacity_governor_app FROM authenticated",
          );
          await run("psql", [
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-h",
            "127.0.0.1",
            "-p",
            String(source.port),
            "-U",
            admin,
            "-d",
            "postgres",
            "-f",
            path.resolve("scripts/provision-hosted-app-role.sql"),
          ]);
          await privileged.query(
            "GRANT UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.governed_outcome_versions TO capacity_governor_app",
          );
          await run("psql", [
            "-X",
            "-v",
            "ON_ERROR_STOP=1",
            "-h",
            "127.0.0.1",
            "-p",
            String(source.port),
            "-U",
            admin,
            "-d",
            "postgres",
            "-f",
            path.resolve("scripts/provision-hosted-app-role.sql"),
          ]);
          const excess = await privileged.query(`SELECT
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','UPDATE') AS update,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','DELETE') AS delete,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','TRUNCATE') AS truncate,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','REFERENCES') AS references,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','TRIGGER') AS trigger`);
          expect(Object.values(excess.rows[0])).toEqual([
            false,
            false,
            false,
            false,
            false,
          ]);
          await privileged.query("ALTER ROLE capacity_governor_app LOGIN");
          const denied =
            await privileged.query(`SELECT has_table_privilege('anon','public.projects','SELECT') AS anon_read,
          has_table_privilege('authenticated','public.projects','SELECT') AS authenticated_read,
          has_table_privilege('service_role','public.projects','SELECT') AS service_read`);
          expect(denied.rows[0]).toEqual({
            anon_read: false,
            authenticated_read: false,
            service_read: false,
          });
          for (const role of ["anon", "authenticated", "service_role"]) {
            await privileged.query(`SET ROLE ${role}`);
            try {
              await expect(
                privileged.query("SELECT id FROM public.projects"),
              ).rejects.toMatchObject({ code: "42501" });
            } finally {
              await privileged.query("RESET ROLE");
            }
          }
        } finally {
          await privileged.end();
        }

        const app = await createDatabaseConnection(
          url(source.port, "capacity_governor_app"),
          { migrate: false },
        );
        let savedIds: string[] = [];
        try {
          const repos = createRepositories(app.db);
          await repos.projects.create(
            projectSchema.parse({
              id: PROJECT,
              name: "Restore sample",
              createdAt: TIME,
              updatedAt: TIME,
            }),
          );
          await repos.preflightDrafts.save(draftFixture());
          const composed = createComposedService({
            ...repos,
            composed: createComposedRepository(app.db),
            createId: randomUUID,
            now: () => new Date(TIME),
            digest,
            forecastConfiguration: GATE_B_V1_CONFIGURATION,
            policyConfiguration: GATE_A_V1_CONFIGURATION,
          });
          const revision = await composed.prepare(inputFixture());
          const evaluation = await composed.confirm(
            revision,
            "local-session:test",
            digest(canonicalizeComposed(revision)),
          );
          const governed = createGovernedService({
            ...repos,
            composed: createComposedRepository(app.db),
            governed: createGovernedRepository(app.db),
            createId: randomUUID,
            now: () => new Date(TIME),
            digest,
          });
          const link = await governed.create(
            PROJECT,
            evaluation.id,
            "local-session:test",
            "confirmation",
          );
          const observation = governedOutcomeInputSchema.parse({
            runOutcome: "COMPLETED",
            validationResult: "PASSED",
            adherence: "FOLLOWED",
            unexpectedFailures: [],
            deferredWork: [],
            usage: [],
          });
          const first = await governed.record(
            link.id,
            observation,
            "local-session:test",
          );
          const amendment = await governed.amend(
            link.id,
            first.id,
            "Correction note",
            observation,
            "local-session:test",
          );
          expect(
            (await governed.reopen(link.id)).observations.map(
              (item) => item.id,
            ),
          ).toEqual([first.id, amendment.id]);
          const competing = await Promise.allSettled([
            governed.amend(
              link.id,
              amendment.id,
              "Concurrent correction A",
              observation,
              "local-session:test",
            ),
            governed.amend(
              link.id,
              amendment.id,
              "Concurrent correction B",
              observation,
              "local-session:test",
            ),
          ]);
          const accepted = competing.filter(
            (
              result,
            ): result is PromiseFulfilledResult<
              Awaited<ReturnType<typeof governed.amend>>
            > => result.status === "fulfilled",
          );
          const rejected = competing.filter(
            (result): result is PromiseRejectedResult =>
              result.status === "rejected",
          );
          expect(accepted).toHaveLength(1);
          expect(rejected).toHaveLength(1);
          expect(String(rejected[0].reason)).toContain("Stale amendment");
          expect(
            (await governed.reopen(link.id)).observations.map(
              (item) => item.id,
            ),
          ).toEqual([first.id, amendment.id, accepted[0].value.id]);
          savedIds = [
            PROJECT,
            evaluation.id,
            link.id,
            first.id,
            amendment.id,
            accepted[0].value.id,
          ];
          await expect(
            app.db.execute(
              sql.raw("UPDATE public.governed_outcome_versions SET id = id"),
            ),
          ).rejects.toMatchObject({
            cause: { code: "42501" },
          });
        } finally {
          await app.close();
        }

        const sourceManifest = new Map<string, unknown[]>();
        const manifestConnection = new Pool({
          connectionString: url(source.port),
          max: 1,
        });
        try {
          for (const table of evidenceTables)
            sourceManifest.set(
              table,
              (
                await manifestConnection.query(
                  `SELECT to_jsonb(t) AS record FROM public.${table} t ORDER BY to_jsonb(t)::text`,
                )
              ).rows,
            );
          sourceManifest.set(
            "drizzle.__drizzle_migrations",
            (
              await manifestConnection.query(
                "SELECT to_jsonb(t) AS record FROM drizzle.__drizzle_migrations t ORDER BY id",
              )
            ).rows,
          );
        } finally {
          await manifestConnection.end();
        }

        await run("pg_dump", [
          "-h",
          "127.0.0.1",
          "-p",
          String(source.port),
          "-U",
          admin,
          "-d",
          "postgres",
          "--format=custom",
          "--no-owner",
          "--no-privileges",
          "--schema=public",
          "--schema=drizzle",
          `--file=${archive}`,
        ]);
        const restoreList = (await run("pg_restore", ["--list", archive]))
          .stdout;
        expect(restoreList).toContain("governed_outcome_versions");
        expect(restoreList).toContain("__drizzle_migrations");
        await run("psql", [
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-h",
          "127.0.0.1",
          "-p",
          String(target.port),
          "-U",
          admin,
          "-d",
          "postgres",
          "-f",
          path.resolve("scripts/prepare-hosted-restore-role.sql"),
        ]);
        await run("pg_restore", [
          "-h",
          "127.0.0.1",
          "-p",
          String(target.port),
          "-U",
          admin,
          "-d",
          "postgres",
          "--no-owner",
          "--no-privileges",
          "--exit-on-error",
          "--single-transaction",
          archive,
        ]);
        await run("psql", [
          "-X",
          "-v",
          "ON_ERROR_STOP=1",
          "-h",
          "127.0.0.1",
          "-p",
          String(target.port),
          "-U",
          admin,
          "-d",
          "postgres",
          "-f",
          path.resolve("scripts/provision-hosted-app-role.sql"),
        ]);
        const restored = new Pool({
          connectionString: url(target.port),
          max: 1,
        });
        try {
          for (const table of evidenceTables)
            expect(
              (
                await restored.query(
                  `SELECT to_jsonb(t) AS record FROM public.${table} t ORDER BY to_jsonb(t)::text`,
                )
              ).rows,
            ).toEqual(sourceManifest.get(table));
          expect(
            (
              await restored.query(
                "SELECT to_jsonb(t) AS record FROM drizzle.__drizzle_migrations t ORDER BY id",
              )
            ).rows,
          ).toEqual(sourceManifest.get("drizzle.__drizzle_migrations"));
          const counts = await restored.query(`SELECT
          (SELECT count(*)::int FROM drizzle.__drizzle_migrations) AS migrations,
          (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') AS tables,
          (SELECT count(*)::int FROM pg_policies WHERE schemaname='public') AS policies,
          (SELECT count(*)::int FROM public.governed_outcome_versions) AS versions`);
          expect(counts.rows[0]).toEqual({
            migrations: 5,
            tables: 14,
            policies: 36,
            versions: 3,
          });
          for (const [table, id] of [
            ["projects", savedIds[0]],
            ["preflight_evaluation_attempts", savedIds[1]],
            ["governed_runs", savedIds[2]],
            ["governed_outcome_versions", savedIds[3]],
            ["governed_outcome_versions", savedIds[4]],
            ["governed_outcome_versions", savedIds[5]],
          ]) {
            const found = await restored.query(
              `SELECT EXISTS (SELECT 1 FROM public.${table} WHERE id=$1) AS found`,
              [id],
            );
            expect(found.rows[0].found).toBe(true);
          }
          expect(
            (
              await restored.query(
                "SELECT count(*)::int AS count FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role')",
              )
            ).rows[0].count,
          ).toBe(0);
          expect(
            (
              await restored.query(`SELECT
          has_table_privilege('capacity_governor_app','public.projects','SELECT') AS read_project,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','INSERT') AS append_outcome,
          has_table_privilege('capacity_governor_app','public.governed_outcome_versions','UPDATE') AS mutate_outcome`)
            ).rows[0],
          ).toEqual({
            read_project: true,
            append_outcome: true,
            mutate_outcome: false,
          });
          await restored.query("SET ROLE capacity_governor_app");
          try {
            expect(
              (
                await restored.query(
                  "SELECT count(*)::int AS count FROM public.governed_outcome_versions",
                )
              ).rows[0].count,
            ).toBe(3);
            await expect(
              restored.query(
                "UPDATE public.governed_outcome_versions SET id = id",
              ),
            ).rejects.toMatchObject({ code: "42501" });
          } finally {
            await restored.query("RESET ROLE");
          }
        } finally {
          await restored.end();
        }
      } finally {
        await cleanupClusters(root, clusters);
      }
    }, 180_000);
  },
);
