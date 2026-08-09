import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

// Product-owner model: two human admins deliberately share one Auth identity; fresh browser contexts prove session independence.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const run = `pawpaw-test-shared-admin-${randomUUID().slice(0, 8)}`
const password = `Pawpaw-${randomUUID()}!aA1`
const email = `${run}@example.invalid`
const titleOne = `Revision one ${run}`
const titleTwo = `Revision two ${run}`
const oldAlt = `Old photograph ${run}`
const newAlt = `Replacement photograph ${run}`

let db: SupabaseClient
let adminId = ''
let storyId = ''
let slug = ''
let oldMediaId = ''
let newMediaId = ''
let viewerCookie = ''

test.describe.configure({ mode: 'serial', timeout: 240_000 })

test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Local Supabase environment is missing')
  const host = new URL(url).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Rejected non-local Supabase host: ${host}`)

  db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  viewerCookie = (await makeViewerCookieValue()) ?? ''
  if (!viewerCookie) throw new Error('Viewer cookie could not be minted from local test secrets')

  const user = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { pawpaw_test_fixture: true, run_id: run },
  })
  if (user.error || !user.data.user) throw user.error ?? new Error('Shared admin fixture failed')
  adminId = user.data.user.id

  const allow = await db.from('admin_users').insert({
    user_id: adminId,
    display_name: 'Shared evidence admin',
    active: true,
  })
  if (allow.error) throw allow.error

  const paths = [`${adminId}/${run}-old.png`, `${adminId}/${run}-new.png`]
  for (const path of paths) {
    const upload = await db.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: false })
    if (upload.error) throw upload.error
  }

  const media = await db.from('media_assets').insert([
    { storage_path: paths[0], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1, alt_text: oldAlt, caption: 'Old evidence photograph', processing_status: 'ready', created_by: adminId },
    { storage_path: paths[1], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1, alt_text: newAlt, caption: 'Replacement evidence photograph', processing_status: 'ready', created_by: adminId },
  ]).select('id')
  if (media.error || !media.data || media.data.length !== 2) throw media.error ?? new Error('Media fixtures failed')
  oldMediaId = media.data[0].id
  newMediaId = media.data[1].id
})

function contextOptions(mobile: boolean) {
  return mobile
    ? { baseURL, viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true }
    : { baseURL, viewport: { width: 1440, height: 1000 } }
}

function instrumentPage(page: Page) {
  page.on('pageerror', error => console.log(`BROWSER_PAGEERROR=${error.message}`))
  page.on('console', message => {
    if (message.type() === 'error' || message.type() === 'warning') {
      console.log(`BROWSER_CONSOLE_${message.type().toUpperCase()}=${message.text()}`)
    }
  })
  page.on('response', response => {
    if (response.status() >= 400 && ['script', 'document', 'xhr', 'fetch'].includes(response.request().resourceType())) {
      console.log(`BROWSER_HTTP_${response.status()}=${response.request().resourceType()} ${response.url()}`)
    }
  })
}

async function waitForReactHydration(page: Page, selector: string) {
  await page.waitForLoadState('networkidle')
  await page.waitForFunction((target) => {
    const element = document.querySelector(target)
    return Boolean(element && Object.keys(element).some(key => key.startsWith('__reactProps$')))
  }, selector, { timeout: 30_000 })
}

async function newAdminPage(browser: Browser, mobile: boolean): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(contextOptions(mobile))
  const page = await context.newPage()
  instrumentPage(page)
  page.setDefaultTimeout(20_000)
  await page.goto('/admin/login', { waitUntil: 'networkidle' })
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
  return { context, page }
}

async function newViewerPage(browser: Browser, mobile: boolean): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext(contextOptions(mobile))
  await context.addCookies([{ name: 'pawpaw_viewer', value: viewerCookie, url: baseURL }])
  const page = await context.newPage()
  instrumentPage(page)
  page.setDefaultTimeout(20_000)
  return { context, page }
}

async function expectPublished(browser: Browser, mobile: boolean, expectedTitle: string, expectedAlt: string, absentAlt: string) {
  const viewer = await newViewerPage(browser, mobile)
  try {
    const response = await viewer.page.goto(`/chapters/${slug}`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    const actualHeadings = await viewer.page.locator('h1').allTextContents()
    const actualImageAlts = await viewer.page.locator('img').evaluateAll(images => images.map(image => image.getAttribute('alt') ?? ''))
    console.log(`VIEWER_SNAPSHOT=${JSON.stringify({ expectedTitle, actualHeadings, expectedAlt, absentAlt, actualImageAlts })}`)
    await expect(viewer.page.getByRole('heading', { level: 1, name: expectedTitle })).toBeVisible()
    await expect(viewer.page.getByRole('img', { name: expectedAlt })).toBeVisible()
    await expect(viewer.page.getByRole('img', { name: absentAlt })).toHaveCount(0)
  } finally {
    await viewer.context.close()
  }
}

test('one shared admin identity completes the real revision and photograph lifecycle from two fresh sessions', async ({ browser }, testInfo) => {
  const mobile = testInfo.project.name === 'mobile-chrome'

  await test.step('session 1 signs in and creates the private chapter', async () => {
    const first = await newAdminPage(browser, mobile)
    try {
      await first.page.goto('/admin/content/new', { waitUntil: 'networkidle' })
      await waitForReactHydration(first.page, '#chapter-title')
      await first.page.getByLabel('Chapter type').selectOption('story')
      await first.page.getByLabel('Title').fill(titleOne)
      const address = first.page.getByLabel('Chapter address')
      await expect(address).not.toHaveValue('', { timeout: 20_000 })
      slug = `${run}-story`
      await address.fill(slug)
      await first.page.getByRole('button', { name: 'Add paragraph' }).click()
      const paragraph = first.page.getByLabel('Paragraph')
      await expect(paragraph).toBeVisible()
      await paragraph.fill('The first published version.')
      await first.page.getByRole('button', { name: 'Save private draft' }).click()
      await expect(first.page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/, { timeout: 20_000 })
      storyId = new URL(first.page.url()).pathname.split('/').pop()!

      await first.page.goto('/admin/media', { waitUntil: 'networkidle' })
      const oldCard = first.page.getByRole('article').filter({ has: first.page.locator(`input[value="${oldAlt}"]`) })
      await oldCard.getByLabel('Attach to content').selectOption(storyId)
      await oldCard.getByRole('button', { name: 'Attach photograph' }).click()
      await expect(first.page.getByRole('status').filter({ hasText: titleOne })).toBeVisible()

      await first.page.goto(`/admin/content/${storyId}`, { waitUntil: 'networkidle' })
      await waitForReactHydration(first.page, '#chapter-title')
      await first.page.getByRole('button', { name: 'Set as cover' }).click()
      await expect(first.page.getByRole('status').filter({ hasText: 'cover updated' })).toBeVisible()
      await first.page.getByRole('button', { name: 'Publish', exact: true }).click()
      await expect(first.page.getByText('Revision 1 published for the family.', { exact: true })).toBeVisible()
      await expect(first.page.getByText('Status: published', { exact: true })).toBeVisible()
    } finally {
      await first.context.close()
    }
  })

  await test.step('viewer sees revision one and the old photograph', async () => {
    await expectPublished(browser, mobile, titleOne, oldAlt, newAlt)
  })

  await test.step('fresh session 2 signs into the same shared account, edits and replaces the photograph', async () => {
    const second = await newAdminPage(browser, mobile)
    try {
      await second.page.goto(`/admin/content/${storyId}`, { waitUntil: 'networkidle' })
      await waitForReactHydration(second.page, '#chapter-title')
      await second.page.getByLabel('Title').fill(titleTwo)
      await second.page.getByRole('button', { name: 'Save private draft' }).click()
      await expect(second.page.getByText('Status: published with newer private draft', { exact: true })).toBeVisible()

      await second.page.getByRole('button', { name: 'Replace photograph…' }).click()
      const panel = second.page.locator('[aria-label^="Replace photograph in"]')
      await panel.getByLabel('Eligible unattached photograph').selectOption(newMediaId)
      await panel.getByRole('button', { name: 'Review replacement…' }).click()
      await expect(panel.getByText('Replace this photograph in this chapter?')).toBeVisible()
      await panel.getByRole('button', { name: 'Confirm replacement' }).click()
      await expect(second.page.getByRole('status').filter({ hasText: 'Photograph replaced.' })).toBeVisible()

      const draftBeforePublish = await db.from('content_items').select('title, cover_media_id, active_published_revision_id').eq('id', storyId).single()
      expect(draftBeforePublish.error).toBeNull()
      console.log(`DB_BEFORE_REPUBLISH=${JSON.stringify({ title: draftBeforePublish.data.title, titleIsRevisionTwo: draftBeforePublish.data.title === titleTwo, coverIsReplacement: draftBeforePublish.data.cover_media_id === newMediaId, hasActiveRevision: Boolean(draftBeforePublish.data.active_published_revision_id) })}`)
      expect(draftBeforePublish.data.title).toBe(titleTwo)
      expect(draftBeforePublish.data.cover_media_id).toBe(newMediaId)

      await expectPublished(browser, mobile, titleOne, oldAlt, newAlt)

      const formTitleBeforePublish = await second.page.getByLabel('Title').inputValue()
      console.log(`FORM_BEFORE_REPUBLISH=${JSON.stringify({ title: formTitleBeforePublish, titleIsRevisionTwo: formTitleBeforePublish === titleTwo })}`)
      expect(formTitleBeforePublish).toBe(titleTwo)

      await second.page.getByRole('button', { name: 'Publish new revision' }).click()
      await expect(second.page.getByText('Revision 2 published for the family.', { exact: true })).toBeVisible()
      await expect(second.page.getByText('Status: published', { exact: true })).toBeVisible()

      const afterPublishItem = await db.from('content_items').select('title, cover_media_id, active_published_revision_id').eq('id', storyId).single()
      expect(afterPublishItem.error).toBeNull()
      const revisions = await db.from('content_revisions')
        .select('id, revision_number, created_by, title, created_at')
        .eq('content_item_id', storyId)
        .order('revision_number', { ascending: true })
      expect(revisions.error).toBeNull()
      const revisionSummary = (revisions.data ?? []).map(row => ({
        revisionNumber: row.revision_number,
        title: row.title,
        sameSharedAdmin: row.created_by === adminId,
        active: row.id === afterPublishItem.data.active_published_revision_id,
      }))
      console.log(`DB_AFTER_REPUBLISH=${JSON.stringify({ draftTitle: afterPublishItem.data.title, draftTitleIsRevisionTwo: afterPublishItem.data.title === titleTwo, coverIsReplacement: afterPublishItem.data.cover_media_id === newMediaId, revisions: revisionSummary })}`)

      expect(afterPublishItem.data.title).toBe(titleTwo)
      expect(revisions.data).toHaveLength(2)
      expect(revisions.data?.map(row => [row.revision_number, row.created_by, row.title])).toEqual([
        [1, adminId, titleOne],
        [2, adminId, titleTwo],
      ])

      const rev1 = revisions.data![0].id
      const rev2 = revisions.data![1].id
      expect(afterPublishItem.data.active_published_revision_id).toBe(rev2)

      const snapshots = await db.from('content_revision_media').select('revision_id, media_id').in('revision_id', [rev1, rev2])
      expect(snapshots.error).toBeNull()
      expect(snapshots.data).toEqual(expect.arrayContaining([
        { revision_id: rev1, media_id: oldMediaId },
        { revision_id: rev2, media_id: newMediaId },
      ]))

      console.log(`SHARED_ADMIN_EVIDENCE=${JSON.stringify({ project: testInfo.project.name, revisionNumbers: [1, 2], bothRevisionsSameAdmin: true, activeRevision: 2, revisionOneHasOldMedia: true, revisionTwoHasNewMedia: true })}`)

      await expectPublished(browser, mobile, titleTwo, newAlt, oldAlt)

      await second.page.getByRole('button', { name: 'Unpublish' }).click()
      await expect(second.page.getByText('Chapter unpublished. Revision history and the private draft were preserved.', { exact: true })).toBeVisible()
      await expect(second.page.getByText('Status: unpublished', { exact: true })).toBeVisible()
    } finally {
      await second.context.close()
    }
  })

  await test.step('fresh viewer loses access after unpublish', async () => {
    const viewer = await newViewerPage(browser, mobile)
    try {
      const response = await viewer.page.goto(`/chapters/${slug}`, { waitUntil: 'networkidle' })
      expect(response?.status()).toBe(404)
      await expect(viewer.page.getByText(titleTwo)).toHaveCount(0)
    } finally {
      await viewer.context.close()
    }
  })
})
