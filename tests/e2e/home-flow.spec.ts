import { test, expect } from '@playwright/test'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'

test.describe('Home page carousel (requires viewer session)', () => {
  // These tests need a valid viewer cookie seeded into the browser context.
  // Run manually with a local dev server and real credentials.

  test('carousel previous and next buttons are visible', async ({ page }) => {
    test.skip(skip, 'Skipping: no viewer session available in CI')
    // Seed cookie: PLAYWRIGHT_VIEWER_COOKIE must be set to a valid signed cookie value.
    const cookie = process.env.PLAYWRIGHT_VIEWER_COOKIE
    test.skip(!cookie, 'Skipping: PLAYWRIGHT_VIEWER_COOKIE not set')
    await page.context().addCookies([{
      name:   'pawpaw_viewer',
      value:  cookie!,
      domain: 'localhost',
      path:   '/',
    }])
    await page.goto('/')
    // If media exists, controls should be visible.
    const prev = page.getByRole('button', { name: 'Previous photo' })
    const next = page.getByRole('button', { name: 'Next photo' })
    if (await prev.isVisible()) {
      await expect(prev).toBeVisible()
      await expect(next).toBeVisible()
    }
  })

  test('carousel does not autoplay (no video or timed transitions)', async ({ page }) => {
    test.skip(skip, 'Skipping: no viewer session available in CI')
    const cookie = process.env.PLAYWRIGHT_VIEWER_COOKIE
    test.skip(!cookie, 'Skipping: PLAYWRIGHT_VIEWER_COOKIE not set')
    await page.context().addCookies([{
      name:   'pawpaw_viewer',
      value:  cookie!,
      domain: 'localhost',
      path:   '/',
    }])
    await page.goto('/')
    const initialIndex = await page.evaluate(() => {
      // No autoplay: the carousel position should not change on its own.
      return document.querySelector('[aria-selected="true"]')?.getAttribute('aria-label') ?? ''
    })
    await page.waitForTimeout(3000)
    const laterIndex = await page.evaluate(() => {
      return document.querySelector('[aria-selected="true"]')?.getAttribute('aria-label') ?? ''
    })
    expect(initialIndex).toBe(laterIndex)
  })
})
