import type { SupabaseClient } from '@supabase/supabase-js'
import { pathBelongsTo } from './upload-path'

export type ManageResult = { ok: true } | { error: string }

const NOT_FOUND = 'That photo could not be found.'
const NOT_YOURS = 'That photo does not belong to your account.'
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

type OwnedMediaResult = { storagePath: string } | { error: string }

async function getOwnedMedia(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
): Promise<OwnedMediaResult> {
  const { data, error } = await db
    .from('media_assets')
    .select('storage_path, created_by')
    .eq('id', mediaId)
    .maybeSingle()
  if (error) return { error: TRY_AGAIN } as const
  if (!data) return { error: NOT_FOUND } as const
  if (data.created_by !== adminId || !pathBelongsTo(data.storage_path, adminId)) {
    return { error: NOT_YOURS } as const
  }
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
  const owned = await getOwnedMedia(db, adminId, mediaId)
  if ('error' in owned) return owned
  const { data, error } = await db
    .from('media_assets')
    .update({ alt_text: altText.trim(), caption: caption?.trim() || null })
    .eq('id', mediaId)
    .eq('created_by', adminId)
    .select('id')
    .maybeSingle()
  if (error || !data) return { error: TRY_AGAIN }
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
  if (error) return { error: 'Photo or Home page not found, or not owned by you.' }
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

export async function deleteMediaCore(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
): Promise<ManageResult> {
  const owned = await getOwnedMedia(db, adminId, mediaId)
  if ('error' in owned) return owned

  const { data: path, error } = await db.rpc('delete_owned_media_records', {
    p_admin_id: adminId, p_media_id: mediaId,
  })
  if (error || path !== owned.storagePath) return { error: TRY_AGAIN }

  const { error: objectError } = await db.storage.from('media').remove([owned.storagePath])
  if (objectError) {
    return { error: 'The database record was deleted, but the private file cleanup failed. It will be retried.' }
  }
  return { ok: true }
}
