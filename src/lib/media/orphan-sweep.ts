import type { SupabaseClient } from '@supabase/supabase-js'

export const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000
export const SWEEP_LIST_LIMIT = 100
export const SWEEP_MAX_OBJECTS = 1000

export interface StoredObject { name: string; created_at: string | null }

export function findOrphans(
  objects: StoredObject[],
  registeredPaths: ReadonlySet<string>,
  adminId: string,
  now: number = Date.now(),
  maxAgeMs: number = ORPHAN_MAX_AGE_MS,
): string[] {
  return objects
    .filter(object => {
      const age = now - Date.parse(object.created_at ?? '')
      return Number.isFinite(age) && age > maxAgeMs &&
        !registeredPaths.has(`${adminId}/${object.name}`)
    })
    .map(object => `${adminId}/${object.name}`)
}

export async function sweepOrphans(db: SupabaseClient, adminId: string): Promise<void> {
  try {
    const { data: rows, error: rowsError } = await db
      .from('media_assets')
      .select('storage_path')
      .like('storage_path', `${adminId}/%`)
    if (rowsError) return

    const registered = new Set((rows ?? []).map(row => row.storage_path as string))
    const candidates: string[] = []
    for (let offset = 0; offset < SWEEP_MAX_OBJECTS; offset += SWEEP_LIST_LIMIT) {
      const { data: objects, error: listError } = await db.storage
        .from('media')
        .list(adminId, {
          limit: SWEEP_LIST_LIMIT,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        })
      if (listError || !objects) return

      candidates.push(...findOrphans(objects, registered, adminId))
      if (objects.length < SWEEP_LIST_LIMIT) break
    }

    // Listing completes before deletion so removing page one cannot shift page
    // two behind an offset. Both the scan and each removal request are bounded.
    for (let start = 0; start < candidates.length; start += SWEEP_LIST_LIMIT) {
      const { error: removeError } = await db.storage
        .from('media')
        .remove(candidates.slice(start, start + SWEEP_LIST_LIMIT))
      if (removeError) return
    }
  } catch (error) {
    console.error('sweepOrphans failed (non-fatal):', error)
  }
}
