import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { requireAdminPage } from '@/lib/admin/require-admin-page'
import AdminState from '../admin-state'
import PhotoLibrary, { type LibraryItem } from './photo-library'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Photos' }

const PAGE = 60

interface Row {
  id: string
  storage_path: string
  alt_text: string | null
  caption: string | null
  content_media: { content_items: { id: string; title: string; type: string } | null }[]
}

export default async function PhotosPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdminPage()
  const page = Math.max(1, Number((await searchParams).page) || 1)
  const db = createAdminClient()
  const { data, error, count } = await db.from('media_assets')
    .select('id, storage_path, alt_text, caption, content_media(content_items(id, title, type))', { count: 'exact' })
    .eq('processing_status', 'ready')
    .order('created_at', { ascending: false }).order('id', { ascending: true })
    .range((page - 1) * PAGE, page * PAGE - 1)
  if (error) return <AdminState title="Photos didn't load." body="Nothing was changed. Reload in a minute." />
  const rows = (data ?? []) as unknown as Row[]

  // A photo that has ever been on her page stays, so older versions of a story never lose it.
  const ids = rows.map(row => row.id)
  const kept = ids.length
    ? await db.from('content_revision_media').select('media_id').in('media_id', ids)
    : { data: [] as { media_id: string }[], error: null }
  if (kept.error) return <AdminState title="Photos didn't load." body="Nothing was changed. Reload in a minute." />
  const everPublished = new Set((kept.data ?? []).map(row => row.media_id))

  const items: LibraryItem[] = await Promise.all(rows.map(async row => ({
    id: row.id,
    url: await generateSignedUrl(row.storage_path),
    altText: row.alt_text?.trim() || 'Family photograph',
    caption: row.caption,
    usedIn: row.content_media.flatMap(use => use.content_items ? [{ id: use.content_items.id, title: use.content_items.type === 'home' ? 'Home' : use.content_items.title, home: use.content_items.type === 'home' }] : []),
    deletable: row.content_media.length === 0 && !everPublished.has(row.id),
  })))
  const total = count ?? items.length
  const pages = Math.max(1, Math.ceil(total / PAGE))

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Photos</h1>
      </div>
      <p className={styles.lede}>{total} photo{total === 1 ? '' : 's'}. Add as many as you like at once; keep this page open while they go up.</p>
      <PhotoLibrary items={items} />
      {pages > 1 && (
        <nav className={styles.pager} aria-label="More photos">
          {page > 1 ? <Link href={`/admin/media?page=${page - 1}`}>← Newer</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={`/admin/media?page=${page + 1}`}>Older →</Link> : <span />}
        </nav>
      )}
    </main>
  )
}
