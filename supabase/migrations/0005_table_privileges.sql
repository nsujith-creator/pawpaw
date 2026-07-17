-- Migration 0005: Explicit table privileges (least privilege).
--
-- RLS (migration 0002) authorizes *rows*, but Postgres requires base
-- table privileges before RLS is even consulted. On this project the
-- tables were created without explicit grants, so both service_role and
-- authenticated failed with "permission denied for table ..." (42501),
-- as revealed by the live integration tests.
--
-- Posture:
--   service_role   full DML on the application tables (server-side only;
--                  bypasses RLS but still needs base privileges).
--   authenticated  DML on content tables, gated row-by-row by the RLS
--                  policies in 0002. admin_users is read-only for clients:
--                  admin accounts are managed exclusively via service_role.
--   anon           nothing. Viewers never touch tables directly.
--
-- Deliberately NOT used: "grant ... on all tables in schema public" or
-- "alter default privileges" — each table is named so nothing is granted
-- by accident, now or for future tables.

-- Start from a clean slate for the roles managed here, so this migration
-- is the single authoritative statement of table privileges.
revoke all on table public.admin_users            from anon, authenticated, service_role;
revoke all on table public.content_items          from anon, authenticated, service_role;
revoke all on table public.media_assets           from anon, authenticated, service_role;
revoke all on table public.content_media          from anon, authenticated, service_role;
revoke all on table public.viewer_login_attempts  from anon, authenticated, service_role;

-- service_role: used by the server-side admin client.
grant select, insert, update, delete on table public.admin_users   to service_role;
grant select, insert, update, delete on table public.content_items to service_role;
grant select, insert, update, delete on table public.media_assets  to service_role;
grant select, insert, update, delete on table public.content_media to service_role;

-- viewer_login_attempts is service-role-only by design (see 0004):
-- the login throttle in src/lib/auth/throttle.ts reads, upserts, and
-- deletes rows through the service-role client. No client role gets access.
grant select, insert, update, delete on table public.viewer_login_attempts to service_role;

-- authenticated: base privileges only — every row still passes through the
-- active-admin RLS policies from 0002. No INSERT/UPDATE/DELETE on
-- admin_users: clients must never modify the admin allowlist.
grant select                         on table public.admin_users   to authenticated;
grant select, insert, update, delete on table public.content_items to authenticated;
grant select, insert, update, delete on table public.media_assets  to authenticated;
grant select, insert, update, delete on table public.content_media to authenticated;

-- anon: no grants. The revokes above are the explicit statement of that.
