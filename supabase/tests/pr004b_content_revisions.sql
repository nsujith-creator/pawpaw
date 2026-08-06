begin;

select plan(55);

select has_table('public', 'content_revisions', 'content_revisions exists');
select has_table('public', 'content_revision_media', 'content_revision_media exists');
select has_column('public', 'content_items', 'active_published_revision_id', 'selected revision pointer exists');
select ok((select relrowsecurity from pg_class where oid = 'public.content_revisions'::regclass), 'revision RLS is enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.content_revision_media'::regclass), 'revision media RLS is enabled');
select ok(not has_table_privilege('anon', 'public.content_revisions', 'select'), 'anon cannot select revisions');
select ok(not has_table_privilege('authenticated', 'public.content_revisions', 'insert'), 'authenticated cannot insert revisions directly');
select ok(not has_function_privilege('authenticated', 'public.publish_content_revision(uuid,uuid)', 'execute'), 'authenticated cannot call publication wrapper');
select ok(has_function_privilege('service_role', 'public.publish_content_revision(uuid,uuid)', 'execute'), 'service role can call bounded wrapper');

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'stage2-a@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'stage2-b@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'stage2-inactive@local.invalid', '', now(), '{}', '{}', now(), now());

insert into public.admin_users(user_id, display_name, active) values
  ('10000000-0000-4000-8000-000000000001', 'Stage 2 Admin A', true),
  ('10000000-0000-4000-8000-000000000002', 'Stage 2 Admin B', true),
  ('10000000-0000-4000-8000-000000000003', 'Stage 2 Inactive', false);

insert into public.content_items (
  id, type, slug, title, summary, body_blocks, status, created_by, updated_by
) values
  ('20000000-0000-4000-8000-000000000001', 'story', 'stage2-story', 'Revision one title', 'Meaningful summary', '[]', 'draft', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000002', 'story', 'stage2-other', 'Other item', 'Meaningful summary', '[]', 'draft', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000003', 'letter', 'stage2-letter', 'Letter draft', 'Meaningful summary', '[]', 'draft', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001'),
  ('20000000-0000-4000-8000-000000000004', 'moment', 'stage2-moment', 'Moment draft', 'Meaningful summary', '[]', 'draft', '10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001');

select is(
  (public.publish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001')->>'revision_number')::integer,
  1,
  'first publish creates revision 1'
);
select is((select count(*)::integer from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001'), 1, 'first publish creates one revision');
select ok((select active_published_revision_id is not null from public.content_items where id = '20000000-0000-4000-8000-000000000001'), 'first publish selects its revision');

update public.content_items set title = 'Newer private draft', updated_by = '10000000-0000-4000-8000-000000000002'
where id = '20000000-0000-4000-8000-000000000001';
select is((select title from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001' and revision_number = 1), 'Revision one title', 'draft edit leaves revision 1 unchanged');

select is(
  (public.publish_content_revision('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001')->>'revision_number')::integer,
  2,
  'second active admin can republish shared content as revision 2'
);
select is((select count(*)::integer from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001'), 2, 'republish preserves both revisions');
select is((select title from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001' and revision_number = 2), 'Newer private draft', 'revision 2 snapshots the current draft');

select throws_ok(
  $$update public.content_revisions set title = 'mutated' where content_item_id = '20000000-0000-4000-8000-000000000001' and revision_number = 1$$,
  '55000', 'PR004B_REVISION_IMMUTABLE', 'revision update is rejected'
);
select throws_ok(
  $$delete from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001' and revision_number = 1$$,
  '55000', 'PR004B_REVISION_IMMUTABLE', 'revision delete is rejected'
);
select throws_ok(
  $$update public.content_items set active_published_revision_id = (select id from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001' limit 1) where id = '20000000-0000-4000-8000-000000000002'$$,
  '23503', null, 'cross-content selected pointer is rejected'
);
select throws_ok(
  $$select public.publish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000003')$$,
  '23514', 'PR004B_LETTER_PUBLICATION_FORBIDDEN', 'Letter publication is rejected'
);
select throws_ok(
  $$select public.publish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000004')$$,
  '23514', 'PR004B_MOMENT_EVENT_DATE_REQUIRED', 'Moment publication without event date is rejected'
);
select throws_ok(
  $$select public.publish_content_revision('10000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002')$$,
  '42501', 'PR004B_ACTIVE_ADMIN_REQUIRED', 'inactive admin publication is rejected'
);

select is(public.unpublish_content_revision('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001')->>'outcome', 'unpublished', 'second active admin can unpublish shared content');
select ok((select active_published_revision_id is null from public.content_items where id = '20000000-0000-4000-8000-000000000001'), 'unpublish clears only the selected pointer');
select is((select count(*)::integer from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000001'), 2, 'unpublish preserves revision history');

select is(
  (select count(*)::integer from pg_constraint
   where conrelid = 'public.content_revisions'::regclass
     and conname = 'content_revisions_content_revision_number_key'
     and contype = 'u'),
  1,
  'revision numbering has one database uniqueness constraint'
);
select is(
  (select count(*)::integer from public.content_revisions
   where content_item_id in (
     '20000000-0000-4000-8000-000000000002',
     '20000000-0000-4000-8000-000000000003',
     '20000000-0000-4000-8000-000000000004'
   )),
  0,
  'draft records do not receive fabricated revisions'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-4000-8000-000000000004',
  'authenticated', 'authenticated', 'stage2-non-admin@local.invalid', '', now(), '{}', '{}', now(), now()
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::integer from public.content_items where id = '20000000-0000-4000-8000-000000000002'),
  1,
  'second active admin can preview the first admin draft'
);
update public.content_items
set title = 'Shared draft edited by admin B'
where id = '20000000-0000-4000-8000-000000000002';
reset role;
reset "request.jwt.claim.sub";
select is(
  (select title from public.content_items where id = '20000000-0000-4000-8000-000000000002'),
  'Shared draft edited by admin B',
  'second active admin can update the first admin draft'
);

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000003';
select is((select count(*)::integer from public.content_items), 0, 'inactive admin cannot read private drafts');
select is((select count(*)::integer from public.content_revisions), 0, 'inactive admin cannot read revisions');
reset role;
reset "request.jwt.claim.sub";

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000004';
select is((select count(*)::integer from public.content_items), 0, 'authenticated non-admin cannot read private drafts');
select is((select count(*)::integer from public.content_revisions), 0, 'authenticated non-admin cannot read revisions');
reset role;
reset "request.jwt.claim.sub";

set local role anon;
select throws_ok(
  $$select count(*) from public.content_items$$,
  '42501', null, 'anon cannot read private drafts'
);
select throws_ok(
  $$select count(*) from public.content_revisions$$,
  '42501', null, 'anon cannot read revisions'
);
reset role;

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
select is(
  (select count(*)::integer from public.content_revisions
   where content_item_id = '20000000-0000-4000-8000-000000000001'),
  2,
  'active admins can read the same revision history'
);
reset role;
reset "request.jwt.claim.sub";

select ok(
  (select event_date is null
      and event_date_precision is null
      and authored_date is null
      and authored_date_precision is null
      and author_display_name is null
      and recipient_display_name is null
      and place_text is null
      and relationship_context is null
   from public.content_revisions
   where content_item_id = '20000000-0000-4000-8000-000000000001'
     and revision_number = 1),
  'unknown chronology and authorship remain null in a published snapshot'
);

update public.content_items
set summary = null, body_blocks = '[]'::jsonb
where id = '20000000-0000-4000-8000-000000000002';
select throws_ok(
  $$select public.publish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002')$$,
  '23514', 'PR004B_MEANINGFUL_CONTENT_REQUIRED',
  'failed first publication is rejected before snapshot creation'
);
select is(
  (select count(*)::integer from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000002'),
  0,
  'failed first publication creates no revision'
);
select ok(
  (select active_published_revision_id is null from public.content_items where id = '20000000-0000-4000-8000-000000000002'),
  'failed first publication leaves the selected pointer null'
);

update public.content_items
set summary = 'Meaningful summary', title = 'Revision one with media'
where id = '20000000-0000-4000-8000-000000000002';
insert into public.media_assets (
  id, storage_path, mime_type, byte_size, width, height, alt_text, caption,
  processing_status, created_by
) values (
  '30000000-0000-4000-8000-000000000001', 'stage2/shared-image.png',
  'image/png', 123, 100, 80, 'Published media alt', 'Original caption',
  'ready', '10000000-0000-4000-8000-000000000001'
);
insert into public.content_media(content_id, media_id, sort_order, placement)
values (
  '20000000-0000-4000-8000-000000000002',
  '30000000-0000-4000-8000-000000000001',
  0, 'full'
);
update public.content_items
set cover_media_id = '30000000-0000-4000-8000-000000000001'
where id = '20000000-0000-4000-8000-000000000002';

set local role authenticated;
set local "request.jwt.claim.sub" = '10000000-0000-4000-8000-000000000002';
update public.media_assets
set caption = 'Shared caption edited by admin B'
where id = '30000000-0000-4000-8000-000000000001';
reset role;
reset "request.jwt.claim.sub";
select is(
  (select caption from public.media_assets where id = '30000000-0000-4000-8000-000000000001'),
  'Shared caption edited by admin B',
  'second active admin can update the first admin media record'
);

select is(
  (public.publish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002')->>'revision_number')::integer,
  1,
  'media-backed first publish creates revision 1'
);
select is(
  (select alt_text from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '20000000-0000-4000-8000-000000000002'
     and cr.revision_number = 1),
  'Published media alt',
  'first publication snapshots media metadata'
);
select is(
  (select count(*)::integer
   from public.content_items ci
   join public.content_revisions cr
     on cr.id = ci.active_published_revision_id
    and cr.content_item_id = ci.id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  1,
  'viewer selection resolves exactly one selected revision'
);

update public.content_items
set title = 'Private draft title must not leak'
where id = '20000000-0000-4000-8000-000000000002';
update public.media_assets
set alt_text = 'Private draft alt must not leak'
where id = '30000000-0000-4000-8000-000000000001';
select is(
  (select cr.title
   from public.content_items ci
   join public.content_revisions cr
     on cr.id = ci.active_published_revision_id
    and cr.content_item_id = ci.id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  'Revision one with media',
  'draft content edits do not leak through the viewer selection'
);
select is(
  (select crm.alt_text
   from public.content_items ci
   join public.content_revision_media crm on crm.revision_id = ci.active_published_revision_id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  'Published media alt',
  'draft media edits do not change viewer snapshot metadata'
);

update public.media_assets
set processing_status = 'error'
where id = '30000000-0000-4000-8000-000000000001';
select throws_ok(
  $$select public.publish_content_revision('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002')$$,
  '23514', 'PR004B_READY_MEDIA_ALT_TEXT_REQUIRED',
  'failed republish is rejected before snapshot creation'
);
select is(
  (select count(*)::integer from public.content_revisions where content_item_id = '20000000-0000-4000-8000-000000000002'),
  1,
  'failed republish leaves revision history unchanged'
);
select is(
  (select cr.revision_number
   from public.content_items ci
   join public.content_revisions cr on cr.id = ci.active_published_revision_id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  1,
  'failed republish leaves the selected pointer unchanged'
);

update public.content_items
set title = 'Revision two with media'
where id = '20000000-0000-4000-8000-000000000002';
update public.media_assets
set processing_status = 'ready', alt_text = 'Republished media alt'
where id = '30000000-0000-4000-8000-000000000001';
select is(
  (public.publish_content_revision('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002')->>'revision_number')::integer,
  2,
  'media-backed republish creates revision 2'
);
select is(
  (select crm.alt_text
   from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '20000000-0000-4000-8000-000000000002'
     and cr.revision_number = 2),
  'Republished media alt',
  'republish snapshots the current media metadata'
);
select is(
  (select cr.title
   from public.content_items ci
   join public.content_revisions cr on cr.id = ci.active_published_revision_id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  'Revision two with media',
  'viewer selection follows only the newly selected revision'
);
select throws_ok(
  $$update public.content_revision_media
    set alt_text = 'mutated'
    where media_id = '30000000-0000-4000-8000-000000000001'$$,
  '55000', 'PR004B_REVISION_IMMUTABLE',
  'revision media update is rejected'
);
select is(
  public.unpublish_content_revision('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002')->>'outcome',
  'unpublished',
  'active admin can unpublish the media-backed content'
);
select is(
  (select count(*)::integer
   from public.content_items ci
   join public.content_revisions cr
     on cr.id = ci.active_published_revision_id
    and cr.content_item_id = ci.id
   where ci.id = '20000000-0000-4000-8000-000000000002'),
  0,
  'unpublish removes viewer visibility while history remains'
);

select * from finish();
rollback;
