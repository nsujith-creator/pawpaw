import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import {
  filterAndSortContent,
  formatAdminDateTime,
  parseContentFilters,
  publishedTimestamp,
  summarizeAttachments,
  type AttachmentCandidate,
  type ContentViewItem,
} from '@/lib/admin/library-view'
import styles from './admin.module.css'

interface DashboardAttachmentRow {
  sort_order: number
  media_assets: {
    id: string
    storage_path: string
    alt_text: string | null
  } | null
}

interface DashboardItem extends ContentViewItem {
  attachedMediaCount: number
  firstMedia: AttachmentCandidate['media']
}

const CONTENT_TYPES = ['home', 'story', 'gallery', 'letter', 'moment'] as const

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string }>
}) {
  const supabase = await createClient()
  let admin: { id: string; email: string }
  try {
    admin = await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const filters = parseContentFilters(await searchParams)
  const db = createAdminClient()

  const [contentResult, mediaResult] = await Promise.all([
    db
      .from('content_items')
      .select(`
        id, type, title, status, updated_at, published_at,
        content_media (
          sort_order,
          media_assets (id, storage_path, alt_text)
        )
      `)
      .eq('created_by', admin.id)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true }),
    db
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', admin.id),
  ])

  if (contentResult.error || mediaResult.error) {
    console.error('AdminDashboard query failed:', contentResult.error ?? mediaResult.error)
    return (
      <div className={styles.page}>
        <p className={styles.eyebrow}>Author&apos;s studio</p>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        <p role="alert" className={styles.errorNotice}>
          Dashboard data could not be loaded right now. Refresh the page to try again.
        </p>
      </div>
    )
  }

  const allItems: DashboardItem[] = (contentResult.data ?? []).map(row => {
    const attachmentRows = ((row.content_media ?? []) as unknown as DashboardAttachmentRow[])
    const summary = summarizeAttachments(attachmentRows.map(attachment => ({
      sortOrder: attachment.sort_order,
      media: attachment.media_assets ? {
        id: attachment.media_assets.id,
        storagePath: attachment.media_assets.storage_path,
        altText: attachment.media_assets.alt_text,
      } : null,
    })))

    return {
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      updatedAt: row.updated_at,
      publishedAt: row.published_at,
      attachedMediaCount: summary.count,
      firstMedia: summary.first,
    }
  })

  const filteredItems = filterAndSortContent(allItems, filters).slice(0, 10)
  const recentItems = await Promise.all(filteredItems.map(async item => {
    if (!item.firstMedia) return { ...item, signedThumbnail: null as string | null }
    try {
      return { ...item, signedThumbnail: await generateSignedUrl(item.firstMedia.storagePath) }
    } catch (error) {
      console.error('AdminDashboard thumbnail signing failed:', error)
      return { ...item, signedThumbnail: null as string | null }
    }
  }))

  const draftCount = allItems.filter(item => item.status === 'draft').length
  const publishedCount = allItems.filter(item => item.status === 'published').length
  const missingAltMediaIds = new Set<string>()
  for (const row of contentResult.data ?? []) {
    const attachments = ((row.content_media ?? []) as unknown as DashboardAttachmentRow[])
    for (const attachment of attachments) {
      const media = attachment.media_assets
      if (media && !media.alt_text?.trim()) missingAltMediaIds.add(media.id)
    }
  }
  const missingAltCount = missingAltMediaIds.size
  const hasFilters = Boolean(filters.query || filters.status !== 'all' || filters.type !== 'all')

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Author&apos;s studio</p>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.lede}>The book is safe. Here is what is ready, what is live, and what needs attention.</p>
        </div>
      </header>

      <div className={styles.statsStrip} aria-label="Current studio counts">
        <a href="/admin/content?status=draft" className={styles.statLink}>
          <span className={styles.statNumber}>{draftCount}</span>
          <span className={styles.statLabel}>Drafts</span>
        </a>
        <a href="/admin/content?status=published" className={styles.statLink}>
          <span className={styles.statNumber}>{publishedCount}</span>
          <span className={styles.statLabel}>Published</span>
        </a>
        <a href="/admin/media" className={styles.statLink}>
          <span className={styles.statNumber}>{mediaResult.count ?? 0}</span>
          <span className={styles.statLabel}>Media files</span>
        </a>
      </div>

      <div className={styles.dashboardGrid}>
        <section className={styles.panel} aria-labelledby="continue-editing-title">
          <h2 id="continue-editing-title" className={styles.sectionTitle}>Continue editing</h2>
          <div className={styles.quickLinks}>
            <a href="/admin/home" className={styles.quickLink}>Home page</a>
            <a href="/admin/content" className={styles.quickLink}>Content library</a>
            <a href="/admin/media" className={styles.quickLink}>Media library</a>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="needs-attention-title">
          <h2 id="needs-attention-title" className={styles.sectionTitle}>Needs attention</h2>
          {missingAltCount > 0 || draftCount > 0 ? (
            <ul className={styles.attentionList}>
              {missingAltCount > 0 && (
                <li className={styles.attentionItem}>{missingAltCount} attached photo{missingAltCount === 1 ? '' : 's'} missing alt text</li>
              )}
              {draftCount > 0 && (
                <li className={styles.attentionItem}>{draftCount} unpublished draft{draftCount === 1 ? '' : 's'}</li>
              )}
            </ul>
          ) : (
            <p className={styles.emptyState}>Nothing needs attention.</p>
          )}
        </section>
      </div>

      <section aria-labelledby="recently-updated-title">
        <div className={styles.sectionHeader}>
          <h2 id="recently-updated-title" className={styles.sectionTitle}>Recently updated</h2>
        </div>

        <form method="GET" className={`${styles.filterBar} ${styles.filterBarCompact}`}>
          <input name="q" type="search" defaultValue={filters.query} placeholder="Search by title" aria-label="Search content by title" className={styles.field} />
          <select name="status" defaultValue={filters.status} aria-label="Filter by status" className={styles.select}>
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <select name="type" defaultValue={filters.type} aria-label="Filter by content type" className={styles.select}>
            <option value="all">All types</option>
            {CONTENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="submit" className={styles.action}>Apply</button>
          <a href="/admin" className={styles.secondaryAction}>Clear</a>
        </form>

        {allItems.length === 0 ? (
          <p className={styles.emptyState}>Nothing saved yet.</p>
        ) : recentItems.length === 0 ? (
          <p className={styles.emptyState}>No content matches these filters. <a href="/admin" className={styles.inlineLink}>Clear filters</a>.</p>
        ) : (
          <div className={styles.list}>
            {recentItems.map(item => {
              const published = publishedTimestamp(item)
              return (
                <article key={item.id} className={styles.recordRow}>
                  {item.signedThumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.signedThumbnail} alt={item.firstMedia?.altText ?? `First attached photo for ${item.title ?? 'this content'}`} width={64} height={64} className={styles.recordThumb} />
                  ) : (
                    <div aria-hidden="true" className={`${styles.recordPlaceholder} ${styles.recordThumb}`} />
                  )}
                  <div className={styles.recordContent}>
                    <p className={styles.recordTitle}>{item.title ?? '(untitled)'}</p>
                    <p className={styles.recordMeta}>Updated {formatAdminDateTime(item.updatedAt)}</p>
                    {published && <p className={styles.recordMeta}>{published}</p>}
                  </div>
                  <span className={styles.recordType}>{item.type}</span>
                  <span className={`${styles.badge} ${item.status === 'published' ? styles.badgePublished : styles.badgeDraft}`}>{item.status}</span>
                  <span className={styles.recordMeta}>{item.attachedMediaCount} photo{item.attachedMediaCount === 1 ? '' : 's'}</span>
                  {item.type === 'home' && <a href="/admin/home" className={styles.inlineLink}>Edit</a>}
                </article>
              )
            })}
          </div>
        )}

        {hasFilters && recentItems.length > 0 && (
          <p className={styles.countNote}>Showing {recentItems.length} matching item{recentItems.length === 1 ? '' : 's'}.</p>
        )}
      </section>
    </div>
  )
}
