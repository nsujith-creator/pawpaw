// Trusted management of attached photos. Every operation is keyed by
// media_assets.id — the browser never supplies a storage path, so path
// substitution is structurally impossible: paths are always looked up
// server-side from the database row, then re-checked with pathBelongsTo.
//
// Detach vs delete:
//   detach  — removes the content_media association only; the media_assets
//             row and the private Storage object are kept.
//   delete  — removes associations, the media_assets row, AND the Storage
//             object, in that order (content_media has ON DELETE RESTRICT
//             against media_assets, so associations must go first).
// Separated from the Server Action wrappers so integration tests can drive
// these directly against a live project.

import type { SupabaseClient } from '@supabase/supabase-js'
import { pathBelongsTo } from './upload-path'

export type ManageResult = { ok: true } | { error: string }

const NOT_FOUND  = 'That photo could not be found.'
const NOT_YOURS  = 'That photo does not belong to your account.'
const TRY_AGAIN  = 'Could not update right now. Please try again in a moment.'

// Pure planning for a one-step reorder: returns the two sort_order writes
// needed to swap the item with its neighbour, or null when the move is a
// no-op (already first/last, or the item is not attached).
export interface AttachmentOrder {
  mediaId:   string
  sortOrder: number
}

export function planReorder(
  items: AttachmentOrder[],
  mediaId: string,
  direction: 'earlier' | 'later',
): { mediaId: string; sortOrder: number }[] | null {
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder)
  const idx = sorted.findIndex(i => i.mediaId === mediaId)
  if (idx === -1) return null
  const neighbourIdx = direction === 'earlier' ? idx - 1 : idx + 1
  if (neighbourIdx < 0 || neighbourIdx >= sorted.length) return null
  const item      = sorted[idx]
  const neighbour = sorted[neighbourIdx]
  return [
    { mediaId: item.mediaId,      sortOrder: neighbour.sortOrder },
    { mediaId: neighbour.mediaId, sortOrder: item.sortOrder },
  ]
}

async function getOwnedMedia(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
): Promise<{ storagePath: string } | { error: string }> {
  const { data: row, error } = await db
    .from('media_assets')
    .select('storage_path, created_by')
    .eq('id', mediaId)
    .maybeSingle()
  if (error) {
    console.error('manage-media lookup failed:', error)
    return { error: TRY_AGAIN }
  }
  if (!row) return { error: NOT_FOUND }
  if (row.created_by !== adminId || !pathBelongsTo(row.storage_path, adminId)) {
    return { error: NOT_YOURS }
  }
  return { storagePath: row.storage_path }
}

// Updates both descriptive fields: alt_text (required, accessibility) and
// caption (optional, shown visibly with the photo — empty clears it).
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

  const { error } = await db
    .from('media_assets')
    .update({ alt_text: altText.trim(), caption: caption?.trim() || null })
    .eq('id', mediaId)
  if (error) {
    console.error('updateMediaDetailsCore failed:', error)
    return { error: TRY_AGAIN }
  }
  return { ok: true }
}

export async function reorderAttachmentCore(
  db: SupabaseClient,
  contentId: string,
  mediaId: string,
  direction: 'earlier' | 'later',
): Promise<ManageResult> {
  const { data: rows, error } = await db
    .from('content_media')
    .select('media_id, sort_order')
    .eq('content_id', contentId)
  if (error) {
    console.error('reorderAttachmentCore list failed:', error)
    return { error: TRY_AGAIN }
  }

  const plan = planReorder(
    (rows ?? []).map(r => ({ mediaId: r.media_id as string, sortOrder: r.sort_order as number })),
    mediaId,
    direction,
  )
  if (!plan) return { ok: true } // already at the edge — nothing to do

  for (const step of plan) {
    const { error: updateError } = await db
      .from('content_media')
      .update({ sort_order: step.sortOrder })
      .eq('content_id', contentId)
      .eq('media_id', step.mediaId)
    if (updateError) {
      console.error('reorderAttachmentCore update failed:', updateError)
      return { error: TRY_AGAIN }
    }
  }
  return { ok: true }
}

// Removes the association only. media_assets and the Storage object survive.
export async function detachMediaCore(
  db: SupabaseClient,
  contentId: string,
  mediaId: string,
): Promise<ManageResult> {
  const { error } = await db
    .from('content_media')
    .delete()
    .eq('content_id', contentId)
    .eq('media_id', mediaId)
  if (error) {
    console.error('detachMediaCore failed:', error)
    return { error: TRY_AGAIN }
  }
  return { ok: true }
}

// Full removal: associations → media_assets row → Storage object.
// If the final object removal fails, the object is unregistered and the
// orphan sweep clears it after the 24-hour grace period.
export async function deleteMediaCore(
  db: SupabaseClient,
  adminId: string,
  mediaId: string,
): Promise<ManageResult> {
  const owned = await getOwnedMedia(db, adminId, mediaId)
  if ('error' in owned) return owned

  const { error: assocError } = await db
    .from('content_media')
    .delete()
    .eq('media_id', mediaId)
  if (assocError) {
    console.error('deleteMediaCore association delete failed:', assocError)
    return { error: TRY_AGAIN }
  }

  const { error: rowError } = await db
    .from('media_assets')
    .delete()
    .eq('id', mediaId)
  if (rowError) {
    console.error('deleteMediaCore media_assets delete failed:', rowError)
    return { error: TRY_AGAIN }
  }

  const { error: objectError } = await db.storage.from('media').remove([owned.storagePath])
  if (objectError) {
    // Non-fatal: the object is now unregistered, so the orphan sweep
    // removes it once it is older than the grace period.
    console.error('deleteMediaCore object removal failed (sweep will reclaim):', objectError)
  }
  return { ok: true }
}
