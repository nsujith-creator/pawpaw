import { describe, expect, it, vi } from 'vitest'
import { loadFirstDaysContent, type FirstDaysDataSource } from '@/lib/content/first-days'
import type { RevisionRow } from '@/lib/content/chapters'

const revision: RevisionRow = {
  id: '00000000-0000-4000-8000-000000000001', content_item_id: 'first-days-id', revision_number: 1,
  type: 'story', slug: 'first-days', title: 'First Days', summary: null, body_blocks: [], cover_media_id: null,
  event_date: null, event_date_precision: null, event_date_is_approximate: false,
  authored_date: null, authored_date_precision: null, authored_date_is_approximate: false,
  author_display_name: null, recipient_display_name: null, place_text: null, relationship_context: null,
  created_at: '2026-08-01T00:00:00Z', created_by: '00000000-0000-4000-8000-000000000002',
}

function source(overrides: Partial<FirstDaysDataSource> = {}): FirstDaysDataSource {
  return {
    findRevision: async () => ({ data: revision, error: null }),
    listRevisionMedia: async () => ({ data: [{
      media_id: 'media-id', sort_order: 1, caption_override: null, storage_path: 'owner/first-days/photo.jpg',
      alt_text: 'Newborn Varada at the hospital.', caption: 'A first-day caption.', width: 1200, height: 1600,
      mime_type: 'image/jpeg', byte_size: 10,
    }], error: null }),
    signMedia: async () => 'https://signed.example/photo.jpg',
    ...overrides,
  }
}

describe('First Days immutable revision loader', () => {
  it('returns snapshot copy, ordered snapshot media, and preserves unknown facts as null', async () => {
    const result = await loadFirstDaysContent(source())
    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.content.media[0]).toMatchObject({ id: 'media-id', caption: 'A first-day caption.' })
    expect(result.content.eventDate).toBeNull()
    expect(result.content.authorDisplayName).toBeNull()
  })

  it('returns empty for an unpublished pointer result or a non-canonical revision', async () => {
    expect(await loadFirstDaysContent(source({ findRevision: async () => ({ data: null, error: null }) }))).toEqual({ state: 'empty' })
    expect(await loadFirstDaysContent(source({ findRevision: async () => ({ data: { ...revision, slug: 'another' }, error: null }) }))).toEqual({ state: 'empty' })
  })

  it('preserves snapshot structure when media signing fails', async () => {
    const result = await loadFirstDaysContent(source({ signMedia: vi.fn(async () => { throw new Error('failed') }) }))
    expect(result).toHaveProperty('state', 'published')
    expect(result).toHaveProperty('mediaState', 'degraded')
    expect(result).toHaveProperty('content.media.0.signedUrl', null)
  })
})
