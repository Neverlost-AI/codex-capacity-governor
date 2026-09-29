-- Run only in a new, isolated disposable PostgreSQL restore cluster, before
-- restoring a post-provision Governor archive. PostgreSQL cluster roles are
-- not included in pg_dump, but the archived RLS policies name this role.
-- This role has no login, password, memberships, or bypass privileges.
-- Fail if it already exists; never alter a shared cluster role.

BEGIN;
CREATE ROLE capacity_governor_app
  NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
  PASSWORD NULL;
COMMIT;
