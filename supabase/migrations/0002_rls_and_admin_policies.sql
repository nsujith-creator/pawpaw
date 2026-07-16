-- Migration 0002: Row Level Security and admin access policies.
-- Viewers receive no direct table access. Only active admins can read/write.

alter table public.admin_users    enable row level security;
alter table public.content_items  enable row level security;
alter table public.media_assets   enable row level security;
alter table public.content_media  enable row level security;

-- Non-exposed schema for security-definer helpers.
-- PostgREST exposes only the schemas listed in its config (public, storage,
-- graphql_public), so nothing in `private` is callable via /rest/v1/rpc.
create schema if not exists private;

-- Security-definer helper: bypasses RLS on admin_users only to answer
-- "is the calling user an active admin?".
-- Empty search_path forces fully qualified references and blocks
-- search_path hijacking.
create or replace function private.is_active_admin()
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = (select auth.uid())
      and active = true
  );
$$;

-- Lock down execution: Postgres grants EXECUTE to PUBLIC by default,
-- so revoke everything first...
revoke execute on function private.is_active_admin() from public;
revoke execute on function private.is_active_admin() from anon;
revoke execute on function private.is_active_admin() from authenticated;

-- ...then grant only the minimum required for authenticated RLS evaluation.
grant usage on schema private to authenticated;
grant execute on function private.is_active_admin() to authenticated;

-- admin_users: active admins can read their own row and other admin rows.
-- No client-side writes — admin accounts are managed by the service role.
create policy "active_admins_read_admin_users"
  on public.admin_users
  for select
  to authenticated
  using ((select private.is_active_admin()));

-- content_items: active admins have full access.
create policy "active_admins_all_content_items"
  on public.content_items
  for all
  to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

-- media_assets: active admins have full access.
create policy "active_admins_all_media_assets"
  on public.media_assets
  for all
  to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

-- content_media: active admins have full access.
create policy "active_admins_all_content_media"
  on public.content_media
  for all
  to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));
