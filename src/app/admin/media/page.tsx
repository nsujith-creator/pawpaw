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
import styles from '../admin.module.css'

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
      <div className={styles.page}>
        <p className={styles.eyebrow}>Photograph desk</p>
        <h1 className={styles.pageTitle}>Media library</h1>
        <p role="alert" className={styles.errorNotice}>The media list could not be loaded right now. Refresh the page to try again.</p>
      </div>
    )
  }

  const baseItems: ServerMediaItem[] = (rows ?? []).map(row => {
    const usage = ((row.content_media ?? []) as unknown as UsageRow[])
    const usageTitles = usage.map(item => item.content_items?.title?.trim() || '(untitled content)').sort((a, b) => a.localeCompare(b))
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

  const hasFilters = Boolean(filters.query || filters.type !== 'all' || filters.attachment !== 'all' || filters.sort !== 'newest')

  return (
    <div className={styles.page}>
      <header className={styles.splitHeader}>
        <div>
          <p className={styles.eyebrow}>Photograph desk</p>
          <h1 className={styles.pageTitle}>Media library</h1>
          <p className={styles.lede}>Review the private photographs already saved in Pawpaw and where each one is used.</p>
        </div>
        <span className={styles.countNote}>{items.length} of {baseItems.length} file{baseItems.length !== 1 ? 's' : ''}</span>
      </header>

      <form method="GET" className={styles.filterBar}>
        <input name="q" type="search" defaultValue={filters.query} placeholder="Search photos or usage" aria-label="Search media" className={styles.field} />
        <select name="type" defaultValue={filters.type} aria-label="Filter by image type" className={styles.select}>
          <option value="all">All image types</option>
          <option value="jpeg">JPEG</option>
          <option value="png">PNG</option>
          <option value="webp">WebP</option>
        </select>
        <select name="attachment" defaultValue={filters.attachment} aria-label="Filter by attachment status" className={styles.select}>
          <option value="all">Attached and unattached</option>
          <option value="attached">Attached</option>
          <option value="unattached">Unattached</option>
        </select>
        <select name="sort" defaultValue={filters.sort} aria-label="Sort media" className={styles.select}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button type="submit" className={styles.action}>Apply</button>
        <a href="/admin/media" className={styles.secondaryAction}>Clear</a>
      </form>

      {baseItems.length === 0 ? (
        <p className={styles.emptyState}>No photos uploaded yet. Upload photos from the <a href="/admin/home" className={styles.inlineLink}>Home page</a>.</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyState}>No media matches these filters. <a href="/admin/media" className={styles.inlineLink}>Clear filters</a>.</p>
      ) : (
        <MediaLibraryClient items={items} />
      )}

      {hasFilters && items.length > 0 && (
        <p className={styles.countNote}>Search covers alt text, caption, safe filename, and attached content titles.</p>
      )}
    </div>
  )
}
