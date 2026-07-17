import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { test, expect, type Page } from '@playwright/test'
import sharp from 'sharp'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'
import { fixtureRunId } from '../integration/fixture-names'
import { deleteRowsByIds, removeStoragePaths } from '../support/fixture-cleanup'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'

let cookie: string | null = null
let fixture: {
  ids: string[]
  paths: string[]
  homeId: string
  originalStatus: string
  originalPublishedAt: string | null
} | null = null

async function removeHomeFlowFixture(
  db: SupabaseClient,
  ids: string[],
  paths: string[],
): Promise<void> {
  await deleteRowsByIds(db, 'content_media', 'media_id', ids, 'E2E Home association')
  await deleteRowsByIds(db, 'media_assets', 'id', ids, 'E2E Home media')
  await removeStoragePaths(db, paths)
}

test.beforeAll(async () => {
  cookie = await makeViewerCookieValue()
  if (!cookie) return

  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: home, error: homeError } = await db.from('content_items')
    .select('id, created_by, status, published_at').eq('type', 'home').eq('slug', 'home').single()
  if (homeError || !home) throw homeError ?? new Error('Canonical Home missing')

  const runId = fixtureRunId()
  const bytes = await sharp({
    create: { width: 3, height: 2, channels: 3, background: '#7c3aed' },
  }).png().toBuffer()
  const paths = [`${home.created_by}/${runId}-carousel-a.png`, `${home.created_by}/${runId}-carousel-b.png`]
  const ids: string[] = []

  try {
    for (const [index, path] of paths.entries()) {
      const upload = await db.storage.from('media').upload(path, bytes, {
        contentType: 'image/png', upsert: false,
      })
      if (upload.error) throw upload.error
      const inserted = await db.from('media_assets').insert({
        storage_path: path, mime_type: 'image/png', byte_size: bytes.length,
        width: 3, height: 2, alt_text: `Pawpaw carousel fixture ${index + 1}`,
        processing_status: 'ready', created_by: home.created_by,
      }).select('id').single()
      if (inserted.error || !inserted.data) throw inserted.error ?? new Error('Fixture insert failed')
      ids.push(inserted.data.id)
      const attached = await db.rpc('attach_owned_media', {
        p_admin_id: home.created_by, p_content_id: home.id, p_media_id: inserted.data.id,
      })
      if (attached.error) throw attached.error
    }
    if (home.status !== 'published') {
      const published = await db.from('content_items').update({
        status: 'published', published_at: new Date().toISOString(),
      }).eq('id', home.id)
      if (published.error) throw published.error
    }
    fixture = {
      ids, paths, homeId: home.id,
      originalStatus: home.status, originalPublishedAt: home.published_at,
    }
  } catch (error) {
    await removeHomeFlowFixture(db, ids, paths)
    throw error
  }
})

test.afterAll(async () => {
  if (!fixture) return
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing E2E cleanup configuration')
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  await removeHomeFlowFixture(db, fixture.ids, fixture.paths)

  const { data: restored, error: restoreError } = await db.from('content_items').update({
      status: fixture.originalStatus, published_at: fixture.originalPublishedAt,
    })
    .eq('id', fixture.homeId)
    .eq('type', 'home')
    .eq('slug', 'home')
    .select('id, status, published_at')
    .single()
  if (restoreError || !restored) {
    throw new Error('E2E Home restoration failed', { cause: restoreError ?? undefined })
  }
  expect(restored.id).toBe(fixture.homeId)
  expect(restored.status).toBe(fixture.originalStatus)
  expect(restored.published_at).toBe(fixture.originalPublishedAt)
})

async function seedViewerSession(page: Page) {
  await page.context().addCookies([{
    name: 'pawpaw_viewer', value: cookie!, domain: 'localhost', path: '/',
  }])
}

test.describe('Home page carousel (requires viewer session)', () => {
  test('carousel previous and next buttons are visible', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Previous photo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next photo' })).toBeVisible()
  })

  test('viewer page offers a Leave control that ends the session', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    const leave = page.getByRole('button', { name: 'Leave' })
    await expect(leave).toBeVisible()
    await leave.click()
    await expect(page).toHaveURL(/\/family-login/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-login/)
  })

  test('family page never overflows and carousel dots are visible', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByRole('tablist', { name: 'Photo position' })).toBeVisible()
  })

  test('carousel does not autoplay', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    const selected = page.locator('[aria-selected="true"]')
    await expect(selected).toHaveCount(1)
    const initial = await selected.getAttribute('aria-label')
    await page.waitForTimeout(3000)
    expect(await selected.getAttribute('aria-label')).toBe(initial)
  })
})

test.describe('family passphrase login flow', () => {
  test('entering the family passphrase grants a viewer session', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    const passphrase = process.env.PLAYWRIGHT_FAMILY_PASSPHRASE
    test.skip(!passphrase, 'Skipping: PLAYWRIGHT_FAMILY_PASSPHRASE not set')
    await page.context().clearCookies()
    await page.goto('/family-login')
    await page.getByLabel('Passphrase').fill(passphrase!)
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page).not.toHaveURL(/\/family-login/)
  })
})
