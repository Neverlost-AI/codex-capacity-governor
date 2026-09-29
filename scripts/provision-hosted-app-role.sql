-- Credential-free provisioning for the dedicated Governor database, and
-- exact grant reapplication after a no-privileges restore.
-- Run only after Drizzle migrations 0000-0004, using the privileged direct
-- connection and psql -X -v ON_ERROR_STOP=1 -f. Never run from a web function.
-- An existing role must still be NOLOGIN with the expected attributes; any
-- existing policies must match all 36 reviewed definitions exactly.
-- The role starts NOLOGIN with no password. Set its password separately with
-- psql \password, verify the grants, then explicitly ALTER ROLE ... LOGIN.

BEGIN;

DO $governor$
DECLARE
  table_name text;
  policy_count integer;
  matching_policy_count integer;
  expected_policy_count integer;
  app_tables text[] := ARRAY[
    'actual_capacity_consumptions',
    'composed_preflight_revisions',
    'development_runs',
    'governed_bucket_usage',
    'governed_outcome_versions',
    'governed_runs',
    'hosted_governed_reviews',
    'hosted_login_states',
    'hosted_preflight_reviews',
    'hosted_sessions',
    'preflight_drafts',
    'preflight_evaluation_attempts',
    'projects',
    'run_outcome_observations'
  ];
  updatable_tables text[] := ARRAY[
    'projects',
    'preflight_drafts',
    'hosted_login_states',
    'hosted_sessions',
    'hosted_preflight_reviews',
    'hosted_governed_reviews'
  ];
  deletable_tables text[] := ARRAY[
    'hosted_preflight_reviews',
    'hosted_governed_reviews'
  ];
BEGIN
  IF (SELECT count(*) FROM pg_tables WHERE schemaname = 'public') <> 14 THEN
    RAISE EXCEPTION 'Expected exactly 14 Governor tables in dedicated public schema';
  END IF;

  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing Governor table: %', table_name;
    END IF;
  END LOOP;

  SELECT count(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
  IF policy_count NOT IN (0, 36) THEN
    RAISE EXCEPTION 'Unexpected Governor policy count: %', policy_count;
  END IF;

  IF policy_count = 36 THEN
    -- A --no-privileges restore retains policies but omits GRANT statements.
    -- Reapply grants only if every restored policy has the exact reviewed
    -- operation, role, and expression; never bless a merely matching count.
    FOREACH table_name IN ARRAY app_tables LOOP
      SELECT count(*) INTO matching_policy_count
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = table_name
        AND permissive = 'PERMISSIVE'
        AND roles = ARRAY['capacity_governor_app']::name[]
        AND (
          (policyname = 'governor_app_select' AND cmd = 'SELECT'
            AND qual = 'true' AND with_check IS NULL)
          OR (policyname = 'governor_app_insert' AND cmd = 'INSERT'
            AND qual IS NULL AND with_check = 'true')
          OR (table_name = ANY(updatable_tables)
            AND policyname = 'governor_app_update' AND cmd = 'UPDATE'
            AND qual = 'true' AND with_check = 'true')
          OR (table_name = ANY(deletable_tables)
            AND policyname = 'governor_app_delete' AND cmd = 'DELETE'
            AND qual = 'true' AND with_check IS NULL)
        );
      expected_policy_count := 2;
      IF table_name = ANY(updatable_tables) THEN
        expected_policy_count := expected_policy_count + 1;
      END IF;
      IF table_name = ANY(deletable_tables) THEN
        expected_policy_count := expected_policy_count + 1;
      END IF;
      IF matching_policy_count <> expected_policy_count THEN
        RAISE EXCEPTION 'Unexpected Governor policies for table %', table_name;
      END IF;
    END LOOP;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'capacity_governor_app') THEN
    EXECUTE 'CREATE ROLE capacity_governor_app NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_roles
    WHERE rolname = 'capacity_governor_app'
      AND NOT rolsuper AND NOT rolcanlogin AND NOT rolinherit AND NOT rolcreatedb
      AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls
  ) OR EXISTS (
    SELECT 1 FROM pg_auth_members
    WHERE member = (SELECT oid FROM pg_roles WHERE rolname = 'capacity_governor_app')
  ) THEN
    RAISE EXCEPTION 'Existing Governor app role has unexpected attributes or memberships';
  END IF;

  -- Do not rely on PUBLIC defaults for the database connection, or let a
  -- PUBLIC schema grant give the app role DDL authority.
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO capacity_governor_app', current_database());
  REVOKE CREATE ON SCHEMA public FROM PUBLIC;
  GRANT USAGE ON SCHEMA public TO capacity_governor_app;

  FOREACH table_name IN ARRAY app_tables LOOP
    -- Supabase can grant these roles DML by default. RLS alone is not a
    -- substitute for removing unused API and service-role grants.
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role',
      table_name
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO capacity_governor_app', table_name);
    IF policy_count = 0 THEN
      EXECUTE format(
        'CREATE POLICY governor_app_select ON public.%I FOR SELECT TO capacity_governor_app USING (true)',
        table_name
      );
      EXECUTE format(
        'CREATE POLICY governor_app_insert ON public.%I FOR INSERT TO capacity_governor_app WITH CHECK (true)',
        table_name
      );
    END IF;

    IF table_name = ANY(updatable_tables) THEN
      EXECUTE format('GRANT UPDATE ON TABLE public.%I TO capacity_governor_app', table_name);
      IF policy_count = 0 THEN
        EXECUTE format(
          'CREATE POLICY governor_app_update ON public.%I FOR UPDATE TO capacity_governor_app USING (true) WITH CHECK (true)',
          table_name
        );
      END IF;
    END IF;

    IF table_name = ANY(deletable_tables) THEN
      EXECUTE format('GRANT DELETE ON TABLE public.%I TO capacity_governor_app', table_name);
      IF policy_count = 0 THEN
        EXECUTE format(
          'CREATE POLICY governor_app_delete ON public.%I FOR DELETE TO capacity_governor_app USING (true)',
          table_name
        );
      END IF;
    END IF;
  END LOOP;

  IF has_database_privilege('capacity_governor_app', current_database(), 'CREATE')
    OR has_schema_privilege('capacity_governor_app', 'public', 'CREATE')
    OR has_schema_privilege('capacity_governor_app', 'drizzle', 'USAGE')
    OR has_table_privilege(
      'capacity_governor_app', 'drizzle.__drizzle_migrations', 'SELECT'
    ) THEN
    RAISE EXCEPTION 'Application role has forbidden schema or migration access';
  END IF;
END
$governor$;

COMMIT;
