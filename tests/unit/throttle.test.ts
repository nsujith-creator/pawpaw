import { describe, it, expect, vi } from 'vitest'

// Mock the Supabase admin client before importing the throttle module.
vi.mock('@/lib/supabase/admin', () => {
  const chain = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete:      vi.fn().mockReturnThis(),
    upsert:      vi.fn().mockResolvedValue({ error: null }),
    from:        vi.fn().mockReturnThis(),
  }
  return {
    createAdminClient: vi.fn(() => ({
      from: vi.fn(() => chain),
      _chain: chain,
    })),
    _chain: chain,
  }
})

import { computeThrottleKey, FAILURE_THRESHOLD, WINDOW_SECONDS, BLOCK_SECONDS } from '@/lib/auth/throttle'

describe('throttle key generation', () => {
  it('produces a hex string for a given client ID', async () => {
    const hash = await computeThrottleKey('192.168.1.1')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('produces the same hash for the same input', async () => {
    const a = await computeThrottleKey('192.168.1.1')
    const b = await computeThrottleKey('192.168.1.1')
    expect(a).toBe(b)
  })

  it('produces different hashes for different client IDs', async () => {
    const a = await computeThrottleKey('10.0.0.1')
    const b = await computeThrottleKey('10.0.0.2')
    expect(a).not.toBe(b)
  })

  it('changes the hash when THROTTLE_KEY_SECRET is rotated', async () => {
    const original = process.env.THROTTLE_KEY_SECRET
    const hash1 = await computeThrottleKey('192.168.1.1')

    process.env.THROTTLE_KEY_SECRET = 'rotated-throttle-secret-32chars!!'
    const hash2 = await computeThrottleKey('192.168.1.1')

    process.env.THROTTLE_KEY_SECRET = original
    expect(hash1).not.toBe(hash2)
  })

  it('normalises case and whitespace before hashing (same hash for "  1.2.3.4  " and "1.2.3.4")', async () => {
    const a = await computeThrottleKey('  1.2.3.4  ')
    const b = await computeThrottleKey('1.2.3.4')
    expect(a).toBe(b)
  })

  it('does not include the raw client ID in the resulting hash string', async () => {
    const clientId = '192.168.99.99'
    const hash     = await computeThrottleKey(clientId)
    expect(hash).not.toContain(clientId)
  })
})

describe('throttle constants', () => {
  it('FAILURE_THRESHOLD is a positive integer', () => {
    expect(Number.isInteger(FAILURE_THRESHOLD)).toBe(true)
    expect(FAILURE_THRESHOLD).toBeGreaterThan(0)
  })

  it('WINDOW_SECONDS is a positive integer', () => {
    expect(Number.isInteger(WINDOW_SECONDS)).toBe(true)
    expect(WINDOW_SECONDS).toBeGreaterThan(0)
  })

  it('BLOCK_SECONDS is a positive integer', () => {
    expect(Number.isInteger(BLOCK_SECONDS)).toBe(true)
    expect(BLOCK_SECONDS).toBeGreaterThan(0)
  })
})
