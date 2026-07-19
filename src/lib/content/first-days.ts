import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'

export interface FirstDaysMediaItem {
  id: string
  signedUrl: string | null
  altText: string
  caption: string
  width: number | null
  height: number | null
}

interface MediaAssetRow {
  id: string
  storage_path: string
  alt_text: string | null
  caption: string | null
  width: number | null
  height: number | null
}

interface ContentMediaRow {
  sort_order: number
  media_assets: MediaAssetRow | null
}

interface FirstDaysRow {
  id: string
  title: string
}

interface QueryError {
  message: string
}

interface QueryResult<T> {
  data: T | null
  error: QueryError | null
}

export interface FirstDaysDataSource {
  findPublishedChapter(): Promise<QueryResult<FirstDaysRow>>
  listAttachedMedia(contentId: string): Promise<QueryResult<ContentMediaRow[]>>
  signMedia(storagePath: string): Promise<string>
}

export type FirstDaysResult =
  | { state: 'empty' }
  | { state: 'error'; reason: 'content-query' | 'media-query' }
  | {
      state: 'published'
      content: { id: string; title: string; media: FirstDaysMediaItem[] }
      mediaState: 'complete' | 'degraded'
      mediaIssueCount: number
    }

export async function loadFirstDaysContent(source: FirstDaysDataSource): Promise<FirstDaysResult> {
  const chapterResult = await source.findPublishedChapter()
  if (chapterResult.error) return { state: 'error', reason: 'content-query' }
  if (!chapterResult.data) return { state: 'empty' }

  const mediaResult = await source.listAttachedMedia(chapterResult.data.id)
  if (mediaResult.error) return { state: 'error', reason: 'media-query' }

  let mediaIssueCount = 0
  const sorted = [...(mediaResult.data ?? [])].sort((a, b) =>
    a.sort_order - b.sort_order ||
    (a.media_assets?.id ?? '').localeCompare(b.media_assets?.id ?? ''),
  )

  const media = await Promise.all(sorted.map(async row => {
    const asset = row.media_assets
    if (!asset) {
      mediaIssueCount += 1
      return null
    }

    let signedUrl: string | null = null
    try {
      signedUrl = await source.signMedia(asset.storage_path)
    } catch {
      mediaIssueCount += 1
    }

    return {
      id: asset.id,
      signedUrl,
      altText: asset.alt_text ?? 'Family photograph',
      caption: asset.caption ?? '',
      width: asset.width,
      height: asset.height,
    }
  }))

  return {
    state: 'published',
    content: {
      id: chapterResult.data.id,
      title: chapterResult.data.title,
      media: media.filter((item): item is FirstDaysMediaItem => item !== null),
    },
    mediaState: mediaIssueCount > 0 ? 'degraded' : 'complete',
    mediaIssueCount,
  }
}

export async function getFirstDaysContent(): Promise<FirstDaysResult> {
  const db = createAdminClient()
  const result = await loadFirstDaysContent({
    async findPublishedChapter() {
      const { data, error } = await db
        .from('content_items')
        .select('id, title')
        .eq('type', 'story')
        .eq('slug', 'first-days')
        .eq('status', 'published')
        .maybeSingle()
      return { data: data as FirstDaysRow | null, error }
    },
    async listAttachedMedia(contentId) {
      const { data, error } = await db
        .from('content_media')
        .select(`
          sort_order,
          media_assets (id, storage_path, alt_text, caption, width, height)
        `)
        .eq('content_id', contentId)
        .order('sort_order', { ascending: true })
      return { data: data as unknown as ContentMediaRow[] | null, error }
    },
    signMedia: generateSignedUrl,
  })

  if (result.state === 'error') {
    console.error('getFirstDaysContent failed:', result.reason)
  } else if (result.state === 'published' && result.mediaState === 'degraded') {
    console.error('getFirstDaysContent media degraded:', result.mediaIssueCount)
  }

  return result
}
