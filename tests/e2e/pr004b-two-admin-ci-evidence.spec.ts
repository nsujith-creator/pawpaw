import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64')
const run = `pawpaw-test-two-admin-${randomUUID().slice(0, 8)}`
const password = `Pawpaw-${randomUUID()}!aA1`
const titleOne = `Revision one ${run}`
const titleTwo = `Revision two ${run}`
const oldAlt = `Old photograph ${run}`
const newAlt = `Replacement photograph ${run}`

let db: SupabaseClient
let adminA = ''
let adminB = ''
let emailA = ''
let emailB = ''
let storyId = ''
let slug = ''
let oldMediaId = ''
let newMediaId = ''
let viewerCookie = ''

test.describe.configure({ mode: 'serial', timeout: 120_000 })

test.beforeAll(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Local Supabase environment is missing')
  const host = new URL(url).hostname
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Rejected non-local Supabase host: ${host}`)
  db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  viewerCookie = (await makeViewerCookieValue()) ?? ''
  if (!viewerCookie) throw new Error('Viewer cookie could not be minted from local test secrets')

  emailA = `${run}-a@example.invalid`
  emailB = `${run}-b@example.invalid`
  const [a, b] = await Promise.all([
    db.auth.admin.createUser({ email: emailA, password, email_confirm: true, user_metadata: { pawpaw_test_fixture: true, run_id: run } }),
    db.auth.admin.createUser({ email: emailB, password, email_confirm: true, user_metadata: { pawpaw_test_fixture: true, run_id: run } }),
  ])
  if (a.error || !a.data.user) throw a.error ?? new Error('Admin A fixture failed')
  if (b.error || !b.data.user) throw b.error ?? new Error('Admin B fixture failed')
  adminA = a.data.user.id
  adminB = b.data.user.id
  const allow = await db.from('admin_users').insert([
    { user_id: adminA, display_name: 'Evidence Admin A', active: true },
    { user_id: adminB, display_name: 'Evidence Admin B', active: true },
  ])
  if (allow.error) throw allow.error

  const paths = [`${adminA}/${run}-old.png`, `${adminA}/${run}-new.png`]
  for (const path of paths) {
    const upload = await db.storage.from('media').upload(path, png, { contentType: 'image/png', upsert: false })
    if (upload.error) throw upload.error
  }
  const media = await db.from('media_assets').insert([
    { storage_path: paths[0], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1, alt_text: oldAlt, caption: 'Old evidence photograph', processing_status: 'ready', created_by: adminA },
    { storage_path: paths[1], mime_type: 'image/png', byte_size: png.length, width: 1, height: 1, alt_text: newAlt, caption: 'Replacement evidence photograph', processing_status: 'ready', created_by: adminA },
  ]).select('id')
  if (media.error || !media.data || media.data.length !== 2) throw media.error ?? new Error('Media fixtures failed')
  oldMediaId = media.data[0].id
  newMediaId = media.data[1].id
})

async function newAdminPage(browser: Browser, email: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL })
  const page = await context.newPage()
  await page.goto('/admin/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/admin$/, { timeout: 20_000 })
  return { context, page }
}

async function newViewerPage(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pawpaw_viewer', value: viewerCookie, url: baseURL }])
  return { context, page: await context.newPage() }
}

async function expectPublished(browser: Browser, expectedTitle: string, expectedAlt: string, absentAlt: string) {
  const viewer = await newViewerPage(browser)
  try {
    const response = await viewer.page.goto(`/chapters/${slug}`, { waitUntil: 'networkidle' })
    expect(response?.status()).toBe(200)
    await expect(viewer.page.getByRole('heading', { level: 1, name: expectedTitle })).toBeVisible()
    await expect(viewer.page.getByRole('img', { name: expectedAlt })).toBeVisible()
    await expect(viewer.page.getByRole('img', { name: absentAlt })).toHaveCount(0)
  } finally {
    await viewer.context.close()
  }
}

test('two independent admins complete the real revision and photograph lifecycle', async ({ browser }) => {
  const a = await newAdminPage(browser, emailA)
  try {
    await a.page.goto('/admin/content/new')
    await a.page.getByLabel('Title').fill(titleOne)
    slug = `${run}-story`
    await a.page.getByLabel('Chapter address').fill(slug)
    await a.page.getByRole('button', { name: 'Add paragraph' }).click()
    await a.page.getByLabel('Paragraph').fill('The first published version.')
    await a.page.getByRole('button', { name: 'Save private draft' }).click()
    await expect(a.page).toHaveURL(/\/admin\/content\/[0-9a-f-]+$/, { timeout: 20_000 })
    storyId = new URL(a.page.url()).pathname.split('/').pop()!

    await a.page.goto('/admin/media')
    const oldCard = a.page.getByRole('article').filter({ has: a.page.locator(`input[value="${oldAlt}"]`) })
    await oldCard.getByLabel('Attach to content').selectOption(storyId)
    await oldCard.getByRole('button', { name: 'Attach photograph' }).click()
    await expect(a.page.getByRole('status').filter({ hasText: titleOne })).toBeVisible()

    await a.page.goto(`/admin/content/${storyId}`)
    await a.page.getByRole('button', { name: 'Set as cover' }).click()
    await expect(a.page.getByRole('status').filter({ hasText: 'cover updated' })).toBeVisible()
    await a.page.getByRole('button', { name: 'Publish', exact: true }).click()
    await expect(a.page.getByText('Status: published')).toBeVisible()
  } finally {
    await a.context.close()
  }

  await expectPublished(browser, titleOne, oldAlt, newAlt)

  const b = await newAdminPage(browser, emailB)
  try {
    await b.page.goto(`/admin/content/${storyId}`)
    await b.page.getByLabel('Title').fill(titleTwo)
    await b.page.getByRole('button', { name: 'Save private draft' }).click()
    await expect(b.page.getByText('Status: published with newer private draft')).toBeVisible()

    await b.page.getByRole('button', { name: 'Replace photograph…' }).click()
    const panel = b.page.locator('[aria-label^="Replace photograph in"]')
    await panel.getByLabel('Eligible unattached photograph').selectOption(newMediaId)
    await panel.getByRole('button', { name: 'Review replacement…' }).click()
    await panel.getByRole('button', { name: 'Confirm replacement' }).click()
    await expect(b.page.getByRole('status').filter({ hasText: 'Photograph replaced.' })).toBeVisible()

    await expectPublished(browser, titleOne, oldAlt, newAlt)

    await b.page.getByRole('button', { name: 'Publish new revision' }).click()
    await expect(b.page.getByText('Status: published')).toBeVisible()
    await expectPublished(browser, titleTwo, newAlt, oldAlt)

    const revisions = await db.from('content_revisions')
      .select('id, revision_number, created_by, title, created_at')
      .eq('content_item_id', storyId)
      .order('revision_number', { ascending: true })
    expect(revisions.error).toBeNull()
    expect(revisions.data).toHaveLength(2)
    expect(revisions.data?.map(r => [r.revision_number, r.created_by, r.title])).toEqual([
      [1, adminA, titleOne],
      [2, adminB, titleTwo],
    ])
    const rev1 = revisions.data![0].id
    const rev2 = revisions.data![1].id
    const snapshots = await db.from('content_revision_media').select('revision_id, media_id').in('revision_id', [rev1, rev2])
    expect(snapshots.error).toBeNull()
    expect(snapshots.data).toEqual(expect.arrayContaining([
      { revision_id: rev1, media_id: oldMediaId },
      { revision_id: rev2, media_id: newMediaId },
    ]))
    const item = await db.from('content_items').select('active_published_revision_id').eq('id', storyId).single()
    expect(item.error).toBeNull()
    expect(item.data.active_published_revision_id).toBe(rev2)

    await b.page.getByRole('button', { name: 'Unpublish' }).click()
    await expect(b.page.getByText('Status: draft')).toBeVisible()
  } finally {
    await b.context.close()
  }

  const viewer = await newViewerPage(browser)
  try {
    const response = await viewer.page.goto(`/chapters/${slug}`)
    expect(response?.status()).toBe(404)
    await expect(viewer.page.getByText(titleTwo)).toHaveCount(0)
  } finally {
    await viewer.context.close()
  }
})
