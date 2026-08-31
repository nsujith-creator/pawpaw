import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  filterAndSortContent,
  formatAdminDateTime,
  parseContentFilters,
  type ContentViewItem,
} from '@/lib/admin/library-view'
import {
  draftMatchesRevision,
  type ChapterRow,
  type RevisionMediaRow,
  type RevisionRow,
} from '@/lib/content/chapters'
import styles from '../admin.module.css'

const TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  story: 'Story',
  gallery: 'Gallery',
  letter: 'Letter',
  moment: 'Moment',
}

export default async function ContentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}) {
  const supabase = await createClient()
  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const filters = parseContentFilters(await searchParams)
  const db = createAdminClient()
  const { data, error } = await db
    .from('content_items')
    .select(`
      id, type, slug, title, summary, body_blocks, status, cover_media_id,
      published_at, active_published_revision_id,
      event_date, event_date_precision, event_date_is_approximate,
      authored_date, authored_date_precision, authored_date_is_approximate,
      author_display_name, recipient_display_name, place_text, relationship_context,
      created_at, updated_at, created_by,
      content_media (
        sort_order, caption_override, placement,
        media_assets (id, storage_path, alt_text, caption, width, height, mime_type, byte_size)
      )
    `)
    .order('updated_at', { ascending: false })
    .order('id', { ascending: true })

  if (error) {
    console.error('ContentLibraryPage query failed:', error)
    return (
      <div className={styles.page}>
        <p className={styles.eyebrow}>Studio records</p>
        <h1 className={styles.pageTitle}>Content library</h1>
        <p role="alert" className={styles.errorNotice}>The content list could not be loaded right now. Refresh the page to try again.</p>
      </div>
    )
  }

  const revisionIds = (data ?? []).map(item => item.active_published_revision_id).filter((id): id is string => Boolean(id))
  const revisionMap = new Map<string, RevisionRow & { content_revision_media: RevisionMediaRow[] }>()
  if (revisionIds.length > 0) {
    const revisions = await db.from('content_revisions').select(`
      id, content_item_id, revision_number, type, slug, title, summary, body_blocks,
      cover_media_id, event_date, event_date_precision, event_date_is_approximate,
      authored_date, authored_date_precision, authored_date_is_approximate,
      author_display_name, recipient_display_name, place_text, relationship_context,
      created_at, created_by,
      content_revision_media!content_revision_media_revision_id_fkey (revision_id, media_id, sort_order, caption_override, placement, storage_path, alt_text, caption, width, height, mime_type, byte_size)
    `).in('id', revisionIds)
    if (revisions.error) {
      console.error('ContentLibraryPage revision query failed:', revisions.error)
      return <div className={styles.page}><p role="alert" className={styles.errorNotice}>Publication state could not be loaded safely. Refresh the page to try again.</p></div>
    }
    for (const revision of revisions.data ?? []) revisionMap.set(revision.id, revision as unknown as RevisionRow & { content_revision_media: RevisionMediaRow[] })
  }

  const allItems: ContentViewItem[] = (data ?? []).map(item => {
    const active = item.active_published_revision_id ? revisionMap.get(item.active_published_revision_id) ?? null : null
    const draftMedia: RevisionMediaRow[] = ((item.content_media ?? []) as unknown as Array<{
      sort_order: number
      caption_override: string | null
      placement: string | null
      media_assets: Omit<RevisionMediaRow, 'media_id' | 'sort_order' | 'caption_override'> & { id: string } | null
    }>).flatMap(attachment => attachment.media_assets ? [{
      revision_id: undefined,
      media_id: attachment.media_assets.id,
      sort_order: attachment.sort_order,
      caption_override: attachment.caption_override,
      placement: attachment.placement,
      storage_path: attachment.media_assets.storage_path,
      alt_text: attachment.media_assets.alt_text,
      caption: attachment.media_assets.caption,
      width: attachment.media_assets.width,
      height: attachment.media_assets.height,
      mime_type: attachment.media_assets.mime_type,
      byte_size: attachment.media_assets.byte_size,
    }] : [])
    const status: ContentViewItem['status'] = item.type === 'home'
      ? item.status === 'published' ? 'published' : 'unpublished'
      : !active ? 'unpublished'
        : draftMatchesRevision(item as unknown as ChapterRow, draftMedia, active, active.content_revision_media ?? []) ? 'published' : 'published-draft'
    return {
      id: item.id, title: item.title, type: item.type, status, updatedAt: item.updated_at,
      publishedAt: item.type === 'home' ? item.published_at : active?.created_at ?? null,
    }
  })
  const items = filterAndSortContent(allItems, filters)
  const hasFilters = Boolean(filters.query || filters.status !== 'all' || filters.type !== 'all')

  return (
    <div className={styles.page}>
      <header className={styles.splitHeader}>
        <div>
          <p className={styles.eyebrow}>Every page you’ve begun</p>
          <h1 className={styles.pageTitle}>Memories</h1>
          <p className={styles.lede}>Find an old thread, continue a draft, or begin something new for Varada.</p>
        </div>
        <Link href="/admin/content/new" className={styles.action}>Create a memory</Link>
      </header>
      <p className={styles.informationNotice}>
        Choose Story for words, Gallery when photographs lead, Letter for something she may read one day, or Moment for a dated milestone. Write, add moments, preview, then share when it feels right.
      </p>

      <form method="GET" className={`${styles.filterBar} ${styles.filterBarCompact}`}>
        <input name="q" type="search" defaultValue={filters.query} placeholder="Search by title" aria-label="Search content by title" className={styles.field} />
        <select name="status" defaultValue={filters.status} aria-label="Filter by status" className={styles.select}>
          <option value="all">All statuses</option>
          <option value="unpublished">Unpublished draft</option>
          <option value="published">Published and unchanged</option>
          <option value="published-draft">Published with newer private draft</option>
        </select>
        <select name="type" defaultValue={filters.type} aria-label="Filter by content type" className={styles.select}>
          <option value="all">All types</option>
          <option value="home">Home</option>
          <option value="story">Story</option>
          <option value="gallery">Gallery</option>
          <option value="letter">Letter</option>
          <option value="moment">Moment</option>
        </select>
        <button type="submit" className={styles.action}>Apply</button>
        <Link href="/admin/content" className={styles.secondaryAction}>Clear</Link>
      </form>

      {allItems.length === 0 ? (
        <p className={styles.emptyState}>No content has been saved yet.</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyState}>No content matches these filters. <Link href="/admin/content" className={styles.inlineLink}>Clear filters</Link>.</p>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <article key={item.id} className={styles.recordRow}>
              <span className={styles.recordType}>{TYPE_LABELS[item.type] ?? item.type}</span>
              <span className={styles.recordTitle}>{item.title ?? '(untitled)'}</span>
              <span className={`${styles.badge} ${item.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{item.status === 'unpublished' ? 'unpublished draft' : item.status === 'published-draft' ? 'published + newer draft' : 'published unchanged'}</span>
              <span className={styles.recordMeta}>Updated {formatAdminDateTime(item.updatedAt)}</span>
              {item.type === 'home' ? (
                <a href="/admin/home" className={styles.inlineLink}>Open editor →</a>
              ) : (
                <Link href={`/admin/content/${item.id}`} className={styles.inlineLink}>Open editor →</Link>
              )}
            </article>
          ))}
        </div>
      )}

      {hasFilters && items.length > 0 && (
        <p className={styles.countNote}>Showing {items.length} matching item{items.length === 1 ? '' : 's'}.</p>
      )}
    </div>
  )
}
