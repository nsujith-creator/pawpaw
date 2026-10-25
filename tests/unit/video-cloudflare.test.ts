import { describe, expect, it } from 'vitest'
import { normalizeVideoDurationSeconds } from '../../src/lib/video/cloudflare'

describe('Cloudflare video duration normalization', () => {
  it('rounds fractional durations up for the integer database column', () => {
    expect(normalizeVideoDurationSeconds(29.01)).toBe(30)
    expect(normalizeVideoDurationSeconds(30)).toBe(30)
  })

  it('keeps unavailable or invalid durations null', () => {
    expect(normalizeVideoDurationSeconds(undefined)).toBeNull()
    expect(normalizeVideoDurationSeconds(Number.NaN)).toBeNull()
    expect(normalizeVideoDurationSeconds(Number.POSITIVE_INFINITY)).toBeNull()
    expect(normalizeVideoDurationSeconds(-1)).toBeNull()
  })
})

describe('Cloudflare upload start', () => {
  it('says why Cloudflare refused, with its status and error, and never the key', async () => {
    const { vi } = await import('vitest')
    process.env.CLOUDFLARE_STREAM_API_TOKEN = 'secret-token-value'
    const { createPrivateTusUpload } = await import('../../src/lib/video/cloudflare')
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, errors: [{ code: 10005, message: 'Storage limit reached' }] }), { status: 403 })))
    const failure = await createPrivateTusUpload(1000, 'a.mp4').then(() => new Error('did not fail'), (error: Error) => error)
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_STREAM_API_TOKEN
    expect(failure.message).toBe('Cloudflare Stream did not create an upload (403: 10005 Storage limit reached)')
    expect(failure.message).not.toContain('secret-token-value')
  })

  it('still reports a refusal with no explanation', async () => {
    const { vi } = await import('vitest')
    process.env.CLOUDFLARE_STREAM_API_TOKEN = 'secret-token-value'
    const { createPrivateTusUpload } = await import('../../src/lib/video/cloudflare')
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 500 })))
    const failure = await createPrivateTusUpload(1000, 'a.mp4').then(() => new Error('did not fail'), (error: Error) => error)
    vi.unstubAllGlobals()
    delete process.env.CLOUDFLARE_STREAM_API_TOKEN
    expect(failure.message).toBe('Cloudflare Stream did not create an upload (500)')
  })
})
