import { test, expect, type Page } from '@playwright/test'
import { signViewerCookie } from '../../src/lib/auth/viewer-cookie'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

function viewerSigningConfig(): { secret: string; version: number } | null {
  const env = loadEnvLocal()
  const secret = process.env.VIEWER_COOKIE_SECRET ?? env.VIEWER_COOKIE_SECRET
  const version = Number(process.env.VIEWER_SESSION_VERSION ?? env.VIEWER_SESSION_VERSION ?? NaN)
  return secret && Number.isSafeInteger(version) && version > 0 ? { secret, version } : null
}

async function setViewerCookie(page: Page, value: string) {
  await page.context().addCookies([{
    name: 'pawpaw_viewer',
    value,
    url: baseURL,
  }])
}

async function installExposureDetector(page: Page) {
  await page.addInitScript(() => {
    const logoutComplete = 'pawpaw-stage1-logout-complete'
    const exposed = 'pawpaw-stage1-private-exposed'
    const detect = () => {
      if (sessionStorage.getItem(logoutComplete) !== '1') return
      const privateSurface = document.querySelector('[data-private-surface="family"]')
      if (privateSurface && getComputedStyle(document.body).visibility !== 'hidden') {
        sessionStorage.setItem(exposed, '1')
      }
    }
    window.addEventListener('pageshow', detect)
    new MutationObserver(detect).observe(document, { attributes: true, childList: true, subtree: true })
  })
}

async function logoutAndProveHistoryPrivacy(page: Page, protectedPath: string) {
  await expect(page.locator('[data-private-surface="family"]')).toBeVisible()
  const logoutResponse = page.waitForResponse(
    response => response.url().endsWith('/logout/viewer') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Leave' }).click()
  expect((await logoutResponse).status()).toBe(303)
  await expect(page).toHaveURL(/\/family-login$/)
  await page.evaluate(() => sessionStorage.setItem('pawpaw-stage1-logout-complete', '1'))

  await page.goBack()
  await expect(page).toHaveURL(/\/family-login$/)
  expect(await page.evaluate(() => sessionStorage.getItem('pawpaw-stage1-private-exposed'))).toBeNull()
  expect(await page.locator('[data-private-surface="family"]').count()).toBe(0)
  expect(await page.getByRole('button', { name: 'Leave' }).count()).toBe(0)

  await page.reload()
  await expect(page).toHaveURL(/\/family-login$/)
  await page.goto(protectedPath)
  await expect(page).toHaveURL(/\/family-login$/)
}

test.describe('read-only Chapters privacy', () => {
  test('unauthenticated index and detail expose no private HTML', async ({ page, request }) => {
    await page.context().clearCookies()
    for (const path of ['/chapters', '/chapters/private-example']) {
      const response = await request.get(path, { maxRedirects: 0 })
      expect(response.status()).toBe(307)
      expect(response.headers().location).toContain('/family-login')
      const body = await response.text()
      expect(body).not.toContain('Private family archive')
      expect(body).not.toContain('data-private-surface="family"')
    }
  })

  test('forged, expired, and wrong-version viewer cookies fail closed', async ({ page }) => {
    const signing = viewerSigningConfig()
    test.skip(!signing, 'Viewer signing configuration is unavailable')

    const realNow = Date.now
    let expired: string
    try {
      Date.now = () => realNow() - 31 * 24 * 60 * 60 * 1000
      expired = await signViewerCookie(signing!.secret, signing!.version)
    } finally {
      Date.now = realNow
    }
    const wrongVersion = await signViewerCookie(signing!.secret, signing!.version + 1)

    for (const cookie of ['forged.viewer-cookie', expired, wrongVersion]) {
      await setViewerCookie(page, cookie)
      await page.goto('/chapters')
      await expect(page).toHaveURL(/\/family-login$/)
      expect(await page.locator('[data-private-surface="family"]').count()).toBe(0)
      await page.context().clearCookies()
    }
  })

  test('a valid viewer receives private Chapters response headers', async ({ page }) => {
    const cookie = await makeViewerCookieValue()
    test.skip(!cookie, 'Viewer signing configuration is unavailable')
    await setViewerCookie(page, cookie!)
    const response = await page.goto('/chapters')
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Chapters' })).toBeVisible()
    expect(response?.headers()['cache-control']).toBe('private, no-store, no-cache, max-age=0, must-revalidate')
    expect(response?.headers()['x-robots-tag']).toBe('noindex, nofollow, noarchive')
  })

  test('logout then immediate Back cannot expose the Chapters index', async ({ page }) => {
    const cookie = await makeViewerCookieValue()
    test.skip(!cookie, 'Viewer signing configuration is unavailable')
    await installExposureDetector(page)
    await page.goto('/family-login')
    await setViewerCookie(page, cookie!)
    await page.goto('/chapters')
    await expect(page.getByRole('heading', { level: 1, name: 'Chapters' })).toBeVisible()
    await logoutAndProveHistoryPrivacy(page, '/chapters')
  })

  test('logout then immediate Back cannot expose a published chapter detail', async ({ page }) => {
    const cookie = await makeViewerCookieValue()
    test.skip(!cookie, 'Viewer signing configuration is unavailable')
    await installExposureDetector(page)
    await page.goto('/family-login')
    await setViewerCookie(page, cookie!)
    await page.goto('/chapters')
    const links = page.locator('a[href^="/chapters/"]')
    test.skip(await links.count() === 0, 'No published non-Letter chapter is available for a read-only detail test')
    const href = await links.first().getAttribute('href')
    await page.goto(href!)
    await expect(page.locator('[data-private-surface="family"]')).toBeVisible()
    await logoutAndProveHistoryPrivacy(page, href!)
  })

  test('the shared guard also protects First Days after logout', async ({ page }) => {
    const cookie = await makeViewerCookieValue()
    test.skip(!cookie, 'Viewer signing configuration is unavailable')
    await installExposureDetector(page)
    await page.goto('/family-login')
    await setViewerCookie(page, cookie!)
    await page.goto('/first-days')
    await expect(page.getByRole('heading', { level: 1, name: 'First Days' })).toBeVisible()
    await logoutAndProveHistoryPrivacy(page, '/first-days')
  })
})
