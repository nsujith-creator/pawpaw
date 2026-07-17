import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'

const EMPTY_TEXT = "Varada's world is being prepared. Come back soon."

test.describe('published Home through the real family route', () => {
  test('publish, media degradation, unpublish, and republish are fresh on HTTP requests', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'chromium', 'Live mutation runs once in the desktop project to avoid cross-project races')

    const localEnv = loadEnvLocal()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? localEnv.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? localEnv.SUPABASE_SERVICE_ROLE_KEY
    const viewerCookie = await makeViewerCookieValue()

    expect(supabaseUrl, 'real Supabase URL is required').toBeTruthy()
    expect(serviceKey, 'service-role key is required').toBeTruthy()
    expect(viewerCookie, 'valid viewer cookie is required').toBeTruthy()

    const db = createClient(supabaseUrl!, serviceKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: homes, error: homeReadError } = await db
      .from('content_items')
      .select('id, title, body_blocks, status, published_at, created_by')
      .eq('type', 'home')
      .order('created_at', { ascending: false })
      .limit(2)

    expect(homeReadError).toBeNull()
    expect(homes).toHaveLength(1)
    const home = homes![0]

    const { data: activeAdmin, error: adminError } = await db
      .from('admin_users')
      .select('active')
      .eq('user_id', home.created_by)
      .single()
    expect(adminError).toBeNull()
    expect(activeAdmin?.active).toBe(true)

    const { data: attachment, error: attachmentError } = await db
      .from('content_media')
      .select('media_id')
      .eq('content_id', home.id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .single()
    expect(attachmentError).toBeNull()

    const { data: media, error: mediaReadError } = await db
      .from('media_assets')
      .select('id, storage_path')
      .eq('id', attachment!.media_id)
      .single()
    expect(mediaReadError).toBeNull()

    const marker = randomUUID().slice(0, 8)
    const testTitle = `Published Home route ${marker}`
    const testBody = `Fresh family route body ${marker}.`
    const missingStoragePath = `e2e-missing/${randomUUID()}.jpg`
    let mediaPathChanged = false

    await page.context().addCookies([{
      name: 'pawpaw_viewer',
      value: viewerCookie!,
      url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    }])

    async function updateHome(values: Record<string, unknown>) {
      const { error } = await db.from('content_items').update(values).eq('id', home.id)
      expect(error).toBeNull()
    }

    async function freshRequest(step: string) {
      return page.goto(`/?home-regression=${step}-${randomUUID()}`, { waitUntil: 'networkidle' })
    }

    try {
      await updateHome({
        title: testTitle,
        body_blocks: [{ type: 'paragraph', text: testBody }],
        status: 'published',
        published_at: new Date().toISOString(),
      })

      const publishedResponse = await freshRequest('published')
      expect(publishedResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: testTitle })).toBeVisible()
      await expect(page.getByText(testBody)).toBeVisible()
      await expect(page.getByText(EMPTY_TEXT)).toHaveCount(0)

      const repeatedResponse = await freshRequest('published-repeat')
      expect(repeatedResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: testTitle })).toBeVisible()
      await expect(page.getByText(EMPTY_TEXT)).toHaveCount(0)

      const { error: breakMediaError } = await db
        .from('media_assets')
        .update({ storage_path: missingStoragePath })
        .eq('id', media!.id)
      expect(breakMediaError).toBeNull()
      mediaPathChanged = true

      const degradedResponse = await freshRequest('media-degraded')
      expect(degradedResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: testTitle })).toBeVisible()
      await expect(page.getByText(testBody)).toBeVisible()
      await expect(page.getByText(EMPTY_TEXT)).toHaveCount(0)
      await expect(
        page.getByRole('alert').filter({ hasText: 'Some photos could not be loaded' }),
      ).toBeVisible()

      const { error: restoreMediaError } = await db
        .from('media_assets')
        .update({ storage_path: media!.storage_path })
        .eq('id', media!.id)
      expect(restoreMediaError).toBeNull()
      mediaPathChanged = false

      await updateHome({ status: 'draft', published_at: null })
      const draftResponse = await freshRequest('draft')
      expect(draftResponse?.status()).toBe(200)
      await expect(page.getByText(EMPTY_TEXT)).toBeVisible()
      await expect(page.getByText(testBody)).toHaveCount(0)

      await updateHome({ status: 'published', published_at: new Date().toISOString() })
      const republishedResponse = await freshRequest('republished')
      expect(republishedResponse?.status()).toBe(200)
      await expect(page.getByRole('heading', { name: testTitle })).toBeVisible()
      await expect(page.getByText(testBody)).toBeVisible()
      await expect(page.getByText(EMPTY_TEXT)).toHaveCount(0)
    } finally {
      if (mediaPathChanged) {
        const { error } = await db
          .from('media_assets')
          .update({ storage_path: media!.storage_path })
          .eq('id', media!.id)
        expect(error).toBeNull()
      }

      await updateHome({
        title: home.title,
        body_blocks: home.body_blocks,
        status: home.status,
        published_at: home.published_at,
      })
    }
  })
})
