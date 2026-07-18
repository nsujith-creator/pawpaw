import { randomUUID } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { test, expect } from '@playwright/test'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'
import { fixtureEmail, fixtureMetadata } from '../integration/fixture-names'

// These tests require a running dev server with real Supabase credentials.
// They are skipped when PLAYWRIGHT_SKIP_AUTH is set.

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'
const adminPassword = `Pawpaw-${randomUUID()}!aA1`
let adminDb: SupabaseClient | null = null
let adminUserId: string | null = null
let adminEmail: string | null = null

test.beforeAll(async () => {
  if (skip) return
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  adminDb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  adminEmail = fixtureEmail('e2e-logout', 'admin')
  const created = await adminDb.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: fixtureMetadata('e2e-logout'),
  })
  if (created.error || !created.data.user) {
    throw created.error ?? new Error('Admin logout fixture user was not created')
  }
  adminUserId = created.data.user.id
  const allowlisted = await adminDb.from('admin_users').insert({
    user_id: adminUserId,
    display_name: 'Pawpaw E2E logout admin',
    active: true,
  })
  if (allowlisted.error) throw allowlisted.error
})

test.afterAll(async () => {
  if (!adminDb || !adminUserId) return
  const allowlist = await adminDb.from('admin_users').delete().eq('user_id', adminUserId)
  if (allowlist.error) throw allowlist.error
  const deleted = await adminDb.auth.admin.deleteUser(adminUserId)
  if (deleted.error) throw deleted.error
})

test.describe('unauthenticated access', () => {
  test('/ redirects to /family-login when no viewer cookie is present', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-login/)
  })

  test('/admin redirects to /admin/login when no admin session is present', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.context().clearCookies()
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})

test.describe('family login page', () => {
  test('renders a passphrase input at 375px width', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/family-login')
    await expect(page.getByLabel('Passphrase')).toBeVisible()
  })

  test('rejects an incorrect passphrase and stays on the login page', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.goto('/family-login')
    await page.getByLabel('Passphrase').fill('wrong-passphrase-12345')
    await page.getByRole('button', { name: 'Enter' }).click()
    await expect(page).toHaveURL(/\/family-login/)
  })

  test('authenticated Leave redirects with GET and keeps the family route closed', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    const viewerCookie = await makeViewerCookieValue()
    test.skip(!viewerCookie, 'Skipping: no viewer cookie could be derived')
    await page.context().addCookies([{
      name: 'pawpaw_viewer',
      value: viewerCookie!,
      url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    }])
    await page.goto('/')

    const loginResponsePromise = page.waitForResponse(
      response => response.url().endsWith('/family-login'),
    )
    await page.getByRole('button', { name: 'Leave' }).click()
    const loginResponse = await loginResponsePromise
    expect(loginResponse.request().method()).toBe('GET')
    expect(loginResponse.status()).toBe(200)
    await expect(page).toHaveURL(/\/family-login/)

    await page.goBack()
    await page.reload()
    await expect(page).toHaveURL(/\/family-login/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-login/)
  })
})

test.describe('admin login page', () => {
  test('renders email and password fields', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.goto('/admin/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
  })

  test('authenticated Sign out redirects with GET and keeps admin routes closed', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    test.skip(!adminEmail, 'Skipping: no admin fixture could be created')
    await page.goto('/admin/login')
    await page.getByLabel('Email').fill(adminEmail!)
    await page.getByLabel('Password').fill(adminPassword)
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/admin$/)

    const loginResponsePromise = page.waitForResponse(
      response => response.url().endsWith('/admin/login'),
    )
    await page.getByRole('button', { name: 'Sign out' }).click()
    const loginResponse = await loginResponsePromise
    expect(loginResponse.request().method()).toBe('GET')
    expect(loginResponse.status()).toBe(200)
    await expect(page).toHaveURL(/\/admin\/login/)

    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login/)
  })
})

test.describe('security headers', () => {
  test('protected pages include X-Robots-Tag header', async ({ request }) => {
    test.skip(skip, 'Skipping: no server available')
    const cookie = await makeViewerCookieValue()
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    const res = await request.get('/', {
      headers: { cookie: `pawpaw_viewer=${cookie}` },
      maxRedirects: 0,
    })
    expect(res.status()).toBe(200)
    expect(res.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive')
  })
})
