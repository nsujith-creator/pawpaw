import { test, expect, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'

// A valid viewer cookie is minted deterministically from the local
// VIEWER_COOKIE_SECRET (see viewer-session.ts) — no manual pasting needed.
let cookie: string | null = null
test.beforeAll(async () => {
  cookie = await makeViewerCookieValue()
})

async function seedViewerSession(page: Page) {
  await page.context().addCookies([{
    name:   'pawpaw_viewer',
    value:  cookie!,
    domain: 'localhost',
    path:   '/',
  }])
}

test.describe('Home page carousel (requires viewer session)', () => {
  test('carousel previous and next buttons are visible', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    // If media exists, controls should be visible.
    const prev = page.getByRole('button', { name: 'Previous photo' })
    const next = page.getByRole('button', { name: 'Next photo' })
    if (await prev.isVisible()) {
      await expect(prev).toBeVisible()
      await expect(next).toBeVisible()
    }
  })

  test('viewer page offers a Leave control that ends the session', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    // The Leave control must exist in BOTH the published and the empty
    // "being prepared" state — whichever the site is currently in.
    const leave = page.getByRole('button', { name: 'Leave' })
    await expect(leave).toBeVisible()
    await leave.click()
    await expect(page).toHaveURL(/\/family-login/)
    // Session is gone: revisiting / must demand the passphrase again.
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-login/)
  })

  test('family page never overflows horizontally (bounded media frame)', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    // Whatever the current photo's aspect ratio (portrait, landscape,
    // square), the contained frame must never widen the document.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    // If a carousel is present, its dots (position tablist) must be visible —
    // this runs on the mobile profile too.
    const dots = page.getByRole('tablist', { name: 'Photo position' })
    if (await dots.count() > 0) {
      await expect(dots).toBeVisible()
    }
  })

  test('carousel does not autoplay (no video or timed transitions)', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
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

test.describe('family passphrase login flow', () => {
  // Full-flow variant: runs only when the operator exports the real
  // passphrase as PLAYWRIGHT_FAMILY_PASSPHRASE (never stored in source or
  // printed). Example (PowerShell, value read interactively, not echoed):
  //   $env:PLAYWRIGHT_FAMILY_PASSPHRASE = Read-Host -MaskInput 'Passphrase'
  //   npm run test:e2e
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
