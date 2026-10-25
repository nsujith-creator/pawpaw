// Which photos still need a line from Sujith, when nobody is suggesting them: first the older
// lines he wants redone, then photos with no line, newest first. A photo he has dealt with
// (including "No line") never comes back, however many of those pile up in front.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface NeedsLine { mediaId: string; storagePath: string; caption: string | null }

const PAGE = 200

export async function photosNeedingALine(db: SupabaseClient, limit: number): Promise<NeedsLine[]> {
  if (limit <= 0) return []
  const picked: NeedsLine[] = []
  const { data: redo } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
  const redoIds = ((redo?.value as { media_ids?: string[] } | undefined)?.media_ids ?? []).slice(0, limit)
  if (redoIds.length) {
    const { data } = await db.from('media_assets').select('id, storage_path, caption').in('id', redoIds)
    for (const row of data ?? []) picked.push({ mediaId: row.id as string, storagePath: row.storage_path as string, caption: (row.caption as string | null) ?? null })
  }
  // Page through photos with no line until the list is full or there are no more.
  for (let from = 0; picked.length < limit && from < 50_000; from += PAGE) {
    const { data, error } = await db.from('timeline_media').select('media_asset_id, media_assets!inner(id, storage_path, caption)')
      .eq('visibility', 'shown').is('media_assets.caption', null)
      .order('taken_at', { ascending: false }).order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error || !data?.length) break
    const rows = data as unknown as { media_asset_id: string; media_assets: { id: string; storage_path: string; caption: string | null } }[]
    const ids = rows.map(row => row.media_asset_id)
    const { data: done } = await db.from('caption_drafts').select('media_asset_id').in('media_asset_id', ids)
    const handled = new Set((done ?? []).map(row => row.media_asset_id as string))
    for (const row of rows) {
      if (picked.length >= limit) break
      if (handled.has(row.media_asset_id) || picked.some(media => media.mediaId === row.media_assets.id)) continue
      picked.push({ mediaId: row.media_assets.id, storagePath: row.media_assets.storage_path, caption: row.media_assets.caption })
    }
    if (rows.length < PAGE) break
  }
  return picked
}
