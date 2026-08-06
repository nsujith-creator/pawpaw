begin;

select plan(24);

select ok(
  has_schema_privilege('service_role', 'private', 'usage'),
  'service role can enter the private schema used by PR-004B wrappers'
);

select ok(has_function_privilege('service_role', 'private.publish_content_revision(uuid,uuid)', 'execute'), 'service role can execute private publish');
select ok(has_function_privilege('service_role', 'private.unpublish_content_revision(uuid,uuid)', 'execute'), 'service role can execute private unpublish');
select ok(has_function_privilege('service_role', 'private.is_active_admin(uuid)', 'execute'), 'service role can execute private active-admin lookup');

select ok(not has_function_privilege('public', 'private.publish_content_revision(uuid,uuid)', 'execute'), 'PUBLIC cannot execute private publish');
select ok(not has_function_privilege('public', 'private.unpublish_content_revision(uuid,uuid)', 'execute'), 'PUBLIC cannot execute private unpublish');
select ok(not has_function_privilege('public', 'private.is_active_admin(uuid)', 'execute'), 'PUBLIC cannot execute private active-admin lookup');
select ok(not has_function_privilege('anon', 'private.publish_content_revision(uuid,uuid)', 'execute'), 'anon cannot execute private publish');
select ok(not has_function_privilege('anon', 'private.unpublish_content_revision(uuid,uuid)', 'execute'), 'anon cannot execute private unpublish');
select ok(not has_function_privilege('anon', 'private.is_active_admin(uuid)', 'execute'), 'anon cannot execute private active-admin lookup');
select ok(not has_function_privilege('authenticated', 'private.publish_content_revision(uuid,uuid)', 'execute'), 'authenticated cannot execute private publish');
select ok(not has_function_privilege('authenticated', 'private.unpublish_content_revision(uuid,uuid)', 'execute'), 'authenticated cannot execute private unpublish');
select ok(not has_function_privilege('authenticated', 'private.is_active_admin(uuid)', 'execute'), 'authenticated cannot execute private active-admin lookup');

select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'publish_content_revision' and pg_get_function_identity_arguments(p.oid) = 'p_admin_id uuid, p_content_id uuid'), 'public publish wrapper remains security invoker');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'unpublish_content_revision' and pg_get_function_identity_arguments(p.oid) = 'p_admin_id uuid, p_content_id uuid'), 'public unpublish wrapper remains security invoker');
select ok(not (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'replace_draft_content_media' and pg_get_function_identity_arguments(p.oid) = 'p_admin_id uuid, p_content_id uuid, p_old_media_id uuid, p_new_media_id uuid'), 'public replacement wrapper remains security invoker');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'service-role-a@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '41000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'service-role-b@local.invalid', '', now(), '{}', '{}', now(), now());

insert into public.admin_users(user_id, display_name, active) values
  ('41000000-0000-4000-8000-000000000001', 'Service role Admin A', true),
  ('41000000-0000-4000-8000-000000000002', 'Service role Admin B', true);

insert into public.content_items (
  id, type, slug, title, summary, body_blocks, status, created_by, updated_by
) values (
  '42000000-0000-4000-8000-000000000001', 'story', 'service-role-wrapper-story', 'Revision one title', 'Synthetic local fixture', '[{"type":"paragraph","text":"Synthetic local fixture."}]', 'draft', '41000000-0000-4000-8000-000000000001', '41000000-0000-4000-8000-000000000001'
);

insert into public.media_assets (
  id, storage_path, mime_type, byte_size, width, height, alt_text, caption, processing_status, created_by
) values
  ('43000000-0000-4000-8000-000000000001', 'service-role/old.png', 'image/png', 1, 1, 1, 'Old synthetic photograph', 'Old', 'ready', '41000000-0000-4000-8000-000000000001'),
  ('43000000-0000-4000-8000-000000000002', 'service-role/new.png', 'image/png', 1, 1, 1, 'New synthetic photograph', 'New', 'ready', '41000000-0000-4000-8000-000000000002');

insert into public.content_media(content_id, media_id, sort_order, caption_override, placement) values
  ('42000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', 3, 'Preserved fixture caption', 'inline');
update public.content_items set cover_media_id = '43000000-0000-4000-8000-000000000001' where id = '42000000-0000-4000-8000-000000000001';

set local role service_role;

select is((public.publish_content_revision('41000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001')->>'revision_number')::integer, 1, 'service role reaches private publish through the unchanged public wrapper');
select is((public.replace_draft_content_media('41000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000001', '43000000-0000-4000-8000-000000000002')->>'sort_order')::integer, 3, 'service role reaches private active-admin lookup through unchanged public replacement wrapper');
update public.content_items set title = 'Revision two title', updated_by = '41000000-0000-4000-8000-000000000002' where id = '42000000-0000-4000-8000-000000000001';
select is((public.publish_content_revision('41000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000001')->>'revision_number')::integer, 2, 'service role reaches private republish through the unchanged public wrapper');
select is(public.unpublish_content_revision('41000000-0000-4000-8000-000000000002', '42000000-0000-4000-8000-000000000001')->>'outcome', 'unpublished', 'service role reaches private unpublish through the unchanged public wrapper');

reset role;

select is((select count(*)::integer from public.content_revisions where content_item_id = '42000000-0000-4000-8000-000000000001'), 2, 'service-role lifecycle preserved both immutable revisions');
select is((select title from public.content_revisions where content_item_id = '42000000-0000-4000-8000-000000000001' and revision_number = 1), 'Revision one title', 'first immutable revision remains unchanged after the later draft edit');
select is((select cover_media_id::text from public.content_revisions where content_item_id = '42000000-0000-4000-8000-000000000001' and revision_number = 1), '43000000-0000-4000-8000-000000000001', 'first published cover remains unchanged after draft replacement');
select is((select cover_media_id::text from public.content_revisions where content_item_id = '42000000-0000-4000-8000-000000000001' and revision_number = 2), '43000000-0000-4000-8000-000000000002', 'republish snapshots the replacement cover');

select * from finish();
rollback;
