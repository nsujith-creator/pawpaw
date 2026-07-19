import { randomUUID } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { expect, test, type Page } from '@playwright/test'
import { loadEnvLocal, makeViewerCookieValue } from './viewer-session'

const skip = process.env.PLAYWRIGHT_SKIP_AUTH === '1'
const evidenceDir = join(process.cwd(), 'test-results', 'release-2-first-days-evidence')
let cookie: string | null = null

const expected = [
  { id: 'b73d7cc3-572c-4c23-94e5-3bdba47d78ef', width: 1088, height: 1445, caption: 'About an hour old, in Acchan’s arms for the first time.', alt: 'Sujith smiling while holding newborn Varada wrapped in green at the hospital.' },
  { id: '1fd67783-86f4-4e22-aaef-351a18fe2129', width: 1086, height: 1448, caption: 'New to the world, wrapped in green under the hospital lights.', alt: 'Newborn Varada wrapped in green on a blue hospital bed.' },
  { id: 'a793f9d6-1214-48e3-aab9-1d02ac69b69c', width: 1086, height: 1448, caption: 'Still in the first hours — drowsy, curious, impossibly small.', alt: 'Close portrait of newborn Varada wrapped in green at the hospital.' },
  { id: 'e1a1d270-87e4-460c-a372-86980dc6f660', width: 1536, height: 1024, caption: 'Two days old, awake beneath a tiny crown of pink flowers.', alt: 'Two-day-old Varada awake in a pink wrap and flower headband.' },
  { id: '7457b3e2-c107-4e65-a6a2-76521ec11024', width: 1536, height: 1024, caption: 'Two days old, folded into sleep and soft pink.', alt: 'Two-day-old Varada sleeping in a pink wrap and flower headband.' },
  { id: '0a66f7ca-aaa1-4fe0-9d7f-8bb7709388c3', width: 2048, height: 1365, caption: 'A small person in a basket of flowers, butterflies, and wonder.', alt: 'Varada in a pink wrap inside a flower-filled basket with decorative butterflies.' },
  { id: '751997ac-2abb-4b16-bd06-2103bc243ede', width: 1365, height: 2048, caption: 'Ten tiny toes, one bright butterfly keeping watch.', alt: 'Close-up of Varada’s feet in a pink wrap beside a decorative butterfly.' },
  { id: '5ceb9b5f-c696-4bd4-a445-3861ae2f8ee8', width: 1365, height: 2048, caption: 'The quiet profile of a two-day-old dream.', alt: 'Side-profile portrait of two-day-old Varada sleeping in a pink wrap and flower headband.' },
  { id: 'ee2261be-2438-4c8b-9d63-87720ac79381', width: 1086, height: 1448, caption: 'One small foot, one entire new world.', alt: 'Close-up of newborn Varada’s foot held gently in an adult hand.' },
]

test.beforeAll(async () => {
  cookie = await makeViewerCookieValue()
  mkdirSync(evidenceDir, { recursive: true })
})

test.beforeEach(async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'One deterministic evidence set covers the declared viewports')
})

async function authenticate(page: Page): Promise<void> {
  await page.context().addCookies([{ name: 'pawpaw_viewer', value: cookie!, domain: 'localhost', path: '/' }])
}

async function waitForImages(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(Array.from(document.images).map(image => image.complete
      ? Promise.resolve()
      : new Promise<void>(resolve => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        })))
  })
}

async function capture(page: Page, fileName: string): Promise<void> {
  await waitForImages(page)
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.screenshot({ path: join(evidenceDir, fileName), fullPage: true, animations: 'disabled' })
}

async function expectNoOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
}

function overlaps(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return !(
    a.x + a.width <= b.x || b.x + b.width <= a.x ||
    a.y + a.height <= b.y || b.y + b.height <= a.y
  )
}

function rgbChannels(css: string): [number, number, number] {
  const values = css.match(/[\d.]+/g)?.slice(0, 3).map(Number)
  if (!values || values.length !== 3) throw new Error(`Unsupported colour: ${css}`)
  return values as [number, number, number]
}

function contrastRatio(foreground: string, background: string): number {
  const luminance = (css: string) => {
    const linear = rgbChannels(css).map(channel => {
      const value = channel / 255
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
  }
  const first = luminance(foreground)
  const second = luminance(background)
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
}

test('First Days uses nine exact ordered records, captions, alt text, and valid signed images', async ({ page }) => {
  test.skip(skip || !cookie, 'Skipping: no viewer session available')
  await authenticate(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/first-days')
  await expect(page.getByRole('heading', { level: 1, name: 'First Days' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Family navigation' }).getByRole('link', { name: 'First Days' })).toHaveAttribute('aria-current', 'page')

  const header = page.locator('[data-chapter-header]')
  const character = page.locator('img[data-chapter-character]')
  await expect(character).toHaveAttribute('src', /varada-sleepy\.png/)
  await expect(character).toHaveAttribute('alt', '')

  const chapterTreatment = await page.locator('[data-chapter-header] p').first().evaluate(element => ({
    eyebrow: getComputedStyle(element).color,
    accent: getComputedStyle(element, '::before').backgroundColor,
    soft: getComputedStyle(document.querySelector('[data-chapter-illustration-zone]')!).backgroundColor,
  }))
  expect(chapterTreatment).toEqual({
    eyebrow: 'rgb(78, 26, 110)',
    accent: 'rgb(155, 95, 192)',
    soft: 'rgb(242, 235, 248)',
  })

  const figures = page.locator('figure')
  await expect(figures).toHaveCount(9)
  for (let index = 0; index < expected.length; index += 1) {
    const item = expected[index]
    const figure = figures.nth(index)
    const image = figure.getByRole('img')
    await expect(image).toHaveAttribute('data-media-id', item.id)
    await expect(image).toHaveAttribute('alt', item.alt)
    await expect(figure.locator('figcaption')).toHaveText(item.caption)
    const dimensions = await image.evaluate(element => {
      const image = element as HTMLImageElement
      return { width: image.naturalWidth, height: image.naturalHeight, complete: image.complete }
    })
    expect(dimensions).toEqual({ width: item.width, height: item.height, complete: true })
  }

  const [titleBox, headerBox, characterBox, firstFigureBox] = await Promise.all([
    page.getByRole('heading', { level: 1, name: 'First Days' }).boundingBox(),
    header.boundingBox(),
    character.boundingBox(),
    figures.first().boundingBox(),
  ])
  expect(titleBox).not.toBeNull()
  expect(headerBox).not.toBeNull()
  expect(characterBox).not.toBeNull()
  expect(firstFigureBox).not.toBeNull()
  expect(characterBox!.width).toBeGreaterThanOrEqual(190)
  expect(characterBox!.width).toBeLessThanOrEqual(240)
  expect(overlaps(characterBox!, titleBox!)).toBe(false)
  expect(overlaps(characterBox!, firstFigureBox!)).toBe(false)
  expect(headerBox!.y + headerBox!.height).toBeLessThanOrEqual(firstFigureBox!.y)

  const captionMetrics = await figures.locator('figcaption').evaluateAll(captions => captions.map(caption => {
    const style = getComputedStyle(caption)
    return {
      fontSize: Number.parseFloat(style.fontSize),
      lineHeight: Number.parseFloat(style.lineHeight),
      color: style.color,
      background: getComputedStyle(document.body).backgroundColor,
    }
  }))
  for (const metric of captionMetrics) {
    expect(metric.fontSize).toBeGreaterThanOrEqual(15)
    expect(metric.lineHeight / metric.fontSize).toBeGreaterThanOrEqual(1.45)
    expect(contrastRatio(metric.color, metric.background)).toBeGreaterThanOrEqual(4.5)
  }

  const figureGaps = await figures.evaluateAll(elements => elements.slice(1).map((element, index) => {
    const previous = elements[index].getBoundingClientRect()
    const current = element.getBoundingClientRect()
    return current.top - previous.bottom
  }))
  for (const gap of figureGaps) {
    expect(gap).toBeGreaterThanOrEqual(40)
    expect(gap).toBeLessThanOrEqual(110)
  }

  const visibleText = await page.locator('body').innerText()
  expect(visibleText).not.toMatch(/storage\/v1\/object\/sign|service[_-]?role|token=|r2-first-days/i)
  await expect(page.locator('a[href*="/storage/v1/object/sign/"]')).toHaveCount(0)
  await capture(page, 'first-days-1440.png')
  await capture(page, 'first-days-all-nine-chronological.png')

  await figures.nth(0).screenshot({ path: join(evidenceDir, 'first-days-portrait-image.png'), animations: 'disabled' })
  await figures.nth(5).screenshot({ path: join(evidenceDir, 'first-days-landscape-image.png'), animations: 'disabled' })
  await figures.nth(5).screenshot({ path: join(evidenceDir, 'first-days-longest-caption.png'), animations: 'disabled' })
})

test('First Days reflows at 375px and 320px and remains usable at 200 percent zoom', async ({ page }) => {
  test.skip(skip || !cookie, 'Skipping: no viewer session available')
  await authenticate(page)

  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/first-days')
  await expectNoOverflow(page)
  const mobileTitle = await page.getByRole('heading', { level: 1, name: 'First Days' }).boundingBox()
  const mobileCharacter = await page.locator('img[data-chapter-character]').boundingBox()
  const mobileFirstFigure = await page.locator('figure').first().boundingBox()
  expect(mobileTitle).not.toBeNull()
  expect(mobileCharacter).not.toBeNull()
  expect(mobileFirstFigure).not.toBeNull()
  expect(mobileCharacter!.width).toBeGreaterThanOrEqual(105)
  expect(mobileCharacter!.width).toBeLessThanOrEqual(135)
  expect(overlaps(mobileCharacter!, mobileTitle!)).toBe(false)
  expect(overlaps(mobileCharacter!, mobileFirstFigure!)).toBe(false)
  for (const item of ['Home', 'First Days', 'Leave']) {
    const control = item === 'Leave' ? page.getByRole('button', { name: item }) : page.getByRole('link', { name: item, exact: true })
    const box = await control.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  }
  await capture(page, 'first-days-375.png')

  await page.setViewportSize({ width: 320, height: 800 })
  await expectNoOverflow(page)
  await capture(page, 'first-days-320.png')

  await page.setViewportSize({ width: 640, height: 900 })
  await page.evaluate(() => { document.body.style.zoom = '2' })
  await expectNoOverflow(page)
  const zoomTitle = await page.getByRole('heading', { level: 1, name: 'First Days' }).boundingBox()
  const zoomCharacter = await page.locator('img[data-chapter-character]').boundingBox()
  const zoomFirstFigure = await page.locator('figure').first().boundingBox()
  expect(zoomTitle).not.toBeNull()
  expect(zoomCharacter).not.toBeNull()
  expect(zoomFirstFigure).not.toBeNull()
  expect(overlaps(zoomCharacter!, zoomTitle!)).toBe(false)
  expect(overlaps(zoomCharacter!, zoomFirstFigure!)).toBe(false)
  for (const item of ['Home', 'First Days', 'Leave']) {
    const control = item === 'Leave' ? page.getByRole('button', { name: item }) : page.getByRole('link', { name: item, exact: true })
    const box = await control.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(640)
  }
  await capture(page, 'first-days-200-percent-zoom.png')
})

test('First Days reduced motion is complete', async ({ page }) => {
  test.skip(skip || !cookie, 'Skipping: no viewer session available')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await authenticate(page)
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/first-days')
  await expect(page.locator('figure')).toHaveCount(9)
  await expect(page.locator('img[data-chapter-character]')).toHaveCSS('animation-name', 'none')
  await capture(page, 'first-days-reduced-motion.png')
})

test('First Days degraded media retains its figure, caption, and chapter structure', async ({ page }) => {
  test.slow()
  test.skip(skip || !cookie, 'Skipping: no viewer session available')
  const env = loadEnvLocal()
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY
  test.skip(!url || !key, 'Skipping: no service configuration for reversible degraded-media proof')
  const db = createClient(url!, key!, { auth: { persistSession: false, autoRefreshToken: false } })
  const mediaId = expected[0].id
  const { data: media, error: readError } = await db.from('media_assets').select('storage_path').eq('id', mediaId).single()
  expect(readError).toBeNull()

  await authenticate(page)
  let changed = false
  try {
    const missingPath = `e2e-missing-${randomUUID()}.png`
    const changedRow = await db.from('media_assets').update({ storage_path: missingPath }).eq('id', mediaId)
    expect(changedRow.error).toBeNull()
    changed = true
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/first-days?degraded=${randomUUID()}`, { waitUntil: 'networkidle' })
    await expect(page.getByRole('alert').filter({ hasText: 'Some photographs could not be loaded' })).toBeVisible()
    await expect(page.locator('figure')).toHaveCount(9)
    await expect(page.locator('figure').first().locator('figcaption')).toHaveText(expected[0].caption)
    await expect(page.getByRole('heading', { level: 1, name: 'First Days' })).toBeVisible()
    await expect(page.locator('img[data-chapter-character]')).toHaveAttribute('alt', '')
    await capture(page, 'first-days-degraded-media.png')
  } finally {
    if (changed) {
      const restored = await db.from('media_assets').update({ storage_path: media!.storage_path }).eq('id', mediaId)
      expect(restored.error).toBeNull()
    }
  }
})
