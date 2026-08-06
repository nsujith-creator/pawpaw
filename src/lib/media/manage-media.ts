import type { SupabaseClient } from '@supabase/supabase-js'

export type ManageResult = { ok: true } | { error: string }

const NOT_FOUND = 'That photo could not be found.'
const TRY_AGAIN = 'Could not update right now. Please try again in a moment.'

export interface AttachmentOrder { mediaId: string; sortOrder: number }

export function planReorder(
  items: AttachmentOrder[],
  mediaId: string,
  direction: 'earlier' | 'later',
): { mediaId: string; sortOrder: number }[] | null {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.mediaId.localeCompare(b.mediaId))
  const index = sorted.findIndex(item => item.mediaId === mediaId)
  if (index < 0) return null
  const neighbourIndex = direction === 'earlier' ? index - 1 : index + 1
  if (neighbourIndex < 0 || neighbourIndex >= sorted.length) return null
  const item = sorted[index]
  const neighbour = sorted[neighbourIndex]
  return [
    { mediaId: item.mediaId, sortOrder: neighbour.sortOrder },
    { mediaId: neighbour.mediaId, sortOrder: item.sortOrder },
  ]
}

type MediaResult = { storagePath: string } | { error: string }

async function getSharedMedia(
  db: SupabaseClient,
  mediaId: string,
): Promise<MediaResult> {
  const { data, error } = await db
    .from('media_assets')
    .select('storage_path')
    .eq('id', mediaId)
    .maybeSingle()
  if (error) return { error: TRY_AGAIN } as const
  if (!data) return { error: NOT_FOUND } as const
  return { storagePath: data.storage_path }
}

export async function updateMediaDetailsCore(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
  altText: string,
  caption: string | null,
): Promise<ManageResult> {
  if (!altText.trim()) return { error: 'Alt text cannot be empty — it is what screen readers announce.' }
  const shared = await getSharedMedia(db, mediaId)
  if ('error' in shared) return shared
  const { data, error } = await db.rpc('update_shared_media_details', {
    p_admin_id: adminId, p_media_id: mediaId, p_alt_text: altText, p_caption: caption,
  })
  if (error || data !== true) return { error: TRY_AGAIN }
  return { ok: true }
}

export async function attachMediaCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  mediaId: string,
): Promise<ManageResult> {
  const { error } = await db.rpc('attach_owned_media', {
    p_admin_id: adminId, p_content_id: contentId, p_media_id: mediaId,
  })
  if (error) return { error: 'The shared photo or content record could not be attached.' }
  return { ok: true }
}

export async function reorderAttachmentCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  mediaId: string,
  direction: 'earlier' | 'later',
): Promise<ManageResult> {
  const { error } = await db.rpc('reorder_owned_media', {
    p_admin_id: adminId,
    p_content_id: contentId,
    p_media_id: mediaId,
    p_direction: direction,
  })
  return error ? { error: TRY_AGAIN } : { ok: true }
}

export async function detachMediaCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  mediaId: string,
): Promise<ManageResult> {
  const { data, error } = await db.rpc('detach_owned_media', {
    p_admin_id: adminId, p_content_id: contentId, p_media_id: mediaId,
  })
  return error || data !== true ? { error: TRY_AGAIN } : { ok: true }
}

export async function setCoverMediaCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  mediaId: string | null,
): Promise<ManageResult> {
  const { data: content, error: contentError } = await db
    .from('content_items')
    .select('id')
    .eq('id', contentId)
    .maybeSingle()
  if (contentError || !content) return { error: 'That chapter could not be found.' }
  if (mediaId) {
    const shared = await getSharedMedia(db, mediaId)
    if ('error' in shared) return shared
    const { data: attachment, error: attachmentError } = await db
      .from('content_media')
      .select('media_id')
      .eq('content_id', contentId)
      .eq('media_id', mediaId)
      .maybeSingle()
    if (attachmentError || !attachment) {
      return { error: 'Only an attached photograph can be the chapter cover.' }
    }
  }

  const { data, error } = await db
    .from('content_items')
    .update({ cover_media_id: mediaId })
    .eq('id', contentId)
    .select('id')
    .maybeSingle()
  return error || !data ? { error: TRY_AGAIN } : { ok: true }
}

export async function detachMediaSafelyCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  mediaId: string,
): Promise<ManageResult> {
  const { data: content, error } = await db
    .from('content_items')
    .select('cover_media_id')
    .eq('id', contentId)
    .maybeSingle()
  if (error || !content) return { error: 'That chapter could not be found.' }
  const wasCover = content.cover_media_id === mediaId
  if (wasCover) {
    const cleared = await setCoverMediaCore(db, adminId, contentId, null)
    if ('error' in cleared) return cleared
  }
  const detached = await detachMediaCore(db, adminId, contentId, mediaId)
  if ('error' in detached && wasCover) {
    const restored = await setCoverMediaCore(db, adminId, contentId, mediaId)
    if ('error' in restored) {
      console.error('detachMediaSafelyCore failed to restore cover after detach failure')
    }
  }
  return detached
}

export async function replaceAttachmentCore(
  db: SupabaseClient,
  adminId: string,
  contentId: string,
  oldMediaId: string,
  newMediaId: string,
): Promise<ManageResult> {
  if (oldMediaId === newMediaId) return { error: 'Choose a different photograph.' }
  const { data, error } = await db.rpc('replace_draft_content_media', {
    p_admin_id: adminId,
    p_content_id: contentId,
    p_old_media_id: oldMediaId,
    p_new_media_id: newMediaId,
  })
  if (error || !data) {
    return { error: 'The replacement could not be completed. The original photograph remains unchanged.' }
  }
  return { ok: true }
}

export async function deleteMediaCore(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
): Promise<ManageResult> {
  const shared = await getSharedMedia(db, mediaId)
  if ('error' in shared) return shared

  const { data: path, error } = await db.rpc('delete_owned_media_records', {
    p_admin_id: adminId, p_media_id: mediaId,
  })
  if (error || path !== shared.storagePath) return { error: TRY_AGAIN }

  const { error: objectError } = await db.storage.from('media').remove([shared.storagePath])
  if (objectError) {
    return { error: 'The database record was deleted, but the private file cleanup failed. It will be retried.' }
  }
  return { ok: true }
}
