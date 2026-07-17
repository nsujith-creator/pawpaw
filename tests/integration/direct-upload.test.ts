import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { finalizeUploadCore } from '@/lib/media/finalize-upload'
import { buildUploadPath } from '@/lib/media/upload-path'

// Live checks for the direct-to-Storage upload path:
//   authorize (signed upload token, server-side) →
//   browser-equivalent upload with anon key + token →
//   trusted finalization (existence, size, MIME, ownership).
// Skipped against the stub credentials from tests/setup.ts.
const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project')

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TEST_PASSWORD = 'integration-test-password-1!'
const MB = 1024 * 1024
const SLOW = 180_000 // large binary uploads over a home connection

function serviceClient(): SupabaseClient {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function anonClient(): SupabaseClient {
  return createClient(url, anon, { auth: { persistSession: false } })
}

function bytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  // PNG magic prefix so the object is at least nominally image-shaped.
  buf.set([137, 80, 78, 71, 13, 10, 26, 10])
  return buf
}

// Upload as the "browser" would: anon key + signed token only.
async function directUpload(path: string, token: string, body: Uint8Array, contentType: string) {
  return anonClient().storage.from('media').uploadToSignedUrl(path, token, body, { contentType })
}

async function signUploadFor(svc: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await svc.storage.from('media').createSignedUploadUrl(path)
  if (error || !data?.token) throw new Error('createSignedUploadUrl failed in test setup')
  return data.token
}

describe.skipIf(!hasRealCredentials)(
  'direct-to-Storage upload (requires real Supabase credentials)',
  () => {
    const svc = hasRealCredentials ? serviceClient() : (null as unknown as SupabaseClient)
    let adminId    = ''
    let nonAdminId = ''
    const uploadedPaths: string[] = []
    const contentIds: string[] = []

    beforeAll(async () => {
      const a = await svc.auth.admin.createUser({
        email: `it-du-admin-${Date.now()}@example.com`, password: TEST_PASSWORD, email_confirm: true,
      })
      if (a.error) throw a.error
      adminId = a.data.user.id
      const row = await svc.from('admin_users').insert({
        user_id: adminId, display_name: 'Direct Upload Test Admin', active: true,
      })
      if (row.error) throw row.error

      const b = await svc.auth.admin.createUser({
        email: `it-du-nonadmin-${Date.now()}@example.com`, password: TEST_PASSWORD, email_confirm: true,
      })
      if (b.error) throw b.error
      nonAdminId = b.data.user.id
    }, 60_000)

    afterAll(async () => {
      // Order matters: content (cascades content_media) → media rows → objects → users.
      for (const id of contentIds) await svc.from('content_items').delete().eq('id', id)
      await svc.from('media_assets').delete().eq('created_by', adminId)
      if (uploadedPaths.length) await svc.storage.from('media').remove(uploadedPaths)
      if (adminId) {
        await svc.from('admin_users').delete().eq('user_id', adminId)
        await svc.auth.admin.deleteUser(adminId)
      }
      if (nonAdminId) await svc.auth.admin.deleteUser(nonAdminId)
    }, 60_000)

    it('uploads a 2 MB file directly with a signed token and finalizes it', async () => {
      const path  = buildUploadPath(adminId, 'image/png')!
      const token = await signUploadFor(svc, path)
      uploadedPaths.push(path)

      const { error: uploadError } = await directUpload(path, token, bytes(2 * MB), 'image/png')
      expect(uploadError).toBeNull()

      const result = await finalizeUploadCore(svc, adminId, {
        path, altText: 'two megabyte test', caption: 'a visible caption', contentId: null,
      })
      expect(result).toHaveProperty('ok', true)

      const { data: row } = await svc
        .from('media_assets').select('byte_size, mime_type, alt_text, caption')
        .eq('storage_path', path).single()
      expect(row?.byte_size).toBe(2 * MB)
      expect(row?.mime_type).toBe('image/png')
      // alt_text and caption are stored separately.
      expect(row?.alt_text).toBe('two megabyte test')
      expect(row?.caption).toBe('a visible caption')
    }, SLOW)

    it('uploads exactly 8 MB and finalizes it', async () => {
      const path  = buildUploadPath(adminId, 'image/jpeg')!
      const token = await signUploadFor(svc, path)
      uploadedPaths.push(path)

      const { error: uploadError } = await directUpload(path, token, bytes(8 * MB), 'image/jpeg')
      expect(uploadError).toBeNull()

      const result = await finalizeUploadCore(svc, adminId, {
        path, altText: 'eight megabyte boundary', caption: null, contentId: null,
      })
      expect(result).toHaveProperty('ok', true)
    }, SLOW)

    it('rejects an oversized object (8 MB + 1) at finalization and removes it', async () => {
      const path  = buildUploadPath(adminId, 'image/png')!
      const token = await signUploadFor(svc, path)

      // The bucket hard limit is 10 MB, so Storage accepts this — the trusted
      // application check at finalization must catch and delete it.
      const { error: uploadError } = await directUpload(path, token, bytes(8 * MB + 1), 'image/png')
      expect(uploadError).toBeNull()

      const result = await finalizeUploadCore(svc, adminId, {
        path, altText: 'too big', caption: null, contentId: null,
      })
      expect(result).toHaveProperty('error')
      expect((result as { error: string }).error).toMatch(/8 MB/)

      const { data: stillThere } = await svc.storage.from('media').exists(path)
      expect(stillThere).toBe(false)
    }, SLOW)

    it('the bucket rejects a disallowed MIME type at upload time', async () => {
      const path  = `${adminId}/${Date.now()}-gif-test.gif`
      const token = await signUploadFor(svc, path)

      const { error } = await directUpload(path, token, bytes(1024), 'image/gif')
      expect(error).not.toBeNull()
    }, SLOW)

    it('a non-admin cannot obtain a signed upload authorization themselves', async () => {
      const { data: userData } = await svc.auth.admin.getUserById(nonAdminId)
      const authed = anonClient()
      const { error: loginError } = await authed.auth.signInWithPassword({
        email: userData.user?.email ?? '', password: TEST_PASSWORD,
      })
      expect(loginError).toBeNull()

      // Signing an upload URL requires INSERT permission on storage.objects;
      // the RLS policies grant that only to active admins.
      const { data, error: signError } = await authed.storage
        .from('media')
        .createSignedUploadUrl(`${nonAdminId}/sneaky.jpg`)
      expect(data).toBeNull()
      expect(signError).not.toBeNull()
      await authed.auth.signOut()
    }, SLOW)

    it('a signed upload token cannot be used for a different path', async () => {
      const pathA = buildUploadPath(adminId, 'image/png')!
      const pathB = buildUploadPath(adminId, 'image/png')!
      const token = await signUploadFor(svc, pathA)

      const { error } = await directUpload(pathB, token, bytes(1024), 'image/png')
      expect(error).not.toBeNull()
    }, SLOW)

    it('finalization rejects a missing object', async () => {
      const result = await finalizeUploadCore(svc, adminId, {
        path: `${adminId}/does-not-exist-${Date.now()}.jpg`, altText: 'ghost', caption: null, contentId: null,
      })
      expect(result).toHaveProperty('error')
      expect((result as { error: string }).error).toMatch(/could not be found/)
    }, SLOW)

    it('finalization rejects path substitution into another folder', async () => {
      const result = await finalizeUploadCore(svc, adminId, {
        path: `${nonAdminId}/stolen.jpg`, altText: 'substitution', caption: null, contentId: null,
      })
      expect(result).toHaveProperty('error')
      expect((result as { error: string }).error).toMatch(/does not belong/)
    })

    it('successful finalization attaches the photo to a content item', async () => {
      const { data: content, error: contentError } = await svc
        .from('content_items')
        .insert({
          type: 'story', slug: `it-du-content-${Date.now()}`, title: 'Attach test',
          body_blocks: [], status: 'draft', created_by: adminId, updated_by: adminId,
        })
        .select('id').single()
      expect(contentError).toBeNull()
      contentIds.push(content!.id)

      const path  = buildUploadPath(adminId, 'image/webp')!
      const token = await signUploadFor(svc, path)
      uploadedPaths.push(path)
      const { error: uploadError } = await directUpload(path, token, bytes(1 * MB), 'image/webp')
      expect(uploadError).toBeNull()

      const result = await finalizeUploadCore(svc, adminId, {
        path, altText: 'attached photo', caption: '  ', contentId: content!.id,
      })
      expect(result).toHaveProperty('ok', true)

      const { data: attachment } = await svc
        .from('content_media')
        .select('media_id, sort_order')
        .eq('content_id', content!.id)
        .single()
      expect(attachment?.media_id).toBe((result as { ok: true; mediaId: string }).mediaId)
      expect(attachment?.sort_order).toBe(0)

      // A whitespace-only caption is stored as null, not an empty string.
      const { data: mediaRow } = await svc
        .from('media_assets').select('caption')
        .eq('id', (result as { ok: true; mediaId: string }).mediaId).single()
      expect(mediaRow?.caption).toBeNull()
    }, SLOW)

    it('private signed delivery still works for a finalized object', async () => {
      const path = uploadedPaths[0]
      expect(path).toBeTruthy()

      const { data, error } = await svc.storage.from('media').createSignedUrl(path, 300)
      expect(error).toBeNull()
      expect(data?.signedUrl).toBeTruthy()

      const res = await fetch(data!.signedUrl)
      expect(res.status).toBe(200)
    }, SLOW)
  },
)
