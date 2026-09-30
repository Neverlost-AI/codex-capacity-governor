-- Run only in a new, isolated disposable PostgreSQL restore cluster, before
-- restoring a post-provision Governor archive. PostgreSQL cluster roles are
-- not included in pg_dump, but the archived RLS policies name this role.
-- The archive creates public itself. Its default empty public schema must be
-- absent before pg_restore --exit-on-error; RESTRICT refuses populated targets.
-- This role has no login, password, memberships, or bypass privileges.
-- Fail if it already exists; never alter a shared cluster role.

BEGIN;
DROP SCHEMA public RESTRICT;
CREATE ROLE capacity_governor_app
  NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD NULL;
COMMIT;
