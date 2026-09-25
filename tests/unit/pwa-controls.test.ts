import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const src = join(__dirname, '../../src')
const read = (path: string) => readFileSync(join(src, path), 'utf8')

const pwaControls = read('components/pwa/pwa-controls.tsx')
const rootLayout = read('app/layout.tsx')
const archiveLayout = read('app/(archive)/layout.tsx')
const globals = read('app/globals.css')
const storyChart = read('components/family/story-chart.tsx')

describe('contextual Pawpaw PWA controls', () => {
  it('renders no normal-state online strip', () => {
    expect(pwaControls).toContain("if (online && !installPrompt && !appleMobile && !updateWorker) return null")
    expect(pwaControls).not.toContain("Online'")
    expect(globals).toContain('.pwaStatusNotice')
  })

  it('keeps actionable install paths and truthful temporary notices', () => {
    expect(pwaControls).toContain('beforeinstallprompt')
    expect(pwaControls).toContain('Install Pawpaw')
    expect(pwaControls).toContain('aria-expanded={showAppleInstall}')
    expect(pwaControls).toContain('Offline — saving, publishing, and uploads need a connection.')
    expect(pwaControls).toContain('A new version is ready')
    expect(pwaControls).toContain("navigator.serviceWorker.register('/service-worker.js')")
    expect(pwaControls).toContain("updateWorker?.postMessage({ type: 'SKIP_WAITING' })")
  })

  it('runs only on authenticated family archive pages, not in Author’s Studio', () => {
    expect(rootLayout).not.toContain('PwaControls')
    expect(archiveLayout).toContain("import PwaControls from '@/components/pwa/pwa-controls'")
    expect(archiveLayout).toContain('<PwaControls />')
  })

  it('hangs First Days on her chart at its own address', () => {
    expect(storyChart).toContain("slug === 'first-days' ? '/first-days'")
  })
})
