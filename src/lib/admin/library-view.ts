export interface ContentViewItem {
  id: string
  title: string | null
  type: string
  status: 'unpublished' | 'published' | 'published-draft'
  updatedAt: string
  publishedAt: string | null
}

export interface ContentFilters {
  query: string
  status: 'all' | 'unpublished' | 'published' | 'published-draft'
  type: string
}

export interface AttachmentCandidate {
  sortOrder: number
  media: {
    id: string
    storagePath: string
    altText: string | null
  } | null
}

export interface MediaViewItem {
  mediaId: string
  createdAt: string
  mimeType: string | null
  altText: string
  caption: string | null
  fileName: string
  attachmentCount: number
  usageTitles: string[]
}

export interface MediaFilters {
  query: string
  type: 'all' | 'jpeg' | 'png' | 'webp'
  attachment: 'all' | 'attached' | 'unattached'
  sort: 'newest' | 'oldest'
}

function time(value: string): number {
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function searchable(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase('en-IN')
}

export function parseContentFilters(params: {
  q?: string
  status?: string
  type?: string
}): ContentFilters {
  const status = params.status === 'unpublished' || params.status === 'published' || params.status === 'published-draft'
    ? params.status
    : 'all'

  return {
    query: params.q?.trim() ?? '',
    status,
    type: params.type?.trim() || 'all',
  }
}

export function filterAndSortContent<T extends ContentViewItem>(
  items: T[],
  filters: ContentFilters,
): T[] {
  const query = searchable(filters.query)

  return [...items]
    .filter(item => !query || searchable(item.title).includes(query))
    .filter(item => filters.status === 'all' || item.status === filters.status)
    .filter(item => filters.type === 'all' || item.type === filters.type)
    .sort((a, b) => time(b.updatedAt) - time(a.updatedAt) || a.id.localeCompare(b.id))
}

export function summarizeAttachments(rows: AttachmentCandidate[]): {
  count: number
  first: AttachmentCandidate['media']
} {
  const ordered = [...rows].sort(
    (a, b) => a.sortOrder - b.sortOrder || (a.media?.id ?? '').localeCompare(b.media?.id ?? ''),
  )

  return {
    count: rows.length,
    first: ordered.find(row => row.media)?.media ?? null,
  }
}

export function formatAdminDateTime(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Unknown date'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(parsed)
}

export function publishedTimestamp(item: ContentViewItem): string | null {
  if ((item.status !== 'published' && item.status !== 'published-draft') || !item.publishedAt) return null
  return `Published ${formatAdminDateTime(item.publishedAt)}`
}

export function derivePublicationState(activeRevisionId: string | null, updatedAt: string, revisionCreatedAt: string | null): ContentViewItem['status'] {
  if (!activeRevisionId || !revisionCreatedAt) return 'unpublished'
  return Date.parse(updatedAt) > Date.parse(revisionCreatedAt) ? 'published-draft' : 'published'
}

export function safeStorageBasename(storagePath: string): string {
  const name = storagePath.split('/').filter(Boolean).at(-1)
  return name || 'photo'
}

export function parseMediaFilters(params: {
  q?: string
  type?: string
  attachment?: string
  sort?: string
}): MediaFilters {
  const type = params.type === 'jpeg' || params.type === 'png' || params.type === 'webp'
    ? params.type
    : 'all'
  const attachment = params.attachment === 'attached' || params.attachment === 'unattached'
    ? params.attachment
    : 'all'

  return {
    query: params.q?.trim() ?? '',
    type,
    attachment,
    sort: params.sort === 'oldest' ? 'oldest' : 'newest',
  }
}

export function filterAndSortMedia<T extends MediaViewItem>(
  items: T[],
  filters: MediaFilters,
): T[] {
  const query = searchable(filters.query)
  const mime = filters.type === 'jpeg' ? 'image/jpeg' : `image/${filters.type}`

  return [...items]
    .filter(item => {
      if (!query) return true
      return [item.altText, item.caption, item.fileName, ...item.usageTitles]
        .some(value => searchable(value).includes(query))
    })
    .filter(item => filters.type === 'all' || item.mimeType === mime)
    .filter(item => {
      if (filters.attachment === 'all') return true
      return filters.attachment === 'attached'
        ? item.attachmentCount > 0
        : item.attachmentCount === 0
    })
    .sort((a, b) => {
      const dateOrder = filters.sort === 'oldest'
        ? time(a.createdAt) - time(b.createdAt)
        : time(b.createdAt) - time(a.createdAt)
      return dateOrder || a.mediaId.localeCompare(b.mediaId)
    })
}
