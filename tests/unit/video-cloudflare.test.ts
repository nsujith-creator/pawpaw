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
