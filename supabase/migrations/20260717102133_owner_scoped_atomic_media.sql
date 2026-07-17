-- Owner-scoped media policies and transaction-safe media association helpers.
-- Forward-only; affects only Pawpaw tables and the private Pawpaw media bucket.

alter table public.content_media
  add constraint content_media_content_sort_unique
  unique (content_id, sort_order)
  deferrable initially deferred;

drop policy if exists "active_admins_all_media_assets" on public.media_assets;
create policy "owners_manage_media_assets"
  on public.media_assets
  for all
  to authenticated
  using (
    (select private.is_active_admin())
    and created_by = (select auth.uid())
  )
  with check (
    (select private.is_active_admin())
    and created_by = (select auth.uid())
  );

drop policy if exists "active_admins_all_content_media" on public.content_media;
create policy "owners_manage_content_media"
  on public.content_media
  for all
  to authenticated
  using (
    (select private.is_active_admin())
    and exists (
      select 1
      from public.content_items ci
      join public.media_assets ma on ma.id = content_media.media_id
      where ci.id = content_media.content_id
        and ci.created_by = (select auth.uid())
        and ma.created_by = (select auth.uid())
    )
  )
  with check (
    (select private.is_active_admin())
    and exists (
      select 1
      from public.content_items ci
      join public.media_assets ma on ma.id = content_media.media_id
      where ci.id = content_media.content_id
        and ci.created_by = (select auth.uid())
        and ma.created_by = (select auth.uid())
    )
  );

drop policy if exists "active_admins_upload_media" on storage.objects;
drop policy if exists "active_admins_read_media" on storage.objects;
drop policy if exists "active_admins_update_media" on storage.objects;
drop policy if exists "active_admins_delete_media" on storage.objects;

create policy "owners_upload_media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owners_read_media"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owners_update_media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "owners_delete_media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create or replace function public.attach_owned_media(
  p_admin_id uuid,
  p_content_id uuid,
  p_media_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_content_owner uuid;
  v_media_owner uuid;
  v_sort_order integer;
begin
  select created_by into v_content_owner
  from public.content_items
  where id = p_content_id
  for update;

  select created_by into v_media_owner
  from public.media_assets
  where id = p_media_id;

  if v_content_owner is null or v_media_owner is null
     or v_content_owner <> p_admin_id or v_media_owner <> p_admin_id then
    raise exception 'Media ownership check failed' using errcode = '42501';
  end if;

  if exists (
    select 1 from public.content_media
    where content_id = p_content_id and media_id = p_media_id
  ) then
    raise exception 'Media is already attached' using errcode = '23505';
  end if;

  select coalesce(max(sort_order), -1) + 1 into v_sort_order
  from public.content_media
  where content_id = p_content_id;

  insert into public.content_media (content_id, media_id, sort_order)
  values (p_content_id, p_media_id, v_sort_order);

  return v_sort_order;
end;
$$;

create or replace function public.reorder_owned_media(
  p_admin_id uuid,
  p_content_id uuid,
  p_media_id uuid,
  p_direction text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_content_owner uuid;
  v_media_owner uuid;
  v_current integer;
  v_neighbour integer;
begin
  if p_direction not in ('earlier', 'later') then
    raise exception 'Invalid reorder direction';
  end if;

  select created_by into v_content_owner
  from public.content_items where id = p_content_id for update;
  select created_by into v_media_owner
  from public.media_assets where id = p_media_id;

  if v_content_owner is null or v_media_owner is null
     or v_content_owner <> p_admin_id or v_media_owner <> p_admin_id then
    raise exception 'Media ownership check failed' using errcode = '42501';
  end if;

  select sort_order into v_current
  from public.content_media
  where content_id = p_content_id and media_id = p_media_id
  for update;
  if v_current is null then
    raise exception 'Attachment not found' using errcode = 'P0002';
  end if;

  if p_direction = 'earlier' then
    select max(sort_order) into v_neighbour
    from public.content_media
    where content_id = p_content_id and sort_order < v_current;
  else
    select min(sort_order) into v_neighbour
    from public.content_media
    where content_id = p_content_id and sort_order > v_current;
  end if;

  if v_neighbour is null then return false; end if;

  update public.content_media
  set sort_order = case
    when media_id = p_media_id then v_neighbour
    else v_current
  end
  where content_id = p_content_id
    and sort_order in (v_current, v_neighbour);

  return true;
end;
$$;

create or replace function public.detach_owned_media(
  p_admin_id uuid,
  p_content_id uuid,
  p_media_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_content_owner uuid;
  v_media_owner uuid;
  v_deleted integer;
begin
  select created_by into v_content_owner
  from public.content_items where id = p_content_id for update;
  select created_by into v_media_owner
  from public.media_assets where id = p_media_id;

  if v_content_owner is null or v_media_owner is null
     or v_content_owner <> p_admin_id or v_media_owner <> p_admin_id then
    raise exception 'Media ownership check failed' using errcode = '42501';
  end if;

  delete from public.content_media
  where content_id = p_content_id and media_id = p_media_id;
  get diagnostics v_deleted = row_count;
  return v_deleted = 1;
end;
$$;

create or replace function public.delete_owned_media_records(
  p_admin_id uuid,
  p_media_id uuid
)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_path text;
begin
  select storage_path into v_path
  from public.media_assets
  where id = p_media_id and created_by = p_admin_id
  for update;

  if v_path is null or split_part(v_path, '/', 1) <> p_admin_id::text then
    raise exception 'Media ownership check failed' using errcode = '42501';
  end if;

  delete from public.content_media where media_id = p_media_id;
  delete from public.media_assets where id = p_media_id and created_by = p_admin_id;
  if not found then
    raise exception 'Media row was not deleted' using errcode = 'P0002';
  end if;

  return v_path;
end;
$$;

revoke execute on function public.attach_owned_media(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.reorder_owned_media(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.detach_owned_media(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_owned_media_records(uuid, uuid) from public, anon, authenticated;
grant execute on function public.attach_owned_media(uuid, uuid, uuid) to service_role;
grant execute on function public.reorder_owned_media(uuid, uuid, uuid, text) to service_role;
grant execute on function public.detach_owned_media(uuid, uuid, uuid) to service_role;
grant execute on function public.delete_owned_media_records(uuid, uuid) to service_role;
