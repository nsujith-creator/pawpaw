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

const statusBadge = (status: string): React.CSSProperties => ({
  display: 'inline-block', fontSize: '0.6875rem', fontWeight: 600,
  padding: '0.125rem 0.5rem', borderRadius: '9999px',
  background: status === 'published' ? '#dcfce7' : '#f3f4f6',
  color: status === 'published' ? '#166534' : '#4b5563',
})

const filterControl: React.CSSProperties = {
  padding: '0.4375rem 0.625rem', border: '1px solid #d1d5db', borderRadius: '0.375rem',
  fontSize: '0.8125rem', background: '#fff', color: '#1a1a2e',
}

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
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', color: '#1a1a2e' }}>
          Dashboard
        </h1>
        <p role="alert" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#dc2626' }}>
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
  const hasFilters = Boolean(filters.query || filters.status !== 'all' || filters.type !== 'all')

  const statCard: React.CSSProperties = {
    display: 'block', background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '0.5rem', padding: '1rem 1.25rem', minWidth: '8rem',
    textDecoration: 'none',
  }
  const quickLink: React.CSSProperties = {
    display: 'block', background: '#fff', border: '1px solid #e5e7eb',
    borderRadius: '0.5rem', padding: '1rem 1.25rem', fontWeight: 500,
    textDecoration: 'none', color: '#1a1a2e',
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', marginBottom: '1.5rem', color: '#1a1a2e' }}>
        Dashboard
      </h1>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <a href="/admin/content?status=draft" style={statCard}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Drafts</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{draftCount}</p>
        </a>
        <a href="/admin/content?status=published" style={statCard}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Published</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{publishedCount}</p>
        </a>
        <a href="/admin/media" style={statCard}>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>Media files</p>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1a1a2e', lineHeight: 1 }}>{mediaResult.count ?? 0}</p>
        </a>
      </div>

      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>
        Quick access
      </h2>
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <a href="/admin/home" style={quickLink}>Home page &rarr;</a>
        <a href="/admin/content" style={quickLink}>Content library &rarr;</a>
        <a href="/admin/media" style={quickLink}>Media library &rarr;</a>
      </div>

      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>
        Recently updated
      </h2>

      <form method="GET" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input
          name="q"
          type="search"
          defaultValue={filters.query}
          placeholder="Search by title"
          aria-label="Search content by title"
          style={{ ...filterControl, minWidth: '13rem', flex: '1 1 13rem' }}
        />
        <select name="status" defaultValue={filters.status} aria-label="Filter by status" style={filterControl}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select name="type" defaultValue={filters.type} aria-label="Filter by content type" style={filterControl}>
          <option value="all">All types</option>
          {CONTENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </select>
        <button type="submit" style={{ ...filterControl, background: '#1a1a2e', color: '#fff', border: 'none' }}>
          Apply
        </button>
        <a href="/admin" style={{ ...filterControl, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Clear
        </a>
      </form>

      {allItems.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>Nothing saved yet.</p>
      ) : recentItems.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          No content matches these filters. <a href="/admin" style={{ textDecoration: 'underline' }}>Clear filters</a>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {recentItems.map(item => {
            const published = publishedTimestamp(item)
            return (
              <article
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem 1rem',
                  background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', flexWrap: 'wrap',
                }}
              >
                {item.signedThumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.signedThumbnail}
                    alt={item.firstMedia?.altText ?? `First attached photo for ${item.title ?? 'this content'}`}
                    width={64}
                    height={64}
                    style={{ width: '4rem', height: '4rem', objectFit: 'cover', borderRadius: '0.375rem', flexShrink: 0 }}
                  />
                ) : (
                  <div aria-hidden="true" style={{ width: '4rem', height: '4rem', borderRadius: '0.375rem', background: '#f3f4f6', flexShrink: 0 }} />
                )}

                <div style={{ flex: 1, minWidth: '11rem' }}>
                  <p style={{ fontSize: '0.875rem', color: '#1a1a2e', fontWeight: 600 }}>
                    {item.title ?? '(untitled)'}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    Updated {formatAdminDateTime(item.updatedAt)}
                  </p>
                  {published && <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>{published}</p>}
                </div>

                <span style={{ fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.type}
                </span>
                <span style={statusBadge(item.status)}>{item.status}</span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap' }}>
                  {item.attachedMediaCount} photo{item.attachedMediaCount === 1 ? '' : 's'}
                </span>
                {item.type === 'home' && (
                  <a href="/admin/home" style={{ fontSize: '0.75rem', color: '#6b7280', textDecoration: 'underline' }}>Edit</a>
                )}
              </article>
            )
          })}
        </div>
      )}

      {hasFilters && recentItems.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Showing {recentItems.length} matching item{recentItems.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}
