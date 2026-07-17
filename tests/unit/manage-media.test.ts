import { describe, it, expect } from 'vitest'
import { planReorder } from '@/lib/media/manage-media'

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
})
