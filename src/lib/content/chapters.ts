import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { loadAuthorizedFamilyData } from '@/lib/auth/family-access'
import { bodyBlocksSchema, type ContentBlock } from './schema'
import {
  MANAGED_CONTENT_TYPES,
  type DatePrecision,
  type ManagedContentType,
  type PublicationState,
} from './manage-content'

export interface ChapterMedia {
  id: string
  signedUrl: string | null
  altText: string
  caption: string | null
  captionOverride: string | null
  width: number | null
  height: number | null
  mimeType: string | null
  byteSize: number | null
  sortOrder: number
}

export interface ChapterSemantics {
  eventDate: string | null
  eventDatePrecision: DatePrecision | null
  eventDateIsApproximate: boolean
  authoredDate: string | null
  authoredDatePrecision: DatePrecision | null
  authoredDateIsApproximate: boolean
  authorDisplayName: string | null
  recipientDisplayName: string | null
  placeText: string | null
  relationshipContext: string | null
}

export interface ChapterContent extends ChapterSemantics {
  id: string
  type: ManagedContentType
  slug: string
  title: string
  summary: string | null
  bodyBlocks: ContentBlock[]
  publicationState: PublicationState
  activeRevisionId: string | null
  revisionNumber: number | null
  coverMediaId: string | null
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  createdBy: string
  media: ChapterMedia[]
}

export interface ChapterRow {
  id: string
  type: string
  slug: string
  title: string
  summary: string | null
  body_blocks: unknown
  cover_media_id: string | null
  active_published_revision_id: string | null
  event_date: string | null
  event_date_precision: string | null
  event_date_is_approximate: boolean
  authored_date: string | null
  authored_date_precision: string | null
  authored_date_is_approximate: boolean
  author_display_name: string | null
  recipient_display_name: string | null
  place_text: string | null
  relationship_context: string | null
  created_at: string
  updated_at: string
  created_by: string
}

export interface RevisionRow {
  id: string
  content_item_id: string
  revision_number: number
  type: string
  slug: string
  title: string
  summary: string | null
  body_blocks: unknown
  cover_media_id: string | null
  event_date: string | null
  event_date_precision: string | null
  event_date_is_approximate: boolean
  authored_date: string | null
  authored_date_precision: string | null
  authored_date_is_approximate: boolean
  author_display_name: string | null
  recipient_display_name: string | null
  place_text: string | null
  relationship_context: string | null
  created_at: string
  created_by: string
}

export interface ChapterMediaRow {
  sort_order: number
  caption_override: string | null
  placement?: string | null
  media_assets: {
    id: string
    storage_path: string
    alt_text: string | null
    caption: string | null
    width: number | null
    height: number | null
    mime_type: string | null
    byte_size: number | null
  } | null
}

export interface RevisionMediaRow {
  revision_id?: string
  media_id: string
  sort_order: number
  caption_override: string | null
  placement?: string | null
  storage_path: string
  alt_text: string | null
  caption: string | null
  width: number | null
  height: number | null
  mime_type: string | null
  byte_size: number | null
}

interface QueryError { message: string }
interface QueryResult<T> { data: T | null; error: QueryError | null }
interface RevisionMeta { id: string; revision_number: number; created_at: string }

export interface ChapterDataSource {
  findChapter(): Promise<QueryResult<ChapterRow>>
  findActiveRevision(revisionId: string): Promise<QueryResult<RevisionRow>>
  findLatestRevision(contentId: string): Promise<QueryResult<RevisionMeta>>
  listMedia(contentId: string): Promise<QueryResult<ChapterMediaRow[]>>
  listRevisionMedia(revisionId: string): Promise<QueryResult<RevisionMediaRow[]>>
  signMedia(storagePath: string): Promise<string>
}

export interface PublishedChapterDataSource {
  findRevision(): Promise<QueryResult<RevisionRow>>
  listRevisionMedia(revisionId: string): Promise<QueryResult<RevisionMediaRow[]>>
  signMedia(storagePath: string): Promise<string>
}

export type ChapterLoadResult =
  | { state: 'empty' }
  | { state: 'error'; reason: 'content-query' | 'invalid-content' }
  | { state: 'ready'; content: ChapterContent; mediaState: 'complete' | 'degraded'; mediaIssueCount: number }

export function draftMatchesRevision(
  draft: ChapterRow,
  draftMedia: RevisionMediaRow[],
  revision: RevisionRow,
  revisionMedia: RevisionMediaRow[],
): boolean {
  const fieldsMatch = draft.type === revision.type && draft.slug === revision.slug && draft.title === revision.title &&
    draft.summary === revision.summary && JSON.stringify(draft.body_blocks) === JSON.stringify(revision.body_blocks) &&
    draft.cover_media_id === revision.cover_media_id && draft.event_date === revision.event_date &&
    draft.event_date_precision === revision.event_date_precision && draft.event_date_is_approximate === revision.event_date_is_approximate &&
    draft.authored_date === revision.authored_date && draft.authored_date_precision === revision.authored_date_precision &&
    draft.authored_date_is_approximate === revision.authored_date_is_approximate &&
    draft.author_display_name === revision.author_display_name && draft.recipient_display_name === revision.recipient_display_name &&
    draft.place_text === revision.place_text && draft.relationship_context === revision.relationship_context
  if (!fieldsMatch) return false
  const comparable = (rows: RevisionMediaRow[]) => [...rows]
    .sort((a, b) => a.sort_order - b.sort_order || a.media_id.localeCompare(b.media_id))
    .map(({ media_id, sort_order, caption_override, placement, storage_path, alt_text, caption, width, height, mime_type, byte_size }) =>
      ({ media_id, sort_order, caption_override, placement: placement ?? null, storage_path, alt_text, caption, width, height, mime_type, byte_size }))
  return JSON.stringify(comparable(draftMedia)) === JSON.stringify(comparable(revisionMedia))
}

function semantics(row: ChapterRow | RevisionRow): ChapterSemantics {
  return {
    eventDate: row.event_date,
    eventDatePrecision: row.event_date_precision as DatePrecision | null,
    eventDateIsApproximate: row.event_date_is_approximate,
    authoredDate: row.authored_date,
    authoredDatePrecision: row.authored_date_precision as DatePrecision | null,
    authoredDateIsApproximate: row.authored_date_is_approximate,
    authorDisplayName: row.author_display_name,
    recipientDisplayName: row.recipient_display_name,
    placeText: row.place_text,
    relationshipContext: row.relationship_context,
  }
}

async function signRows(rows: RevisionMediaRow[], signMedia: (path: string) => Promise<string>, initialIssues = 0) {
  let mediaIssueCount = initialIssues
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order || a.media_id.localeCompare(b.media_id))
  const media = await Promise.all(sorted.map(async row => {
    let signedUrl: string | null = null
    try { signedUrl = await signMedia(row.storage_path) } catch { mediaIssueCount += 1 }
    return {
      id: row.media_id, signedUrl, altText: row.alt_text?.trim() || 'Family photograph',
      caption: row.caption, captionOverride: row.caption_override, width: row.width,
      height: row.height, mimeType: row.mime_type, byteSize: row.byte_size, sortOrder: row.sort_order,
    }
  }))
  return { media, mediaIssueCount }
}

export async function loadChapterContent(source: ChapterDataSource): Promise<ChapterLoadResult> {
  const result = await source.findChapter()
  if (result.error) return { state: 'error', reason: 'content-query' }
  if (!result.data) return { state: 'empty' }
  const row = result.data
  if (!MANAGED_CONTENT_TYPES.includes(row.type as ManagedContentType)) return { state: 'error', reason: 'invalid-content' }
  const parsed = bodyBlocksSchema.safeParse(row.body_blocks)
  if (!parsed.success) return { state: 'error', reason: 'invalid-content' }

  const mediaResult = await source.listMedia(row.id)
  const normalized: RevisionMediaRow[] = (mediaResult.data ?? []).flatMap(attachment => {
    const asset = attachment.media_assets
    return asset ? [{
      media_id: asset.id, sort_order: attachment.sort_order, caption_override: attachment.caption_override, placement: attachment.placement ?? null,
      storage_path: asset.storage_path, alt_text: asset.alt_text, caption: asset.caption,
      width: asset.width, height: asset.height, mime_type: asset.mime_type, byte_size: asset.byte_size,
    }] : []
  })
  const missingAssets = (mediaResult.data ?? []).length - normalized.length
  const signed = await signRows(normalized, source.signMedia, (mediaResult.error ? 1 : 0) + missingAssets)

  let active: RevisionRow | null = null
  if (row.active_published_revision_id) {
    const activeResult = await source.findActiveRevision(row.active_published_revision_id)
    if (activeResult.error || !activeResult.data) return { state: 'error', reason: 'invalid-content' }
    active = activeResult.data
  }
  const latestResult = await source.findLatestRevision(row.id)
  if (latestResult.error) return { state: 'error', reason: 'content-query' }
  const latest = latestResult.data
  let publicationState: PublicationState = 'unpublished'
  if (active) {
    const revisionMedia = await source.listRevisionMedia(active.id)
    if (revisionMedia.error) return { state: 'error', reason: 'content-query' }
    publicationState = draftMatchesRevision(row, normalized, active, revisionMedia.data ?? []) ? 'published' : 'published-draft'
  }

  return {
    state: 'ready',
    content: {
      id: row.id, type: row.type as ManagedContentType, slug: row.slug, title: row.title,
      summary: row.summary, bodyBlocks: parsed.data, publicationState,
      activeRevisionId: active?.id ?? null, revisionNumber: active?.revision_number ?? latest?.revision_number ?? null,
      coverMediaId: row.cover_media_id, publishedAt: active?.created_at ?? null,
      createdAt: row.created_at, updatedAt: row.updated_at, createdBy: row.created_by,
      ...semantics(row), media: signed.media,
    },
    mediaState: signed.mediaIssueCount > 0 ? 'degraded' : 'complete', mediaIssueCount: signed.mediaIssueCount,
  }
}

export async function loadPublishedChapterContent(source: PublishedChapterDataSource): Promise<ChapterLoadResult> {
  const result = await source.findRevision()
  if (result.error) return { state: 'error', reason: 'content-query' }
  if (!result.data) return { state: 'empty' }
  const row = result.data
  if (!MANAGED_CONTENT_TYPES.includes(row.type as ManagedContentType) || row.type === 'home') {
    return { state: 'empty' }
  }
  const parsed = bodyBlocksSchema.safeParse(row.body_blocks)
  if (!parsed.success) return { state: 'error', reason: 'invalid-content' }
  const mediaResult = await source.listRevisionMedia(row.id)
  const signed = await signRows(mediaResult.data ?? [], source.signMedia, mediaResult.error ? 1 : 0)
  return {
    state: 'ready',
    content: {
      id: row.content_item_id, type: row.type as ManagedContentType, slug: row.slug, title: row.title,
      summary: row.summary, bodyBlocks: parsed.data, publicationState: 'published', activeRevisionId: row.id,
      revisionNumber: row.revision_number, coverMediaId: row.cover_media_id, publishedAt: row.created_at,
      createdAt: row.created_at, updatedAt: row.created_at, createdBy: row.created_by,
      ...semantics(row), media: signed.media,
    },
    mediaState: signed.mediaIssueCount > 0 ? 'degraded' : 'complete', mediaIssueCount: signed.mediaIssueCount,
  }
}

const DRAFT_SELECT = 'id, type, slug, title, summary, body_blocks, cover_media_id, active_published_revision_id, event_date, event_date_precision, event_date_is_approximate, authored_date, authored_date_precision, authored_date_is_approximate, author_display_name, recipient_display_name, place_text, relationship_context, created_at, updated_at, created_by'
const REVISION_SELECT = 'id, content_item_id, revision_number, type, slug, title, summary, body_blocks, cover_media_id, event_date, event_date_precision, event_date_is_approximate, authored_date, authored_date_precision, authored_date_is_approximate, author_display_name, recipient_display_name, place_text, relationship_context, created_at, created_by'
const REVISION_MEDIA_SELECT = 'revision_id, media_id, sort_order, caption_override, placement, storage_path, alt_text, caption, width, height, mime_type, byte_size'

function draftSource(findChapter: () => Promise<QueryResult<ChapterRow>>): ChapterDataSource {
  const db = createAdminClient()
  return {
    findChapter,
    async findActiveRevision(revisionId) {
      const { data, error } = await db.from('content_revisions').select(REVISION_SELECT).eq('id', revisionId).maybeSingle()
      return { data: data as RevisionRow | null, error }
    },
    async findLatestRevision(contentId) {
      const { data, error } = await db.from('content_revisions').select('id, revision_number, created_at')
        .eq('content_item_id', contentId).order('revision_number', { ascending: false }).limit(1).maybeSingle()
      return { data: data as RevisionMeta | null, error }
    },
    async listMedia(contentId) {
      const { data, error } = await db.from('content_media').select(`sort_order, caption_override, placement, media_assets (id, storage_path, alt_text, caption, width, height, mime_type, byte_size)`)
        .eq('content_id', contentId).order('sort_order', { ascending: true })
      return { data: data as unknown as ChapterMediaRow[] | null, error }
    },
    async listRevisionMedia(revisionId) {
      const { data, error } = await db.from('content_revision_media').select(REVISION_MEDIA_SELECT)
        .eq('revision_id', revisionId).order('sort_order', { ascending: true })
      return { data: data as RevisionMediaRow[] | null, error }
    },
    signMedia: generateSignedUrl,
  }
}

export async function getAdminChapter(id: string): Promise<ChapterLoadResult> {
  const db = createAdminClient()
  return loadChapterContent(draftSource(async () => {
    const { data, error } = await db.from('content_items').select(DRAFT_SELECT).eq('id', id).neq('type', 'home').maybeSingle()
    return { data: data as ChapterRow | null, error }
  }))
}

async function getSelectedRevisionForSlug(slug: string): Promise<{ data: RevisionRow | null; error: QueryError | null }> {
  const db = createAdminClient()
  const item = await db.from('content_items').select('id, active_published_revision_id').eq('slug', slug)
    .not('active_published_revision_id', 'is', null).neq('type', 'home').maybeSingle()
  if (item.error || !item.data?.active_published_revision_id) return { data: null, error: item.error }
  const revision = await db.from('content_revisions').select(REVISION_SELECT)
    .eq('id', item.data.active_published_revision_id).eq('content_item_id', item.data.id).maybeSingle()
  return { data: revision.data as RevisionRow | null, error: revision.error }
}

export async function getPublishedChapter(slug: string): Promise<ChapterLoadResult> {
  return loadAuthorizedFamilyData(async () => {
    if (slug === 'first-days') return { state: 'empty' } as const
    const db = createAdminClient()
    return loadPublishedChapterContent({
      findRevision: () => getSelectedRevisionForSlug(slug),
      async listRevisionMedia(revisionId) {
        const { data, error } = await db.from('content_revision_media').select(REVISION_MEDIA_SELECT)
          .eq('revision_id', revisionId).order('sort_order', { ascending: true })
        return { data: data as RevisionMediaRow[] | null, error }
      },
      signMedia: generateSignedUrl,
    })
  })
}

export interface ChapterIndexItem extends ChapterSemantics {
  id: string
  type: ManagedContentType
  slug: string
  title: string
  summary: string | null
  publishedAt: string
  cover: { signedUrl: string; altText: string } | null
}
export type ChapterIndexResult = { state: 'error' } | { state: 'ready'; items: ChapterIndexItem[] }

export async function listPublishedChapters(): Promise<ChapterIndexResult> {
  return loadAuthorizedFamilyData(async () => {
    const db = createAdminClient()
    const itemsResult = await db.from('content_items').select('id, active_published_revision_id')
      .not('active_published_revision_id', 'is', null).neq('type', 'home').neq('slug', 'first-days')
    if (itemsResult.error) return { state: 'error' }
    const pointers = new Map((itemsResult.data ?? []).map(item => [item.active_published_revision_id as string, item.id]))
    if (pointers.size === 0) return { state: 'ready', items: [] }
    const revisions = await db.from('content_revisions').select(REVISION_SELECT)
      .in('id', [...pointers.keys()]).order('created_at', { ascending: false }).order('id', { ascending: true })
    if (revisions.error) return { state: 'error' }
    const rows = (revisions.data ?? []) as RevisionRow[]
    const covers = new Map<string, RevisionMediaRow>()
    const coverPairs = rows.filter(row => row.cover_media_id).map(row => ({ revision: row.id, media: row.cover_media_id! }))
    if (coverPairs.length) {
      const coverRows = await db.from('content_revision_media').select(REVISION_MEDIA_SELECT)
        .in('revision_id', coverPairs.map(pair => pair.revision)).in('media_id', coverPairs.map(pair => pair.media))
      if (coverRows.error) return { state: 'error' }
      for (const cover of (coverRows.data ?? []) as RevisionMediaRow[]) covers.set(`${cover.revision_id}:${cover.media_id}`, cover)
    }
    const items = await Promise.all(rows.map(async row => {
      let cover: ChapterIndexItem['cover'] = null
      const asset = row.cover_media_id ? covers.get(`${row.id}:${row.cover_media_id}`) : null
      if (asset) {
        try { cover = { signedUrl: await generateSignedUrl(asset.storage_path), altText: asset.alt_text?.trim() || 'Family photograph' } } catch { cover = null }
      }
      return {
        id: row.content_item_id, type: row.type as ManagedContentType, slug: row.slug, title: row.title,
        summary: row.summary, publishedAt: row.created_at, ...semantics(row), cover,
      }
    }))
    return { state: 'ready', items }
  })
}

export { getSelectedRevisionForSlug, REVISION_MEDIA_SELECT }
