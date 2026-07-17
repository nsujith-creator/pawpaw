import { test, expect } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

// These tests require a running dev server with real Supabase credentials.
// They are skipped when PLAYWRIGHT_SKIP_AUTH is set.

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'

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
})

test.describe('admin login page', () => {
  test('renders email and password fields', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available')
    await page.goto('/admin/login')
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
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
