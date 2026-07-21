import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  filterAndSortContent,
  formatAdminDateTime,
  parseContentFilters,
  type ContentViewItem,
} from '@/lib/admin/library-view'
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
    .select('id, type, slug, title, status, updated_at, published_at')
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

  const allItems: ContentViewItem[] = (data ?? []).map(item => ({
    id: item.id,
    title: item.title,
    type: item.type,
    status: item.status,
    updatedAt: item.updated_at,
    publishedAt: item.published_at,
  }))
  const items = filterAndSortContent(allItems, filters)
  const hasFilters = Boolean(filters.query || filters.status !== 'all' || filters.type !== 'all')

  return (
    <div className={styles.page}>
      <header className={styles.splitHeader}>
        <div>
          <p className={styles.eyebrow}>Studio records</p>
          <h1 className={styles.pageTitle}>Content library</h1>
          <p className={styles.lede}>Find every saved page and see what is still a draft or already published.</p>
        </div>
        <button type="button" disabled aria-describedby="create-new-note" className={styles.disabledAction}>
          Create New — Release 2
        </button>
      </header>
      <p id="create-new-note" className={styles.informationNotice}>
        Home is the only editable content type in Phase 1. New Story, Gallery, Letter, and Moment editors arrive in Release 2. This disabled control never opens, preloads, or overwrites the Home singleton.
      </p>

      <form method="GET" className={`${styles.filterBar} ${styles.filterBarCompact}`}>
        <input name="q" type="search" defaultValue={filters.query} placeholder="Search by title" aria-label="Search content by title" className={styles.field} />
        <select name="status" defaultValue={filters.status} aria-label="Filter by status" className={styles.select}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
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
        <a href="/admin/content" className={styles.secondaryAction}>Clear</a>
      </form>

      {allItems.length === 0 ? (
        <p className={styles.emptyState}>No content has been saved yet.</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyState}>No content matches these filters. <a href="/admin/content" className={styles.inlineLink}>Clear filters</a>.</p>
      ) : (
        <div className={styles.list}>
          {items.map(item => (
            <article key={item.id} className={styles.recordRow}>
              <span className={styles.recordType}>{TYPE_LABELS[item.type] ?? item.type}</span>
              <span className={styles.recordTitle}>{item.title ?? '(untitled)'}</span>
              <span className={`${styles.badge} ${item.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{item.status}</span>
              <span className={styles.recordMeta}>Updated {formatAdminDateTime(item.updatedAt)}</span>
              {item.type === 'home' ? (
                <a href="/admin/home" className={styles.inlineLink}>Open editor →</a>
              ) : (
                <span className={styles.recordMeta}>Editor coming in Release 2</span>
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
