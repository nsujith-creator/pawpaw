import { describe, expect, it, vi } from 'vitest'
import { loadFirstDaysContent, type FirstDaysDataSource } from '@/lib/content/first-days'

const chapter = { id: 'first-days-id', title: 'First Days' }
const media = {
  id: 'media-id', storage_path: 'owner/first-days/photo.jpg',
  alt_text: 'Newborn Varada at the hospital.', caption: 'A first-day caption.',
  width: 1200, height: 1600,
}

function source(overrides: Partial<FirstDaysDataSource> = {}): FirstDaysDataSource {
  return {
    findPublishedChapter: async () => ({ data: chapter, error: null }),
    listAttachedMedia: async () => ({ data: [{ sort_order: 1, media_assets: media }], error: null }),
    signMedia: async () => 'https://signed.example/photo.jpg',
    ...overrides,
  }
}

describe('First Days loader', () => {
  it('returns the published chapter with ordered signed media', async () => {
    const result = await loadFirstDaysContent(source({
      listAttachedMedia: async () => ({
        data: [
          { sort_order: 2, media_assets: { ...media, id: 'second' } },
          { sort_order: 1, media_assets: media },
        ],
        error: null,
      }),
    }))
    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.content.media.map(item => item.id)).toEqual(['media-id', 'second'])
    expect(result.content.media[0]).toMatchObject({ altText: media.alt_text, caption: media.caption })
    expect(result.mediaState).toBe('complete')
  })

  it('returns empty only when the published chapter does not exist', async () => {
    expect(await loadFirstDaysContent(source({
      findPublishedChapter: async () => ({ data: null, error: null }),
    }))).toEqual({ state: 'empty' })
  })

  it('preserves caption and chapter structure when signing fails', async () => {
    const result = await loadFirstDaysContent(source({
      signMedia: vi.fn(async () => { throw new Error('signing failed') }),
    }))
    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.mediaState).toBe('degraded')
    expect(result.mediaIssueCount).toBe(1)
    expect(result.content.media[0]).toMatchObject({
      signedUrl: null, altText: media.alt_text, caption: media.caption,
    })
  })

  it('distinguishes content and media query failures', async () => {
    expect(await loadFirstDaysContent(source({
      findPublishedChapter: async () => ({ data: null, error: { message: 'failed' } }),
    }))).toEqual({ state: 'error', reason: 'content-query' })
    expect(await loadFirstDaysContent(source({
      listAttachedMedia: async () => ({ data: null, error: { message: 'failed' } }),
    }))).toEqual({ state: 'error', reason: 'media-query' })
  })
})
