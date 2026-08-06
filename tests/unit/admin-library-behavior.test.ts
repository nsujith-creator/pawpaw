import { describe, expect, it } from 'vitest'
import {
  filterAndSortContent,
  derivePublicationState,
  filterAndSortMedia,
  formatAdminDateTime,
  parseContentFilters,
  parseMediaFilters,
  publishedTimestamp,
  safeStorageBasename,
  summarizeAttachments,
  type ContentViewItem,
  type MediaViewItem,
} from '@/lib/admin/library-view'

const content: ContentViewItem[] = [
  {
    id: 'b', title: 'A Sunny Morning', type: 'home', status: 'published',
    updatedAt: '2026-07-17T10:00:00.000Z', publishedAt: '2026-07-17T09:00:00.000Z',
  },
  {
    id: 'a', title: 'Bedtime Story', type: 'story', status: 'unpublished',
    updatedAt: '2026-07-17T10:00:00.000Z', publishedAt: null,
  },
  {
    id: 'c', title: 'Garden Day', type: 'gallery', status: 'published',
    updatedAt: '2026-07-16T10:00:00.000Z', publishedAt: '2026-07-16T11:00:00.000Z',
  },
]

const media: MediaViewItem[] = [
  {
    mediaId: 'new-png', createdAt: '2026-07-17T10:00:00.000Z', mimeType: 'image/png',
    altText: 'Varada in the garden', caption: 'Sunny flowers', fileName: 'garden-day.png',
    attachmentCount: 1, usageTitles: ['Garden Day'],
  },
  {
    mediaId: 'new-jpeg', createdAt: '2026-07-17T10:00:00.000Z', mimeType: 'image/jpeg',
    altText: 'Reading together', caption: null, fileName: 'bedtime.JPG',
    attachmentCount: 0, usageTitles: [],
  },
  {
    mediaId: 'old-webp', createdAt: '2026-07-15T10:00:00.000Z', mimeType: 'image/webp',
    altText: 'Cloud costume', caption: 'Little explorer', fileName: 'cloud.webp',
    attachmentCount: 1, usageTitles: ['A Sunny Morning'],
  },
]

describe('admin content view behavior', () => {
  it('formats timestamps in the project timezone', () => {
    const formatted = formatAdminDateTime('2026-07-17T00:00:00.000Z')
    expect(formatted).toContain('17 Jul 2026')
    expect(formatted.toLocaleLowerCase('en-IN')).toContain('5:30 am')
  })

  it('shows a published timestamp only for published content with a timestamp', () => {
    expect(publishedTimestamp(content[0])).toMatch(/^Published /)
    expect(publishedTimestamp(content[1])).toBeNull()
    expect(publishedTimestamp({ ...content[0], publishedAt: null })).toBeNull()
  })

  it('distinguishes unpublished, selected unchanged, and selected with a newer saved draft', () => {
    expect(derivePublicationState(null, '2026-08-02T00:00:00Z', null)).toBe('unpublished')
    expect(derivePublicationState('r1', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z')).toBe('published')
    expect(derivePublicationState('r1', '2026-08-03T00:00:00Z', '2026-08-02T00:00:00Z')).toBe('published-draft')
  })

  it('counts every attachment and selects the first valid image by sort order', () => {
    const summary = summarizeAttachments([
      { sortOrder: 2, media: { id: 'later', storagePath: 'owner/later.jpg', altText: null } },
      { sortOrder: 0, media: null },
      { sortOrder: 1, media: { id: 'first', storagePath: 'owner/first.jpg', altText: 'First' } },
    ])
    expect(summary.count).toBe(3)
    expect(summary.first?.id).toBe('first')
  })

  it('searches titles case-insensitively', () => {
    const filters = parseContentFilters({ q: 'SUNNY' })
    expect(filterAndSortContent(content, filters).map(item => item.id)).toEqual(['b'])
  })

  it('combines status and content-type filters', () => {
    const filters = parseContentFilters({ status: 'published', type: 'gallery' })
    expect(filterAndSortContent(content, filters).map(item => item.id)).toEqual(['c'])
  })

  it('sorts newest first with deterministic id tie-breaking', () => {
    expect(filterAndSortContent(content, parseContentFilters({})).map(item => item.id))
      .toEqual(['a', 'b', 'c'])
  })

  it('clear/reset parameters restore all content', () => {
    expect(filterAndSortContent(content, parseContentFilters({ q: '', status: 'all', type: 'all' })))
      .toHaveLength(3)
  })
})

describe('media library view behavior', () => {
  it.each([
    ['alt text', 'GARDEN', 'new-png'],
    ['caption', 'explorer', 'old-webp'],
    ['safe filename', 'BEDTIME', 'new-jpeg'],
    ['usage title', 'sunny morning', 'old-webp'],
  ])('searches case-insensitively across %s', (_field, query, expected) => {
    const result = filterAndSortMedia(media, parseMediaFilters({ q: query }))
    expect(result.map(item => item.mediaId)).toEqual([expected])
  })

  it.each([
    ['jpeg', 'new-jpeg'],
    ['png', 'new-png'],
    ['webp', 'old-webp'],
  ])('filters %s images by exact MIME type', (type, expected) => {
    const result = filterAndSortMedia(media, parseMediaFilters({ type }))
    expect(result.map(item => item.mediaId)).toEqual([expected])
  })

  it('sorts newest and oldest with deterministic id tie-breaking', () => {
    expect(filterAndSortMedia(media, parseMediaFilters({ sort: 'newest' })).map(item => item.mediaId))
      .toEqual(['new-jpeg', 'new-png', 'old-webp'])
    expect(filterAndSortMedia(media, parseMediaFilters({ sort: 'oldest' })).map(item => item.mediaId))
      .toEqual(['old-webp', 'new-jpeg', 'new-png'])
  })

  it('combines search, type, attachment status, and sort', () => {
    const result = filterAndSortMedia(media, parseMediaFilters({
      q: 'sunny', type: 'png', attachment: 'attached', sort: 'oldest',
    }))
    expect(result.map(item => item.mediaId)).toEqual(['new-png'])
  })

  it('keeps unattached media visible and reports zero usage', () => {
    const result = filterAndSortMedia(media, parseMediaFilters({ attachment: 'unattached' }))
    expect(result).toHaveLength(1)
    expect(result[0].mediaId).toBe('new-jpeg')
    expect(result[0].attachmentCount).toBe(0)
    expect(result[0].usageTitles).toEqual([])
  })

  it('exposes only a safe storage basename for filename search', () => {
    expect(safeStorageBasename('admin-private-id/folder/photo-name.webp')).toBe('photo-name.webp')
  })

  it('clear/reset parameters restore all media in newest-first order', () => {
    expect(filterAndSortMedia(media, parseMediaFilters({}))).toHaveLength(3)
  })
})
