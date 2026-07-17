import { describe, it, expect } from 'vitest'

// Integration tests require a real Supabase project.
// They are skipped automatically when running against the test stub credentials
// set in tests/setup.ts (URL contains 'test-project.supabase.co').
const hasRealCredentials =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project')

describe.skipIf(!hasRealCredentials)(
  'publication boundary (requires real Supabase credentials)',
  () => {
    it('viewer query returns only published content_items of type home', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const db = createAdminClient()

      const { data, error } = await db
        .from('content_items')
        .select('id, status, type')
        .eq('status', 'published')
        .eq('type', 'home')

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      data?.forEach(row => {
        expect(row.status).toBe('published')
        expect(row.type).toBe('home')
      })
    })

    it('family loader returns the exact published Home with renderable blocks and signed media', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const { getPublishedHomeContent } = await import('@/lib/content/home')
      const { bodyBlocksSchema } = await import('@/lib/content/schema')
      const db = createAdminClient()

      const { data: exactRow, error } = await db
        .from('content_items')
        .select('id, title, body_blocks, status')
        .eq('type', 'home')
        .eq('status', 'published')
        .single()

      expect(error).toBeNull()
      expect(exactRow?.status).toBe('published')
      expect(bodyBlocksSchema.safeParse(exactRow?.body_blocks).success).toBe(true)

      const result = await getPublishedHomeContent()
      expect(result.state).toBe('published')
      if (result.state !== 'published') return
      expect(result.content.id).toBe(exactRow?.id)
      expect(result.content.title).toBe(exactRow?.title)
      expect(result.content.bodyBlocks).toEqual(exactRow?.body_blocks)
      expect(result.content.carousel.length).toBeGreaterThan(0)
      result.content.carousel.forEach(item => expect(item.signedUrl).toMatch(/^https:\/\//))
    })

    it('draft content_items are not included in the published filter', async () => {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const db = createAdminClient()

      const { data } = await db
        .from('content_items')
        .select('id, status')
        .eq('status', 'published')

      data?.forEach(row => {
        expect(row.status).not.toBe('draft')
      })
    })

    it('anonymous Supabase client cannot read content_items (RLS blocks)', async () => {
      const { createBrowserClient } = await import('@supabase/ssr')
      const anonClient = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )
      const { data, error } = await anonClient.from('content_items').select('id').limit(1)
      // RLS with no anon policy should produce a policy error or empty result.
      // Either is acceptable — what's NOT acceptable is returning rows.
      if (error) {
        expect(data).toBeNull()
        expect(error.message).toMatch(/permission denied|row-level security/i)
        return
      }

      expect(data).toEqual([])
    })
  },
)

describe('publication boundary (always runs — pure logic)', () => {
  it('bodyBlocksSchema rejects content with script tags', async () => {
    const { bodyBlocksSchema } = await import('@/lib/content/schema')
    const result = bodyBlocksSchema.safeParse([
      { type: 'paragraph', text: '<script>alert("xss")</script>' },
    ])
    expect(result.success).toBe(false)
  })
})
