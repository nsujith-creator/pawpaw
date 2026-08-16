import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { getAdminChapter, getPublishedChapter, listPublishedChapters } from '@/lib/content/chapters'
import {
  canDeleteContent,
  planContentWrite,
  validateContentInput,
  type ExistingContent,
} from '@/lib/content/manage-content'
import {
  attachMediaCore,
  detachMediaSafelyCore,
  replaceAttachmentCore,
  setCoverMediaCore,
  updateMediaDetailsCore,
} from '@/lib/media/manage-media'
import { fixtureEmail, fixtureMetadata, fixtureObjectName, fixtureSlug } from './fixture-names'

const hasRealCredentials =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('test-project')

const SLOW = 120_000
const PASSWORD = 'integration-content-management-1!Aa'

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

describe.skipIf(!hasRealCredentials)('PR-004B chapter management (live)', () => {
  const db = hasRealCredentials ? serviceClient() : null as unknown as SupabaseClient
  let adminId = ''
  const content = new Map<string, { id: string; slug: string }>()
  const media: { id: string; path: string }[] = []

  beforeAll(async () => {
    const user = await db.auth.admin.createUser({
      email: fixtureEmail('content-management', 'admin'),
      password: PASSWORD,
      email_confirm: true,
      user_metadata: fixtureMetadata('content-management'),
    })
    if (user.error || !user.data.user) throw user.error ?? new Error('Fixture user was not created')
    adminId = user.data.user.id
    const allowlist = await db.from('admin_users').insert({
      user_id: adminId,
      display_name: 'PR-004B content test admin',
      active: true,
    })
    if (allowlist.error) throw allowlist.error

    for (const type of ['story', 'gallery', 'letter', 'moment'] as const) {
      const slug = fixtureSlug('content-management', type)
      const inserted = await db.from('content_items').insert({
        type,
        slug,
        title: `${type} fixture`,
        summary: null,
        body_blocks: [],
        status: 'draft',
        created_by: adminId,
        updated_by: adminId,
      }).select('id').single()
      if (inserted.error) throw inserted.error
      content.set(type, { id: inserted.data.id, slug })
    }

    const bytes = await sharp({
      create: { width: 4, height: 3, channels: 3, background: '#d88fa7' },
    }).png().toBuffer()
    for (const label of ['old', 'new', 'uploaded']) {
      const path = `${adminId}/${fixtureObjectName(`content-management-${label}`, 'png')}`
      const upload = await db.storage.from('media').upload(path, bytes, {
        contentType: 'image/png',
        upsert: false,
      })
      if (upload.error) throw upload.error
      const inserted = await db.from('media_assets').insert({
        storage_path: path,
        mime_type: 'image/png',
        byte_size: bytes.length,
        width: 4,
        height: 3,
        alt_text: `${label} fixture photograph`,
        caption: `${label} fixture caption`,
        processing_status: 'ready',
        created_by: adminId,
      }).select('id').single()
      if (inserted.error) throw inserted.error
      media.push({ id: inserted.data.id, path })
    }
  }, SLOW)

  afterAll(async () => {
    if (!adminId) return
    const ids = [...content.values()].map(item => item.id)
    if (ids.length) {
      const revisionRows = await db.from('content_revisions').select('id').in('content_item_id', ids)
      const revisionIds = (revisionRows.data ?? []).map(row => row.id)
      if (revisionIds.length) await db.from('content_revision_media').delete().in('revision_id', revisionIds)
      await db.from('content_revisions').delete().in('content_item_id', ids)
    }
    await db.from('content_items').delete().eq('created_by', adminId)
    await db.from('media_assets').delete().eq('created_by', adminId)
    if (media.length) await db.storage.from('media').remove(media.map(item => item.path))
    await db.from('admin_users').delete().eq('user_id', adminId)
    await db.auth.admin.deleteUser(adminId)
  }, SLOW)

  it('creates every existing non-Home type as a private draft and edits validated fields', async () => {
    for (const [type, item] of content) {
      const validated = validateContentInput({
        type,
        title: `${type} edited title`,
        slug: item.slug,
        summary: `${type} introduction`,
        bodyBlocks: [
          { type: 'heading', level: 2, text: `${type} heading` },
          { type: 'paragraph', text: `${type} paragraph` },
          { type: 'quote', text: `${type} quote`, attribution: 'Family' },
        ],
        eventDate: null,
        eventDatePrecision: null,
        eventDateIsApproximate: false,
        authoredDate: null,
        authoredDatePrecision: null,
        authoredDateIsApproximate: false,
        authorDisplayName: null,
        recipientDisplayName: null,
        placeText: null,
        relationshipContext: null,
        visualScene: null,
      })
      expect(validated).toHaveProperty('ok', true)
      if (!('ok' in validated)) continue
      const existing: ExistingContent = {
        id: item.id,
        type,
        slug: item.slug,
        hasRevisionHistory: false,
      }
      const plan = planContentWrite({
        input: validated.data,
        existing,
        intent: 'save',
        attachmentCount: 0,
      })
      expect(plan).toHaveProperty('ok', true)
      if (!('ok' in plan)) continue
      const updated = await db.from('content_items')
        .update({ ...plan.payload, updated_by: adminId })
        .eq('id', item.id)
      expect(updated.error).toBeNull()
    }

    const { data, error } = await db.from('content_items')
      .select('type, status, summary, body_blocks')
      .eq('created_by', adminId)
    expect(error).toBeNull()
    expect(data).toHaveLength(4)
    expect(data?.every(row => row.status === 'draft' && row.summary && Array.isArray(row.body_blocks))).toBe(true)
  })

  it('loads an exact private preview but keeps drafts out of the viewer loader', async () => {
    const story = content.get('story')!
    const preview = await getAdminChapter(story.id)
    expect(preview.state).toBe('ready')
    if (preview.state === 'ready') {
      expect(preview.content.title).toBe('story edited title')
      expect(preview.content.publicationState).toBe('unpublished')
    }
    expect(await getPublishedChapter(story.slug)).toEqual({ state: 'empty' })
  })

  it('publishes immutable revisions, isolates later drafts, republishes, and unpublishes', async () => {
    const story = content.get('story')!
    const published = await db.rpc('publish_content_revision', { p_admin_id: adminId, p_content_id: story.id })
    expect(published.error).toBeNull()

    const viewer = await getPublishedChapter(story.slug)
    expect(viewer.state).toBe('ready')
    const firstTitle = viewer.state === 'ready' ? viewer.content.title : ''
    const index = await listPublishedChapters()
    expect(index.state).toBe('ready')
    if (index.state === 'ready') expect(index.items.some(item => item.id === story.id)).toBe(true)

    const draftEdit = await db.from('content_items').update({
      title: 'story republished title',
      updated_by: adminId,
    }).eq('id', story.id)
    expect(draftEdit.error).toBeNull()
    const stillFirst = await getPublishedChapter(story.slug)
    if (stillFirst.state === 'ready') expect(stillFirst.content.title).toBe(firstTitle)

    const republished = await db.rpc('publish_content_revision', { p_admin_id: adminId, p_content_id: story.id })
    expect(republished.error).toBeNull()
    const { data: revisions } = await db.from('content_revisions')
      .select('revision_number, title').eq('content_item_id', story.id).order('revision_number')
    expect(revisions).toEqual([
      expect.objectContaining({ revision_number: 1, title: firstTitle }),
      expect.objectContaining({ revision_number: 2, title: 'story republished title' }),
    ])

    const unpublished = await db.rpc('unpublish_content_revision', { p_admin_id: adminId, p_content_id: story.id })
    expect(unpublished.error).toBeNull()
    expect(await getPublishedChapter(story.slug)).toEqual({ state: 'empty' })
    const { count } = await db.from('content_revisions').select('id', { count: 'exact', head: true }).eq('content_item_id', story.id)
    expect(count).toBe(2)
  })

  it('attaches, edits, orders, covers, replaces, rolls back failure, and detaches without cross-record damage', async () => {
    const gallery = content.get('gallery')!
    const letter = content.get('letter')!
    expect(await attachMediaCore(db, adminId, gallery.id, media[0].id)).toEqual({ ok: true })
    expect(await attachMediaCore(db, adminId, letter.id, media[2].id)).toEqual({ ok: true })
    expect(await updateMediaDetailsCore(db, adminId, media[0].id, 'edited old alt', 'edited old caption')).toEqual({ ok: true })
    expect(await setCoverMediaCore(db, adminId, gallery.id, media[0].id)).toEqual({ ok: true })

    const replacement = await replaceAttachmentCore(db, adminId, gallery.id, media[0].id, media[1].id)
    expect(replacement).toEqual({ ok: true })
    const { data: replacedRows } = await db.from('content_media')
      .select('media_id, sort_order').eq('content_id', gallery.id)
    expect(replacedRows).toEqual([{ media_id: media[1].id, sort_order: 0 }])
    const { data: cover } = await db.from('content_items')
      .select('cover_media_id').eq('id', gallery.id).single()
    expect(cover?.cover_media_id).toBe(media[1].id)
    const { data: oldStillExists } = await db.from('media_assets')
      .select('id').eq('id', media[0].id).single()
    expect(oldStillExists?.id).toBe(media[0].id)

    const failed = await replaceAttachmentCore(db, adminId, gallery.id, media[1].id, media[1].id)
    expect(failed).toHaveProperty('error')
    const { data: afterFailure } = await db.from('content_media')
      .select('media_id, sort_order').eq('content_id', gallery.id)
    expect(afterFailure).toEqual([{ media_id: media[1].id, sort_order: 0 }])

    const { data: letterRows } = await db.from('content_media')
      .select('media_id').eq('content_id', letter.id)
    expect(letterRows).toEqual([{ media_id: media[2].id }])

    expect(await detachMediaSafelyCore(db, adminId, gallery.id, media[1].id)).toEqual({ ok: true })
    const { data: detached } = await db.from('content_media')
      .select('media_id').eq('content_id', gallery.id)
    expect(detached).toEqual([])
    const { data: clearedCover } = await db.from('content_items')
      .select('cover_media_id').eq('id', gallery.id).single()
    expect(clearedCover?.cover_media_id).toBeNull()
  }, SLOW)

  it('protects permanent Home and First Days while deleting only an eligible fixture chapter', async () => {
    expect(canDeleteContent({ type: 'home', slug: 'home', hasRevisionHistory: false })).toBe(false)
    expect(canDeleteContent({ type: 'story', slug: 'first-days', hasRevisionHistory: false })).toBe(false)
    const moment = content.get('moment')!
    expect(canDeleteContent({ type: 'moment', slug: moment.slug, hasRevisionHistory: false })).toBe(true)

    const deleted = await db.from('content_items').delete()
      .eq('id', moment.id)
      .eq('created_by', adminId)
      .select('id')
      .single()
    expect(deleted.error).toBeNull()
    content.delete('moment')
    const { count } = await db.from('content_items')
      .select('id', { count: 'exact', head: true })
      .in('slug', ['home', 'first-days'])
    expect(count).toBe(2)
  })
})
