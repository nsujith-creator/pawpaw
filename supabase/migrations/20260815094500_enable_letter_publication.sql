-- Letters use the existing immutable revision model. Publication remains private
-- to the family archive and adds only the context that makes a letter truthful.
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
  if v_item.type not in ('story', 'gallery', 'letter', 'moment') then
    raise exception 'PR004B_CONTENT_TYPE_UNSUPPORTED' using errcode = '23514';
  end if;
  if v_item.type = 'moment' and (v_item.event_date is null or v_item.event_date_precision is null) then
    raise exception 'PR004B_MOMENT_EVENT_DATE_REQUIRED' using errcode = '23514';
  end if;
  if v_item.type = 'letter' and (
    nullif(btrim(coalesce(v_item.author_display_name, '')), '') is null
    or nullif(btrim(coalesce(v_item.recipient_display_name, '')), '') is null
    or v_item.authored_date is null
    or v_item.authored_date_precision is null
  ) then
    raise exception 'LETTER_PUBLICATION_FIELDS_REQUIRED' using errcode = '23514';
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

revoke execute on function private.publish_content_revision(uuid, uuid) from public, anon, authenticated;
grant execute on function private.publish_content_revision(uuid, uuid) to service_role;
