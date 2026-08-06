import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  deleteMediaCore,
  planReorder,
  replaceAttachmentCore,
} from '@/lib/media/manage-media'

const items = [
  { mediaId: 'a', sortOrder: 0 },
  { mediaId: 'b', sortOrder: 1 },
  { mediaId: 'c', sortOrder: 2 },
]

describe('planReorder', () => {
  it('swaps sort positions with the previous item when moving earlier', () => {
    expect(planReorder(items, 'b', 'earlier')).toEqual([
      { mediaId: 'b', sortOrder: 0 },
      { mediaId: 'a', sortOrder: 1 },
    ])
  })

  it('swaps sort positions with the next item when moving later', () => {
    expect(planReorder(items, 'b', 'later')).toEqual([
      { mediaId: 'b', sortOrder: 2 },
      { mediaId: 'c', sortOrder: 1 },
    ])
  })

  it('is a no-op at the boundaries', () => {
    expect(planReorder(items, 'a', 'earlier')).toBeNull()
    expect(planReorder(items, 'c', 'later')).toBeNull()
  })

  it('is a no-op for an unknown media id', () => {
    expect(planReorder(items, 'nope', 'later')).toBeNull()
  })

  it('touches exactly two rows — other attachments are unaffected', () => {
    const plan = planReorder(items, 'c', 'earlier')!
    expect(plan).toHaveLength(2)
    expect(plan.map(p => p.mediaId).sort()).toEqual(['b', 'c'])
  })

  it('works with unsorted input and gapped sort orders', () => {
    const gapped = [
      { mediaId: 'y', sortOrder: 10 },
      { mediaId: 'x', sortOrder: 3 },
    ]
    expect(planReorder(gapped, 'y', 'earlier')).toEqual([
      { mediaId: 'y', sortOrder: 3 },
      { mediaId: 'x', sortOrder: 10 },
    ])
  })

  it('uses media ID as a deterministic tie breaker', () => {
    const tied = [
      { mediaId: 'b', sortOrder: 0 },
      { mediaId: 'a', sortOrder: 0 },
      { mediaId: 'c', sortOrder: 1 },
    ]
    expect(planReorder(tied, 'a', 'later')).toEqual([
      { mediaId: 'a', sortOrder: 0 },
      { mediaId: 'b', sortOrder: 0 },
    ])
  })
})

describe('transactional media deletion', () => {
  function dbWith(rpcResult: unknown, removeResult: unknown) {
    const remove = vi.fn().mockResolvedValue(removeResult)
    const db = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: { storage_path: 'admin-id/photo.png', created_by: 'admin-id' }, error: null,
        }),
      })),
      rpc: vi.fn().mockResolvedValue(rpcResult),
      storage: { from: vi.fn(() => ({ remove })) },
    } as unknown as SupabaseClient
    return { db, remove }
  }

  it('does not touch Storage when the atomic relational deletion fails', async () => {
    const { db, remove } = dbWith({ data: null, error: { message: 'failed' } }, { error: null })
    await expect(deleteMediaCore(db, 'admin-id', 'media-id')).resolves.toHaveProperty('error')
    expect(remove).not.toHaveBeenCalled()
  })

  it('reports Storage deletion failure explicitly after relational deletion', async () => {
    const { db } = dbWith(
      { data: 'admin-id/photo.png', error: null },
      { error: { message: 'storage offline' } },
    )
    await expect(deleteMediaCore(db, 'admin-id', 'media-id')).resolves.toEqual({
      error: 'The database record was deleted, but the private file cleanup failed. It will be retried.',
    })
  })
})

describe('atomic photograph replacement', () => {
  function dbWith(rpcResult: unknown) {
    const rpc = vi.fn().mockResolvedValue(rpcResult)
    const from = vi.fn()
    const storageFrom = vi.fn()
    const db = { rpc, from, storage: { from: storageFrom } } as unknown as SupabaseClient
    return { db, rpc, from, storageFrom }
  }

  it('calls exactly one atomic RPC and performs no direct table or Storage writes', async () => {
    const fixture = dbWith({ data: { sort_order: 3, cover_transferred: true }, error: null })
    await expect(replaceAttachmentCore(fixture.db, 'admin', 'content', 'old', 'new'))
      .resolves.toEqual({ ok: true })
    expect(fixture.rpc).toHaveBeenCalledOnce()
    expect(fixture.rpc).toHaveBeenCalledWith('replace_draft_content_media', {
      p_admin_id: 'admin',
      p_content_id: 'content',
      p_old_media_id: 'old',
      p_new_media_id: 'new',
    })
    expect(fixture.from).not.toHaveBeenCalled()
    expect(fixture.storageFrom).not.toHaveBeenCalled()
  })

  it('reports an RPC failure truthfully without attempting compensation writes', async () => {
    const fixture = dbWith({ data: null, error: { message: 'stale target' } })
    await expect(replaceAttachmentCore(fixture.db, 'admin', 'content', 'old', 'new'))
      .resolves.toEqual({
        error: 'The replacement could not be completed. The original photograph remains unchanged.',
      })
    expect(fixture.rpc).toHaveBeenCalledOnce()
    expect(fixture.from).not.toHaveBeenCalled()
    expect(fixture.storageFrom).not.toHaveBeenCalled()
  })

  it('rejects the same photograph before any database call', async () => {
    const fixture = dbWith({ data: null, error: null })
    await expect(replaceAttachmentCore(fixture.db, 'admin', 'content', 'same', 'same'))
      .resolves.toEqual({ error: 'Choose a different photograph.' })
    expect(fixture.rpc).not.toHaveBeenCalled()
  })
})
