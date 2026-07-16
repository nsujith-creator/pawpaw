-- Migration 0002: Row Level Security and admin access policies.
-- Viewers receive no direct table access. Only active admins can read/write.

alter table public.admin_users    enable row level security;
alter table public.content_items  enable row level security;
alter table public.media_assets   enable row level security;
alter table public.content_media  enable row level security;

-- Security-definer helper so the policy body cannot be bypassed by search_path tricks.
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
      and active = true
  );
$$;

-- admin_users: active admins can read their own row and other admin rows.
-- No client-side writes — admin accounts are managed by the service role.
create policy "active_admins_read_admin_users"
  on public.admin_users
  for select
  to authenticated
  using (public.is_active_admin());

-- content_items: active admins have full access.
create policy "active_admins_all_content_items"
  on public.content_items
  for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- media_assets: active admins have full access.
create policy "active_admins_all_media_assets"
  on public.media_assets
  for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

-- content_media: active admins have full access.
create policy "active_admins_all_content_media"
  on public.content_media
  for all
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());
