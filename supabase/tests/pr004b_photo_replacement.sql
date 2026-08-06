begin;

select plan(37);

select has_function(
  'public',
  'replace_draft_content_media',
  array['uuid', 'uuid', 'uuid', 'uuid'],
  'atomic draft photograph replacement RPC exists'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.replace_draft_content_media(uuid,uuid,uuid,uuid)',
    'execute'
  ),
  'authenticated clients cannot call the service-only replacement RPC'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.replace_draft_content_media(uuid,uuid,uuid,uuid)',
    'execute'
  ),
  'service role can call the bounded replacement RPC'
);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'stage3-a@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'stage3-b@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'stage3-inactive@local.invalid', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '11000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'stage3-non-admin@local.invalid', '', now(), '{}', '{}', now(), now());

insert into public.admin_users(user_id, display_name, active) values
  ('11000000-0000-4000-8000-000000000001', 'Stage 3 Admin A', true),
  ('11000000-0000-4000-8000-000000000002', 'Stage 3 Admin B', true),
  ('11000000-0000-4000-8000-000000000003', 'Stage 3 Inactive', false);

insert into public.content_items (
  id, type, slug, title, summary, body_blocks, status, created_by, updated_by
) values
  ('22000000-0000-4000-8000-000000000001', 'story', 'stage3-published-draft', 'Published family snapshot', 'Generated local fixture', '[]', 'draft', '11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001'),
  ('22000000-0000-4000-8000-000000000002', 'story', 'stage3-admin-a', 'Admin A draft', 'Generated local fixture', '[]', 'draft', '11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001'),
  ('22000000-0000-4000-8000-000000000003', 'story', 'stage3-unauthorized', 'Authorization draft', 'Generated local fixture', '[]', 'draft', '11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001'),
  ('22000000-0000-4000-8000-000000000004', 'story', 'stage3-cross-content', 'Cross-content draft', 'Generated local fixture', '[]', 'draft', '11000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001');

insert into public.media_assets (
  id, storage_path, mime_type, byte_size, width, height, alt_text, caption,
  processing_status, created_by
) values
  ('33000000-0000-4000-8000-000000000001', 'stage3/generated-old-one.png', 'image/png', 101, 10, 10, 'Generated old one', 'Old one', 'ready', '11000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000002', 'stage3/generated-new-one.png', 'image/png', 102, 10, 10, 'Generated new one', 'New one', 'ready', '11000000-0000-4000-8000-000000000002'),
  ('33000000-0000-4000-8000-000000000003', 'stage3/generated-old-two.png', 'image/png', 103, 10, 10, 'Generated old two', 'Old two', 'ready', '11000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000004', 'stage3/generated-new-two.png', 'image/png', 104, 10, 10, 'Generated new two', 'New two', 'ready', '11000000-0000-4000-8000-000000000002'),
  ('33000000-0000-4000-8000-000000000005', 'stage3/generated-old-three.png', 'image/png', 105, 10, 10, 'Generated old three', 'Old three', 'ready', '11000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000006', 'stage3/generated-new-three.png', 'image/png', 106, 10, 10, 'Generated new three', 'New three', 'ready', '11000000-0000-4000-8000-000000000002'),
  ('33000000-0000-4000-8000-000000000007', 'stage3/generated-cross-old.png', 'image/png', 107, 10, 10, 'Generated cross old', 'Cross old', 'ready', '11000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000008', 'stage3/generated-attached.png', 'image/png', 108, 10, 10, 'Generated attached', 'Attached', 'ready', '11000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000009', 'stage3/generated-ineligible.png', 'image/png', 109, 10, 10, 'Generated ineligible', 'Ineligible', 'error', '11000000-0000-4000-8000-000000000002'),
  ('33000000-0000-4000-8000-000000000010', 'stage3/generated-non-cover-new.png', 'image/png', 110, 10, 10, 'Generated non-cover new', 'Non-cover new', 'ready', '11000000-0000-4000-8000-000000000002');

insert into public.content_media(content_id, media_id, sort_order, caption_override, placement) values
  ('22000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', 2, 'Preserved draft caption', 'full'),
  ('22000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000008', 5, 'Non-cover caption', 'inline'),
  ('22000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000003', 7, 'Second draft caption', 'inline'),
  ('22000000-0000-4000-8000-000000000003', '33000000-0000-4000-8000-000000000005', 4, 'Authorization caption', 'full'),
  ('22000000-0000-4000-8000-000000000004', '33000000-0000-4000-8000-000000000007', 1, 'Cross-content caption', 'full');

update public.content_items
set cover_media_id = case id
  when '22000000-0000-4000-8000-000000000001' then '33000000-0000-4000-8000-000000000001'::uuid
  when '22000000-0000-4000-8000-000000000002' then '33000000-0000-4000-8000-000000000003'::uuid
  when '22000000-0000-4000-8000-000000000003' then '33000000-0000-4000-8000-000000000005'::uuid
  when '22000000-0000-4000-8000-000000000004' then '33000000-0000-4000-8000-000000000007'::uuid
end
where id in (
  '22000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000002',
  '22000000-0000-4000-8000-000000000003',
  '22000000-0000-4000-8000-000000000004'
);

select public.publish_content_revision(
  '11000000-0000-4000-8000-000000000001',
  '22000000-0000-4000-8000-000000000001'
);

select is(
  (public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000002',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000002'
  )->>'sort_order')::integer,
  2,
  'active admin B can replace admin A draft media'
);
select is(
  (select concat_ws('|', sort_order::text, caption_override, placement)
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000001'
     and media_id = '33000000-0000-4000-8000-000000000002'),
  '2|Preserved draft caption|full',
  'replacement preserves position and draft presentation fields'
);
select is(
  (select cover_media_id::text from public.content_items where id = '22000000-0000-4000-8000-000000000001'),
  '33000000-0000-4000-8000-000000000002',
  'replacement transfers draft cover when the old photograph was cover'
);
select is(
  (select count(*)::integer from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000001'
     and media_id = '33000000-0000-4000-8000-000000000001'),
  0,
  'successful replacement removes only the old draft association'
);
select is(
  (select count(*)::integer from public.media_assets where id = '33000000-0000-4000-8000-000000000001'),
  1,
  'successful replacement retains the old media record'
);

select is(
  (public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000004'
  )->>'sort_order')::integer,
  7,
  'active admin A can replace a draft photograph'
);
select is(
  (select concat_ws('|', sort_order::text, caption_override, placement)
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000002'
     and media_id = '33000000-0000-4000-8000-000000000004'),
  '7|Second draft caption|inline',
  'admin A replacement preserves the exact association position'
);
select is(
  (select cover_media_id::text from public.content_items where id = '22000000-0000-4000-8000-000000000002'),
  '33000000-0000-4000-8000-000000000004',
  'admin A replacement transfers its draft cover'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000002')$$,
  '22023', 'PR004B_REPLACEMENT_MUST_DIFFER', 'same-media replacement is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 2
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000001'
     and media_id = '33000000-0000-4000-8000-000000000002')
  and (select cover_media_id = '33000000-0000-4000-8000-000000000002'
       from public.content_items where id = '22000000-0000-4000-8000-000000000001'),
  'same-media failure leaves the draft association and cover unchanged'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000006')$$,
  'P0002', 'PR004B_REPLACEMENT_TARGET_STALE', 'stale replacement target is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 2
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000001'
     and media_id = '33000000-0000-4000-8000-000000000002'),
  'stale failure leaves the authoritative replacement usable'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000007',
    '33000000-0000-4000-8000-000000000006')$$,
  'P0002', 'PR004B_REPLACEMENT_TARGET_STALE', 'cross-content old association is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 1
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000004'
     and media_id = '33000000-0000-4000-8000-000000000007'),
  'cross-content failure leaves the real association unchanged'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000002',
    '33000000-0000-4000-8000-000000000008')$$,
  '23505', 'PR004B_REPLACEMENT_ALREADY_ATTACHED', 'already-attached replacement is rejected'
);
select is(
  (select count(*)::integer from public.content_media where content_id = '22000000-0000-4000-8000-000000000001'),
  2,
  'already-attached failure creates no partial relational change'
);

select is(
  (public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000001',
    '33000000-0000-4000-8000-000000000008',
    '33000000-0000-4000-8000-000000000010'
  )->>'sort_order')::integer,
  5,
  'an eligible non-cover association can be replaced in place'
);
select is(
  (select cover_media_id::text from public.content_items where id = '22000000-0000-4000-8000-000000000001'),
  '33000000-0000-4000-8000-000000000002',
  'replacing a non-cover photograph does not change draft cover meaning'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000003',
    '22000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000005',
    '33000000-0000-4000-8000-000000000006')$$,
  '42501', 'PR004B_ACTIVE_ADMIN_REQUIRED', 'inactive admin replacement is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 4
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000003'
     and media_id = '33000000-0000-4000-8000-000000000005'),
  'inactive-admin failure leaves the old association usable'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000004',
    '22000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000005',
    '33000000-0000-4000-8000-000000000006')$$,
  '42501', 'PR004B_ACTIVE_ADMIN_REQUIRED', 'authenticated non-admin replacement is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 4
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000003'
     and media_id = '33000000-0000-4000-8000-000000000005'),
  'non-admin failure leaves the old association usable'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000005',
    '33000000-0000-4000-8000-000000000009')$$,
  '23514', 'PR004B_REPLACEMENT_MEDIA_INELIGIBLE', 'non-ready replacement is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 4
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000003'
     and media_id = '33000000-0000-4000-8000-000000000005'),
  'ineligible-media failure leaves the old association usable'
);

select throws_ok(
  $$select public.replace_draft_content_media(
    '11000000-0000-4000-8000-000000000001',
    '22000000-0000-4000-8000-000000000003',
    '33000000-0000-4000-8000-000000000005',
    '33000000-0000-4000-8000-000000000099')$$,
  'P0002', 'PR004B_REPLACEMENT_MEDIA_NOT_FOUND', 'missing replacement media is rejected'
);
select ok(
  (select count(*) = 1 and min(sort_order) = 4
   from public.content_media
   where content_id = '22000000-0000-4000-8000-000000000003'
     and media_id = '33000000-0000-4000-8000-000000000005'),
  'missing-media failure leaves the old association usable'
);

select is(
  (select count(*)::integer from public.content_revisions where content_item_id = '22000000-0000-4000-8000-000000000001'),
  1,
  'draft replacements do not create or alter published revisions'
);
select is(
  (select cover_media_id::text from public.content_revisions where content_item_id = '22000000-0000-4000-8000-000000000001'),
  '33000000-0000-4000-8000-000000000001',
  'published revision retains its original cover photograph'
);
select is(
  (select concat_ws('|', sort_order::text, caption_override, placement)
   from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '22000000-0000-4000-8000-000000000001'
     and crm.media_id = '33000000-0000-4000-8000-000000000001'),
  '2|Preserved draft caption|full',
  'published revision retains the original association snapshot'
);
select is(
  (select count(*)::integer
   from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '22000000-0000-4000-8000-000000000001'
     and crm.media_id = '33000000-0000-4000-8000-000000000002'),
  0,
  'draft cover replacement does not leak into revision media'
);
select is(
  (select count(*)::integer
   from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '22000000-0000-4000-8000-000000000001'
     and crm.media_id = '33000000-0000-4000-8000-000000000010'),
  0,
  'draft non-cover replacement does not leak into revision media'
);
select is(
  (select count(*)::integer
   from public.content_revision_media crm
   join public.content_revisions cr on cr.id = crm.revision_id
   where cr.content_item_id = '22000000-0000-4000-8000-000000000001'),
  2,
  'published revision media snapshot count remains unchanged'
);
select is(
  (select count(*)::integer from public.media_assets where storage_path like 'stage3/generated-%'),
  10,
  'all generated old and new media records remain in Media Library'
);
select ok(
  pg_get_functiondef('public.replace_draft_content_media(uuid,uuid,uuid,uuid)'::regprocedure) not ilike '%delete%'
  and pg_get_functiondef('public.replace_draft_content_media(uuid,uuid,uuid,uuid)'::regprocedure) not ilike '%storage.objects%',
  'replacement RPC contains no media or Storage deletion path'
);

select * from finish();
rollback;
