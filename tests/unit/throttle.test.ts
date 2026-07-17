import { describe, it, expect, vi, beforeEach } from 'vitest'

const maybeSingle = vi.fn()
const rpc = vi.fn()
const deleteResult = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc,
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation(function (this: unknown) {
        return deleteResult.mock.results.length > 0 ? deleteResult() : this
      }),
      maybeSingle,
      delete: vi.fn().mockReturnThis(),
    })),
  })),
}))

import {
  checkThrottle,
  computeThrottleKey,
  recordFailure,
  FAILURE_THRESHOLD,
  WINDOW_SECONDS,
  BLOCK_SECONDS,
} from '@/lib/auth/throttle'

beforeEach(() => {
  vi.clearAllMocks()
  maybeSingle.mockResolvedValue({ data: null, error: null })
  rpc.mockResolvedValue({ data: [{ failure_count: 1 }], error: null })
})

describe('throttle key generation', () => {
  it('produces a stable, normalized, non-reversible key', async () => {
    const a = await computeThrottleKey('  192.168.1.1  ')
    const b = await computeThrottleKey('192.168.1.1')
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).toBe(b)
    expect(a).not.toContain('192.168.1.1')
  })

  it('produces different keys for different clients and rotated secrets', async () => {
    const first = await computeThrottleKey('10.0.0.1')
    expect(await computeThrottleKey('10.0.0.2')).not.toBe(first)
    const original = process.env.THROTTLE_KEY_SECRET
    process.env.THROTTLE_KEY_SECRET = 'rotated-throttle-secret-32chars!!'
    expect(await computeThrottleKey('10.0.0.1')).not.toBe(first)
    process.env.THROTTLE_KEY_SECRET = original
  })
})

describe('atomic throttle persistence', () => {
  it('records through the atomic database function', async () => {
    await expect(recordFailure('203.0.113.1')).resolves.toBeUndefined()
    expect(rpc).toHaveBeenCalledWith('record_viewer_login_failure', {
      p_key_hash: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
  })

  it('fails conservatively when the atomic datastore call fails', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    await expect(recordFailure('203.0.113.2')).rejects.toThrow('Throttle datastore unavailable')
  })

  it('blocks checks when the datastore cannot be read', async () => {
    maybeSingle.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    await expect(checkThrottle('203.0.113.3')).resolves.toEqual({ blocked: true })
  })

  it('allows a client with no failure row and blocks a future blocked_until', async () => {
    await expect(checkThrottle('203.0.113.4')).resolves.toEqual({ blocked: false })
    maybeSingle.mockResolvedValueOnce({
      data: { failure_count: 10, blocked_until: new Date(Date.now() + 60_000).toISOString() },
      error: null,
    })
    await expect(checkThrottle('203.0.113.4')).resolves.toEqual({ blocked: true })
  })
})

describe('throttle constants', () => {
  it('uses positive integer thresholds', () => {
    for (const value of [FAILURE_THRESHOLD, WINDOW_SECONDS, BLOCK_SECONDS]) {
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThan(0)
    }
  })
})
