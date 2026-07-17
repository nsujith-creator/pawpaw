import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fixtureEmail, fixtureMetadata, fixtureObjectName, fixtureSlug } from './fixture-names'

// Live-database checks for the private.is_active_admin() security posture.
// Requires a real Supabase project with migrations applied — skipped against
// the stub credentials set in tests/setup.ts (URL contains 'test-project').
const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project')

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const TEST_PASSWORD = 'integration-test-password-1!'

function anonClient(): SupabaseClient {
  return createClient(url, anon, { auth: { persistSession: false } })
}

function serviceClient(): SupabaseClient {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function signedInClient(email: string): Promise<SupabaseClient> {
  const client = anonClient()
  const { error } = await client.auth.signInWithPassword({ email, password: TEST_PASSWORD })
  if (error) throw new Error(`Test sign-in failed for ${email}: ${error.message}`)
  return client
}

describe.skipIf(!hasRealCredentials)(
  'private.is_active_admin security (requires real Supabase credentials)',
  () => {
    const svc = hasRealCredentials ? serviceClient() : (null as unknown as SupabaseClient)
    let nonAdminId = ''
    let adminId    = ''
    const nonAdminEmail = fixtureEmail('admin-security', 'nonadmin')
    const adminEmail    = fixtureEmail('admin-security', 'admin')
    const createdContentIds: string[] = []

    beforeAll(async () => {
      const a = await svc.auth.admin.createUser({
        email: nonAdminEmail, password: TEST_PASSWORD, email_confirm: true,
        user_metadata: fixtureMetadata('admin-security'),
      })
      if (a.error) throw a.error
      nonAdminId = a.data.user.id

      const b = await svc.auth.admin.createUser({
        email: adminEmail, password: TEST_PASSWORD, email_confirm: true,
        user_metadata: fixtureMetadata('admin-security'),
      })
      if (b.error) throw b.error
      adminId = b.data.user.id

      const { error } = await svc
        .from('admin_users')
        .insert({ user_id: adminId, display_name: 'Integration Test Admin', active: true })
      if (error) throw error
    })

    afterAll(async () => {
      for (const id of createdContentIds) {
        await svc.from('content_items').delete().eq('id', id)
      }
      await svc.storage.from('media').remove([`${adminId}/${fixtureObjectName('admin-security', 'png')}`])
      if (adminId)    { await svc.from('admin_users').delete().eq('user_id', adminId); await svc.auth.admin.deleteUser(adminId) }
      if (nonAdminId) { await svc.auth.admin.deleteUser(nonAdminId) }
    })

    it('anon cannot execute the function over the API (private schema is not exposed)', async () => {
      const { error } = await anonClient().rpc('is_active_admin')
      expect(error).not.toBeNull()
    })

    it('authenticated user cannot execute the function over the API either', async () => {
      const client = await signedInClient(nonAdminEmail)
      const { error } = await client.rpc('is_active_admin')
      expect(error).not.toBeNull()
      await client.auth.signOut()
    })

    it('authenticated non-admin cannot read protected rows', async () => {
      const client = await signedInClient(nonAdminEmail)
      const { data, error } = await client.from('content_items').select('id').limit(1)
      // RLS must yield zero rows (or an error) — never data.
      expect(error !== null || (data ?? []).length === 0).toBe(true)
      await client.auth.signOut()
    })

    it('authenticated non-admin cannot write content or Storage objects', async () => {
      const client = await signedInClient(nonAdminEmail)

      const insert = await client.from('content_items').insert({
        type: 'story', slug: fixtureSlug('admin-security', 'nonadmin-write'), title: 'should fail',
        created_by: nonAdminId, updated_by: nonAdminId,
      })
      expect(insert.error).not.toBeNull()

      const upload = await client.storage
        .from('media')
        .upload(`${nonAdminId}/forbidden.png`, new Uint8Array([137, 80, 78, 71]), {
          contentType: 'image/png',
        })
      expect(upload.error).not.toBeNull()

      await client.auth.signOut()
    })

    it('active admin passes RLS: can write and read content and upload to Storage', async () => {
      const client = await signedInClient(adminEmail)
      const slug = fixtureSlug('admin-security', 'admin-write')

      const insert = await client
        .from('content_items')
        .insert({
          type: 'story', slug, title: 'integration test draft',
          created_by: adminId, updated_by: adminId,
        })
        .select('id')
        .single()
      expect(insert.error).toBeNull()
      if (insert.data?.id) createdContentIds.push(insert.data.id)

      const read = await client.from('content_items').select('id').eq('slug', slug)
      expect(read.error).toBeNull()
      expect(read.data).toHaveLength(1)

      const upload = await client.storage
        .from('media')
        .upload(`${adminId}/${fixtureObjectName('admin-security', 'png')}`, new Uint8Array([137, 80, 78, 71]), {
          contentType: 'image/png',
        })
      expect(upload.error).toBeNull()

      await client.auth.signOut()
    })

    it('inactive admin is rejected by RLS', async () => {
      const flagOff = await svc.from('admin_users').update({ active: false }).eq('user_id', adminId)
      expect(flagOff.error).toBeNull()

      const client = await signedInClient(adminEmail)

      const read = await client.from('content_items').select('id').limit(1)
      expect(read.error !== null || (read.data ?? []).length === 0).toBe(true)

      const insert = await client.from('content_items').insert({
        type: 'story', slug: fixtureSlug('admin-security', 'inactive-write'), title: 'should fail',
        created_by: adminId, updated_by: adminId,
      })
      expect(insert.error).not.toBeNull()

      await client.auth.signOut()

      // Restore for cleanup symmetry.
      await svc.from('admin_users').update({ active: true }).eq('user_id', adminId)
    })
  },
)
