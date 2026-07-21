import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import HomeEditor from './home-editor'
import UploadForm from '../media/upload-form'
import AttachmentList, { type AttachmentItem } from '../media/attachment-list'
import { loadCanonicalAdminHome } from '@/lib/content/manage-home'
import styles from '../admin.module.css'

interface AttachmentRow {
  sort_order:   number
  media_assets: {
    id:           string
    storage_path: string
    alt_text:     string | null
    caption:      string | null
    mime_type:    string | null
    byte_size:    number | null
  }
}

interface AdminHomeItem {
  id: string
  title: string
  body_blocks: unknown[]
  status: 'draft' | 'published'
  content_media: AttachmentRow[]
}

export default async function AdminHomePage() {
  const supabase = await createClient()

  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const db = createAdminClient()

  const homeResult = await loadCanonicalAdminHome<AdminHomeItem>(async () => {
    const { data, error } = await db
      .from('content_items')
      .select('id, title, body_blocks, status, content_media(sort_order, media_assets(id, storage_path, alt_text, caption, mime_type, byte_size))')
      .eq('type', 'home')
      .eq('slug', 'home')
      .limit(2)
    return { rows: data as unknown as AdminHomeItem[] | null, error }
  })

  if (homeResult.state === 'error') {
    return (
      <div className={styles.pageNarrow}>
        <p className={styles.eyebrow}>Home page editor</p>
        <h1 className={styles.pageTitle}>Home</h1>
        <p role="alert" className={styles.errorNotice}>
          Home could not be loaded. Nothing has been changed; please try again later.
        </p>
      </div>
    )
  }

  const item = homeResult.state === 'ready' ? homeResult.item : null

  const attachmentRows = ((item?.content_media ?? []) as unknown as AttachmentRow[])
    .sort((a, b) => a.sort_order - b.sort_order || a.media_assets.id.localeCompare(b.media_assets.id))

  const attachments: AttachmentItem[] = await Promise.all(
    attachmentRows.map(async (row) => {
      let signedUrl: string | null = null
      try {
        signedUrl = await generateSignedUrl(row.media_assets.storage_path)
      } catch {
        // Thumbnail unavailable — the row still renders with its controls.
      }
      return {
        mediaId:   row.media_assets.id,
        signedUrl,
        altText:   row.media_assets.alt_text ?? '',
        caption:   row.media_assets.caption,
        mimeType:  row.media_assets.mime_type,
        byteSize:  row.media_assets.byte_size,
        sortOrder: row.sort_order,
      }
    }),
  )

  return (
    <div className={styles.pageNarrow}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Home page editor</p>
          <h1 className={styles.pageTitle}>Home</h1>
          <p className={styles.lede}>
        Changes appear on the family page after it is refreshed — an already-open
        page will not update by itself.
          </p>
        </div>
      </header>
      <section className={styles.editorSection} aria-label="Home words and publication">
        <HomeEditor existing={item ?? null} />
      </section>

      <hr className={styles.sectionDivider} />
      <h2 className={styles.sectionTitle}>Attached photos</h2>
      <p className={styles.lede}>
        Uploading or attaching a photo saves it in Admin immediately.
        The family sees photos only after the Home page is published — use the Publish button above.
      </p>
      {item?.id ? (
        <AttachmentList contentId={item.id} items={attachments} />
      ) : (
        <p className={styles.emptyState}>
          Save Home content first — photos attach to the saved content.
        </p>
      )}

      <hr className={styles.sectionDivider} />
      <section className={styles.editorSection} aria-labelledby="upload-photo-title">
        <h2 id="upload-photo-title" className={styles.sectionTitle}>Upload a photo</h2>
        <UploadForm contentItemId={item?.id ?? null} />
      </section>
    </div>
  )
}
