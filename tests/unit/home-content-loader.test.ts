import { describe, expect, it, vi } from 'vitest'
import {
  loadPublishedHomeContent,
  type HomeDataSource,
} from '@/lib/content/home'

const homeRow = {
  id: 'home-id',
  title: 'Published title',
  body_blocks: [{ type: 'paragraph' as const, text: 'Published body.' }],
  published_at: '2026-07-17T00:00:00.000Z',
}

const mediaAsset = {
  id: 'media-id',
  storage_path: 'owner/photo.jpg',
  alt_text: 'A family photo',
  caption: 'Visible caption',
  focal_x: null,
  focal_y: null,
  width: 1200,
  height: 800,
  extracted_palette: ['#123456'],
}

function source(overrides: Partial<HomeDataSource> = {}): HomeDataSource {
  return {
    listPublishedHomes: async () => ({ data: [homeRow], error: null }),
    listAttachedMedia: async () => ({
      data: [{ sort_order: 0, media_assets: mediaAsset }],
      error: null,
    }),
    signMedia: async () => 'https://signed.example/photo.jpg',
    ...overrides,
  }
}

describe('published Home loader', () => {
  it('returns validated published title, body, and signed attached media', async () => {
    const result = await loadPublishedHomeContent(source())

    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.content.title).toBe('Published title')
    expect(result.content.bodyBlocks).toEqual(homeRow.body_blocks)
    expect(result.content.carousel).toHaveLength(1)
    expect(result.content.carousel[0]?.signedUrl).toContain('signed.example')
    expect(result.mediaState).toBe('complete')
  })

  it('returns the genuine empty state only when no published Home exists', async () => {
    const result = await loadPublishedHomeContent(source({
      listPublishedHomes: async () => ({ data: [], error: null }),
    }))

    expect(result).toEqual({ state: 'empty' })
  })

  it('distinguishes a content query failure from the empty state', async () => {
    const result = await loadPublishedHomeContent(source({
      listPublishedHomes: async () => ({ data: null, error: { message: 'query failed' } }),
    }))

    expect(result).toEqual({ state: 'error', reason: 'content-query' })
  })

  it('rejects duplicate published Home rows instead of choosing one silently', async () => {
    const result = await loadPublishedHomeContent(source({
      listPublishedHomes: async () => ({ data: [homeRow, { ...homeRow, id: 'second-home' }], error: null }),
    }))

    expect(result).toEqual({ state: 'error', reason: 'duplicate-published-home' })
  })

  it('distinguishes malformed content blocks from the empty state', async () => {
    const result = await loadPublishedHomeContent(source({
      listPublishedHomes: async () => ({
        data: [{ ...homeRow, body_blocks: [{ type: 'paragraph', text: '<script>bad</script>' }] }],
        error: null,
      }),
    }))

    expect(result).toEqual({ state: 'error', reason: 'invalid-content' })
  })

  it('keeps published prose when the attached-media query fails', async () => {
    const result = await loadPublishedHomeContent(source({
      listAttachedMedia: async () => ({ data: null, error: { message: 'media query failed' } }),
    }))

    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.content.title).toBe('Published title')
    expect(result.content.bodyBlocks).toEqual(homeRow.body_blocks)
    expect(result.content.carousel).toEqual([])
    expect(result.mediaState).toBe('degraded')
  })

  it('skips missing or unsigned media without suppressing valid media or prose', async () => {
    const signMedia = vi.fn(async (path: string) => {
      if (path.includes('broken')) throw new Error('signing failed')
      return `https://signed.example/${path}`
    })
    const result = await loadPublishedHomeContent(source({
      listAttachedMedia: async () => ({
        data: [
          { sort_order: 2, media_assets: null },
          { sort_order: 1, media_assets: { ...mediaAsset, id: 'broken', storage_path: 'broken.jpg' } },
          { sort_order: 0, media_assets: mediaAsset },
        ],
        error: null,
      }),
      signMedia,
    }))

    expect(result.state).toBe('published')
    if (result.state !== 'published') return
    expect(result.content.bodyBlocks).toEqual(homeRow.body_blocks)
    expect(result.content.carousel.map(item => item.id)).toEqual(['media-id'])
    expect(result.mediaState).toBe('degraded')
    expect(result.mediaIssueCount).toBe(2)
  })
})
