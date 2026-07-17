import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import {
  filterAndSortMedia,
  parseMediaFilters,
  safeStorageBasename,
  type MediaViewItem,
} from '@/lib/admin/library-view'
import MediaLibraryClient, { type MediaLibraryItem } from './media-library-client'

interface UsageRow {
  content_id: string
  content_items: { title: string | null } | null
}

interface ServerMediaItem extends MediaViewItem {
  sizeLabel: string
  storagePath: string
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const filterControl: React.CSSProperties = {
  padding: '0.4375rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem',
  fontSize: '0.8125rem', background: '#fff', color: '#1a1a2e',
}

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; attachment?: string; sort?: string }>
}) {
  const supabase = await createClient()
  let admin: { id: string; email: string }
  try {
    admin = await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const filters = parseMediaFilters(await searchParams)
  const db = createAdminClient()

  const { data: rows, error: queryError } = await db
    .from('media_assets')
    .select(`
      id, storage_path, alt_text, caption, mime_type, byte_size, created_at,
      content_media (
        content_id,
        content_items (title)
      )
    `)
    .eq('created_by', admin.id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })

  if (queryError) {
    console.error('MediaLibraryPage query failed:', queryError)
    return (
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', color: '#1a1a2e' }}>
          Media library
        </h1>
        <p role="alert" style={{ fontSize: '0.875rem', color: '#dc2626', marginTop: '1rem' }}>
          The media list could not be loaded right now. Refresh the page to try again.
        </p>
      </div>
    )
  }

  const baseItems: ServerMediaItem[] = (rows ?? []).map(row => {
    const usage = ((row.content_media ?? []) as unknown as UsageRow[])
    const usageTitles = usage
      .map(item => item.content_items?.title?.trim() || '(untitled content)')
      .sort((a, b) => a.localeCompare(b))

    return {
      mediaId: row.id,
      altText: row.alt_text ?? '',
      caption: row.caption ?? null,
      mimeType: row.mime_type ?? null,
      sizeLabel: formatSize(row.byte_size),
      createdAt: row.created_at,
      fileName: safeStorageBasename(row.storage_path),
      attachmentCount: usage.length,
      usageTitles,
      storagePath: row.storage_path,
    }
  })

  const filteredItems = filterAndSortMedia(baseItems, filters)
  const items: MediaLibraryItem[] = await Promise.all(filteredItems.map(async item => {
    let signedUrl: string | null = null
    try {
      signedUrl = await generateSignedUrl(item.storagePath)
    } catch (error) {
      console.error('MediaLibraryPage thumbnail signing failed:', error)
    }

    return {
      mediaId: item.mediaId,
      signedUrl,
      altText: item.altText,
      caption: item.caption,
      mimeType: item.mimeType,
      sizeLabel: item.sizeLabel,
      createdAt: item.createdAt,
      fileName: item.fileName,
      attachmentCount: item.attachmentCount,
      usageTitles: item.usageTitles,
    }
  }))

  const hasFilters = Boolean(
    filters.query || filters.type !== 'all' || filters.attachment !== 'all' || filters.sort !== 'newest',
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', color: '#1a1a2e', margin: 0 }}>
          Media library
        </h1>
        <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
          {items.length} of {baseItems.length} file{baseItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      <form method="GET" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder="Search photos or usage"
          aria-label="Search media"
          style={{ ...filterControl, minWidth: '14rem', flex: '1 1 14rem' }}
        />
        <select name="type" defaultValue={filters.type} aria-label="Filter by image type" style={filterControl}>
          <option value="all">All image types</option>
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
        <select name="attachment" defaultValue={filters.attachment} aria-label="Filter by attachment status" style={filterControl}>
          <option value="all">Attached and unattached</option>
          <option value="attached">Attached</option>
          <option value="unattached">Unattached</option>
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort media" style={filterControl}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button type="submit" style={{ ...filterControl, background: '#1a1a2e', color: '#fff', border: 'none' }}>
          Apply
        </button>
        <a href="/admin/media" style={{ ...filterControl, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Clear
        </a>
      </form>

      {baseItems.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          No photos uploaded yet. Upload photos from the{' '}
          <a href="/admin/home" style={{ textDecoration: 'underline', color: '#1a1a2e' }}>Home page</a>.
        </p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          No media matches these filters.{' '}
          <a href="/admin/media" style={{ textDecoration: 'underline', color: '#1a1a2e' }}>Clear filters</a>.
        </p>
      ) : (
        <MediaLibraryClient items={items} />
      )}

      {hasFilters && items.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Search covers alt text, caption, safe filename, and attached content titles.
        </p>
      )}
    </div>
  )
}
