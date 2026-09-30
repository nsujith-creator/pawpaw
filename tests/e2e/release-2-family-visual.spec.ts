import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'
const evidenceDir = join(process.cwd(), 'test-results', 'release-2-family-evidence')
const expectedManifest = {
  name: 'Pawpaw',
  short_name: 'Pawpaw',
  description: 'A private family archive.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#FFC93C',
  theme_color: '#FFC93C',
  icons: [
    { src: '/icons/pawpaw-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/pawpaw-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icons/pawpaw-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}
let cookie: string | null = null

test.beforeAll(async () => {
  cookie = await makeViewerCookieValue()
})

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One deterministic evidence set covers both declared viewports')
  mkdirSync(evidenceDir, { recursive: true })
})

async function seedViewerSession(page: Page): Promise<void> {
  await page.context().addCookies([{
    name: 'pawpaw_viewer',
    value: cookie!,
    domain: 'localhost',
    path: '/',
  }])
}

async function waitForVisuals(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(image => {
      if (image.complete) return Promise.resolve()
      return new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true })
        image.addEventListener('error', () => resolve(), { once: true })
      })
    }))
  })
}

async function capture(page: Page, fileName: string): Promise<void> {
  await waitForVisuals(page)
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({
    path: join(evidenceDir, fileName),
    fullPage: true,
    animations: 'disabled',
  })
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

async function expectMinimumTargets(page: Page): Promise<void> {
  const interactive = page.locator('main button, main input:not([type="hidden"])')
  for (let index = 0; index < await interactive.count(); index += 1) {
    const box = await interactive.nth(index).boundingBox()
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
}

function trackBrowserFailures(page: Page) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []

  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', error => pageErrors.push(error.message))
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim())
  })

  return () => {
    expect(consoleErrors, 'browser console errors').toEqual([])
    expect(pageErrors, 'uncaught page errors').toEqual([])
    expect(failedRequests, 'failed browser requests').toEqual([])
  }
}

async function expectPwaHeadAndAssets(page: Page): Promise<void> {
  const manifestLink = page.locator('link[rel="manifest"]')
  await expect(manifestLink).toHaveCount(1)
  const manifestHref = await manifestLink.getAttribute('href')
  expect(manifestHref).toBeTruthy()

  const iconHrefs = await page.locator('link[rel~="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll(links => links.map(link => (link as HTMLLinkElement).href))
  expect(iconHrefs.some(href => new URL(href).pathname === '/favicon.ico')).toBe(true)
  expect(iconHrefs.some(href => new URL(href).pathname === '/icon.svg')).toBe(true)
  expect(iconHrefs.some(href => new URL(href).pathname === '/apple-icon.png')).toBe(true)

  for (const href of [manifestHref!, ...iconHrefs]) {
    const response = await page.request.get(new URL(href, page.url()).toString())
    expect(response.status(), href).toBe(200)
  }

  for (const path of [
    '/icons/pawpaw-192.png',
    '/icons/pawpaw-512.png',
    '/icons/pawpaw-maskable-512.png',
  ]) {
    expect((await page.request.get(path)).status(), path).toBe(200)
  }

  const manifestResponse = await page.request.get(new URL(manifestHref!, page.url()).toString())
  expect(await manifestResponse.json()).toEqual(expectedManifest)
}

async function expectDatelinePresentation(page: Page): Promise<void> {
  const dateline = page.getByText('Written 19 July 2026 · V was 7 weeks and 2 days old', { exact: true })
  await expect(dateline).toBeVisible()
  const dateTime = await dateline.locator('time').getAttribute('datetime')
  expect(new Date(dateTime!).toISOString()).toBe('2026-07-19T13:28:44.637Z')
  await expect(page.locator('main time')).toHaveCount(1)

  const presentation = await dateline.evaluate(element => {
    function channels(value: string): number[] {
      return value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []
    }
    function luminance(rgb: number[]): number {
      const linear = rgb.map(channel => {
        const normalized = channel / 255
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
    }
    const style = getComputedStyle(element)
    const foreground = luminance(channels(style.color))
    const background = luminance(channels(getComputedStyle(document.body).backgroundColor))
    const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
    return { fontSize: Number.parseFloat(style.fontSize), contrast }
  })
  expect(presentation.fontSize).toBeGreaterThanOrEqual(15)
  expect(presentation.contrast).toBeGreaterThanOrEqual(4.5)
}

test('Unauthenticated manifest access preserves every protected route boundary', async ({ request }) => {
  test.skip(skip, 'Skipping: no server available')

  const manifestResponse = await request.get('/manifest.webmanifest', { maxRedirects: 0 })
  expect(manifestResponse.status()).toBe(200)
  expect(manifestResponse.headers()['location']).toBeUndefined()
  expect(manifestResponse.headers()['content-type']).toMatch(
    /^(?:application\/manifest\+json|application\/json)(?:;|$)/,
  )
  expect(await manifestResponse.json()).toEqual(expectedManifest)

  for (const path of ['/', '/first-days']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(307)
    expect(new URL(response.headers()['location'], 'http://pawpaw.local').pathname, path).toBe('/family-login')
  }

  for (const path of ['/admin', '/admin/home', '/admin/media']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status(), path).toBe(307)
    expect(new URL(response.headers()['location'], 'http://pawpaw.local').pathname, path).toBe('/admin/login')
  }
})

test('Family login visual foundation at 1440px and 375px', async ({ page }) => {
  test.skip(skip, 'Skipping: no server available')
  const expectNoBrowserFailures = trackBrowserFailures(page)
  const thirdPartyFontRequests: string[] = []
  page.on('request', request => {
    if (/fonts\.(?:googleapis|gstatic)\.com/.test(request.url())) {
      thirdPartyFontRequests.push(request.url())
    }
  })

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/family-login')
  await expectPwaHeadAndAssets(page)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("Varada's World")
  await expect(page.getByLabel('Passphrase')).toBeVisible()

  const fonts = await page.evaluate(() => ({
    display: getComputedStyle(document.documentElement).getPropertyValue('--font-display'),
    body: getComputedStyle(document.documentElement).getPropertyValue('--font-body'),
    malayalam: getComputedStyle(document.documentElement).getPropertyValue('--font-malayalam'),
    headingFamily: getComputedStyle(document.querySelector('h1')!).fontFamily,
    bodyFamily: getComputedStyle(document.body).fontFamily,
    homePrimary: getComputedStyle(document.documentElement).getPropertyValue('--color-home-primary').trim(),
  }))
  expect(fonts.display.toLowerCase()).toContain('fraunces')
  expect(fonts.body.toLowerCase()).toContain('manrope')
  expect(fonts.malayalam.toLowerCase()).toContain('noto')
  expect(fonts.headingFamily.toLowerCase()).toContain('fraunces')
  expect(fonts.bodyFamily.toLowerCase()).toContain('manrope')
  expect(fonts.homePrimary.toLowerCase()).toBe('#e8526a')
  expect(thirdPartyFontRequests).toEqual([])

  await page.getByLabel('Passphrase').focus()
  const focus = await page.getByLabel('Passphrase').evaluate(element => {
    const style = getComputedStyle(element)
    return { width: Number.parseFloat(style.outlineWidth), style: style.outlineStyle }
  })
  expect(focus.width).toBeGreaterThanOrEqual(2)
  expect(focus.style).not.toBe('none')
  await capture(page, 'family-login-1440.png')

  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoHorizontalOverflow(page)
  await expectMinimumTargets(page)
  await capture(page, 'family-login-375.png')

  await page.setViewportSize({ width: 320, height: 800 })
  await expectNoHorizontalOverflow(page)
  await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
  expectNoBrowserFailures()
})

test('Authenticated Home visual foundation, reflow, focus, and privacy', async ({ page }) => {
  test.skip(skip, 'Skipping: no server available')
  test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
  const expectNoBrowserFailures = trackBrowserFailures(page)
  await seedViewerSession(page)

  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')
  await expectPwaHeadAndAssets(page)
  await expect(page.locator('[data-private-surface="family"]')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
  await expectDatelinePresentation(page)
  await expect(page.getByRole('tab')).toHaveCount(6)
  await expect(page.getByRole('img').first()).toHaveCSS('object-fit', 'contain')
  await expect(page.locator('header').getByRole('button', { name: 'Leave' })).toBeVisible()
  await expect(page.locator('main').getByRole('button', { name: 'Leave' })).toHaveCount(0)
  await capture(page, 'home-authenticated-1440.png')

  const visibleText = await page.locator('body').innerText()
  expect(visibleText).not.toMatch(/storage\/v1\/object\/sign|service[_-]?role|token=/i)
  await expect(page.locator('a[href*="/storage/v1/object/sign/"]')).toHaveCount(0)

  const frameBox = await page.getByRole('img').first().locator('..').boundingBox()
  const character = page.locator('img[src*="varada-base-wave-alpha"]')
  await expect(character).toBeVisible()
  await expect(character).toHaveAttribute('alt', '')
  await expect(character).toHaveAttribute('aria-hidden', 'true')
  const characterBox = await character.boundingBox()
  expect(frameBox).not.toBeNull()
  expect(characterBox).not.toBeNull()
  const overlap = !(
    (frameBox!.x + frameBox!.width) <= characterBox!.x
      || (characterBox!.x + characterBox!.width) <= frameBox!.x
      || (frameBox!.y + frameBox!.height) <= characterBox!.y
      || (characterBox!.y + characterBox!.height) <= frameBox!.y
  )
  expect(overlap).toBe(false)
  expect(frameBox!.width).toBeGreaterThan(650)

  await page.setViewportSize({ width: 375, height: 812 })
  await expectNoHorizontalOverflow(page)
  await expectDatelinePresentation(page)
  await expectMinimumTargets(page)
  const tabRows = await page.getByRole('tab').evaluateAll(tabs => (
    tabs.map(tab => Math.round(tab.getBoundingClientRect().top))
  ))
  expect(new Set(tabRows)).toHaveProperty('size', 1)
  const next = page.getByRole('button', { name: 'Next photo' })
  await next.focus()
  const outlineWidth = await next.evaluate(element => Number.parseFloat(getComputedStyle(element).outlineWidth))
  expect(outlineWidth).toBeGreaterThanOrEqual(2)
  const mobileFrame = await page.getByRole('img').first().locator('..').boundingBox()
  const mobileControls = await page.getByRole('button', { name: 'Next photo' }).locator('..').boundingBox()
  expect(mobileFrame).not.toBeNull()
  expect(mobileControls).not.toBeNull()
  expect(mobileControls!.y - (mobileFrame!.y + mobileFrame!.height)).toBeLessThanOrEqual(12)
  await capture(page, 'home-authenticated-375.png')

  const proseLength = (await page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) }).innerText()).length
  if (proseLength >= 300) {
    await capture(page, 'home-long-prose-375.png')
  }

  await page.setViewportSize({ width: 320, height: 800 })
  await expectNoHorizontalOverflow(page)
  await expectDatelinePresentation(page)

  await page.setViewportSize({ width: 640, height: 900 })
  await page.evaluate(() => { document.body.style.zoom = '2' })
  await expectNoHorizontalOverflow(page)
  await expectDatelinePresentation(page)
  for (const buttonName of ['Previous photo', 'Next photo', 'Leave']) {
    const box = await page.getByRole('button', { name: buttonName }).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(640)
  }
  expectNoBrowserFailures()
})

test('Home evidence includes all six approved exact-crop photographs', async ({ page }) => {
  test.skip(skip, 'Skipping: no server available')
  test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
  await seedViewerSession(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  const tabs = page.getByRole('tab')
  expect(await tabs.count()).toBe(6)

  const expected = [
    { id: 'd7092bde-2fa6-4513-824b-adb658cf31b9', width: 1254, height: 1254, fileName: 'home-slide-01-noolukettu.png' },
    { id: '6100b5f8-ab7e-44c8-92bd-62c96ab29f8e', width: 1122, height: 1402, fileName: 'home-slide-02-sleepy-close-up.png' },
    { id: 'a8b3aad4-2766-4598-9329-a50fdd582a2f', width: 1088, height: 1445, fileName: 'home-slide-03-natural-phone-photo.png' },
    { id: '82122c79-b888-4eec-bcfb-cc3636ff38c7', width: 864, height: 1536, fileName: 'home-slide-04-one-month-cake.png' },
    { id: 'c90dcae7-d768-4d8d-85b6-43380c0730c0', width: 1254, height: 1254, fileName: 'home-slide-05-ducks-and-gold.png' },
    { id: '967b1dbf-8001-4bf6-a948-c37322d8a38f', width: 1086, height: 1448, fileName: 'home-slide-06-green-towel-sleep.png' },
  ]

  for (let index = 0; index < await tabs.count(); index += 1) {
    await tabs.nth(index).click()
    const image = page.getByRole('img').first()
    await image.evaluate(element => {
      const img = element as HTMLImageElement
      return img.complete
        ? Promise.resolve()
        : new Promise<void>(resolve => img.addEventListener('load', () => resolve(), { once: true }))
    })
    const dimensions = await image.evaluate(element => {
      const img = element as HTMLImageElement
      return { width: img.naturalWidth, height: img.naturalHeight }
    })
    expect(dimensions).toEqual({ width: expected[index].width, height: expected[index].height })
    await expect(image).toHaveAttribute('data-media-id', expected[index].id)
    await expect(image).toHaveCSS('object-fit', 'contain')
    await capture(page, expected[index].fileName)
  }

  // The full-size approved source keeps its genuine square and portrait ratios.
  await page.getByRole('tab').nth(0).click()
  await capture(page, 'home-widest-genuine-slide.png')
})

test('Home ambient colour is active-photo bounded and reduced motion is immediate', async ({ page }) => {
  test.skip(skip, 'Skipping: no server available')
  test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await seedViewerSession(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/')

  const ambient = page.locator('[data-ambient-fallback]')
  await expect(ambient).toBeVisible()
  const values = new Set<string>()
  for (let index = 0; index < await page.getByRole('tab').count(); index += 1) {
    await page.getByRole('tab').nth(index).click()
    values.add(await ambient.evaluate(element => getComputedStyle(element).getPropertyValue('--ambient-surface')))
  }
  expect(values.size).toBeGreaterThan(1)

  const motion = await ambient.evaluate(element => ({
    duration: getComputedStyle(element).transitionDuration,
    bodyBackground: getComputedStyle(document.body).backgroundColor,
  }))
  expect(motion.duration.split(',').every(value => value.trim() === '0s')).toBe(true)
  expect(motion.bodyBackground).toBe('rgb(255, 248, 238)')
  await capture(page, 'home-reduced-motion.png')
})

test('Home degraded-media evidence retains published prose and restores the media row', async ({ page }) => {
  test.slow()
  test.skip(skip, 'Skipping: no server available')
  test.skip(!cookie, 'Skipping: no viewer cookie could be derived')
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  test.skip(!url || !key, 'Skipping: no service configuration for reversible degraded-media proof')

  const db = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: home, error: homeError } = await db.from('content_items')
    .select('id')
    .eq('type', 'home')
    .eq('slug', 'home')
    .eq('status', 'published')
    .single()
  expect(homeError).toBeNull()

  const { data: attachment, error: attachmentError } = await db.from('content_media')
    .select('media_id')
    .eq('content_id', home!.id)
    .order('sort_order', { ascending: true })
    .limit(1)
    .single()
  expect(attachmentError).toBeNull()

  const { data: media, error: mediaError } = await db.from('media_assets')
    .select('id, storage_path')
    .eq('id', attachment!.media_id)
    .single()
  expect(mediaError).toBeNull()

  await seedViewerSession(page)
  let changed = false
  try {
    const missingPath = `e2e-missing/${randomUUID()}.png`
    const { error } = await db.from('media_assets')
      .update({ storage_path: missingPath })
      .eq('id', media!.id)
    expect(error).toBeNull()
    changed = true

    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/?release-2-degraded=${randomUUID()}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('alert').filter({ hasText: 'Some photos could not be loaded' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const prose = await page.locator('section').filter({ has: page.getByRole('heading', { level: 1 }) }).innerText()
    expect(prose.length).toBeGreaterThan(40)
    await capture(page, 'home-degraded-media-prose-retained.png')
  } finally {
    if (changed) {
      const { error } = await db.from('media_assets')
        .update({ storage_path: media!.storage_path })
        .eq('id', media!.id)
      expect(error).toBeNull()
    }
  }
})
