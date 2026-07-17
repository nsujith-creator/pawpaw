import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { finalizeUploadCore } from '@/lib/media/finalize-upload'
import { buildUploadPath } from '@/lib/media/upload-path'
import {
  updateMediaDetailsCore,
  reorderAttachmentCore,
  detachMediaCore,
  deleteMediaCore,
} from '@/lib/media/manage-media'
import { generateSignedUrl } from '@/lib/media/private-url'

// Live checks for attached-photo management: list, signed thumbnails,
// alt-text edit, reorder, detach (keeps file), permanent delete (removes
// everything), ownership enforcement, and non-admin RLS denial.
const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project')

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_PASSWORD = 'integration-test-password-1!'
const SLOW = 120_000

function serviceClient(): SupabaseClient {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function anonClient(): SupabaseClient {
  return createClient(url, anon, { auth: { persistSession: false } })
}

function pngBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  buf.set([137, 80, 78, 71, 13, 10, 26, 10])
  return buf
}

describe.skipIf(!hasRealCredentials)(
  'attached-photo management (requires real Supabase credentials)',
  () => {
    const svc = hasRealCredentials ? serviceClient() : (null as unknown as SupabaseClient)
    let adminId       = ''
    let nonAdminId    = ''
    let nonAdminEmail = ''
    let contentId     = ''
    // Three attached photos, in sort order 0, 1, 2 after setup.
    const media: { id: string; path: string }[] = []

    async function attachedRows() {
      const { data } = await svc
        .from('content_media')
        .select('media_id, sort_order')
        .eq('content_id', contentId)
        .order('sort_order', { ascending: true })
      return data ?? []
    }

    beforeAll(async () => {
      const a = await svc.auth.admin.createUser({
        email: `it-mm-admin-${Date.now()}@example.com`, password: TEST_PASSWORD, email_confirm: true,
      })
      if (a.error) throw a.error
      adminId = a.data.user.id
      const row = await svc.from('admin_users').insert({
        user_id: adminId, display_name: 'Media Mgmt Test Admin', active: true,
      })
      if (row.error) throw row.error

      nonAdminEmail = `it-mm-nonadmin-${Date.now()}@example.com`
      const b = await svc.auth.admin.createUser({
        email: nonAdminEmail, password: TEST_PASSWORD, email_confirm: true,
      })
      if (b.error) throw b.error
      nonAdminId = b.data.user.id

      const { data: content, error: contentError } = await svc
        .from('content_items')
        .insert({
          type: 'story', slug: `it-mm-${Date.now()}`, title: 'Media management test',
          body_blocks: [], status: 'draft', created_by: adminId, updated_by: adminId,
        })
        .select('id').single()
      if (contentError) throw contentError
      contentId = content.id

      // Upload and attach three small photos via the real direct-upload path.
      for (let i = 0; i < 3; i++) {
        const path = buildUploadPath(adminId, 'image/png')!
        const { data: signed, error: signError } = await svc.storage
          .from('media').createSignedUploadUrl(path)
        if (signError || !signed?.token) throw new Error('setup: signing failed')
        const { error: upErr } = await anonClient().storage
          .from('media')
          .uploadToSignedUrl(path, signed.token, pngBytes(100 * 1024), { contentType: 'image/png' })
        if (upErr) throw new Error('setup: upload failed')
        const result = await finalizeUploadCore(svc, adminId, {
          path, altText: `photo ${i}`, caption: `caption ${i}`, contentId,
        })
        if (!('ok' in result)) throw new Error('setup: finalize failed')
        media.push({ id: result.mediaId, path })
      }
    }, SLOW)

    afterAll(async () => {
      if (contentId) await svc.from('content_items').delete().eq('id', contentId)
      await svc.from('media_assets').delete().eq('created_by', adminId)
      const paths = media.map(m => m.path)
      if (paths.length) await svc.storage.from('media').remove(paths)
      if (adminId) {
        await svc.from('admin_users').delete().eq('user_id', adminId)
        await svc.auth.admin.deleteUser(adminId)
      }
      if (nonAdminId) await svc.auth.admin.deleteUser(nonAdminId)
    }, SLOW)

    it('lists attachments in sort order — the data the admin page renders', async () => {
      const rows = await attachedRows()
      expect(rows).toHaveLength(3)
      expect(rows.map(r => r.media_id)).toEqual(media.map(m => m.id))
      expect(rows.map(r => r.sort_order)).toEqual([0, 1, 2])
    })

    it('dashboard query returns the exact attachment count and first attached image', async () => {
      const { data, error } = await svc
        .from('content_items')
        .select('id, updated_at, published_at, content_media(sort_order, media_assets(id, storage_path, alt_text))')
        .eq('id', contentId)
        .single()

      expect(error).toBeNull()
      const attachments = (data?.content_media ?? []) as unknown as {
        sort_order: number
        media_assets: { id: string; storage_path: string; alt_text: string | null }
      }[]
      const ordered = [...attachments].sort((a, b) => a.sort_order - b.sort_order)
      expect(attachments).toHaveLength(3)
      expect(ordered[0].media_assets.id).toBe(media[0].id)
      expect(ordered[0].media_assets.storage_path).toBe(media[0].path)
    })

    it('media-library query returns accurate attachment counts and content titles', async () => {
      const { data, error } = await svc
        .from('media_assets')
        .select('id, created_at, mime_type, content_media(content_id, content_items(title))')
        .eq('created_by', adminId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: true })

      expect(error).toBeNull()
      expect(data).toHaveLength(3)
      for (const row of data ?? []) {
        const usage = row.content_media as unknown as {
          content_id: string
          content_items: { title: string } | null
        }[]
        expect(usage).toHaveLength(1)
        expect(usage[0].content_id).toBe(contentId)
        expect(usage[0].content_items?.title).toBe('Media management test')
      }
    })

    it('generates working private signed thumbnails', async () => {
      const signedUrl = await generateSignedUrl(media[0].path)
      const res = await fetch(signedUrl)
      expect(res.status).toBe(200)
    }, SLOW)

    it('loads both stored values — alt text and caption are separate fields', async () => {
      // The exact select the admin attachment editor uses to populate fields.
      const { data } = await svc
        .from('media_assets').select('alt_text, caption')
        .eq('id', media[0].id).single()
      expect(data?.alt_text).toBe('photo 0')
      expect(data?.caption).toBe('caption 0')
    })

    it('updates alt text and caption together', async () => {
      const result = await updateMediaDetailsCore(
        svc, adminId, media[0].id, 'updated description', 'updated caption',
      )
      expect(result).toHaveProperty('ok', true)
      const { data } = await svc
        .from('media_assets').select('alt_text, caption')
        .eq('id', media[0].id).single()
      expect(data?.alt_text).toBe('updated description')
      expect(data?.caption).toBe('updated caption')
    })

    it('clears the caption when saved empty, but rejects empty alt text', async () => {
      const cleared = await updateMediaDetailsCore(svc, adminId, media[0].id, 'kept alt', '')
      expect(cleared).toHaveProperty('ok', true)
      const { data } = await svc
        .from('media_assets').select('alt_text, caption')
        .eq('id', media[0].id).single()
      expect(data?.alt_text).toBe('kept alt')
      expect(data?.caption).toBeNull()

      const rejected = await updateMediaDetailsCore(svc, adminId, media[0].id, '   ', 'x')
      expect(rejected).toHaveProperty('error')
    })

    it('reorders an attachment one step later and back', async () => {
      const later = await reorderAttachmentCore(svc, contentId, media[0].id, 'later')
      expect(later).toHaveProperty('ok', true)
      let rows = await attachedRows()
      expect(rows.map(r => r.media_id)).toEqual([media[1].id, media[0].id, media[2].id])

      const earlier = await reorderAttachmentCore(svc, contentId, media[0].id, 'earlier')
      expect(earlier).toHaveProperty('ok', true)
      rows = await attachedRows()
      expect(rows.map(r => r.media_id)).toEqual([media[0].id, media[1].id, media[2].id])
    })

    it('a non-admin cannot modify, detach, or remove photos (RLS)', async () => {
      const authed = anonClient()
      const { error: loginError } = await authed.auth.signInWithPassword({
        email: nonAdminEmail, password: TEST_PASSWORD,
      })
      expect(loginError).toBeNull()

      // Update is silently filtered by RLS — prove state is unchanged.
      await authed.from('media_assets').update({ alt_text: 'hacked' }).eq('id', media[0].id)
      const { data: after } = await svc.from('media_assets').select('alt_text').eq('id', media[0].id).single()
      expect(after?.alt_text).not.toBe('hacked')

      await authed.from('content_media').delete().eq('content_id', contentId)
      expect(await attachedRows()).toHaveLength(3)

      await authed.storage.from('media').remove([media[0].path])
      const { data: stillThere } = await svc.storage.from('media').exists(media[0].path)
      expect(stillThere).toBe(true)

      await authed.auth.signOut()
    }, SLOW)

    it('ownership check blocks operations against another account\'s photo', async () => {
      // Equivalent of path substitution: a different user id cannot manage
      // media whose storage path and created_by belong to the admin.
      const del = await deleteMediaCore(svc, nonAdminId, media[0].id)
      expect(del).toHaveProperty('error')
      expect((del as { error: string }).error).toMatch(/does not belong/)

      const alt = await updateMediaDetailsCore(svc, nonAdminId, media[0].id, 'not yours', null)
      expect(alt).toHaveProperty('error')

      const { data: stillThere } = await svc.storage.from('media').exists(media[0].path)
      expect(stillThere).toBe(true)
    })

    it('detach removes the association but keeps media_assets and the Storage object', async () => {
      const result = await detachMediaCore(svc, contentId, media[2].id)
      expect(result).toHaveProperty('ok', true)

      const rows = await attachedRows()
      expect(rows.map(r => r.media_id)).toEqual([media[0].id, media[1].id])

      const { data: rowStillThere } = await svc
        .from('media_assets').select('id').eq('id', media[2].id).single()
      expect(rowStillThere?.id).toBe(media[2].id)

      const { data: objectStillThere } = await svc.storage.from('media').exists(media[2].path)
      expect(objectStillThere).toBe(true)
    })

    it('permanent delete removes association, metadata row, and Storage object — others untouched', async () => {
      const result = await deleteMediaCore(svc, adminId, media[1].id)
      expect(result).toHaveProperty('ok', true)

      const rows = await attachedRows()
      expect(rows.map(r => r.media_id)).toEqual([media[0].id])

      const { data: rowGone } = await svc
        .from('media_assets').select('id').eq('id', media[1].id).maybeSingle()
      expect(rowGone).toBeNull()

      const { data: objectGone } = await svc.storage.from('media').exists(media[1].path)
      expect(objectGone).toBe(false)

      // The remaining attachment is fully intact.
      const { data: survivor } = await svc
        .from('media_assets').select('id').eq('id', media[0].id).single()
      expect(survivor?.id).toBe(media[0].id)
      const { data: survivorObject } = await svc.storage.from('media').exists(media[0].path)
      expect(survivorObject).toBe(true)
    }, SLOW)

    it('the viewer-equivalent query reflects the changes after refresh', async () => {
      // Same join shape getPublishedHomeContent uses — what a refreshed
      // family page would render for this content item.
      const { data } = await svc
        .from('content_items')
        .select('id, content_media(sort_order, media_assets(id))')
        .eq('id', contentId)
        .single()
      const remaining = (data?.content_media ?? []) as unknown as
        { sort_order: number; media_assets: { id: string } }[]
      expect(remaining).toHaveLength(1)
      expect(remaining[0].media_assets.id).toBe(media[0].id)
    })
  },
)
