// Trusted finalization of a direct-to-Storage upload.
// The browser uploads bytes straight to the private bucket with a signed
// upload token; nothing here trusts the client's claims. This core:
//   1. verifies the path belongs to the calling admin (no substitution);
//   2. verifies the object actually exists in Storage;
//   3. verifies the object's real size and MIME type as recorded by Storage;
//   4. removes invalid objects instead of registering them;
//   5. extracts metadata/palette from a server-side outbound download
//      (a function fetching FROM Storage — not a request payload, so the
//      Vercel request-body limit does not apply);
//   6. inserts media_assets and attaches content_media.
// Separated from the Server Action wrapper so integration tests can drive it
// directly against a live project.

import type { SupabaseClient } from '@supabase/supabase-js'
import { MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_TYPES } from './validate-upload'
import { pathBelongsTo } from './upload-path'
import { verifyImageBytes } from './image-metadata'
import { extractPalette } from './palette'

export interface FinalizeParams {
  path:      string
  altText:   string          // required accessibility text (img alt attribute)
  caption:   string | null   // optional visible caption shown with the photo
  contentId: string | null
}

export type FinalizeResult = { ok: true; mediaId: string } | { error: string }

export async function finalizeUploadCore(
  db: SupabaseClient,
  adminId: string,
  { path, altText, caption, contentId }: FinalizeParams,
): Promise<FinalizeResult> {
  if (!altText) return { error: 'Alt text is required before the photo can be saved.' }

  if (!pathBelongsTo(path, adminId)) {
    return { error: 'That upload does not belong to your account.' }
  }

  const { data: objectInfo, error: infoError } = await db.storage.from('media').info(path)
  if (infoError || !objectInfo) {
    return { error: 'The uploaded photo could not be found. Please upload it again.' }
  }

  const size = objectInfo.size ?? 0
  const mime = objectInfo.contentType ?? ''

  if (size === 0 || size > MAX_UPLOAD_BYTES || !ALLOWED_UPLOAD_TYPES.has(mime)) {
    // Invalid object: remove it rather than leaving it in the bucket.
    await db.storage.from('media').remove([path])
    return {
      error: size > MAX_UPLOAD_BYTES
        ? 'File exceeds 8 MB limit. The upload has been discarded.'
        : 'Unsupported or empty file. Use JPEG, PNG, or WebP up to 8 MB.',
    }
  }

  // Download and decode the entire object. Storage MIME metadata is not proof
  // that the bytes are a valid image of that format.
  let buffer: Buffer
  let palette: string[] | null = null
  try {
    const { data: blob, error: downloadError } = await db.storage.from('media').download(path)
    if (downloadError || !blob) throw new Error('download failed')
    buffer = Buffer.from(await blob.arrayBuffer())
  } catch {
    await db.storage.from('media').remove([path])
    return { error: 'The uploaded image could not be verified and was discarded.' }
  }

  const verified = await verifyImageBytes(buffer, mime)
  if (!verified || !verified.width || !verified.height) {
    await db.storage.from('media').remove([path])
    return { error: 'The file is malformed or does not match its image type. It was discarded.' }
  }
  const width = verified.width
  const height = verified.height
  try {
    palette = await extractPalette(buffer)
  } catch {
    palette = null
  }

  const { data: asset, error: dbError } = await db
    .from('media_assets')
    .insert({
      storage_path:      path,
      mime_type:         mime,
      byte_size:         size,
      width,
      height,
      alt_text:          altText,
      caption:           caption?.trim() || null,
      extracted_palette: palette,
      processing_status: 'ready',
      created_by:        adminId,
    })
    .select('id')
    .single()

  if (dbError || !asset?.id) {
    console.error('finalizeUploadCore media_assets insert failed:', dbError)
    // Do not leave an unregistered object behind.
    await db.storage.from('media').remove([path])
    return { error: 'The photo was uploaded but could not be saved. Please try again.' }
  }

  if (contentId) {
    const { error: attachError } = await db.rpc('attach_owned_media', {
      p_admin_id: adminId,
      p_content_id: contentId,
      p_media_id: asset.id,
    })
    if (attachError) {
      console.error('finalizeUploadCore content_media attach failed:', attachError)
      return { error: 'The photo was saved but could not be attached to the Home content.' }
    }
  }

  return { ok: true, mediaId: asset.id }
}
