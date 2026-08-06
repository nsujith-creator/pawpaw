import { createHash, randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { fixtureMetadata, fixtureObjectName, fixtureRunId, fixtureSlug } from '../integration/fixture-names'
import { reconcilePawpawFixtures } from '../support/fixture-cleanup'
import { loadEnvLocal } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'
const evidenceDir = join(process.cwd(), 'test-results', 'release-2-admin-evidence')
const password = `Pawpaw-${randomUUID()}!aA1`
const fixtureKey = createHash('sha256').update(fixtureRunId()).digest('hex').slice(0, 12)
const email = `pawpaw-test-admin-visual-${fixtureKey}@example.invalid`
const longTitle = 'A deliberately long studio record title that proves the author can still read every word without clipping on a narrow screen'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')

let db: SupabaseClient | null = null
let adminId: string | null = null
let draftContentId = ''

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.beforeAll(async ({}, testInfo) => {
  if (skip || testInfo.project.name !== 'chromium') return
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  await reconcilePawpawFixtures(db)

  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: fixtureMetadata('admin-visual'),
  })
  if (created.error || !created.data.user) throw created.error ?? new Error('Admin visual fixture user was not created')
  adminId = created.data.user.id

  const allowlist = await db.from('admin_users').insert({ user_id: adminId, display_name: 'Pawpaw visual evidence admin', active: true })
  if (allowlist.error) throw allowlist.error

  const content = await db.from('content_items').insert([
    {
      type: 'story', slug: fixtureSlug('admin-visual', 'draft'), title: longTitle,
      body_blocks: [{ type: 'paragraph', text: 'A long fixture paragraph for the studio list.' }],
      status: 'draft', created_by: adminId, updated_by: adminId,
    },
    {
      type: 'gallery', slug: fixtureSlug('admin-visual', 'published'), title: 'A published studio record',
      body_blocks: [], status: 'published', published_at: new Date().toISOString(),
      created_by: adminId, updated_by: adminId,
    },
  ]).select('id')
  if (content.error || !content.data) throw content.error ?? new Error('Admin visual content fixtures were not created')
  draftContentId = content.data[0].id

  const paths = [fixtureObjectName('admin-visual-attached', 'png'), fixtureObjectName('admin-visual-unattached', 'png')]
    .map(name => `${adminId}/${name}`)
  for (const path of paths) {
    const uploaded = await db.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: false })
    if (uploaded.error) throw uploaded.error
  }

  const media = await db.from('media_assets').insert([
    {
      storage_path: paths[0], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1,
      alt_text: '', caption: 'A long reversible fixture caption that remains fully readable on mobile and at two hundred percent zoom.',
      processing_status: 'ready', created_by: adminId,
    },
    {
      storage_path: paths[1], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1,
      alt_text: 'A tiny test-only square used for reversible Admin evidence.', caption: null,
      processing_status: 'ready', created_by: adminId,
    },
  ]).select('id')
  if (media.error || !media.data) throw media.error ?? new Error('Admin visual media fixtures were not created')

  const associations = await db.from('content_media').insert([
    { content_id: content.data[0].id, media_id: media.data[0].id, sort_order: 0 },
    { content_id: content.data[1].id, media_id: media.data[0].id, sort_order: 0 },
  ])
  if (associations.error) throw associations.error
})

test.afterAll(async ({}, testInfo) => {
  if (testInfo.project.name === 'chromium' && db) await reconcilePawpawFixtures(db)
})

test.beforeEach(async ({}, testInfo) => {
  test.skip(skip, 'Skipping: no server available')
  test.skip(testInfo.project.name !== 'chromium', 'One deterministic evidence set covers every declared Admin viewport')
  test.skip(!db || !adminId, 'Skipping: no Admin fixture could be created')
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
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toBeVisible()
}

async function gotoAdmin(page: Page, route: string) {
  await page.goto(route)
  if (/\/admin\/login/.test(page.url())) {
    await signIn(page)
    if (route !== '/admin') await page.goto(route)
  }
  expect(new URL(page.url()).pathname).toBe(route)
}

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)
}

async function expectTargets(page: Page) {
  const interactive = page.locator('nav a, nav button, main a, main button, main input:not([type="hidden"]), main select, main textarea').filter({ visible: true })
  for (let index = 0; index < await interactive.count(); index += 1) {
    const box = await interactive.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
}

function trackBrowserFailures(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('requestfailed', request => {
    const errorText = request.failure()?.errorText ?? ''
    if (errorText !== 'net::ERR_ABORTED') {
      failedRequests.push(`${request.method()} ${request.url()} ${errorText}`.trim())
    }
  })

  return () => {
    expect(consoleErrors, 'browser console errors').toEqual([])
    expect(pageErrors, 'uncaught page errors').toEqual([])
    expect(failedRequests, 'failed browser requests').toEqual([])
  }
}

async function expectStudioPrivacy(page: Page) {
  const visibleText = await page.locator('body').innerText()
  expect(visibleText).not.toMatch(/storage\/v1\/object\/sign|service[_-]?role|token=|eyJ[A-Za-z0-9_-]{20,}/i)
  await expect(page.locator('a[href*="/storage/v1/object/sign/"]')).toHaveCount(0)
  const navigation = page.getByRole('navigation', { name: 'Admin navigation' })
  await expect(navigation).toBeVisible()
  for (const name of ['Dashboard', 'Content', 'Media', 'Home page', 'Sign out']) {
    await expect(navigation.getByRole(name === 'Sign out' ? 'button' : 'link', { name: new RegExp(`^${name}`) })).toBeVisible()
  }
}

async function expectDashboardAttention(page: Page) {
  await expect(page.getByText('1 attached photo missing alt text', { exact: true })).toHaveCount(1)
  await expect(page.getByText('1 unpublished draft', { exact: true })).toHaveCount(1)
}

test('Admin login has complete desktop/mobile, focus, error, reduced-motion, and overflow evidence', async ({ page }) => {
  const expectNoBrowserFailures = trackBrowserFailures(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/admin/login')
  await expect(page.getByLabel('Email')).toHaveAttribute('autocomplete', 'email')
  await expect(page.getByLabel('Password')).toHaveAttribute('autocomplete', 'current-password')
  await page.getByLabel('Email').focus()
  const focusStyle = await page.getByLabel('Email').evaluate(element => getComputedStyle(element, ':focus-visible').outlineStyle)
  expect(focusStyle).not.toBe('none')
  await capture(page, 'admin-login-1440.png')

  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoOverflow(page)
  await expectTargets(page)
  await capture(page, 'admin-login-375.png')

  await page.setViewportSize({ width: 320, height: 800 })
  await expectNoOverflow(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await page.getByRole('button', { name: 'Sign in' }).evaluate(element => getComputedStyle(element).transitionDuration)).toMatch(/^(0s|0ms)(, (0s|0ms))*$/)

  await page.getByLabel('Email').fill('invalid@example.invalid')
  await page.getByLabel('Password').fill('not-the-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('p[role="alert"]')).toBeVisible()
  await capture(page, 'admin-login-error.png')
  expectNoBrowserFailures()
})

test('Admin routes match the desktop/mobile screenshot matrix with visible navigation and no overflow', async ({ page }) => {
  const expectNoBrowserFailures = trackBrowserFailures(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)
  const routes = [
    ['/admin', 'admin-dashboard'],
    ['/admin/content', 'admin-content'],
    ['/admin/media', 'admin-media'],
    ['/admin/home', 'admin-home'],
  ] as const

  for (const [route, file] of routes) {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await gotoAdmin(page, route)
    await expectStudioPrivacy(page)
    if (route === '/admin') await expectDashboardAttention(page)
    await expectNoOverflow(page)
    await capture(page, `${file}-1440.png`)

    await page.setViewportSize({ width: 375, height: 812 })
    await expectStudioPrivacy(page)
    if (route === '/admin') await expectDashboardAttention(page)
    await expectNoOverflow(page)
    await expectTargets(page)
    await capture(page, `${file}-375.png`)

    await page.setViewportSize({ width: 320, height: 800 })
    await expectNoOverflow(page)
  }

  await gotoAdmin(page, '/admin')
  const active = page.getByRole('link', { name: /Dashboard Current/ })
  await expect(active).toHaveAttribute('aria-current', 'page')
  expect(await active.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe('none')

  await page.getByRole('link', { name: /Drafts/ }).click()
  await expect(page).toHaveURL(/\/admin\/content\?status=draft/)
  await expect(page.getByLabel('Filter by status')).toHaveValue('draft')

  await page.setViewportSize({ width: 640, height: 900 })
  await expect(page.getByRole('heading', { name: 'Content library' })).toBeVisible()
  const zoomApply = page.getByRole('button', { name: 'Apply' })
  await expect(zoomApply).toBeVisible()
  await expectNoOverflow(page)
  await capture(page, 'admin-content-200-percent-zoom.png')
  expectNoBrowserFailures()
})

test('Content, media, editor, upload, semantic states, and destructive confirmation retain real behaviour', async ({ page }) => {
  const expectNoBrowserFailures = trackBrowserFailures(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)

  await gotoAdmin(page, '/admin/content')
  await expect(page.getByRole('link', { name: 'Create chapter' })).toHaveAttribute('href', '/admin/content/new')
  await page.getByLabel('Search content by title').fill('no-result-studio-filter')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('No content matches these filters.')).toBeVisible()
  await capture(page, 'admin-content-empty-filtered.png')

  await gotoAdmin(page, '/admin/media')
  await expect(page.getByRole('heading', { name: /Attached to a page/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Unattached/ })).toBeVisible()
  await page.getByRole('button', { name: 'Delete permanently…' }).first().click()
  await expect(page.getByText('Delete this photo forever? This cannot be undone.')).toBeVisible()
  await capture(page, 'admin-media-destructive-confirmation.png')
  await page.getByRole('button', { name: 'Cancel' }).click()

  const alt = page.getByLabel('Alt text for this photo').first()
  await alt.fill('Updated reversible Admin evidence alt text.')
  await page.getByRole('button', { name: 'Save details' }).first().click()
  await expect(page.getByRole('status')).toContainText('Details updated.')
  await capture(page, 'admin-media-success.png')

  const unattachedCard = page.getByRole('article').filter({
    has: page.locator('input[value="A tiny test-only square used for reversible Admin evidence."]'),
  })
  await unattachedCard.getByLabel('Attach to content').selectOption(draftContentId)
  await unattachedCard.getByRole('button', { name: 'Attach photograph' }).click()
  await expect(page.getByRole('status')).toContainText(`Photograph attached to ${longTitle}.`)
  await capture(page, 'admin-media-target-attachment.png')

  await gotoAdmin(page, '/admin/home')
  await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Advanced: edit blocks as JSON' }).click()
  await expect(page.getByLabel('Advanced content blocks (JSON)')).toBeVisible()
  await capture(page, 'admin-home-advanced-editor.png')
  await page.getByRole('button', { name: 'Use the simple text editor' }).click()
  await expect(page.getByLabel('Your words')).toBeVisible()

  await page.getByLabel('Photo (JPEG, PNG, or WebP, max 8 MB)').setInputFiles({ name: 'not-an-image.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') })
  await page.getByLabel('Alt text for screen readers (required)').last().fill('Invalid upload evidence')
  await page.getByRole('button', { name: 'Upload photo' }).click()
  await expect(page.locator('p[role="alert"]').filter({ hasText: 'Unsupported file type' })).toBeVisible()
  await capture(page, 'admin-home-upload-error.png')

  await page.setViewportSize({ width: 640, height: 900 })
  await expect(page.getByRole('button', { name: 'Publish', exact: true })).toBeVisible()
  const zoomDelete = page.getByRole('button', { name: 'Delete permanently…' }).first()
  await expect(zoomDelete).toBeVisible()
  await expectNoOverflow(page)
  await capture(page, 'admin-home-200-percent-zoom.png')
  expectNoBrowserFailures()
})

test('Reduced motion is complete and sign out plus immediate Back never restores Admin', async ({ page }) => {
  const expectNoBrowserFailures = trackBrowserFailures(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await signIn(page)
  const durations = await page.locator('nav a, nav button, main button').evaluateAll(elements => elements.map(element => getComputedStyle(element).transitionDuration))
  expect(durations.every(duration => /^(0s|0ms)(, (0s|0ms))*$/.test(duration))).toBe(true)
  await capture(page, 'admin-dashboard-reduced-motion.png')

  await page.evaluate(() => window.history.pushState({}, '', '/admin?history=admin-visual'))
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goBack()
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole('navigation', { name: 'Admin navigation' })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toHaveCount(0)
  await expect(page.getByLabel('Email')).toBeVisible()
  expectNoBrowserFailures()
})
