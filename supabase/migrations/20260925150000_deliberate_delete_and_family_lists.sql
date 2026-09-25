-- 1. Anything can be deleted on purpose.
-- Published history stays locked against edits and accidental deletes; a delete that runs
-- inside delete_story_everywhere or delete_photo_everywhere sets a transaction-local flag
-- that lets those two functions, and only them, remove it.
create or replace function private.reject_revision_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('pawpaw.deliberate_delete', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'PR004B_REVISION_IMMUTABLE' using errcode = '55000';
end;
$$;

create or replace function private.reject_revision_video_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(current_setting('pawpaw.deliberate_delete', true), '') = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  raise exception 'VIDEO_REVISION_IMMUTABLE' using errcode = '55000';
end;
$$;

-- Deletes a story, its published history and its video links. Photos stay in the library.
-- Returns the videos that no longer belong anywhere, so the app can remove them from the
-- video service.
create or replace function public.delete_story_everywhere(p_admin_id uuid, p_content_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_type text;
  v_videos jsonb;
  v_video_ids uuid[];
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select type into v_type from public.content_items where id = p_content_id for update;
  if not found then raise exception 'CONTENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_type = 'home' then raise exception 'HOME_CANNOT_BE_DELETED' using errcode = '23514'; end if;
  perform set_config('pawpaw.deliberate_delete', 'on', true);

  select array_agg(distinct v) into v_video_ids from (
    select video_id as v from public.content_videos where content_id = p_content_id
    union
    select rv.video_id from public.content_revision_videos rv
      join public.content_revisions r on r.id = rv.revision_id where r.content_item_id = p_content_id
  ) found;

  update public.content_items set active_published_revision_id = null where id = p_content_id;
  delete from public.content_revision_videos where revision_id in (select id from public.content_revisions where content_item_id = p_content_id);
  delete from public.content_revision_media where revision_id in (select id from public.content_revisions where content_item_id = p_content_id);
  delete from public.content_revisions where content_item_id = p_content_id;
  delete from public.content_videos where content_id = p_content_id;
  delete from public.content_items where id = p_content_id;

  select coalesce(jsonb_agg(jsonb_build_object('id', va.id, 'cloudflare_uid', va.cloudflare_uid)), '[]'::jsonb) into v_videos
  from public.video_assets va
  where va.id = any(coalesce(v_video_ids, '{}'::uuid[]))
    and not exists (select 1 from public.content_videos cv where cv.video_id = va.id)
    and not exists (select 1 from public.content_revision_videos rv where rv.video_id = va.id);
  return v_videos;
end;
$$;

-- Deletes a photo from every story, every published version and the library.
-- Returns its storage path so the app can remove the file and its resized copies.
create or replace function public.delete_photo_everywhere(p_admin_id uuid, p_media_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_path text;
  v_block jsonb := jsonb_build_array(jsonb_build_object('mediaId', p_media_id::text));
begin
  if not private.is_active_admin(p_admin_id) then raise exception 'ACTIVE_ADMIN_REQUIRED' using errcode = '42501'; end if;
  select storage_path into v_path from public.media_assets where id = p_media_id for update;
  if v_path is null then raise exception 'MEDIA_NOT_FOUND' using errcode = 'P0002'; end if;
  perform set_config('pawpaw.deliberate_delete', 'on', true);

  -- Take it out of the words wherever it was placed, in drafts and published versions.
  update public.content_items set
    body_blocks = coalesce((select jsonb_agg(b order by o) from jsonb_array_elements(body_blocks) with ordinality t(b, o)
                            where not (b->>'type' = 'media' and b->>'mediaId' = p_media_id::text)), '[]'::jsonb),
    updated_by = p_admin_id
  where body_blocks @> v_block;
  update public.content_revisions set
    body_blocks = coalesce((select jsonb_agg(b order by o) from jsonb_array_elements(body_blocks) with ordinality t(b, o)
                            where not (b->>'type' = 'media' and b->>'mediaId' = p_media_id::text)), '[]'::jsonb)
  where body_blocks @> v_block;
  update public.content_revisions set cover_media_id = null where cover_media_id = p_media_id;
  delete from public.content_revision_media where media_id = p_media_id;
  delete from public.content_media where media_id = p_media_id;
  delete from public.media_assets where id = p_media_id;
  return v_path;
end;
$$;

revoke execute on function public.delete_story_everywhere(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.delete_photo_everywhere(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_story_everywhere(uuid, uuid) to service_role;
grant execute on function public.delete_photo_everywhere(uuid, uuid) to service_role;

-- 2. Her names and her people, editable from the desk.
create table if not exists public.family_lists (
  key text primary key check (key in ('her-names', 'her-people')),
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.family_lists enable row level security;
revoke all on public.family_lists from anon, authenticated;
grant select, insert, update on public.family_lists to service_role;

insert into public.family_lists (key, items) values
  ('her-names', $j$[{"text": "വരദ", "note": "Varada · she who grants boons", "href": "/chapters/she-arrives"}, {"text": "pawpaw", "note": "acchan's, for online", "href": "/chapters/my-pawpaw"}, {"text": "pupu", "note": "on her 1-month cake · amma's too"}, {"text": "ചക്കു", "note": "chakku · amma's"}, {"text": "ചുന്ദരമുത്ത്", "note": "chundaramutthu · amma's"}, {"text": "ശങ്കു", "note": "shanku · amma's"}, {"text": "വാവ", "note": "vava"}, {"text": "മണിക്കുട്ടി", "note": "manikutty"}, {"text": "bubba · bubbu · V"}]$j$::jsonb),
  ('her-people', $j$[{"malayalam": "അച്ഛൻ", "said": "acchan"}, {"malayalam": "അമ്മ", "said": "amma"}, {"malayalam": "അച്ഛച്ചൻ", "said": "acchachan"}, {"malayalam": "അച്ഛമ്മ", "said": "acchamma"}, {"malayalam": "അമ്മായി", "said": "ammayi"}, {"malayalam": "ശ്രീമാമൻ", "said": "sreemaman · ammavan"}, {"malayalam": "അമ്മുച്ചി", "said": "ammuchi · amuchi"}, {"malayalam": "രഘുമാമൻ", "said": "raghumaman · nunnumaman · ammavan"}]$j$::jsonb)
on conflict (key) do nothing;
