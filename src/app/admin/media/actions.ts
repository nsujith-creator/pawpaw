'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { extractImageMetadata } from '@/lib/media/image-metadata'
import { extractPalette } from '@/lib/media/palette'

const MAX_BYTES     = 8 * 1024 * 1024  // 8 MB application limit
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export async function uploadMedia(formData: FormData) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  const admin    = await requireActiveAdmin(supabase)

  const file        = formData.get('file') as File | null
  const altText     = (formData.get('alt_text') as string | null)?.trim() ?? null
  const contentId   = (formData.get('content_id') as string | null) ?? null

  if (!file || file.size === 0) return { error: 'No file selected.' }
  if (!ALLOWED_TYPES.has(file.type)) return { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }
  if (file.size > MAX_BYTES) return { error: `File exceeds 8 MB limit (got ${(file.size / 1024 / 1024).toFixed(1)} MB).` }
  if (!altText) return { error: 'Alt text is required before upload.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext    = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path   = `${admin.id}/${Date.now()}.${ext}`

  const db = createAdminClient()

  const { error: uploadError } = await db.storage
    .from('media')
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) return { error: 'Upload failed: ' + uploadError.message }

  // Process metadata — non-fatal if sharp is unavailable.
  const meta    = await extractImageMetadata(buffer)
  const palette = await extractPalette(buffer)

  const { data: asset, error: dbError } = await db
    .from('media_assets')
    .insert({
      storage_path:      path,
      mime_type:         file.type,
      byte_size:         file.size,
      width:             meta.width,
      height:            meta.height,
      alt_text:          altText,
      extracted_palette: palette,
      processing_status: meta.width ? 'ready' : 'pending',
      created_by:        admin.id,
    })
    .select('id')
    .single()

  if (dbError) return { error: 'Metadata save failed: ' + dbError.message }

  // Attach to content item if provided.
  if (contentId && asset?.id) {
    const { data: maxRow } = await db
      .from('content_media')
      .select('sort_order')
      .eq('content_id', contentId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    await db.from('content_media').insert({
      content_id: contentId,
      media_id:   asset.id,
      sort_order: (maxRow?.sort_order ?? -1) + 1,
    })
  }

  revalidatePath('/admin/home')
  return { ok: true, mediaId: asset?.id }
}
