import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { attachMediaCore, replaceAttachmentCore, setCoverMediaCore } from '@/lib/media/manage-media'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db: SupabaseClient = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const run = `pawpaw-test-reverification-${randomUUID().slice(0, 8)}`
const password = `Pawpaw-${randomUUID()}!aA1`

async function getSelectedPublished(slug: string) {
  const item = await db.from('content_items')
    .select('id, active_published_revision_id').eq('slug', slug).maybeSingle()
  if (item.error) throw item.error
  if (!item.data?.active_published_revision_id) return null
  const revision = await db.from('content_revisions')
    .select('id, title, cover_media_id').eq('id', item.data.active_published_revision_id).single()
  if (revision.error) throw revision.error
  const media = await db.from('content_revision_media')
    .select('media_id, sort_order, placement').eq('revision_id', revision.data.id).order('sort_order')
  if (media.error) throw media.error
  return { ...revision.data, media: media.data }
}

async function createAdmin(label: string): Promise<string> {
  const created = await db.auth.admin.createUser({
    email: `${run}-${label}@example.invalid`,
    password,
    email_confirm: true,
    user_metadata: { pawpaw_test_fixture: true, repository: 'pawpaw', run_id: run, suite: 'reverification' },
  })
  if (created.error || !created.data.user) throw created.error ?? new Error('Synthetic admin was not created')
  const allowed = await db.from('admin_users').insert({
    user_id: created.data.user.id,
    display_name: `Synthetic ${label}`,
    active: true,
  })
  if (allowed.error) throw allowed.error
  return created.data.user.id
}

describe('PR-004B integrated release re-verification', () => {
  it('proves the shared-admin lifecycle, selected immutable revision, replacement boundary, and Letter guard', async () => {
    const adminA = await createAdmin('admin-a')
    const adminB = await createAdmin('admin-b')
    const slug = `${run}-story`

    const story = await db.from('content_items').insert({
      type: 'story',
      slug,
      title: 'Immutable revision one',
      summary: 'Synthetic non-private fixture',
      body_blocks: [{ type: 'paragraph', text: 'First published text.' }],
      status: 'draft',
      created_by: adminA,
      updated_by: adminA,
    }).select('id').single()
    if (story.error) throw story.error

    const letter = await db.from('content_items').insert({
      type: 'letter',
      slug: `${run}-letter`,
      title: 'Synthetic disabled letter',
      body_blocks: [{ type: 'paragraph', text: 'Never publish this fixture.' }],
      status: 'draft',
      created_by: adminA,
      updated_by: adminA,
    }).select('id').single()
    if (letter.error) throw letter.error

    const media = await db.from('media_assets').insert([
      {
        storage_path: `${adminA}/${run}-old.png`, mime_type: 'image/png', byte_size: 1,
        width: 1, height: 1, alt_text: 'Old synthetic photograph', caption: 'Old fixture',
        processing_status: 'ready', created_by: adminA,
      },
      {
        storage_path: `${adminB}/${run}-new.png`, mime_type: 'image/png', byte_size: 1,
        width: 1, height: 1, alt_text: 'New synthetic photograph', caption: 'New fixture',
        processing_status: 'ready', created_by: adminB,
      },
    ]).select('id')
    if (media.error || !media.data) throw media.error ?? new Error('Synthetic media rows were not created')
    const [oldPhoto, newPhoto] = media.data

    expect(await attachMediaCore(db, adminA, story.data.id, oldPhoto.id)).toEqual({ ok: true })
    const positioned = await db.from('content_media').update({ sort_order: 3, placement: 'inline' })
      .eq('content_id', story.data.id).eq('media_id', oldPhoto.id)
    expect(positioned.error).toBeNull()
    expect(await setCoverMediaCore(db, adminA, story.data.id, oldPhoto.id)).toEqual({ ok: true })

    const firstPublish = await db.rpc('publish_content_revision', {
      p_admin_id: adminA, p_content_id: story.data.id,
    })
    expect(firstPublish.error).toBeNull()

    const firstViewer = await getSelectedPublished(slug)
    expect(firstViewer).toEqual(expect.objectContaining({
      title: 'Immutable revision one', cover_media_id: oldPhoto.id,
      media: [{ media_id: oldPhoto.id, sort_order: 3, placement: 'inline' }],
    }))
    const firstRevisionId = firstViewer!.id

    const secondAdminEdit = await db.from('content_items').update({
      title: 'Immutable revision two',
      body_blocks: [{ type: 'paragraph', text: 'Second published text.' }],
      updated_by: adminB,
    }).eq('id', story.data.id).select('id').single()
    expect(secondAdminEdit.error).toBeNull()
    expect(await replaceAttachmentCore(db, adminB, story.data.id, oldPhoto.id, newPhoto.id)).toEqual({ ok: true })

    const draft = await db.from('content_items').select('cover_media_id, updated_by')
      .eq('id', story.data.id).single()
    expect(draft.error).toBeNull()
    expect(draft.data).toEqual(expect.objectContaining({ cover_media_id: newPhoto.id, updated_by: adminB }))
    const draftMedia = await db.from('content_media').select('media_id, sort_order, placement')
      .eq('content_id', story.data.id).single()
    expect(draftMedia.data).toEqual({ media_id: newPhoto.id, sort_order: 3, placement: 'inline' })

    const unchangedViewer = await getSelectedPublished(slug)
    expect(unchangedViewer).toEqual(expect.objectContaining({
      id: firstRevisionId, title: 'Immutable revision one', cover_media_id: oldPhoto.id,
      media: [{ media_id: oldPhoto.id, sort_order: 3, placement: 'inline' }],
    }))

    const secondPublish = await db.rpc('publish_content_revision', {
      p_admin_id: adminB, p_content_id: story.data.id,
    })
    expect(secondPublish.error).toBeNull()
    const secondViewer = await getSelectedPublished(slug)
    expect(secondViewer).toEqual(expect.objectContaining({
      title: 'Immutable revision two', cover_media_id: newPhoto.id,
      media: [{ media_id: newPhoto.id, sort_order: 3, placement: 'inline' }],
    }))
    expect(secondViewer!.id).not.toBe(firstRevisionId)

    const revisions = await db.from('content_revisions')
      .select('id, revision_number, title, cover_media_id').eq('content_item_id', story.data.id)
      .order('revision_number')
    expect(revisions.data).toEqual([
      { id: firstRevisionId, revision_number: 1, title: 'Immutable revision one', cover_media_id: oldPhoto.id },
      expect.objectContaining({ revision_number: 2, title: 'Immutable revision two', cover_media_id: newPhoto.id }),
    ])
    const snapshots = await db.from('content_revision_media')
      .select('revision_id, media_id, sort_order, placement').in('revision_id', revisions.data!.map(row => row.id))
      .order('revision_id')
    expect(snapshots.data).toEqual(expect.arrayContaining([
      { revision_id: firstRevisionId, media_id: oldPhoto.id, sort_order: 3, placement: 'inline' },
      expect.objectContaining({ media_id: newPhoto.id, sort_order: 3, placement: 'inline' }),
    ]))

    const letterPublish = await db.rpc('publish_content_revision', {
      p_admin_id: adminB, p_content_id: letter.data.id,
    })
    expect(letterPublish.error?.message).toContain('PR004B_LETTER_PUBLICATION_FORBIDDEN')

    const unpublished = await db.rpc('unpublish_content_revision', {
      p_admin_id: adminB, p_content_id: story.data.id,
    })
    expect(unpublished.error).toBeNull()
    expect(await getSelectedPublished(slug)).toBeNull()
  }, 120_000)
})
