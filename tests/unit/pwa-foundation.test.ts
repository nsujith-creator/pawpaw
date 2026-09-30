import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import sharp from 'sharp'
import manifest from '@/app/manifest'

const root = join(__dirname, '../..')
const read = (path: string) => readFileSync(join(root, path))

function faviconEntries(buffer: Buffer) {
  expect(buffer.readUInt16LE(0)).toBe(0)
  expect(buffer.readUInt16LE(2)).toBe(1)
  const count = buffer.readUInt16LE(4)
  return Array.from({ length: count }, (_, index) => {
    const offset = 6 + index * 16
    return {
      width: buffer.readUInt8(offset) || 256,
      height: buffer.readUInt8(offset + 1) || 256,
      byteSize: buffer.readUInt32LE(offset + 8),
      imageOffset: buffer.readUInt32LE(offset + 12),
    }
  })
}

describe('Pawpaw icon source and generated assets', () => {
  it('uses only the three approved colours and no text, font, or remote resource', () => {
    const svg = read('src/app/icon.svg').toString('utf8')
    const colours = [...svg.matchAll(/#[0-9a-f]{6}/gi)].map(match => match[0].toUpperCase())

    expect(new Set(colours)).toEqual(new Set(['#FFC93C', '#22163A', '#C8325A']))
    expect(svg).not.toMatch(/<text|font-family|@font-face|<image|<foreignObject|\bhref=|url\(/i)
  })

  it('contains valid 16px and 32px favicon entries', () => {
    const icon = read('src/app/favicon.ico')
    const entries = faviconEntries(icon)
    expect(entries.map(entry => [entry.width, entry.height])).toContainEqual([16, 16])
    expect(entries.map(entry => [entry.width, entry.height])).toContainEqual([32, 32])
    for (const entry of entries) {
      expect(entry.byteSize).toBeGreaterThan(0)
      expect(entry.imageOffset + entry.byteSize).toBeLessThanOrEqual(icon.length)
      expect(icon.subarray(entry.imageOffset, entry.imageOffset + 8)).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      )
    }
  })

  it.each([
    ['src/app/apple-icon.png', 180, 180],
    ['public/icons/pawpaw-192.png', 192, 192],
    ['public/icons/pawpaw-512.png', 512, 512],
    ['public/icons/pawpaw-maskable-512.png', 512, 512],
  ])('%s is exactly %ix%i', async (path, width, height) => {
    const metadata = await sharp(read(path)).metadata()
    expect(metadata).toMatchObject({ width, height, format: 'png' })
  })

  it('keeps every non-background maskable pixel inside the declared 10% safe inset', async () => {
    const { data, info } = await sharp(read('public/icons/pawpaw-maskable-512.png'))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    const background = [0xff, 0xc9, 0x3c]
    const bounds = { left: info.width, top: info.height, right: -1, bottom: -1 }
    let maximumRadius = 0

    for (let y = 0; y < info.height; y += 1) {
      for (let x = 0; x < info.width; x += 1) {
        const offset = (y * info.width + x) * info.channels
        const isBackground = background.every((channel, index) => data[offset + index] === channel)
        if (!isBackground) {
          bounds.left = Math.min(bounds.left, x)
          bounds.top = Math.min(bounds.top, y)
          bounds.right = Math.max(bounds.right, x)
          bounds.bottom = Math.max(bounds.bottom, y)
          maximumRadius = Math.max(
            maximumRadius,
            Math.hypot(x - info.width / 2, y - info.height / 2),
          )
        }
      }
    }

    const inset = Math.floor(info.width * 0.1)
    expect(bounds.left).toBeGreaterThanOrEqual(inset)
    expect(bounds.top).toBeGreaterThanOrEqual(inset)
    expect(bounds.right).toBeLessThan(info.width - inset)
    expect(bounds.bottom).toBeLessThan(info.height - inset)
    expect(maximumRadius).toBeLessThanOrEqual(info.width * 0.36)
  })
})

describe('web-app manifest foundation', () => {
  it('makes only the generated manifest and neutral PWA shell paths public at the archive gate', () => {
    const proxy = read('src/proxy.ts').toString('utf8')

    expect(proxy).toContain("pathname === '/manifest.webmanifest'")
    expect(proxy).toContain("pathname === '/service-worker.js'")
    expect(proxy).toContain("pathname === '/offline.html'")
    expect(proxy).not.toMatch(/startsWith\(['"]\/manifest/)
  })

  it('returns the exact approved manifest and icon purposes', () => {
    expect(manifest()).toEqual({
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
    })
  })

  it('uses a native service worker only on the authenticated family archive', () => {
    const packageJson = JSON.parse(read('package.json').toString('utf8')) as {
      dependencies: Record<string, string>
      devDependencies: Record<string, string>
    }
    const rootLayout = read('src/app/layout.tsx').toString('utf8')
    const archiveLayout = read('src/app/(archive)/layout.tsx').toString('utf8')
    const controls = read('src/components/pwa/pwa-controls.tsx').toString('utf8')
    const worker = read('public/service-worker.js').toString('utf8')
    const offline = read('public/offline.html').toString('utf8')

    const dependencyNames = Object.keys({ ...packageJson.dependencies, ...packageJson.devDependencies })
    expect(dependencyNames.some(name => /workbox|pwa/i.test(name))).toBe(false)
    expect(rootLayout).not.toContain('PwaControls')
    expect(archiveLayout).toContain('<PwaControls />')
    expect(controls).toContain("navigator.serviceWorker.register('/service-worker.js')")
    expect(controls).toContain('beforeinstallprompt')
    expect(controls).toContain('navigator.onLine')
    expect(worker).toContain("const PRELOAD = ['/offline.html'")
    expect(worker).toContain("url.pathname.startsWith('/icons/')")
    expect(worker).toContain("url.pathname.startsWith('/_next/static/')")
    expect(worker).toContain("request.mode === 'navigate'")
    expect(worker).not.toMatch(/supabase|cookie|token|video|media|\/admin/i)
    expect(offline).toContain('No connection.')
    expect(offline).toContain('Try again')
  })
})
