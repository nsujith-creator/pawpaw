'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { deletePrivateVideo } from '@/lib/video/cloudflare'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { validateUploadFile } from '@/lib/media/validate-upload'
import { buildUploadPath } from '@/lib/media/upload-path'
import { finalizeUploadCore } from '@/lib/media/finalize-upload'
import { sweepOrphans } from '@/lib/media/orphan-sweep'
import { isValidId } from '@/lib/content/manage-content'
import { generateSignedUrl } from '@/lib/media/private-url'
import { PHOTO_WIDTHS } from '@/lib/media/media-token'
import { createHash } from 'node:crypto'
import {
  attachMediaCore,
  updateMediaDetailsCore,
  reorderAttachmentCore,
  detachMediaSafelyCore,
  replaceAttachmentCore,
  setCoverMediaCore,
} from '@/lib/media/manage-media'

let lastSweep = 0

async function requireAdminWithOrigin() {
  checkOrigin(await headers())
  const supabase = await createClient()
  return requireActiveAdmin(supabase)
}

async function revalidateTarget(contentId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('content_items')
    .select('id, type, slug')
    .eq('id', contentId)
    .maybeSingle()
  revalidatePath('/admin')
  revalidatePath('/admin/content')
  revalidatePath('/admin/media')
  if (!data) return
  if (data.type === 'home') {
    revalidatePath('/')
    revalidatePath('/admin/home')
    return
  }
  revalidatePath(`/admin/content/${data.id}`)
  revalidatePath(`/admin/content/${data.id}/preview`)
  revalidatePath('/chapters')
  if (data.slug === 'first-days') revalidatePath('/first-days')
  else revalidatePath(`/chapters/${data.slug}`)
}

async function revalidateMediaUsages(mediaId: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('content_media')
    .select('content_id')
    .eq('media_id', mediaId)
  if (!data || data.length === 0) {
    revalidatePath('/admin/media')
    return
  }
  await Promise.all(data.map(row => revalidateTarget(row.content_id)))
}

export async function authorizeUpload(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const fileType = (formData.get('file_type') as string | null) ?? ''
  const fileSize = Number(formData.get('file_size') ?? 0)
  const problem = validateUploadFile({ size: fileSize, type: fileType })
  if (problem) return { error: problem }

  const path = buildUploadPath(admin.id, fileType)
  if (!path) return { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }

  const db = createAdminClient()
  // Tidying abandoned uploads once every ten minutes is plenty; a batch of 500 photos
  // shouldn't pay for it 500 times.
  if (Date.now() - lastSweep > 10 * 60 * 1000) {
    lastSweep = Date.now()
    await sweepOrphans(db, admin.id)
  }
  const { data, error } = await db.storage.from('media').createSignedUploadUrl(path)
  if (error || !data?.token) {
    console.error('authorizeUpload createSignedUploadUrl failed')
    return { error: 'Could not start the upload. Please try again in a moment.' }
  }
  return { ok: true as const, path: data.path, token: data.token }
}

export async function finalizeUpload(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) || null
  if (contentId && !isValidId(contentId)) return { error: 'That chapter could not be found.' }
  const result = await finalizeUploadCore(createAdminClient(), admin.id, {
    path: (formData.get('path') as string | null) ?? '',
    altText: (formData.get('alt_text') as string | null)?.trim() ?? '',
    caption: (formData.get('caption') as string | null) ?? null,
    contentId,
  })
  if ('ok' in result) {
    if (contentId) await revalidateTarget(contentId)
    else revalidatePath('/admin/media')
  }
  return result
}

export async function finalizeReplacementUpload(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const oldMediaId = (formData.get('old_media_id') as string | null) ?? ''
  if (!isValidId(contentId) || !isValidId(oldMediaId)) {
    return { error: 'The replacement target could not be found.' }
  }
  const db = createAdminClient()
  const finalized = await finalizeUploadCore(db, admin.id, {
    path: (formData.get('path') as string | null) ?? '',
    altText: (formData.get('alt_text') as string | null)?.trim() ?? '',
    caption: (formData.get('caption') as string | null) ?? null,
    contentId: null,
  })
  if ('error' in finalized) return finalized

  const replaced = await replaceAttachmentCore(db, admin.id, contentId, oldMediaId, finalized.mediaId)
  if ('error' in replaced) {
    return {
      error: `${replaced.error} The new file remains safely available in Media Library.`,
      mediaId: finalized.mediaId,
    }
  }
  await revalidateTarget(contentId)
  return {
    ok: true as const,
    mediaId: finalized.mediaId,
    message: 'Photograph replaced. The previous file remains in Media Library.',
  }
}

export async function updateMediaDetails(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(mediaId)) return { error: 'That photo could not be found.' }
  const result = await updateMediaDetailsCore(
    createAdminClient(),
    admin.id,
    mediaId,
    (formData.get('alt_text') as string | null) ?? '',
    (formData.get('caption') as string | null) ?? null,
  )
  if ('ok' in result) await revalidateMediaUsages(mediaId)
  return result
}

export async function reorderContentMedia(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(contentId) || !isValidId(mediaId)) return { error: 'That photo could not be found.' }
  const result = await reorderAttachmentCore(
    createAdminClient(), admin.id, contentId, mediaId,
    formData.get('direction') === 'earlier' ? 'earlier' : 'later',
  )
  if ('ok' in result) await revalidateTarget(contentId)
  return result
}

export async function detachContentMedia(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(contentId) || !isValidId(mediaId)) return { error: 'That photo could not be found.' }
  const result = await detachMediaSafelyCore(createAdminClient(), admin.id, contentId, mediaId)
  if ('ok' in result) await revalidateTarget(contentId)
  return result
}

export async function setContentCover(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(contentId) || !isValidId(mediaId)) return { error: 'That photo could not be found.' }
  const result = await setCoverMediaCore(createAdminClient(), admin.id, contentId, mediaId)
  if ('ok' in result) await revalidateTarget(contentId)
  return result
}

export async function replaceContentMedia(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const oldMediaId = (formData.get('old_media_id') as string | null) ?? ''
  const newMediaId = (formData.get('new_media_id') as string | null) ?? ''
  if (![contentId, oldMediaId, newMediaId].every(isValidId)) {
    return { error: 'The replacement photographs could not be found.' }
  }
  const result = await replaceAttachmentCore(
    createAdminClient(), admin.id, contentId, oldMediaId, newMediaId,
  )
  if ('ok' in result) {
    await revalidateTarget(contentId)
    return {
      ok: true as const,
      message: 'Photograph replaced. The previous file remains in Media Library.',
    }
  }
  return result
}

// Deletes a photo from every story, every version that was on her page, and Photos, then
// removes the file and its resized copies from storage. There is no undo.
export async function deleteMediaForever(formData: FormData) {
  let admin
  try { admin = await requireAdminWithOrigin() } catch { return { error: "You've been signed out. Sign in again in another tab." } }
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(mediaId)) return { error: "That photo isn't there any more." }
  const db = createAdminClient()
  // A video brought in to her days keeps its still here. Note the video now, because deleting the
  // still also removes its place on her days.
  const { data: timelineVideos, error: videoLookupError } = await db.from('timeline_media')
    .select('video_asset_id, video_assets(cloudflare_uid)').eq('media_asset_id', mediaId).not('video_asset_id', 'is', null)
  if (videoLookupError) return { error: "Couldn't delete it just now. Nothing was changed." }
  const deleted = await db.rpc('delete_photo_everywhere', { p_admin_id: admin.id, p_media_id: mediaId })
  if (deleted.error || typeof deleted.data !== 'string') {
    console.error('delete_photo_everywhere failed:', deleted.error?.message)
    return { error: "Couldn't delete it just now. Nothing was changed." }
  }
  const path = deleted.data
  const hash = createHash('sha256').update(path).digest('hex').slice(0, 40)
  const files = [path, ...PHOTO_WIDTHS.map(width => `derived/${hash}-${width}.webp`)]
  let fileError: unknown = null
  for (let attempt = 0; attempt < 3; attempt += 1) {
    fileError = (await db.storage.from('media').remove(files)).error
    if (!fileError) break
  }
  let videoLeft = false
  for (const row of (timelineVideos ?? []) as unknown as { video_asset_id: string; video_assets: { cloudflare_uid: string } | null }[]) {
    const uid = row.video_assets?.cloudflare_uid
    const { count } = await db.from('content_videos').select('video_id', { count: 'exact', head: true }).eq('video_id', row.video_asset_id)
    if (count) continue // still used by a story; that story keeps it
    let gone = !uid
    for (let attempt = 0; attempt < 2 && !gone; attempt += 1) {
      try { await deletePrivateVideo(uid!); gone = true } catch { gone = false }
    }
    if (gone) await db.from('video_assets').delete().eq('id', row.video_asset_id)
    else videoLeft = true
  }
  revalidatePath('/', 'layout')
  if (videoLeft) {
    console.error('Video removal failed after deleting its still.')
    return { error: "It's gone from her days and Photos, but its video couldn't be removed from the video service just now. It stays private. Tell Claude if this keeps happening." }
  }
  if (fileError) {
    console.error('Photo file removal failed after delete.')
    return { error: "It's gone from every story and from Photos, but the file itself couldn't be removed from storage just now. It stays private. Tell Claude if this keeps happening." }
  }
  return { ok: true as const }
}

export async function attachMediaToContent(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  const contentId = (formData.get('content_id') as string | null) ?? ''
  if (!isValidId(mediaId) || !isValidId(contentId)) return { error: 'Photo or target chapter not specified.' }

  const db = createAdminClient()
  const result = await attachMediaCore(db, admin.id, contentId, mediaId)
  if ('error' in result) return result
  await revalidateTarget(contentId)
  return { ok: true as const }
}

// Backward-compatible wrappers keep the released Home editor imports stable.
export async function reorderHomeMedia(formData: FormData) {
  return reorderContentMedia(formData)
}

export async function detachHomeMedia(formData: FormData) {
  return detachContentMedia(formData)
}

export async function attachMediaToHome(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!isValidId(mediaId)) return { error: 'Photo not specified.' }
  const db = createAdminClient()
  const { data: homes, error } = await db
    .from('content_items')
    .select('id')
    .eq('type', 'home')
    .eq('slug', 'home')
    .limit(2)
  if (error || homes === null || homes.length !== 1) {
    return { error: 'The shared Home page is not available for this photo.' }
  }
  const result = await attachMediaCore(db, admin.id, homes[0].id, mediaId)
  if ('error' in result) return result
  await revalidateTarget(homes[0].id)
  return { ok: true as const }
}

export interface LibraryPhoto { id: string; url: string; caption: string | null; altText: string }

// A page of photos for the "Choose from Photos" picker, newest first.
export async function listLibraryPhotos(formData: FormData): Promise<{ photos: LibraryPhoto[]; more: boolean } | { error: string }> {
  try { await requireAdminWithOrigin() } catch { return { error: "You've been signed out. Sign in again in another tab." } }
  const offset = Math.max(0, Number(formData.get('offset') ?? 0) || 0)
  const pageSize = 48
  const { data, error } = await createAdminClient().from('media_assets')
    .select('id, storage_path, alt_text, caption')
    .eq('processing_status', 'ready')
    .order('created_at', { ascending: false }).order('id', { ascending: true })
    .range(offset, offset + pageSize)
  if (error) return { error: "Photos didn't load. Try again." }
  const rows = data ?? []
  const photos = await Promise.all(rows.slice(0, pageSize).map(async row => ({
    id: row.id, url: await generateSignedUrl(row.storage_path),
    caption: row.caption, altText: row.alt_text?.trim() || 'Family photograph',
  })))
  return { photos, more: rows.length > pageSize }
}
