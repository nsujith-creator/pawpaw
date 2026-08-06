import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
let db: SupabaseClient
let slug = ''

async function setViewerCookie(page: Page, value: string) {
  await page.context().addCookies([{ name: 'pawpaw_viewer', value, url: baseURL }])
}

async function installExposureDetector(page: Page) {
  await page.addInitScript(() => {
    const detect = () => {
      if (sessionStorage.getItem('pawpaw-reverification-logout') !== '1') return
      if (document.querySelector('[data-private-surface="family"]') && getComputedStyle(document.body).visibility !== 'hidden') {
        sessionStorage.setItem('pawpaw-reverification-exposed', '1')
      }
    }
    window.addEventListener('pageshow', detect)
    new MutationObserver(detect).observe(document, { attributes: true, childList: true, subtree: true })
  })
}

test.describe('published Chapters detail re-verification', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 })

  test.beforeAll(async ({}, testInfo) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const host = new URL(url).hostname
    if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Rejected non-local Supabase host: ${host}`)
    db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const run = `pawpaw-test-browser-${testInfo.project.name}-${randomUUID().slice(0, 8)}`
    slug = `${run}-story`
    const user = await db.auth.admin.createUser({
      email: `${run}-admin@example.invalid`,
      password: `Pawpaw-${randomUUID()}!aA1`,
      email_confirm: true,
      user_metadata: { pawpaw_test_fixture: true, repository: 'pawpaw', run_id: run, suite: 'browser-reverification' },
    })
    if (user.error || !user.data.user) throw user.error ?? new Error('Browser fixture admin was not created')
    const adminId = user.data.user.id
    const allowed = await db.from('admin_users').insert({ user_id: adminId, display_name: 'Synthetic browser admin', active: true })
    if (allowed.error) throw allowed.error
    const story = await db.from('content_items').insert({
      type: 'story', slug, title: 'A synthetic published chapter',
      summary: 'Non-private browser fixture',
      body_blocks: [{ type: 'paragraph', text: 'Private detail rendered through the real application path.' }],
      status: 'draft', created_by: adminId, updated_by: adminId,
    }).select('id').single()
    if (story.error) throw story.error
    const published = await db.rpc('publish_content_revision', { p_admin_id: adminId, p_content_id: story.data.id })
    if (published.error) throw published.error
  })

  test('renders the published detail and hides it on logout then immediate Back', async ({ page }) => {
    const cookie = await makeViewerCookieValue()
    expect(cookie).not.toBeNull()
    await installExposureDetector(page)
    await page.goto('/family-login')
    await setViewerCookie(page, cookie!)
    const response = await page.goto(`/chapters/${slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'A synthetic published chapter' })).toBeVisible()
    await expect(page.getByText('Private detail rendered through the real application path.')).toBeVisible()
    await expect(page.locator('[data-private-surface="family"]')).toBeVisible()

    const logoutResponse = page.waitForResponse(r => r.url().endsWith('/logout/viewer') && r.request().method() === 'POST')
    await page.getByRole('button', { name: 'Leave' }).click()
    expect((await logoutResponse).status()).toBe(303)
    await expect(page).toHaveURL(/\/family-login$/)
    await page.evaluate(() => sessionStorage.setItem('pawpaw-reverification-logout', '1'))
    await page.goBack()
    await expect(page).toHaveURL(/\/family-login$/)
    expect(await page.evaluate(() => sessionStorage.getItem('pawpaw-reverification-exposed'))).toBeNull()
    expect(await page.locator('[data-private-surface="family"]').count()).toBe(0)
    expect(await page.getByText('Private detail rendered through the real application path.').count()).toBe(0)
  })
})
