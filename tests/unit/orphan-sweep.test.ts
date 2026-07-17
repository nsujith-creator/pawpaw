import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { findOrphans, ORPHAN_MAX_AGE_MS, sweepOrphans } from '@/lib/media/orphan-sweep'

const ADMIN = '123e4567-e89b-12d3-a456-426614174000'
const NOW = Date.parse('2026-07-16T12:00:00Z')

const hoursAgo = (h: number) => new Date(NOW - h * 60 * 60 * 1000).toISOString()

describe('findOrphans', () => {
  it('selects only unregistered objects older than the grace period', () => {
    const objects = [
      { name: 'old-orphan.jpg',    created_at: hoursAgo(25) },
      { name: 'old-registered.jpg', created_at: hoursAgo(48) },
      { name: 'fresh-orphan.jpg',  created_at: hoursAgo(1) },
    ]
    const registered = new Set([`${ADMIN}/old-registered.jpg`])
    expect(findOrphans(objects, registered, ADMIN, NOW)).toEqual([`${ADMIN}/old-orphan.jpg`])
  })

  it('never selects anything within the 24-hour grace period (tokens expire in 2 h)', () => {
    const objects = [{ name: 'recent.jpg', created_at: hoursAgo(23) }]
    expect(findOrphans(objects, new Set(), ADMIN, NOW)).toEqual([])
    expect(ORPHAN_MAX_AGE_MS).toBe(24 * 60 * 60 * 1000)
  })

  it('selects an object exactly one hour past the grace period', () => {
    const objects = [{ name: 'stale.jpg', created_at: hoursAgo(25) }]
    expect(findOrphans(objects, new Set(), ADMIN, NOW)).toEqual([`${ADMIN}/stale.jpg`])
  })

  it('ignores objects with unparsable timestamps', () => {
    const objects = [{ name: 'weird.jpg', created_at: 'not-a-date' }]
    expect(findOrphans(objects, new Set(), ADMIN, NOW)).toEqual([])
  })

  it('returns full storage paths under the admin folder', () => {
    const objects = [{ name: 'a.jpg', created_at: hoursAgo(30) }]
    expect(findOrphans(objects, new Set(), ADMIN, NOW)).toEqual([`${ADMIN}/a.jpg`])
  })
})

describe('sweepOrphans pagination', () => {
  it('continues beyond the first 100 Storage objects', async () => {
    const first = Array.from({ length: 100 }, (_, index) => ({
      name: `fresh-${index}.jpg`, created_at: new Date().toISOString(),
    }))
    const list = vi.fn()
      .mockResolvedValueOnce({ data: first, error: null })
      .mockResolvedValueOnce({ data: [{ name: 'last.jpg', created_at: new Date().toISOString() }], error: null })
    const db = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        like: vi.fn().mockResolvedValue({ data: [], error: null }),
      })),
      storage: { from: vi.fn(() => ({ list, remove: vi.fn() })) },
    } as unknown as SupabaseClient

    await sweepOrphans(db, ADMIN)
    expect(list).toHaveBeenNthCalledWith(1, ADMIN, expect.objectContaining({ limit: 100, offset: 0 }))
    expect(list).toHaveBeenNthCalledWith(2, ADMIN, expect.objectContaining({ limit: 100, offset: 100 }))
  })
})
