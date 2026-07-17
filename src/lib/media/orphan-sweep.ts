// Bounded reconciliation for abandoned direct uploads.
// A browser can upload bytes with a signed token and then never finalize
// (tab closed, network drop). Those objects have no media_assets row.
// Each time an admin requests a new upload authorization, their own folder
// (bounded to one list call of up to 100 objects) is swept: any object older
// than ORPHAN_MAX_AGE_MS with no media_assets row is removed. Signed upload
// tokens expire after 2 hours, so a 24-hour grace period can never delete an
// upload that is still finalizable.

import type { SupabaseClient } from '@supabase/supabase-js'

export const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 hours
const SWEEP_LIST_LIMIT = 100

export interface StoredObject {
  name:       string
  created_at: string | null
}

// Pure selection logic: which object names in this admin's folder are
// orphans — older than maxAgeMs and not registered in media_assets.
export function findOrphans(
  objects: StoredObject[],
  registeredPaths: ReadonlySet<string>,
  adminId: string,
  now: number = Date.now(),
  maxAgeMs: number = ORPHAN_MAX_AGE_MS,
): string[] {
  return objects
    .filter(o => {
      // Objects with no parsable timestamp are never deleted.
      const age = now - Date.parse(o.created_at ?? '')
      return Number.isFinite(age) && age > maxAgeMs && !registeredPaths.has(`${adminId}/${o.name}`)
    })
    .map(o => `${adminId}/${o.name}`)
}

// Best-effort sweep of one admin's folder. Never throws — a failed sweep
// must not block a new upload.
export async function sweepOrphans(db: SupabaseClient, adminId: string): Promise<void> {
  try {
    const { data: objects, error: listError } = await db.storage
      .from('media')
      .list(adminId, { limit: SWEEP_LIST_LIMIT })
    if (listError || !objects?.length) return

    const { data: rows, error: rowsError } = await db
      .from('media_assets')
      .select('storage_path')
      .like('storage_path', `${adminId}/%`)
    if (rowsError) return

    const registered = new Set((rows ?? []).map(r => r.storage_path as string))
    const orphans = findOrphans(objects, registered, adminId)
    if (orphans.length > 0) {
      await db.storage.from('media').remove(orphans)
    }
  } catch (e) {
    console.error('sweepOrphans failed (non-fatal):', e)
  }
}
