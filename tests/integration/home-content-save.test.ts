import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { plainTextToBlocks } from '@/lib/content/plain-text'
import { bodyBlocksSchema } from '@/lib/content/schema'

// Live checks for the save path the admin editor drives: plain text is
// converted to paragraph blocks, validated, and persisted as draft, then
// published. Uses type 'story' with unique slugs so the real Home row is
// never touched. Skipped against the stub credentials from tests/setup.ts.
const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project')

function serviceClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}

describe.skipIf(!hasRealCredentials)(
  'home content save flow (requires real Supabase credentials)',
  () => {
    const svc = hasRealCredentials ? serviceClient() : (null as unknown as SupabaseClient)
    let userId = ''
    const createdIds: string[] = []

    beforeAll(async () => {
      const { data, error } = await svc.auth.admin.createUser({
        email: `it-editor-${Date.now()}@example.com`,
        password: 'integration-test-password-1!',
        email_confirm: true,
      })
      if (error) throw error
      userId = data.user.id
    })

    afterAll(async () => {
      for (const id of createdIds) {
        await svc.from('content_items').delete().eq('id', id)
      }
      if (userId) await svc.auth.admin.deleteUser(userId)
    })

    it('saves plain-text-converted paragraphs as a draft', async () => {
      const blocks = plainTextToBlocks('First paragraph.\n\nSecond paragraph.')
      expect(bodyBlocksSchema.safeParse(blocks).success).toBe(true)

      const { data, error } = await svc
        .from('content_items')
        .insert({
          type: 'story', slug: `it-editor-draft-${Date.now()}`,
          title: 'Editor draft test', body_blocks: blocks, status: 'draft',
          created_by: userId, updated_by: userId,
        })
        .select('id, status, body_blocks')
        .single()

      expect(error).toBeNull()
      expect(data?.status).toBe('draft')
      expect(data?.body_blocks).toEqual(blocks)
      if (data?.id) createdIds.push(data.id)
    })

    it('saves a titled draft with an empty body', async () => {
      const { data, error } = await svc
        .from('content_items')
        .insert({
          type: 'story', slug: `it-editor-empty-${Date.now()}`,
          title: 'Empty draft test', body_blocks: [], status: 'draft',
          created_by: userId, updated_by: userId,
        })
        .select('id')
        .single()

      expect(error).toBeNull()
      if (data?.id) createdIds.push(data.id)
    })

    it('publishes a draft and it becomes visible to the published filter', async () => {
      const slug = `it-editor-publish-${Date.now()}`
      const { data: draft, error: insertErr } = await svc
        .from('content_items')
        .insert({
          type: 'story', slug,
          title: 'Publish test', body_blocks: plainTextToBlocks('Hello.'), status: 'draft',
          created_by: userId, updated_by: userId,
        })
        .select('id')
        .single()
      expect(insertErr).toBeNull()
      if (draft?.id) createdIds.push(draft.id)

      const { error: publishErr } = await svc
        .from('content_items')
        .update({ status: 'published', published_at: new Date().toISOString() })
        .eq('id', draft!.id)
      expect(publishErr).toBeNull()

      const { data: found, error: readErr } = await svc
        .from('content_items')
        .select('id, status')
        .eq('slug', slug)
        .eq('status', 'published')
        .single()
      expect(readErr).toBeNull()
      expect(found?.status).toBe('published')
    })
  },
)
