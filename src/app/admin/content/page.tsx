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

const TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  story: 'Story',
  gallery: 'Gallery',
  letter: 'Letter',
  moment: 'Moment',
}

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
      <div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', color: '#1a1a2e' }}>
          Content library
        </h1>
        <p role="alert" style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#dc2626' }}>
          The content list could not be loaded right now. Refresh the page to try again.
        </p>
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
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.375rem', color: '#1a1a2e' }}>
            Content library
          </h1>
          <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: '#6b7280' }}>
            Home is the only editable content type in Phase 1.
          </p>
        </div>
        <button
          type="button"
          disabled
          aria-describedby="create-new-note"
          style={{ ...filterControl, cursor: 'not-allowed', color: '#9ca3af', background: '#f9fafb' }}
        >
          Create New — Release 2
        </button>
      </div>
      <p id="create-new-note" style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
        New Story, Gallery, Letter, and Moment editors arrive in Release 2. This disabled control never opens,
        preloads, or overwrites the Home singleton.
      </p>

      <form method="GET" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
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
          <option value="home">Home</option>
          <option value="story">Story</option>
          <option value="gallery">Gallery</option>
          <option value="letter">Letter</option>
          <option value="moment">Moment</option>
        </select>
        <button type="submit" style={{ ...filterControl, background: '#1a1a2e', color: '#fff', border: 'none' }}>
          Apply
        </button>
        <a href="/admin/content" style={{ ...filterControl, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          Clear
        </a>
      </form>

      {allItems.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>No content has been saved yet.</p>
      ) : items.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          No content matches these filters.{' '}
          <a href="/admin/content" style={{ textDecoration: 'underline', color: '#1a1a2e' }}>Clear filters</a>.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {items.map(item => (
            <article
              key={item.id}
              style={{
                background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem',
                padding: '0.875rem 1rem', display: 'flex', alignItems: 'center',
                gap: '0.875rem', flexWrap: 'wrap',
              }}
            >
              <span style={{
                fontSize: '0.6875rem', color: '#9ca3af', textTransform: 'uppercase',
                letterSpacing: '0.05em', minWidth: '3.5rem',
              }}>
                {TYPE_LABELS[item.type] ?? item.type}
              </span>
              <span style={{ flex: 1, fontSize: '0.875rem', color: '#1a1a2e', minWidth: '10rem' }}>
                {item.title ?? '(untitled)'}
              </span>
              <span style={statusBadge(item.status)}>{item.status}</span>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                Updated {formatAdminDateTime(item.updatedAt)}
              </span>
              {item.type === 'home' ? (
                <a href="/admin/home" style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#1a1a2e', textDecoration: 'underline', whiteSpace: 'nowrap' }}>
                  Open editor &rarr;
                </a>
              ) : (
                <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                  Editor coming in Release 2
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {hasFilters && items.length > 0 && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#6b7280' }}>
          Showing {items.length} matching item{items.length === 1 ? '' : 's'}.
        </p>
      )}
    </div>
  )
}
