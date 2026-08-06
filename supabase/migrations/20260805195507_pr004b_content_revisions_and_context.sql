-- PR-004B Stage 2: shared administration, private drafts, and immutable publication.
-- Forward-only and Pawpaw-scoped. This migration is intentionally never applied
-- to a linked project by the Stage 2 workflow.

-- Home keeps its existing, separately tested status/published_at flow. Every
-- other content type uses active_published_revision_id as its sole visibility
-- source after this migration.

alter table public.content_items
  add column event_date date,
  add column event_date_precision text,
  add column event_date_is_approximate boolean not null default false,
  add column authored_date date,
  add column authored_date_precision text,
  add column authored_date_is_approximate boolean not null default false,
  add column author_display_name text,
  add column recipient_display_name text,
  add column place_text text,
  add column relationship_context text,
  add column active_published_revision_id uuid;

alter table public.content_items
  add constraint content_items_event_date_precision_check
    check (event_date_precision is null or event_date_precision in ('day', 'month', 'year')),
  add constraint content_items_event_date_pair_check
    check (
      (event_date is null and event_date_precision is null and event_date_is_approximate = false)
      or (event_date is not null and event_date_precision is not null)
    ),
  add constraint content_items_authored_date_precision_check
    check (authored_date_precision is null or authored_date_precision in ('day', 'month', 'year')),
  add constraint content_items_authored_date_pair_check
    check (
      (authored_date is null and authored_date_precision is null and authored_date_is_approximate = false)
      or (authored_date is not null and authored_date_precision is not null)
    ),
  add constraint content_items_author_display_name_length_check
    check (author_display_name is null or char_length(author_display_name) <= 200),
  add constraint content_items_recipient_display_name_length_check
    check (recipient_display_name is null or char_length(recipient_display_name) <= 200),
  add constraint content_items_place_text_length_check
    check (place_text is null or char_length(place_text) <= 300),
  add constraint content_items_relationship_context_length_check
    check (relationship_context is null or char_length(relationship_context) <= 500);

-- Pointer-only publish/unpublish updates must not masquerade as newer draft
-- edits. Explicit media touches may supply updated_at; draft field changes get
-- a fresh value; an active-pointer-only change preserves the previous value.
drop trigger if exists content_items_set_updated_at on public.content_items;
create or replace function private.set_content_item_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.updated_at is distinct from old.updated_at then
    return new;
  end if;
  if new.type is distinct from old.type
     or new.slug is distinct from old.slug
     or new.title is distinct from old.title
     or new.summary is distinct from old.summary
     or new.body_blocks is distinct from old.body_blocks
     or new.status is distinct from old.status
     or new.cover_media_id is distinct from old.cover_media_id
     or new.published_at is distinct from old.published_at
     or new.updated_by is distinct from old.updated_by
     or new.event_date is distinct from old.event_date
     or new.event_date_precision is distinct from old.event_date_precision
     or new.event_date_is_approximate is distinct from old.event_date_is_approximate
     or new.authored_date is distinct from old.authored_date
     or new.authored_date_precision is distinct from old.authored_date_precision
     or new.authored_date_is_approximate is distinct from old.authored_date_is_approximate
     or new.author_display_name is distinct from old.author_display_name
     or new.recipient_display_name is distinct from old.recipient_display_name
     or new.place_text is distinct from old.place_text
     or new.relationship_context is distinct from old.relationship_context then
    new.updated_at = now();
  else
    new.updated_at = old.updated_at;
  end if;
  return new;
end;
$$;
revoke execute on function private.set_content_item_updated_at() from public, anon, authenticated;
create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function private.set_content_item_updated_at();

create table public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete restrict,
  revision_number integer not null check (revision_number > 0),
  type text not null check (type in ('story', 'gallery', 'letter', 'moment')),
  slug text not null,
  title text not null check (char_length(title) between 1 and 200),
  summary text check (summary is null or char_length(summary) <= 2000),
  body_blocks jsonb not null check (jsonb_typeof(body_blocks) = 'array'),
  event_date date,
  event_date_precision text check (event_date_precision is null or event_date_precision in ('day', 'month', 'year')),
  event_date_is_approximate boolean not null default false,
  authored_date date,
  authored_date_precision text check (authored_date_precision is null or authored_date_precision in ('day', 'month', 'year')),
  authored_date_is_approximate boolean not null default false,
  author_display_name text check (author_display_name is null or char_length(author_display_name) <= 200),
  recipient_display_name text check (recipient_display_name is null or char_length(recipient_display_name) <= 200),
  place_text text check (place_text is null or char_length(place_text) <= 300),
  relationship_context text check (relationship_context is null or char_length(relationship_context) <= 500),
  cover_media_id uuid references public.media_assets(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint content_revisions_content_revision_number_key unique (content_item_id, revision_number),
  constraint content_revisions_content_id_id_key unique (content_item_id, id),
  constraint content_revisions_event_date_pair_check check (
    (event_date is null and event_date_precision is null and event_date_is_approximate = false)
    or (event_date is not null and event_date_precision is not null)
  ),
  constraint content_revisions_authored_date_pair_check check (
    (authored_date is null and authored_date_precision is null and authored_date_is_approximate = false)
    or (authored_date is not null and authored_date_precision is not null)
  )
);

create table public.content_revision_media (
  revision_id uuid not null references public.content_revisions(id) on delete restrict,
  media_id uuid not null references public.media_assets(id) on delete restrict,
  sort_order integer not null check (sort_order >= 0),
  caption_override text,
  placement text,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  alt_text text,
  caption text,
  primary key (revision_id, media_id),
  constraint content_revision_media_revision_sort_key unique (revision_id, sort_order)
);

alter table public.content_revisions
  add constraint content_revisions_cover_membership_fkey
  foreign key (id, cover_media_id)
  references public.content_revision_media(revision_id, media_id)
  deferrable initially deferred;

-- Build independent indexes before the populated backfill. A published item
-- with a cover creates deferred membership trigger events during the backfill;
-- PostgreSQL rejects CREATE INDEX while those events are pending.
create index content_items_active_published_revision_idx
  on public.content_items(active_published_revision_id)
  where active_published_revision_id is not null;
create index content_revisions_current_lookup_idx
  on public.content_revisions(content_item_id, id);
create index content_revision_media_media_id_idx
  on public.content_revision_media(media_id);
create index admin_users_active_user_id_idx
  on public.admin_users(user_id) where active = true;

alter table public.content_items
  add constraint content_items_active_revision_same_item_fkey
  foreign key (id, active_published_revision_id)
  references public.content_revisions(content_item_id, id);

-- Published legacy Moments cannot be truthfully backfilled because the previous
-- schema had no event date. Letter publication remains forbidden altogether.
do $$
begin
  if exists (
    select 1 from public.content_items
    where status = 'published' and type = 'moment'
  ) then
    raise exception 'PR004B_BACKFILL_MOMENT_EVENT_DATE_REQUIRED' using errcode = '23514';
  end if;

  if exists (
    select 1 from public.content_items
    where status = 'published' and type = 'letter'
  ) then
    raise exception 'PR004B_BACKFILL_LETTER_PUBLICATION_FORBIDDEN' using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.content_items ci
    where ci.status = 'published'
      and ci.type <> 'home'
      and ci.cover_media_id is not null
      and not exists (
        select 1 from public.content_media cm
        where cm.content_id = ci.id and cm.media_id = ci.cover_media_id
      )
  ) then
    raise exception 'PR004B_BACKFILL_COVER_NOT_ATTACHED' using errcode = '23514';
  end if;
end;
$$;

alter table public.content_revisions enable row level security;
alter table public.content_revision_media enable row level security;

create policy "active_admins_read_content_revisions"
  on public.content_revisions for select to authenticated
  using ((select private.is_active_admin()));

create policy "active_admins_read_content_revision_media"
  on public.content_revision_media for select to authenticated
  using ((select private.is_active_admin()));

-- Restore the locked shared-admin rule that the owner-scoped migration narrowed.
drop policy if exists "owners_manage_media_assets" on public.media_assets;
drop policy if exists "owners_manage_content_media" on public.content_media;
create policy "active_admins_all_media_assets"
  on public.media_assets for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));
create policy "active_admins_all_content_media"
  on public.content_media for all to authenticated
  using ((select private.is_active_admin()))
  with check ((select private.is_active_admin()));

drop policy if exists "owners_upload_media" on storage.objects;
drop policy if exists "owners_read_media" on storage.objects;
drop policy if exists "owners_update_media" on storage.objects;
drop policy if exists "owners_delete_media" on storage.objects;
create policy "active_admins_upload_media"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and not exists (
      select 1
      from public.media_assets ma
      join public.content_revision_media crm on crm.media_id = ma.id
      where ma.storage_path = storage.objects.name
    )
  );
create policy "active_admins_read_media"
  on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select private.is_active_admin()));
create policy "active_admins_update_media"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and not exists (
      select 1
      from public.media_assets ma
      join public.content_revision_media crm on crm.media_id = ma.id
      where ma.storage_path = storage.objects.name
    )
  )
  with check (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and not exists (
      select 1
      from public.media_assets ma
      join public.content_revision_media crm on crm.media_id = ma.id
      where ma.storage_path = storage.objects.name
    )
  );
create policy "active_admins_delete_media"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (select private.is_active_admin())
    and not exists (
      select 1 from public.media_assets ma
      where ma.storage_path = storage.objects.name
    )
  );

-- The overload centralizes the same active-admin predicate for server-only
-- transaction functions whose acting UUID is explicit.
create or replace function private.is_active_admin(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users
    where user_id = p_user_id and active = true
  );
$$;
revoke execute on function private.is_active_admin(uuid) from public, anon, authenticated;
grant execute on function private.is_active_admin(uuid) to service_role;

create or replace function private.reject_revision_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'PR004B_REVISION_IMMUTABLE' using errcode = '55000';
end;
$$;
revoke execute on function private.reject_revision_mutation() from public, anon, authenticated;

create trigger content_revisions_immutable
  before update or delete on public.content_revisions
  for each row execute function private.reject_revision_mutation();
create trigger content_revision_media_immutable
  before update or delete on public.content_revision_media
  for each row execute function private.reject_revision_mutation();

create or replace function private.publish_content_revision(
  p_admin_id uuid,
  p_content_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.content_items%rowtype;
  v_revision_id uuid := gen_random_uuid();
  v_revision_number integer;
  v_attachment_count integer;
begin
  if not private.is_active_admin(p_admin_id) then
    raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select * into v_item
  from public.content_items
  where id = p_content_id and type <> 'home'
  for update;
  if not found then
    raise exception 'PR004B_CONTENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_item.type = 'letter' then
    raise exception 'PR004B_LETTER_PUBLICATION_FORBIDDEN' using errcode = '23514';
  end if;
  if v_item.type not in ('story', 'gallery', 'moment') then
    raise exception 'PR004B_CONTENT_TYPE_UNSUPPORTED' using errcode = '23514';
  end if;
  if v_item.type = 'moment' and (v_item.event_date is null or v_item.event_date_precision is null) then
    raise exception 'PR004B_MOMENT_EVENT_DATE_REQUIRED' using errcode = '23514';
  end if;
  if jsonb_typeof(v_item.body_blocks) <> 'array' then
    raise exception 'PR004B_BODY_BLOCKS_INVALID' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_item.body_blocks) block
    where jsonb_typeof(block) <> 'object'
       or coalesce(block->>'type', '') not in ('heading', 'paragraph', 'quote', 'media')
       or (block->>'type' in ('heading', 'paragraph', 'quote') and nullif(btrim(coalesce(block->>'text', '')), '') is null)
       or (block->>'type' = 'media' and coalesce(block->>'mediaId', '') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
  ) then
    raise exception 'PR004B_BODY_BLOCKS_INVALID' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_item.body_blocks) block
    where block->>'type' = 'media'
    group by block->>'mediaId' having count(*) > 1
  ) then
    raise exception 'PR004B_DUPLICATE_MEDIA_BLOCK' using errcode = '23514';
  end if;
  if exists (
    select 1 from jsonb_array_elements(v_item.body_blocks) block
    where block->>'type' = 'media'
      and not exists (
        select 1 from public.content_media cm
        where cm.content_id = p_content_id and cm.media_id = (block->>'mediaId')::uuid
      )
  ) then
    raise exception 'PR004B_MEDIA_BLOCK_NOT_ATTACHED' using errcode = '23514';
  end if;

  select count(*) into v_attachment_count
  from public.content_media where content_id = p_content_id;
  if nullif(btrim(coalesce(v_item.summary, '')), '') is null
     and not exists (
       select 1 from jsonb_array_elements(v_item.body_blocks) block
       where block->>'type' in ('heading', 'paragraph', 'quote')
         and nullif(btrim(coalesce(block->>'text', '')), '') is not null
     )
     and v_attachment_count = 0 then
    raise exception 'PR004B_MEANINGFUL_CONTENT_REQUIRED' using errcode = '23514';
  end if;
  if exists (
    select 1
    from public.content_media cm
    join public.media_assets ma on ma.id = cm.media_id
    where cm.content_id = p_content_id
      and (ma.processing_status <> 'ready' or nullif(btrim(coalesce(ma.alt_text, '')), '') is null)
  ) then
    raise exception 'PR004B_READY_MEDIA_ALT_TEXT_REQUIRED' using errcode = '23514';
  end if;
  if v_item.cover_media_id is not null and not exists (
    select 1 from public.content_media
    where content_id = p_content_id and media_id = v_item.cover_media_id
  ) then
    raise exception 'PR004B_COVER_NOT_ATTACHED' using errcode = '23514';
  end if;

  select coalesce(max(revision_number), 0) + 1 into v_revision_number
  from public.content_revisions where content_item_id = p_content_id;

  insert into public.content_revisions (
    id, content_item_id, revision_number, type, slug, title, summary, body_blocks,
    event_date, event_date_precision, event_date_is_approximate,
    authored_date, authored_date_precision, authored_date_is_approximate,
    author_display_name, recipient_display_name, place_text, relationship_context,
    cover_media_id, created_by
  ) values (
    v_revision_id, v_item.id, v_revision_number, v_item.type, v_item.slug,
    v_item.title, v_item.summary, v_item.body_blocks,
    v_item.event_date, v_item.event_date_precision, v_item.event_date_is_approximate,
    v_item.authored_date, v_item.authored_date_precision, v_item.authored_date_is_approximate,
    v_item.author_display_name, v_item.recipient_display_name,
    v_item.place_text, v_item.relationship_context,
    v_item.cover_media_id, p_admin_id
  );

  insert into public.content_revision_media (
    revision_id, media_id, sort_order, caption_override, placement,
    storage_path, mime_type, byte_size, width, height, alt_text, caption
  )
  select
    v_revision_id, ma.id, cm.sort_order, cm.caption_override, cm.placement,
    ma.storage_path, ma.mime_type, ma.byte_size, ma.width, ma.height,
    ma.alt_text, ma.caption
  from public.content_media cm
  join public.media_assets ma on ma.id = cm.media_id
  where cm.content_id = p_content_id
  order by cm.sort_order, ma.id;

  update public.content_items
  set active_published_revision_id = v_revision_id
  where id = p_content_id;

  return jsonb_build_object(
    'outcome', 'published',
    'content_id', p_content_id,
    'revision_id', v_revision_id,
    'revision_number', v_revision_number
  );
end;
$$;

create or replace function private.unpublish_content_revision(
  p_admin_id uuid,
  p_content_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_previous_revision_id uuid;
begin
  if not private.is_active_admin(p_admin_id) then
    raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select active_published_revision_id into v_previous_revision_id
  from public.content_items
  where id = p_content_id and type <> 'home'
  for update;
  if not found then
    raise exception 'PR004B_CONTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.content_items
  set active_published_revision_id = null
  where id = p_content_id;

  return jsonb_build_object(
    'outcome', 'unpublished',
    'content_id', p_content_id,
    'previous_revision_id', v_previous_revision_id
  );
end;
$$;

-- Public-schema wrappers are non-privileged PostgREST entry points. The actual
-- privileged operations remain in the non-exposed private schema.
create or replace function public.publish_content_revision(p_admin_id uuid, p_content_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.publish_content_revision(p_admin_id, p_content_id) $$;

create or replace function public.unpublish_content_revision(p_admin_id uuid, p_content_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.unpublish_content_revision(p_admin_id, p_content_id) $$;

revoke execute on function private.publish_content_revision(uuid, uuid) from public, anon, authenticated;
revoke execute on function private.unpublish_content_revision(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.publish_content_revision(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.unpublish_content_revision(uuid, uuid) from public, anon, authenticated;
grant execute on function private.publish_content_revision(uuid, uuid) to service_role;
grant execute on function private.unpublish_content_revision(uuid, uuid) to service_role;
grant execute on function public.publish_content_revision(uuid, uuid) to service_role;
grant execute on function public.unpublish_content_revision(uuid, uuid) to service_role;

revoke all on table public.content_revisions from anon, authenticated, service_role;
revoke all on table public.content_revision_media from anon, authenticated, service_role;
grant select on table public.content_revisions to authenticated, service_role;
grant select on table public.content_revision_media to authenticated, service_role;

-- Existing service-only media RPC names are retained to avoid unrelated UI
-- churn, but creator UUIDs and path prefixes are audit data, not authorization.
create or replace function public.attach_owned_media(p_admin_id uuid, p_content_id uuid, p_media_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_sort_order integer;
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform 1 from public.content_items where id = p_content_id for update;
  if not found or not exists (select 1 from public.media_assets where id = p_media_id) then
    raise exception 'PR004B_CONTENT_OR_MEDIA_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.content_media where content_id = p_content_id and media_id = p_media_id) then
    raise exception 'Media is already attached' using errcode = '23505';
  end if;
  select coalesce(max(sort_order), -1) + 1 into v_sort_order from public.content_media where content_id = p_content_id;
  insert into public.content_media(content_id, media_id, sort_order) values (p_content_id, p_media_id, v_sort_order);
  update public.content_items set updated_by = p_admin_id, updated_at = clock_timestamp() where id = p_content_id;
  return v_sort_order;
end $$;

create or replace function public.reorder_owned_media(p_admin_id uuid, p_content_id uuid, p_media_id uuid, p_direction text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_current integer; v_neighbour integer;
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  if p_direction not in ('earlier','later') then raise exception 'Invalid reorder direction' using errcode = '22023'; end if;
  perform 1 from public.content_items where id = p_content_id for update;
  if not found then raise exception 'PR004B_CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  select sort_order into v_current from public.content_media where content_id = p_content_id and media_id = p_media_id for update;
  if v_current is null then raise exception 'Attachment not found' using errcode = 'P0002'; end if;
  if p_direction = 'earlier' then
    select max(sort_order) into v_neighbour from public.content_media where content_id = p_content_id and sort_order < v_current;
  else
    select min(sort_order) into v_neighbour from public.content_media where content_id = p_content_id and sort_order > v_current;
  end if;
  if v_neighbour is null then return false; end if;
  update public.content_media set sort_order = case when media_id = p_media_id then v_neighbour else v_current end
  where content_id = p_content_id and sort_order in (v_current, v_neighbour);
  update public.content_items set updated_by = p_admin_id, updated_at = clock_timestamp() where id = p_content_id;
  return true;
end $$;

create or replace function public.detach_owned_media(p_admin_id uuid, p_content_id uuid, p_media_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_deleted integer;
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  perform 1 from public.content_items where id = p_content_id for update;
  if not found then raise exception 'PR004B_CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  delete from public.content_media where content_id = p_content_id and media_id = p_media_id;
  get diagnostics v_deleted = row_count;
  if v_deleted = 1 then
    update public.content_items set updated_by = p_admin_id, updated_at = clock_timestamp() where id = p_content_id;
  end if;
  return v_deleted = 1;
end $$;

create or replace function public.delete_owned_media_records(p_admin_id uuid, p_media_id uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare v_path text;
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select storage_path into v_path from public.media_assets where id = p_media_id for update;
  if v_path is null then raise exception 'PR004B_MEDIA_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.content_items ci
  set updated_by = p_admin_id, updated_at = clock_timestamp()
  where exists (select 1 from public.content_media cm where cm.content_id = ci.id and cm.media_id = p_media_id);
  delete from public.content_media where media_id = p_media_id;
  delete from public.media_assets where id = p_media_id;
  if not found then raise exception 'Media row was not deleted' using errcode = 'P0002'; end if;
  return v_path;
end $$;

revoke execute on function public.attach_owned_media(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.reorder_owned_media(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke execute on function public.detach_owned_media(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.delete_owned_media_records(uuid,uuid) from public,anon,authenticated;
grant execute on function public.attach_owned_media(uuid,uuid,uuid) to service_role;
grant execute on function public.reorder_owned_media(uuid,uuid,uuid,text) to service_role;
grant execute on function public.detach_owned_media(uuid,uuid,uuid) to service_role;
grant execute on function public.delete_owned_media_records(uuid,uuid) to service_role;

create or replace function public.update_shared_media_details(
  p_admin_id uuid,
  p_media_id uuid,
  p_alt_text text,
  p_caption text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not private.is_active_admin(p_admin_id) then
    raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_alt_text, '')), '') is null then
    raise exception 'PR004B_ALT_TEXT_REQUIRED' using errcode = '23514';
  end if;
  perform 1 from public.media_assets where id = p_media_id for update;
  if not found then raise exception 'PR004B_MEDIA_NOT_FOUND' using errcode = 'P0002'; end if;
  update public.media_assets
  set alt_text = btrim(p_alt_text), caption = nullif(btrim(coalesce(p_caption, '')), '')
  where id = p_media_id;
  update public.content_items ci
  set updated_by = p_admin_id, updated_at = clock_timestamp()
  where exists (select 1 from public.content_media cm where cm.content_id = ci.id and cm.media_id = p_media_id);
  return true;
end;
$$;
revoke execute on function public.update_shared_media_details(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.update_shared_media_details(uuid,uuid,text,text) to service_role;

-- Run the populated backfill after every schema-changing statement. Cover
-- membership is intentionally deferred; putting these writes last lets the
-- transaction validate them at commit without blocking later DDL.
-- md5(text)::uuid supplies a stable one-time identifier, making the backfill
-- deterministic even if the migration is inspected in a rolled-back retry.
insert into public.content_revisions (
  id, content_item_id, revision_number, type, slug, title, summary, body_blocks,
  event_date, event_date_precision, event_date_is_approximate,
  authored_date, authored_date_precision, authored_date_is_approximate,
  author_display_name, recipient_display_name, place_text, relationship_context,
  cover_media_id, created_by, created_at
)
select
  md5('pawpaw-pr004b-revision-1:' || ci.id::text)::uuid,
  ci.id, 1, ci.type, ci.slug, ci.title, ci.summary, ci.body_blocks,
  null, null, false,
  null, null, false,
  null, null, null, null,
  ci.cover_media_id, ci.updated_by, coalesce(ci.published_at, ci.updated_at, ci.created_at)
from public.content_items ci
where ci.status = 'published'
  and ci.type in ('story', 'gallery')
on conflict (content_item_id, revision_number) do nothing;

insert into public.content_revision_media (
  revision_id, media_id, sort_order, caption_override, placement,
  storage_path, mime_type, byte_size, width, height, alt_text, caption
)
select
  md5('pawpaw-pr004b-revision-1:' || cm.content_id::text)::uuid,
  ma.id, cm.sort_order, cm.caption_override, cm.placement,
  ma.storage_path, ma.mime_type, ma.byte_size, ma.width, ma.height,
  ma.alt_text, ma.caption
from public.content_media cm
join public.content_items ci on ci.id = cm.content_id
join public.media_assets ma on ma.id = cm.media_id
where ci.status = 'published'
  and ci.type in ('story', 'gallery')
on conflict (revision_id, media_id) do nothing;

update public.content_items ci
set active_published_revision_id = cr.id
from public.content_revisions cr
where cr.content_item_id = ci.id
  and cr.revision_number = 1
  and ci.status = 'published'
  and ci.type in ('story', 'gallery');
