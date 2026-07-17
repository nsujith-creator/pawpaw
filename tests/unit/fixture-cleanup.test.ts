import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deleteRowsByIds,
  listPrefixedFixtureObjectPaths,
  removeStoragePaths,
  requireCountedRows,
} from '../support/fixture-cleanup'

describe('Pawpaw fixture cleanup failures', () => {
  it('fails instead of converting a missing exact database count to zero', () => {
    expect(() => requireCountedRows('Content', { data: [], count: null, error: null }))
      .toThrow('Content residue query returned no exact count')
  })

  it('propagates database cleanup errors', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ error: new Error('database denied') }),
    }
    const db = { from: vi.fn(() => query) } as unknown as SupabaseClient
    await expect(deleteRowsByIds(
      db, 'media_assets', 'id', ['fixture-id'], 'Fixture media',
    )).rejects.toThrow('Fixture media cleanup failed')
  })

  it('propagates Storage cleanup errors', async () => {
    const remove = vi.fn().mockResolvedValue({ error: new Error('storage denied') })
    const db = { storage: { from: vi.fn(() => ({ remove })) } } as unknown as SupabaseClient
    await expect(removeStoragePaths(db, ['owner/pawpaw-test-file.png']))
      .rejects.toThrow('Storage fixture cleanup failed')
  })
})

describe('Pawpaw fixture object scoping', () => {
  it('finds only prefixed objects under a real Home-owner folder', async () => {
    const list = vi.fn().mockResolvedValue({
      data: [
        { name: 'family-photo.png' },
        { name: 'pawpaw-test-e2e-carousel-a.png' },
      ],
      error: null,
    })
    const db = { storage: { from: vi.fn(() => ({ list })) } } as unknown as SupabaseClient
    await expect(listPrefixedFixtureObjectPaths(db, ['real-home-owner']))
      .resolves.toEqual(['real-home-owner/pawpaw-test-e2e-carousel-a.png'])
  })
})
