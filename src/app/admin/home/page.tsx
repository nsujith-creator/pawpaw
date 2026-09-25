import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { loadCanonicalAdminHome } from '@/lib/content/manage-home'
import { blocksToPlainText } from '@/lib/content/plain-text'
import { requireAdminPage } from '@/lib/admin/require-admin-page'
import AdminState from '../admin-state'
import HomeEditor, { type HomePhoto } from './home-editor'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Home' }

interface HomeRow {
  id: string
  title: string
  body_blocks: unknown[]
  status: 'draft' | 'published'
  updated_at: string
  content_media: { sort_order: number; media_assets: { id: string; storage_path: string; alt_text: string | null; caption: string | null } | null }[]
}

export default async function AdminHomePage() {
  await requireAdminPage()
  const db = createAdminClient()
  const home = await loadCanonicalAdminHome<HomeRow>(async () => {
    const { data, error } = await db.from('content_items')
      .select('id, title, body_blocks, status, updated_at, content_media(sort_order, media_assets(id, storage_path, alt_text, caption))')
      .eq('type', 'home').eq('slug', 'home').limit(2)
    return { rows: data as unknown as HomeRow[] | null, error }
  })
  if (home.state === 'error') return <AdminState title="Home didn't load." body="Nothing was changed. Reload in a minute." />
  const item = home.state === 'ready' ? home.item : null
  const photos: HomePhoto[] = await Promise.all([...(item?.content_media ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .flatMap(row => row.media_assets ? [row.media_assets] : [])
    .map(async asset => ({
      id: asset.id, url: await generateSignedUrl(asset.storage_path),
      altText: asset.alt_text?.trim() || 'Varada', caption: asset.caption,
    })))

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Home</h1>
      </div>
      <p className={styles.lede}>The first page the family sees. Changes go up when you press Update Home.</p>
      <HomeEditor
        id={item?.id ?? null}
        title={item?.title || 'Varada'}
        note={blocksToPlainText(item?.body_blocks ?? [])}
        live={item?.status === 'published'}
        photos={photos}
      />
    </main>
  )
}
