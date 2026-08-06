import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { fixtureMetadata, fixtureObjectName, fixtureRunId, fixtureSlug } from '../integration/fixture-names'
import { reconcilePawpawFixtures } from '../support/fixture-cleanup'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'
const evidenceDir = join(process.cwd(), 'test-results', 'pr-004b-evidence')
const password = `Pawpaw-${randomUUID()}!aA1`
const fixtureKey = createHash('sha256').update(fixtureRunId()).digest('hex').slice(0, 12)
const email = `pawpaw-test-pr004b-${fixtureKey}@example.invalid`
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const storyTitle = 'A quiet morning full of small discoveries'

let db: SupabaseClient | null = null
let adminId = ''
let viewerCookie: string | null = null
let storyId = ''
let galleryId = ''
let galleryMediaId = ''
let galleryMediaPath = ''
let oldMediaId = ''
let newMediaId = ''
let adminCookies: Awaited<ReturnType<BrowserContext['cookies']>> = []

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.beforeAll(async ({}, testInfo) => {
  if (skip || testInfo.project.name !== 'chromium') return
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return
  db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  await reconcilePawpawFixtures(db)
  viewerCookie = await makeViewerCookieValue()

  const user = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fixtureMetadata('pr-004b-core'),
  })
  if (user.error || !user.data.user) throw user.error ?? new Error('PR-004B fixture user was not created')
  adminId = user.data.user.id
  const allowlist = await db.from('admin_users').insert({
    user_id: adminId,
    display_name: 'PR-004B evidence admin',
    active: true,
  })
  if (allowlist.error) throw allowlist.error

  const now = new Date().toISOString()
  const content = await db.from('content_items').insert([
    {
      type: 'gallery',
      slug: fixtureSlug('pr004b', 'gallery'),
      title: 'A gallery of tiny details',
      summary: 'A collection of close, ordinary details kept together.',
      body_blocks: [{ type: 'heading', level: 2, text: 'Look closely' }, { type: 'paragraph', text: 'The copy remains available even when a photograph cannot load.' }],
      status: 'published',
      published_at: now,
      created_by: adminId,
      updated_by: adminId,
    },
    {
      type: 'letter',
      slug: fixtureSlug('pr004b', 'letter'),
      title: 'A letter for a later day',
      summary: 'Words saved for Varada to meet in her own time.',
      body_blocks: [{ type: 'quote', text: 'You were loved in the ordinary hours too.', attribution: 'Family' }],
      status: 'published',
      published_at: now,
      created_by: adminId,
      updated_by: adminId,
    },
    {
      type: 'moment',
      slug: fixtureSlug('pr004b', 'moment'),
      title: 'One bright small moment',
      summary: 'A truthful moment without invented chronology.',
      body_blocks: [{ type: 'paragraph', text: 'A small green towel, a sleepy face, and a room briefly quiet.' }],
      status: 'published',
      published_at: now,
      created_by: adminId,
      updated_by: adminId,
    },
    {
      type: 'story',
      slug: fixtureSlug('pr004b', 'long-draft'),
      title: 'A deliberately long private draft title that proves every word remains readable in the Author’s Studio at a narrow mobile width',
      summary: null,
      body_blocks: [],
      status: 'draft',
      created_by: adminId,
      updated_by: adminId,
    },
  ]).select('id, type')
  if (content.error || !content.data) throw content.error ?? new Error('PR-004B content fixtures were not created')
  galleryId = content.data.find(item => item.type === 'gallery')!.id

  const mediaLabels = ['gallery-cover', 'replacement-old', 'replacement-new']
  const paths = mediaLabels.map(label => `${adminId}/${fixtureObjectName(`pr004b-${label}`, 'png')}`)
  for (const path of paths) {
    const upload = await db.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: false })
    if (upload.error) throw upload.error
  }
  const media = await db.from('media_assets').insert(paths.map((path, index) => ({
    storage_path: path,
    mime_type: 'image/png',
    byte_size: png.length,
    width: 1,
    height: 1,
    alt_text: ['A fixture gallery photograph.', 'The original fixture photograph.', 'The proposed replacement photograph.'][index],
    caption: ['Gallery fixture caption.', 'Original fixture caption.', 'Replacement fixture caption.'][index],
    processing_status: 'ready',
    created_by: adminId,
  }))).select('id')
  if (media.error || !media.data) throw media.error ?? new Error('PR-004B media fixtures were not created')
  galleryMediaId = media.data[0].id
  galleryMediaPath = paths[0]
  oldMediaId = media.data[1].id
  newMediaId = media.data[2].id
  const association = await db.from('content_media').insert({
    content_id: galleryId,
    media_id: galleryMediaId,
    sort_order: 0,
  })
  if (association.error) throw association.error
  const cover = await db.from('content_items').update({ cover_media_id: galleryMediaId }).eq('id', galleryId)
  if (cover.error) throw cover.error
})

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name === 'chromium' && db) await reconcilePawpawFixtures(db)
})

test.beforeEach(async ({}, testInfo) => {
  test.skip(skip, 'Skipping: no server available')
  test.skip(testInfo.project.name !== 'chromium', 'One deterministic PR-004B evidence set covers all declared viewports')
  test.skip(!db || !adminId || !viewerCookie, 'Skipping: PR-004B fixtures could not be created')
  mkdirSync(evidenceDir, { recursive: true })
})

async function waitForVisuals(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
      image.addEventListener('load', () => resolve(), { once: true })
      image.addEventListener('error', () => resolve(), { once: true })
    })))
  })
}

async function capture(page: Page, fileName: string) {
  await waitForVisuals(page)
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({ path: join(evidenceDir, fileName), fullPage: true, animations: 'disabled', caret: 'initial' })
}

async function signIn(page: Page) {
  if (adminCookies.length > 0) {
    await page.context().addCookies(adminCookies)
    await page.goto('/admin')
    if (new URL(page.url()).pathname === '/admin') return
    adminCookies = []
  }
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
  adminCookies = await page.context().cookies()
}

async function viewerPage(browser: Browser): Promise<{ page: Page; close: () => Promise<void> }> {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pawpaw_viewer', value: viewerCookie!, url: baseURL }])
  const page = await context.newPage()
  return { page, close: () => context.close() }
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

async function expectNoVisibleLeak(page: Page) {
  const text = await page.locator('body').innerText()
  expect(text).not.toMatch(/storage\/v1\/object\/sign|service[_-]?role|token=|[0-9a-f]{8}-[0-9a-f-]{27,}/i)
}

test('Admin creates, validates, previews, and publishes one structured Story', async ({ page, browser }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/content')
  await expect(page.getByRole('link', { name: 'Create chapter' })).toBeVisible()
  await capture(page, 'admin-content-library-1440.png')
  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoOverflow(page)
  await capture(page, 'admin-content-library-375.png')
  await capture(page, 'admin-content-library-long-text-375.png')

  await page.getByRole('link', { name: 'Create chapter' }).click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await capture(page, 'admin-create-story-1440.png')
  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please correct' })).toBeVisible()
  await capture(page, 'admin-create-validation-errors.png')

  await page.getByLabel('Title').fill(storyTitle)
  await expect(page.getByLabel('Chapter address')).toHaveValue('a-quiet-morning-full-of-small-discoveries')
  await page.getByLabel('Introduction (optional)').fill('A truthful private introduction written for this reversible fixture.')
  await page.getByRole('button', { name: 'Add heading' }).click()
  await page.getByLabel('Heading text').fill('What we noticed')
  await page.getByRole('button', { name: 'Add paragraph' }).click()
  await page.getByLabel('Paragraph').fill('Morning light crossed the room while the family spoke softly.')
  await page.getByRole('button', { name: 'Add quote' }).click()
  await page.getByLabel('Quotation').fill('Keep the ordinary parts too.')
  await page.getByLabel('Attribution (optional)').fill('Family')
  await capture(page, 'admin-block-editor-heading-paragraph-quote.png')
  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoOverflow(page)
  await capture(page, 'admin-create-story-375.png')

  await page.getByRole('button', { name: 'Save draft' }).click()
  await expect(page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/, { timeout: 20_000 })
  storyId = new URL(page.url()).pathname.split('/').pop()!
  await expect(page.getByText('Status: draft')).toBeVisible()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await capture(page, 'admin-saved-draft-editor-1440.png')
  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoOverflow(page)
  await capture(page, 'admin-saved-draft-editor-375.png')
  await page.setViewportSize({ width: 640, height: 900 })
  await page.evaluate(() => { document.body.style.zoom = '2' })
  await expectNoOverflow(page)
  await capture(page, 'admin-editor-200-percent-zoom.png')
  await page.evaluate(() => { document.body.style.zoom = '1' })

  const viewer = await viewerPage(browser)
  try {
    await viewer.page.goto('/chapters')
    await expect(viewer.page.getByText(storyTitle, { exact: true })).toHaveCount(0)
    await viewer.page.goto(`/admin/content/${storyId}/preview`)
    await expect(viewer.page).toHaveURL(/\/admin\/login$/, { timeout: 20_000 })
  } finally {
    await viewer.close()
  }

  const persistedDraft = await db!.from('content_items')
    .select('id, status')
    .eq('id', storyId)
    .maybeSingle()
  expect(persistedDraft.error).toBeNull()
  expect(persistedDraft.data).toEqual({ id: storyId, status: 'draft' })
  await page.getByRole('link', { name: 'Preview' }).click()
  await expect(page).toHaveURL(new RegExp(`/admin/content/${storyId}/preview$`), { timeout: 20_000 })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.getByText('Private preview — not visible to family')).toBeVisible()
  await capture(page, 'admin-private-preview-1440.png')
  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoOverflow(page)
  await capture(page, 'admin-private-preview-375.png')
  await expectNoVisibleLeak(page)

  await page.getByRole('link', { name: 'Edit chapter' }).click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByRole('button', { name: 'Publish', exact: true }).click()
  await expect(page.getByText('Status: published')).toBeVisible()
  await capture(page, 'admin-published-state.png')

  await page.goto('/admin/content/new')
  await page.getByLabel('Chapter type').selectOption('gallery')
  await page.setViewportSize({ width: 375, height: 812 })
  await capture(page, 'admin-create-gallery-375.png')
})

test('Published private family chapters render responsively and retain prose during fixture media degradation', async ({ browser }) => {
  const viewer = await viewerPage(browser)
  const page = viewer.page
  try {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto('/chapters')
    await expect(page.getByRole('heading', { level: 1, name: 'Chapters' })).toBeVisible()
    await expect(page.getByText(storyTitle, { exact: true })).toBeVisible()
    await capture(page, 'family-chapters-index-1440.png')
    await page.setViewportSize({ width: 375, height: 812 })
    await expectNoOverflow(page)
    await capture(page, 'family-chapters-index-375.png')

    await page.getByText(storyTitle, { exact: true }).click()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await capture(page, 'family-story-1440.png')
    await page.setViewportSize({ width: 375, height: 812 })
    await expectNoOverflow(page)
    await capture(page, 'family-story-375.png')

    const fixtures = await db!.from('content_items')
      .select('type, slug')
      .eq('created_by', adminId)
      .eq('status', 'published')
    expect(fixtures.error).toBeNull()
    const gallery = fixtures.data!.find(item => item.type === 'gallery')!
    const letter = fixtures.data!.find(item => item.type === 'letter')!
    const moment = fixtures.data!.find(item => item.type === 'moment')!

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/chapters/${gallery.slug}`)
    await capture(page, 'family-gallery-1440.png')
    await page.setViewportSize({ width: 375, height: 812 })
    await capture(page, 'family-gallery-375.png')
    await page.goto(`/chapters/${letter.slug}`)
    await capture(page, 'family-letter-375.png')
    await page.goto(`/chapters/${moment.slug}`)
    await capture(page, 'family-moment-375.png')

    let changed = false
    try {
      // An empty fixture-only path makes signed-URL creation fail deterministically,
      // exercising the renderer's degraded-media branch without touching a real file.
      const update = await db!.from('media_assets').update({ storage_path: '' }).eq('id', galleryMediaId)
      expect(update.error).toBeNull()
      changed = true
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(`/chapters/${gallery.slug}?degraded=${randomUUID()}`, { waitUntil: 'networkidle' })
      await expect(page.getByRole('alert').filter({ hasText: 'written chapter remains available' })).toBeVisible()
      await expect(page.getByText('The copy remains available even when a photograph cannot load.')).toBeVisible()
      await capture(page, 'family-degraded-media-with-prose.png')
    } finally {
      if (changed) {
        const restore = await db!.from('media_assets').update({ storage_path: galleryMediaPath }).eq('id', galleryMediaId)
        expect(restore.error).toBeNull()
      }
    }

    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/first-days')
    await expect(page.getByRole('heading', { level: 1, name: 'First Days' })).toBeVisible()
    await capture(page, 'family-first-days-preserved-layout-375.png')
    await expectNoVisibleLeak(page)
  } finally {
    await viewer.close()
  }
})

test('Admin attaches, covers, replaces from library and upload, unpublishes, detaches, and deletes safely', async ({ page }) => {
  await signIn(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/media')
  const oldCard = page.getByRole('article').filter({
    has: page.locator('input[value="The original fixture photograph."]'),
  })
  await oldCard.getByLabel('Attach to content').selectOption(storyId)
  await capture(page, 'admin-media-target-selector.png')
  await oldCard.getByRole('button', { name: 'Attach photograph' }).click()
  await expect(page.getByRole('status').filter({ hasText: storyTitle })).toBeVisible()

  await page.goto(`/admin/content/${storyId}`)
  await page.getByRole('button', { name: 'Set as cover' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'cover updated' })).toBeVisible()
  await page.getByRole('button', { name: 'Replace photograph…' }).click()
  await capture(page, 'admin-replacement-chooser.png')
  let replacementPanel = page.locator('[aria-label^="Replace photograph in"]')
  await replacementPanel.getByLabel('Eligible unattached photograph').selectOption(newMediaId)
  await replacementPanel.getByRole('button', { name: 'Review replacement…' }).click()
  await expect(replacementPanel.getByText('Replace this photograph in this chapter?')).toBeVisible()
  await capture(page, 'admin-replacement-old-new-confirmation.png')
  await replacementPanel.getByRole('button', { name: 'Confirm replacement' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Photograph replaced. The previous file remains in Media Library.' })).toBeVisible()
  await capture(page, 'admin-replacement-success.png')

  const current = page.getByRole('article').filter({
    has: page.locator('input[value="The proposed replacement photograph."]'),
  })
  await current.getByRole('button', { name: 'Replace photograph…' }).click()
  replacementPanel = current.locator('[aria-label^="Replace photograph in"]')
  await replacementPanel.getByRole('button', { name: 'Upload new photograph' }).click()
  await replacementPanel.getByLabel('Photo (JPEG, PNG, or WebP, max 8 MB)').setInputFiles({
    name: 'fixture-upload.png',
    mimeType: 'image/png',
    buffer: png,
  })
  await replacementPanel.getByLabel('Alt text (required)').fill('A newly uploaded replacement fixture.')
  await replacementPanel.getByLabel('Caption (optional)').fill('Uploaded replacement fixture caption.')
  await replacementPanel.getByRole('button', { name: 'Review replacement…' }).click()
  await replacementPanel.getByRole('button', { name: 'Confirm replacement' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Photograph replaced. The previous file remains in Media Library.' })).toBeVisible()

  const { data: oldRows } = await db!.from('media_assets').select('id').in('id', [oldMediaId, newMediaId])
  expect(oldRows).toHaveLength(2)
  const { data: attached } = await db!.from('content_media')
    .select('media_id, sort_order').eq('content_id', storyId)
  expect(attached).toHaveLength(1)
  expect(attached?.[0].sort_order).toBe(0)
  const uploadedId = attached![0].media_id
  expect(uploadedId).not.toBe(oldMediaId)
  expect(uploadedId).not.toBe(newMediaId)

  await page.getByRole('button', { name: 'Unpublish' }).click()
  await expect(page.getByText('Status: draft')).toBeVisible()
  await capture(page, 'admin-unpublished-state.png')
  await page.getByRole('button', { name: 'Detach' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'file remains in Media Library' })).toBeVisible()

  await page.getByRole('button', { name: 'Delete chapter…' }).click()
  await capture(page, 'admin-delete-confirmation.png')
  await page.getByLabel('Exact chapter title').fill(storyTitle)
  await page.getByRole('button', { name: 'Delete this chapter' }).click()
  await expect(page).toHaveURL(/\/admin\/content$/, { timeout: 20_000 })
  const { data: retained } = await db!.from('media_assets').select('id').in('id', [oldMediaId, newMediaId, uploadedId])
  expect(retained).toHaveLength(3)
})
