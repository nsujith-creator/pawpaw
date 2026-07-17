import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import HomeEditor from './home-editor'
import UploadForm from '../media/upload-form'
import AttachmentList, { type AttachmentItem } from '../media/attachment-list'

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

export default async function AdminHomePage() {
  const supabase = await createClient()

  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const db = createAdminClient()

  const { data: item } = await db
    .from('content_items')
    .select('id, title, body_blocks, status, content_media(sort_order, media_assets(id, storage_path, alt_text, caption, mime_type, byte_size))')
    .eq('type', 'home')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const attachmentRows = ((item?.content_media ?? []) as unknown as AttachmentRow[])
    .sort((a, b) => a.sort_order - b.sort_order)

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
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', marginBottom: '0.5rem' }}>Home</h1>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1.5rem' }}>
        Changes appear on the family page after it is refreshed — an already-open
        page will not update by itself.
      </p>
      <HomeEditor existing={item ?? null} />

      <hr style={{ margin: '2rem 0', borderColor: '#e5e7eb' }} />
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '0.375rem' }}>
        Attached photos
      </h2>
      <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
        Uploading or attaching a photo saves it in Admin immediately.
        The family sees photos only after the Home page is published — use the Publish button above.
      </p>
      {item?.id ? (
        <AttachmentList contentId={item.id} items={attachments} />
      ) : (
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Save Home content first — photos attach to the saved content.
        </p>
      )}

      <hr style={{ margin: '2rem 0', borderColor: '#e5e7eb' }} />
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '1rem' }}>Upload a photo</h2>
      <UploadForm contentItemId={item?.id ?? null} />
    </div>
  )
}
