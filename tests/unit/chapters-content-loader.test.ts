import { describe, expect, it, vi } from 'vitest'
import {
  loadChapterContent, loadPublishedChapterContent,
  type ChapterDataSource, type ChapterRow, type PublishedChapterDataSource, type RevisionRow,
} from '@/lib/content/chapters'

const semantics = {
  event_date: null, event_date_precision: null, event_date_is_approximate: false,
  authored_date: null, authored_date_precision: null, authored_date_is_approximate: false,
  author_display_name: 'Paru', recipient_display_name: null, place_text: null, relationship_context: null, visual_scene: null,
}
const row: ChapterRow = {
  id: '00000000-0000-4000-8000-000000000001', type: 'story', slug: 'a-story',
  title: 'Private draft title', summary: 'Private draft introduction',
  body_blocks: [{ type: 'paragraph', text: 'Private draft copy.' }], cover_media_id: null,
  active_published_revision_id: '00000000-0000-4000-8000-000000000010', ...semantics,
  created_at: '2026-07-24T00:00:00.000Z', updated_at: '2026-07-25T00:00:00.000Z',
  created_by: '00000000-0000-4000-8000-000000000002',
}
const revision: RevisionRow = {
  id: row.active_published_revision_id!, content_item_id: row.id, revision_number: 1,
  type: 'story', slug: 'a-story', title: 'Published title', summary: 'Published introduction',
  body_blocks: [{ type: 'paragraph', text: 'Published copy.' }], cover_media_id: null,
  ...semantics, created_at: '2026-07-24T12:00:00.000Z', created_by: row.created_by,
}

function draftSource(overrides: Partial<ChapterDataSource> = {}): ChapterDataSource {
  return {
    findChapter: async () => ({ data: row, error: null }),
    findActiveRevision: async () => ({ data: revision, error: null }),
    findLatestRevision: async () => ({ data: { id: revision.id, revision_number: 1, created_at: revision.created_at }, error: null }),
    listMedia: async () => ({ data: [], error: null }),
    listRevisionMedia: async () => ({ data: [], error: null }),
    signMedia: async () => 'https://signed.example/draft.jpg',
    ...overrides,
  }
}

function publishedSource(overrides: Partial<PublishedChapterDataSource> = {}): PublishedChapterDataSource {
  return {
    findRevision: async () => ({ data: revision, error: null }),
    listRevisionMedia: async () => ({ data: [{
      media_id: '00000000-0000-4000-8000-000000000003', sort_order: 0,
      caption_override: 'Published association caption', storage_path: 'owner/published.jpg',
      alt_text: 'Published photograph', caption: 'Published asset caption', width: 1200, height: 800,
      mime_type: 'image/jpeg', byte_size: 10,
    }], error: null }),
    signMedia: async () => 'https://signed.example/published.jpg',
    ...overrides,
  }
}

describe('private draft loader', () => {
  it('loads draft fields and reports a newer private draft without altering the revision', async () => {
    const result = await loadChapterContent(draftSource())
    expect(result.state).toBe('ready')
    if (result.state !== 'ready') return
    expect(result.content.title).toBe('Private draft title')
    expect(result.content.publicationState).toBe('published-draft')
    expect(result.content.activeRevisionId).toBe(revision.id)
  })

  it('reports published unchanged when draft fields and media equal the selected snapshot', async () => {
    const matchingDraft: ChapterRow = {
      ...row, title: revision.title, summary: revision.summary, body_blocks: revision.body_blocks,
      updated_at: '2026-08-05T00:00:00Z',
    }
    const result = await loadChapterContent(draftSource({ findChapter: async () => ({ data: matchingDraft, error: null }) }))
    expect(result).toHaveProperty('content.publicationState', 'published')
  })

  it('reports unpublished when the selected pointer is null while preserving revision history metadata', async () => {
    const result = await loadChapterContent(draftSource({ findChapter: async () => ({ data: { ...row, active_published_revision_id: null }, error: null }) }))
    expect(result).toHaveProperty('content.publicationState', 'unpublished')
    expect(result).toHaveProperty('content.revisionNumber', 1)
  })
})

describe('immutable family revision loader', () => {
  it('returns only snapshot copy and snapshot media, never newer draft values', async () => {
    const result = await loadPublishedChapterContent(publishedSource())
    expect(result.state).toBe('ready')
    if (result.state !== 'ready') return
    expect(result.content.title).toBe('Published title')
    expect(result.content.bodyBlocks).toEqual(revision.body_blocks)
    expect(result.content.title).not.toBe(row.title)
    expect(result.content.media[0]).toMatchObject({ signedUrl: 'https://signed.example/published.jpg', captionOverride: 'Published association caption' })
  })

  it('degrades media signing without leaking or erasing snapshot prose', async () => {
    const result = await loadPublishedChapterContent(publishedSource({ signMedia: vi.fn(async () => { throw new Error('failed') }) }))
    expect(result).toHaveProperty('content.bodyBlocks', revision.body_blocks)
    expect(result).toHaveProperty('content.media.0.signedUrl', null)
    expect(result).toHaveProperty('mediaState', 'degraded')
  })

  it('loads a published Letter and rejects invalid snapshot blocks before media reads', async () => {
    const listRevisionMedia = vi.fn(publishedSource().listRevisionMedia)
    const letter = await loadPublishedChapterContent(publishedSource({
      findRevision: async () => ({ data: { ...revision, type: 'letter' }, error: null }), listRevisionMedia,
    }))
    expect(letter).toHaveProperty('content.type', 'letter')
    expect(listRevisionMedia).toHaveBeenCalledOnce()
    expect(await loadPublishedChapterContent(publishedSource({
      findRevision: async () => ({ data: { ...revision, body_blocks: [{ type: 'script' }] }, error: null }),
    }))).toEqual({ state: 'error', reason: 'invalid-content' })
  })
})
