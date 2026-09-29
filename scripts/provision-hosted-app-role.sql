-- One-time, credential-free provisioning for the dedicated Governor database.
-- Run only after Drizzle migrations 0000-0004, using the privileged direct
-- connection and psql -X -v ON_ERROR_STOP=1 -f. Never run from a web function.
-- This deliberately fails if the role or any policy already exists: review a
-- changed database rather than silently replacing grants or policies.
-- The role starts NOLOGIN with no password. Set its password separately with
-- psql \password, verify the grants, then explicitly ALTER ROLE ... LOGIN.

BEGIN;

CREATE ROLE capacity_governor_app
  NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD NULL;

-- Do not let a PUBLIC schema grant give the new role DDL authority.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO capacity_governor_app;

DO $governor$
DECLARE
  table_name text;
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

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY(app_tables)
  ) THEN
    RAISE EXCEPTION 'Existing Governor table policies require separate review';
  END IF;

  FOREACH table_name IN ARRAY app_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NULL THEN
      RAISE EXCEPTION 'Missing Governor table: %', table_name;
    END IF;

    -- Supabase can grant these roles DML by default. RLS alone is not a
    -- substitute for removing unused API and service-role grants.
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated, service_role',
      table_name
    );
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('GRANT SELECT, INSERT ON TABLE public.%I TO capacity_governor_app', table_name);
    EXECUTE format(
      'CREATE POLICY governor_app_select ON public.%I FOR SELECT TO capacity_governor_app USING (true)',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY governor_app_insert ON public.%I FOR INSERT TO capacity_governor_app WITH CHECK (true)',
      table_name
    );

    IF table_name = ANY(updatable_tables) THEN
      EXECUTE format('GRANT UPDATE ON TABLE public.%I TO capacity_governor_app', table_name);
      EXECUTE format(
        'CREATE POLICY governor_app_update ON public.%I FOR UPDATE TO capacity_governor_app USING (true) WITH CHECK (true)',
        table_name
      );
    END IF;

    IF table_name = ANY(deletable_tables) THEN
      EXECUTE format('GRANT DELETE ON TABLE public.%I TO capacity_governor_app', table_name);
      EXECUTE format(
        'CREATE POLICY governor_app_delete ON public.%I FOR DELETE TO capacity_governor_app USING (true)',
        table_name
      );
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
