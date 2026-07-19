import { test, expect, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'

let cookie: string | null = null

test.beforeAll(async () => {
  cookie = await makeViewerCookieValue()
})

async function seedViewerSession(page: Page) {
  await page.context().addCookies([{
    name: 'pawpaw_viewer', value: cookie!, domain: 'localhost', path: '/',
  }])
}

test.describe('Home page carousel (requires viewer session)', () => {
  test('all six photographs retain visible arrows and position controls', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Previous photo' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next photo' })).toBeVisible()
    await expect(page.getByRole('tab')).toHaveCount(6)
  })

  test('viewer page offers a Leave control that ends the session', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    const leave = page.getByRole('button', { name: 'Leave' })
    await expect(leave).toBeVisible()
    const loginResponsePromise = page.waitForResponse(
      response => response.url().endsWith('/family-login'),
    )
    await leave.click()
    const loginResponse = await loginResponsePromise
    expect(loginResponse.request().method()).toBe('GET')
    expect(loginResponse.status()).toBe(200)
    await expect(page).toHaveURL(/\/family-login/)
    await page.goto('/')
    await expect(page).toHaveURL(/\/family-login/)
  })

  test('family page never overflows at 320px and all controls meet 44px', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await page.setViewportSize({ width: 320, height: 800 })
    await seedViewerSession(page)
    await page.goto('/')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    await expect(page.getByRole('tablist', { name: 'Photo position' })).toBeVisible()
    const controls = page.locator('main button')
    for (let index = 0; index < await controls.count(); index += 1) {
      const box = await controls.nth(index).boundingBox()
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    }
  })

  test('dots, keyboard arrows, and swipe each change the active photograph', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')

    const gallery = page.locator('section[aria-label$="photo gallery"]')
    const selected = page.locator('[role="tab"][aria-selected="true"]')
    await page.getByRole('tab', { name: 'Photo 2' }).click()
    await expect(selected).toHaveAttribute('aria-label', 'Photo 2')

    await gallery.focus()
    await gallery.press('ArrowRight')
    await expect(selected).toHaveAttribute('aria-label', 'Photo 3')
    await gallery.press('ArrowLeft')
    await expect(selected).toHaveAttribute('aria-label', 'Photo 2')

    const frame = gallery.getByRole('img').first().locator('..')
    await frame.dispatchEvent('touchstart', { touches: [{ identifier: 1, clientX: 280 }] })
    await frame.dispatchEvent('touchend', { changedTouches: [{ identifier: 1, clientX: 180 }] })
    await expect(selected).toHaveAttribute('aria-label', 'Photo 3')
  })

  test('primary photographs remain contained and controls sit below the image', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')

    const primary = page.getByRole('img').first()
    await expect(primary).toHaveCSS('object-fit', 'contain')
    const imageBox = await primary.boundingBox()
    const previousBox = await page.getByRole('button', { name: 'Previous photo' }).boundingBox()
    const nextBox = await page.getByRole('button', { name: 'Next photo' }).boundingBox()
    expect(imageBox).not.toBeNull()
    expect(previousBox?.y ?? 0).toBeGreaterThanOrEqual((imageBox?.y ?? 0) + (imageBox?.height ?? 0))
    expect(nextBox?.y ?? 0).toBeGreaterThanOrEqual((imageBox?.y ?? 0) + (imageBox?.height ?? 0))
  })

  test('carousel does not autoplay', async ({ page }) => {
    test.skip(skip, 'Skipping: no server available in CI')
    test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
    await seedViewerSession(page)
    await page.goto('/')
    const selected = page.locator('[aria-selected="true"]')
    await expect(selected).toHaveCount(1)
    const initial = await selected.getAttribute('aria-label')
    await page.waitForTimeout(3000)
    expect(await selected.getAttribute('aria-label')).toBe(initial)
  })
})

test.describe('family passphrase login flow', () => {
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
