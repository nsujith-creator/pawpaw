import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { makeViewerCookieValue } from './viewer-session'

const evidenceDir = join(process.cwd(), 'docs', 'visual-proof', 'stage3-runtime')
let viewerCookie: string | null = null

test.beforeAll(async () => {
  viewerCookie = await makeViewerCookieValue()
})

async function authenticate(page: Page) {
  await page.context().addCookies([{
    name: 'pawpaw_viewer',
    value: viewerCookie!,
    domain: 'localhost',
    path: '/',
  }])
}

async function waitForVisuals(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(image => image.complete
      ? Promise.resolve()
      : new Promise<void>(resolve => image.addEventListener('load', () => resolve(), { once: true }))))
  })
}

async function capture(page: Page, fileName: string) {
  await waitForVisuals(page)
  await page.screenshot({ path: join(evidenceDir, fileName), fullPage: true, animations: 'disabled' })
}

async function expectFamilyChrome(page: Page, sceneAsset: string) {
  await expect(page.locator('[data-private-surface="family"]')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Family navigation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Leave' })).toBeVisible()
  const scene = page.locator(`img[src*="${sceneAsset}"]`)
  await expect(scene).toBeVisible()
  await expect(scene).toHaveAttribute('alt', '')
  await expect(scene).toHaveAttribute('aria-hidden', 'true')
  await expect(page.locator('img[src*="varada-wonder"], img[src*="varada-sleepy"], img[src*="varada-delight"]')).toHaveCount(0)
}

test('Stage 3 authenticated Family Home and Chapters visual proof is read-only', async ({ page }) => {
  test.skip(!viewerCookie, 'Skipping: no local viewer cookie signing configuration is available')
  mkdirSync(evidenceDir, { recursive: true })
  await authenticate(page)

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expectFamilyChrome(page, 'varada-base-wave-alpha')

  const gallery = page.locator('section[aria-label$="photo gallery"]')
  const photo = gallery.locator('img[data-media-id]')
  await expect(photo).toBeVisible()
  await expect(photo).toHaveAttribute('alt', /\S/)
  await expect(gallery.locator(':scope > p')).toContainText(/\S/)
  await expect(photo).toHaveCSS('object-fit', 'contain')

  const photoSrc = await photo.getAttribute('src')
  await page.waitForTimeout(900)
  expect(await photo.getAttribute('src')).toBe(photoSrc)
  await capture(page, 'family-home-1440.png')

  await page.setViewportSize({ width: 375, height: 812 })
  await capture(page, 'family-home-375.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/chapters')
  await expectFamilyChrome(page, 'varada-reader-alpha')
  await expect(page.getByRole('heading', { level: 1, name: 'Chapters' })).toBeVisible()
  const covers = page.locator('a[href^="/chapters/"] img')
  for (let index = 0; index < await covers.count(); index += 1) {
    await expect(covers.nth(index)).toHaveAttribute('alt', /\S/)
    await expect(covers.nth(index)).toHaveCSS('object-fit', 'contain')
  }
  await capture(page, 'chapters-1440.png')

  await page.setViewportSize({ width: 375, height: 812 })
  await capture(page, 'chapters-375.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0)

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expectFamilyChrome(page, 'varada-base-wave-alpha')
  await expect(page.locator('img[src*="varada-base-wave-alpha"]')).toHaveCSS('animation-name', 'none')
  await capture(page, 'family-home-reduced-motion.png')
})
