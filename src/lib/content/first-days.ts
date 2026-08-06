import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { loadAuthorizedFamilyData } from '@/lib/auth/family-access'
import {
  getSelectedRevisionForSlug,
  loadPublishedChapterContent,
  REVISION_MEDIA_SELECT,
  type ChapterMedia,
  type PublishedChapterDataSource,
  type RevisionMediaRow,
} from '@/lib/content/chapters'
import type { ContentBlock } from '@/lib/content/schema'
import type { DatePrecision } from '@/lib/content/manage-content'

export interface FirstDaysMediaItem extends Pick<ChapterMedia, 'id' | 'signedUrl' | 'altText' | 'width' | 'height'> {
  caption: string
}

export type FirstDaysDataSource = PublishedChapterDataSource

export type FirstDaysResult =
  | { state: 'empty' }
  | { state: 'error'; reason: 'content-query' | 'invalid-content' }
  | {
      state: 'published'
      content: {
        id: string
        title: string
        summary: string | null
        bodyBlocks: ContentBlock[]
        eventDate: string | null
        eventDatePrecision: DatePrecision | null
        eventDateIsApproximate: boolean
        authorDisplayName: string | null
        placeText: string | null
        relationshipContext: string | null
        media: FirstDaysMediaItem[]
      }
      mediaState: 'complete' | 'degraded'
      mediaIssueCount: number
    }

export async function loadFirstDaysContent(source: FirstDaysDataSource): Promise<FirstDaysResult> {
  const result = await loadPublishedChapterContent(source)
  if (result.state !== 'ready') return result
  if (result.content.slug !== 'first-days' || result.content.type !== 'story') return { state: 'empty' }
  return {
    state: 'published',
    content: {
      id: result.content.id,
      title: result.content.title,
      summary: result.content.summary,
      bodyBlocks: result.content.bodyBlocks,
      eventDate: result.content.eventDate,
      eventDatePrecision: result.content.eventDatePrecision,
      eventDateIsApproximate: result.content.eventDateIsApproximate,
      authorDisplayName: result.content.authorDisplayName,
      placeText: result.content.placeText,
      relationshipContext: result.content.relationshipContext,
      media: result.content.media.map(item => ({
        id: item.id, signedUrl: item.signedUrl, altText: item.altText,
        caption: item.captionOverride?.trim() || item.caption?.trim() || '',
        width: item.width, height: item.height,
      })),
    },
    mediaState: result.mediaState,
    mediaIssueCount: result.mediaIssueCount,
  }
}

export async function getFirstDaysContent(): Promise<FirstDaysResult> {
  return loadAuthorizedFamilyData(async () => {
    const db = createAdminClient()
    const result = await loadFirstDaysContent({
      findRevision: () => getSelectedRevisionForSlug('first-days'),
      async listRevisionMedia(revisionId) {
        const { data, error } = await db.from('content_revision_media').select(REVISION_MEDIA_SELECT)
          .eq('revision_id', revisionId).order('sort_order', { ascending: true })
        return { data: data as RevisionMediaRow[] | null, error }
      },
      signMedia: generateSignedUrl,
    })
    if (result.state === 'error') console.error('getFirstDaysContent failed:', result.reason)
    else if (result.state === 'published' && result.mediaState === 'degraded') {
      console.error('getFirstDaysContent media degraded:', result.mediaIssueCount)
    }
    return result
  })
}
