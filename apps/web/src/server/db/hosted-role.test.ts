import { readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { describe, expect, it } from "vitest";

const migrationsFolder = path.resolve(process.cwd(), "apps/web/drizzle");
const provisioningSql = readFileSync(
  path.resolve(process.cwd(), "scripts/provision-hosted-app-role.sql"),
  "utf8",
);
const prepareRestoreRoleSql = readFileSync(
  path.resolve(process.cwd(), "scripts/prepare-hosted-restore-role.sql"),
  "utf8",
);
const appTables = [
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
];
const updatableTables = new Set([
  "projects",
  "preflight_drafts",
  "hosted_login_states",
  "hosted_sessions",
  "hosted_preflight_reviews",
  "hosted_governed_reviews",
]);
const deletableTables = new Set([
  "hosted_preflight_reviews",
  "hosted_governed_reviews",
]);

const migratedDatabase = async () => {
  const client = new PGlite();
  await migrate(drizzle(client), { migrationsFolder });
  await client.exec(
    "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;",
  );
  return client;
};

describe("hosted application PostgreSQL role provisioning", () => {
  it("removes API grants, enables app-only RLS, and restricts DML and DDL", async () => {
    const client = await migratedDatabase();
    try {
      // Reproduce Supabase's permissive initial table grants, not only its
      // current no-policy/default-deny behavior.
      await client.exec(
        "GRANT ALL ON ALL TABLES IN SCHEMA public TO PUBLIC, anon, authenticated, service_role;",
      );
      await client.exec("REVOKE CONNECT ON DATABASE postgres FROM PUBLIC");
      await client.exec(provisioningSql);

      const { rows: connectionRows } = await client.query<{
        app_connect: boolean;
        anon_connect: boolean;
      }>(
        "SELECT has_database_privilege('capacity_governor_app', current_database(), 'CONNECT') AS app_connect, has_database_privilege('anon', current_database(), 'CONNECT') AS anon_connect",
      );
      expect(connectionRows).toEqual([
        { app_connect: true, anon_connect: false },
      ]);

      const { rows: roleRows } = await client.query<{
        rolsuper: boolean;
        rolcanlogin: boolean;
        rolinherit: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolbypassrls: boolean;
      }>(
        "SELECT rolsuper, rolcanlogin, rolinherit, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname = 'capacity_governor_app'",
      );
      expect(roleRows).toEqual([
        {
          rolsuper: false,
          rolcanlogin: false,
          rolinherit: false,
          rolcreatedb: false,
          rolcreaterole: false,
          rolbypassrls: false,
        },
      ]);

      for (const table of appTables) {
        const { rows } = await client.query<{
          role_name: string;
          can_select: boolean;
          can_insert: boolean;
          can_update: boolean;
          can_delete: boolean;
        }>(
          `SELECT role_name,
            has_table_privilege(role_name, $1, 'SELECT') AS can_select,
            has_table_privilege(role_name, $1, 'INSERT') AS can_insert,
            has_table_privilege(role_name, $1, 'UPDATE') AS can_update,
            has_table_privilege(role_name, $1, 'DELETE') AS can_delete
          FROM unnest(ARRAY['capacity_governor_app', 'anon', 'authenticated', 'service_role']) AS role_name`,
          [`public.${table}`],
        );
        expect(rows).toEqual([
          {
            role_name: "capacity_governor_app",
            can_select: true,
            can_insert: true,
            can_update: updatableTables.has(table),
            can_delete: deletableTables.has(table),
          },
          ...["anon", "authenticated", "service_role"].map((role_name) => ({
            role_name,
            can_select: false,
            can_insert: false,
            can_update: false,
            can_delete: false,
          })),
        ]);
      }

      const { rows: policyRows } = await client.query<{
        tablename: string;
        cmd: string;
        roles: string[];
      }>(
        "SELECT tablename, cmd, roles FROM pg_policies WHERE schemaname = 'public'",
      );
      expect(policyRows).toHaveLength(36);
      for (const row of policyRows) {
        expect(row.roles).toEqual(["capacity_governor_app"]);
        expect(["SELECT", "INSERT", "UPDATE", "DELETE"]).toContain(row.cmd);
      }
      const { rows: rlsRows } = await client.query<{ relrowsecurity: boolean }>(
        "SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relkind = 'r'",
      );
      expect(rlsRows).toHaveLength(14);
      expect(rlsRows.every((row) => row.relrowsecurity)).toBe(true);

      await client.exec("SET ROLE capacity_governor_app");
      await client.exec(`
        INSERT INTO public.projects (id, owner_key, name, created_at, updated_at)
        VALUES ('d1b5eaa4-d266-4dd8-b9ab-17e195dccbd2', 'test:founder', 'Draft', now(), now());
        UPDATE public.projects SET name = 'Reviewed' WHERE owner_key = 'test:founder';
        INSERT INTO public.hosted_login_states (state_hash, nonce, code_verifier, expires_at)
        VALUES ('state', 'nonce', 'verifier', now());
        UPDATE public.hosted_login_states SET consumed_at = now() WHERE state_hash = 'state';
        INSERT INTO public.preflight_drafts (
          id, project_id, tranche_id, tranche_title, tranche_brief,
          explicit_exclusions, acceptance_criteria, available_budget_amount,
          available_budget_unit, available_budget_source, reset_timezone,
          assumptions, open_questions, created_at, updated_at
        ) VALUES (
          '496ca42f-3e77-4332-ad25-d845b9b27125',
          'd1b5eaa4-d266-4dd8-b9ab-17e195dccbd2',
          '42235782-83d5-48d8-9e72-3146e452d9dd',
          'First', 'A small task', '[]'::jsonb, '[]'::jsonb, 10,
          'PERCENT', 'manual', 'UTC', '[]'::jsonb, '[]'::jsonb, now(), now()
        );
        INSERT INTO public.preflight_drafts (
          id, project_id, tranche_id, tranche_title, tranche_brief,
          explicit_exclusions, acceptance_criteria, available_budget_amount,
          available_budget_unit, available_budget_source, reset_timezone,
          assumptions, open_questions, created_at, updated_at
        ) VALUES (
          '496ca42f-3e77-4332-ad25-d845b9b27125',
          'd1b5eaa4-d266-4dd8-b9ab-17e195dccbd2',
          '42235782-83d5-48d8-9e72-3146e452d9dd',
          'Revised', 'A small task', '[]'::jsonb, '[]'::jsonb, 10,
          'PERCENT', 'manual', 'UTC', '[]'::jsonb, '[]'::jsonb, now(), now()
        ) ON CONFLICT (project_id) DO UPDATE SET tranche_title = excluded.tranche_title;
        INSERT INTO public.hosted_preflight_reviews (
          revision_id, owner_key, session_hash, project_id, draft_id,
          snapshot, digest, challenge_hash, created_at
        ) VALUES (
          'cb9b7b62-0e5a-428d-8d4a-6b36a8321a77', 'test:founder', 'session',
          'd1b5eaa4-d266-4dd8-b9ab-17e195dccbd2',
          '496ca42f-3e77-4332-ad25-d845b9b27125',
          '{}'::jsonb, 'digest', 'challenge', now()
        );
        DELETE FROM public.hosted_preflight_reviews WHERE session_hash = 'session';
      `);
      const { rows: projectRows } = await client.query<{ name: string }>(
        "SELECT name FROM public.projects WHERE owner_key = 'test:founder'",
      );
      expect(projectRows).toEqual([{ name: "Reviewed" }]);
      const { rows: draftRows } = await client.query<{ tranche_title: string }>(
        "SELECT tranche_title FROM public.preflight_drafts",
      );
      expect(draftRows).toEqual([{ tranche_title: "Revised" }]);
      const { rows: reviewRows } = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM public.hosted_preflight_reviews",
      );
      expect(reviewRows[0].count).toBe(0);
      await expect(client.exec("DELETE FROM public.projects")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        client.exec("UPDATE public.governed_outcome_versions SET id = id"),
      ).rejects.toThrow(/permission denied/);
      await expect(
        client.exec("CREATE TABLE public.unauthorized (id integer)"),
      ).rejects.toThrow(/permission denied/);
      await expect(client.exec("CREATE SCHEMA unauthorized")).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        client.query("SELECT * FROM drizzle.__drizzle_migrations"),
      ).rejects.toThrow(/permission denied/);
      await client.exec("RESET ROLE");
      await client.exec("SET ROLE anon");
      await expect(
        client.query("SELECT * FROM public.projects"),
      ).rejects.toThrow(/permission denied/);
    } finally {
      await client.close();
    }
  });

  it("rolls back on a non-dedicated public schema", async () => {
    const client = await migratedDatabase();
    try {
      await client.exec("CREATE TABLE public.unrelated (id integer)");
      await expect(client.exec(provisioningSql)).rejects.toThrow(
        /Expected exactly 14 Governor tables/,
      );
      await client.exec("ROLLBACK");
      const { rows } = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_roles WHERE rolname = 'capacity_governor_app'",
      );
      expect(rows[0].count).toBe(0);
    } finally {
      await client.close();
    }
  });

  it("reapplies only reviewed grants after a no-privileges restore", async () => {
    const client = new PGlite();
    try {
      // A separate disposable cluster needs the policy-referenced role before
      // pg_restore. No credentials or production login are copied to it.
      await client.exec(prepareRestoreRoleSql);
      await client.exec("CREATE SCHEMA public");
      await migrate(drizzle(client), { migrationsFolder });
      await client.exec(provisioningSql);
      await client.exec(`
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM capacity_governor_app;
        REVOKE USAGE ON SCHEMA public FROM capacity_governor_app;
        REVOKE CONNECT ON DATABASE postgres FROM capacity_governor_app;
        REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;
      `);
      const { rows: before } = await client.query<{ usable: boolean }>(
        "SELECT has_table_privilege('capacity_governor_app', 'public.projects', 'SELECT') AS usable",
      );
      expect(before[0].usable).toBe(false);

      // Mirrors restoring policies with pg_restore --no-privileges and then
      // running the same reviewed provisioning SQL against that exact state.
      await client.exec(provisioningSql);
      const { rows: after } = await client.query<{
        connect: boolean;
        schema_usage: boolean;
        read_project: boolean;
        update_draft: boolean;
        delete_review: boolean;
        update_outcome: boolean;
      }>(
        `SELECT
          has_database_privilege('capacity_governor_app', current_database(), 'CONNECT') AS connect,
          has_schema_privilege('capacity_governor_app', 'public', 'USAGE') AS schema_usage,
          has_table_privilege('capacity_governor_app', 'public.projects', 'SELECT') AS read_project,
          has_table_privilege('capacity_governor_app', 'public.preflight_drafts', 'UPDATE') AS update_draft,
          has_table_privilege('capacity_governor_app', 'public.hosted_preflight_reviews', 'DELETE') AS delete_review,
          has_table_privilege('capacity_governor_app', 'public.governed_outcome_versions', 'UPDATE') AS update_outcome`,
      );
      expect(after).toEqual([
        {
          connect: true,
          schema_usage: true,
          read_project: true,
          update_draft: true,
          delete_review: true,
          update_outcome: false,
        },
      ]);
      await expect(client.exec(prepareRestoreRoleSql)).rejects.toThrow(
        /cannot drop schema public|already exists/,
      );
      await client.exec("ROLLBACK");
      await client.exec("ALTER ROLE capacity_governor_app LOGIN");
      await expect(client.exec(provisioningSql)).rejects.toThrow(
        /unexpected attributes or memberships/,
      );
      await client.exec("ROLLBACK");
    } finally {
      await client.close();
    }
  });

  it("refuses a restored policy whose meaning changed", async () => {
    const client = await migratedDatabase();
    try {
      await client.exec(provisioningSql);
      await client.exec(`
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM capacity_governor_app;
        ALTER POLICY governor_app_select ON public.projects USING (false);
      `);
      await expect(client.exec(provisioningSql)).rejects.toThrow(
        /Unexpected Governor policies for table projects/,
      );
      await client.exec("ROLLBACK");
      const { rows } = await client.query<{ usable: boolean }>(
        "SELECT has_table_privilege('capacity_governor_app', 'public.projects', 'SELECT') AS usable",
      );
      expect(rows[0].usable).toBe(false);
    } finally {
      await client.close();
    }
  });

  it("rejects an existing app role granted to an API role before changing grants", async () => {
    const client = new PGlite();
    try {
      await client.exec(prepareRestoreRoleSql);
      await client.exec("CREATE SCHEMA public");
      await migrate(drizzle(client), { migrationsFolder });
      await client.exec("CREATE ROLE authenticated");
      await client.exec("GRANT capacity_governor_app TO authenticated");
      await expect(client.exec(provisioningSql)).rejects.toThrow(
        /unexpected attributes or memberships/,
      );
      await client.exec("ROLLBACK");
      const { rows } = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'",
      );
      expect(rows[0].count).toBe(0);
    } finally {
      await client.close();
    }
  });

  it("removes excess app grants when reapplying the exact reviewed policy", async () => {
    const client = await migratedDatabase();
    try {
      await client.exec(provisioningSql);
      await client.exec(
        "GRANT UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.governed_outcome_versions TO capacity_governor_app",
      );
      await client.exec(
        "GRANT DELETE ON public.projects TO capacity_governor_app",
      );
      await client.exec(provisioningSql);
      const { rows } = await client.query<{
        update_outcome: boolean;
        delete_outcome: boolean;
        truncate_outcome: boolean;
        references_outcome: boolean;
        trigger_outcome: boolean;
        delete_project: boolean;
      }>(`SELECT
        has_table_privilege('capacity_governor_app','public.governed_outcome_versions','UPDATE') AS update_outcome,
        has_table_privilege('capacity_governor_app','public.governed_outcome_versions','DELETE') AS delete_outcome,
        has_table_privilege('capacity_governor_app','public.governed_outcome_versions','TRUNCATE') AS truncate_outcome,
        has_table_privilege('capacity_governor_app','public.governed_outcome_versions','REFERENCES') AS references_outcome,
        has_table_privilege('capacity_governor_app','public.governed_outcome_versions','TRIGGER') AS trigger_outcome,
        has_table_privilege('capacity_governor_app','public.projects','DELETE') AS delete_project`);
      expect(rows[0]).toEqual({
        update_outcome: false,
        delete_outcome: false,
        truncate_outcome: false,
        references_outcome: false,
        trigger_outcome: false,
        delete_project: false,
      });
    } finally {
      await client.close();
    }
  });

  it("provisions a restore cluster with no Supabase API roles", async () => {
    const client = new PGlite();
    try {
      await client.exec(prepareRestoreRoleSql);
      await client.exec("CREATE SCHEMA public");
      await migrate(drizzle(client), { migrationsFolder });
      await client.exec(provisioningSql);
      const { rows } = await client.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM pg_policies WHERE schemaname = 'public'",
      );
      expect(rows[0].count).toBe(36);
    } finally {
      await client.close();
    }
  });
});
