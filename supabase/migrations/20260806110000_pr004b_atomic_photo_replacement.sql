-- PR-004B Stage 3: atomically replace one photograph in a private draft.
-- The old media row and Storage object are intentionally retained.

create or replace function public.replace_draft_content_media(
  p_admin_id uuid,
  p_content_id uuid,
  p_old_media_id uuid,
  p_new_media_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_old_sort_order integer;
  v_old_caption_override text;
  v_old_placement text;
  v_new_status text;
  v_new_alt_text text;
  v_cover_transferred boolean;
begin
  if not private.is_active_admin(p_admin_id) then
    raise exception 'PR004B_ACTIVE_ADMIN_REQUIRED' using errcode = '42501';
  end if;
  if p_old_media_id = p_new_media_id then
    raise exception 'PR004B_REPLACEMENT_MUST_DIFFER' using errcode = '22023';
  end if;

  -- Serialise draft media changes for this content item. A stale page therefore
  -- cannot pass validation and then replace a different association.
  perform 1
  from public.content_items
  where id = p_content_id
  for update;
  if not found then
    raise exception 'PR004B_CONTENT_NOT_FOUND' using errcode = 'P0002';
  end if;

  select sort_order, caption_override, placement
  into v_old_sort_order, v_old_caption_override, v_old_placement
  from public.content_media
  where content_id = p_content_id and media_id = p_old_media_id
  for update;
  if not found then
    raise exception 'PR004B_REPLACEMENT_TARGET_STALE' using errcode = 'P0002';
  end if;

  select processing_status, alt_text
  into v_new_status, v_new_alt_text
  from public.media_assets
  where id = p_new_media_id
  for update;
  if not found then
    raise exception 'PR004B_REPLACEMENT_MEDIA_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_new_status <> 'ready' or nullif(btrim(coalesce(v_new_alt_text, '')), '') is null then
    raise exception 'PR004B_REPLACEMENT_MEDIA_INELIGIBLE' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.content_media
    where content_id = p_content_id and media_id = p_new_media_id
  ) then
    raise exception 'PR004B_REPLACEMENT_ALREADY_ATTACHED' using errcode = '23505';
  end if;

  -- Updating the association key preserves its position and presentation
  -- fields. The enclosing PostgreSQL function is one transaction, including
  -- the conditional cover transfer and updated-at bookkeeping below.
  update public.content_media
  set media_id = p_new_media_id,
      sort_order = v_old_sort_order,
      caption_override = v_old_caption_override,
      placement = v_old_placement
  where content_id = p_content_id and media_id = p_old_media_id;

  v_cover_transferred := exists (
    select 1 from public.content_items
    where id = p_content_id and cover_media_id = p_old_media_id
  );
  update public.content_items
  set cover_media_id = case when v_cover_transferred then p_new_media_id else cover_media_id end,
      updated_by = p_admin_id,
      updated_at = clock_timestamp()
  where id = p_content_id;

  return jsonb_build_object(
    'sort_order', v_old_sort_order,
    'cover_transferred', v_cover_transferred
  );
end;
$$;

revoke execute on function public.replace_draft_content_media(uuid,uuid,uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.replace_draft_content_media(uuid,uuid,uuid,uuid)
  to service_role;
