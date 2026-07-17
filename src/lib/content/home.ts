// Fetches published Home content for viewer delivery.
// Uses the service-role client — viewer browsers never touch the database directly.
// Drafts are excluded, while content and media failures remain distinct from
// the genuine "no published Home" state.

import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { bodyBlocksSchema, type ContentBlock } from '@/lib/content/schema'

export interface CarouselItem {
  id:               string
  signedUrl:        string
  altText:          string | null
  caption:          string | null
  focalX:           number | null
  focalY:           number | null
  width:            number | null
  height:           number | null
  extractedPalette: string[] | null
}

interface MediaAssetRow {
  id:                string
  storage_path:      string
  alt_text:          string | null
  caption:           string | null
  focal_x:           number | null
  focal_y:           number | null
  width:             number | null
  height:            number | null
  extracted_palette: string[] | null
}

interface ContentMediaRow {
  sort_order:   number
  media_assets: MediaAssetRow | null
}

interface PublishedHomeRow {
  id:           string
  title:        string
  body_blocks:  unknown
  published_at: string | null
}

interface QueryError {
  message: string
}

interface QueryResult<T> {
  data:  T | null
  error: QueryError | null
}

export interface HomeDataSource {
  listPublishedHomes(): Promise<QueryResult<PublishedHomeRow[]>>
  listAttachedMedia(contentId: string): Promise<QueryResult<ContentMediaRow[]>>
  signMedia(storagePath: string): Promise<string>
}

export interface HomeContent {
  id:           string
  title:        string
  bodyBlocks:   ContentBlock[]
  carousel:     CarouselItem[]
  publishedAt:  string | null
}

export type PublishedHomeResult =
  | { state: 'empty' }
  | {
      state: 'error'
      reason: 'content-query' | 'duplicate-published-home' | 'invalid-content'
    }
  | {
      state: 'published'
      content: HomeContent
      mediaState: 'complete' | 'degraded'
      mediaIssueCount: number
    }

// Kept independent from Next.js and Supabase construction so every failure
// classification can be regression-tested without a source-string assertion.
export async function loadPublishedHomeContent(
  source: HomeDataSource,
): Promise<PublishedHomeResult> {
  const contentResult = await source.listPublishedHomes()

  if (contentResult.error) return { state: 'error', reason: 'content-query' }

  const rows = contentResult.data ?? []
  if (rows.length === 0) return { state: 'empty' }
  if (rows.length > 1) return { state: 'error', reason: 'duplicate-published-home' }

  const row = rows[0]
  const parsedBlocks = bodyBlocksSchema.safeParse(row.body_blocks)
  if (!parsedBlocks.success) return { state: 'error', reason: 'invalid-content' }

  const baseContent: Omit<HomeContent, 'carousel'> = {
    id:          row.id,
    title:       row.title,
    bodyBlocks:  parsedBlocks.data,
    publishedAt: row.published_at,
  }

  const mediaResult = await source.listAttachedMedia(row.id)
  if (mediaResult.error) {
    return {
      state: 'published',
      content: { ...baseContent, carousel: [] },
      mediaState: 'degraded',
      mediaIssueCount: 1,
    }
  }

  let mediaIssueCount = 0
  const sorted = [...(mediaResult.data ?? [])]
    .sort((a, b) =>
      a.sort_order - b.sort_order ||
      (a.media_assets?.id ?? '').localeCompare(b.media_assets?.id ?? ''),
    )

  const items = await Promise.all(
    sorted.map(async (contentMedia): Promise<CarouselItem | null> => {
      const asset = contentMedia.media_assets
      if (!asset) {
        mediaIssueCount += 1
        return null
      }

      try {
        return {
          id:               asset.id,
          signedUrl:        await source.signMedia(asset.storage_path),
          altText:          asset.alt_text,
          caption:          asset.caption,
          focalX:           asset.focal_x,
          focalY:           asset.focal_y,
          width:            asset.width,
          height:           asset.height,
          extractedPalette: asset.extracted_palette,
        }
      } catch {
        mediaIssueCount += 1
        return null
      }
    }),
  )

  return {
    state: 'published',
    content: { ...baseContent, carousel: items.filter((item): item is CarouselItem => item !== null) },
    mediaState: mediaIssueCount > 0 ? 'degraded' : 'complete',
    mediaIssueCount,
  }
}

export async function getPublishedHomeContent(): Promise<PublishedHomeResult> {
  const db = createAdminClient()

  const result = await loadPublishedHomeContent({
    async listPublishedHomes() {
      const { data, error } = await db
        .from('content_items')
        .select('id, title, body_blocks, published_at')
        .eq('type', 'home')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        // Reading two rows deliberately detects a broken singleton instead of
        // silently choosing one with limit(1).maybeSingle().
        .limit(2)

      return { data: data as PublishedHomeRow[] | null, error }
    },
    async listAttachedMedia(contentId) {
      // Media is a separate query so a relationship/PostgREST failure cannot
      // erase otherwise valid published title and prose.
      const { data, error } = await db
        .from('content_media')
        .select(`
          sort_order,
          media_assets (
            id, storage_path, alt_text, caption,
            focal_x, focal_y, width, height, extracted_palette
          )
        `)
        .eq('content_id', contentId)
        .order('sort_order', { ascending: true })

      return { data: data as unknown as ContentMediaRow[] | null, error }
    },
    signMedia: generateSignedUrl,
  })

  if (result.state === 'error') {
    console.error('getPublishedHomeContent failed:', result.reason)
  } else if (result.state === 'published' && result.mediaState === 'degraded') {
    console.error('getPublishedHomeContent media degraded:', result.mediaIssueCount)
  }

  return result
}
