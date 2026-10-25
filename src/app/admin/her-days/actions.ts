'use server'

// The desk side of Her days: check the folder now, keep or rewrite drafted lines, and show, hide or
// re-date a photo.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncHerDays, type SyncReport } from '@/lib/her-days/sync'
import { dayNumber, indiaDate } from '@/lib/her-days/days'

const SIGNED_OUT = 'You’ve been signed out. Sign in again, then try once more.'

async function admin() {
  checkOrigin(await headers())
  return requireActiveAdmin(await createClient())
}

// Looks in the folder and brings in what it can for about four minutes. The desk calls it again
// while there's more to bring in.
export async function checkNow(): Promise<SyncReport | { error: string }> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const report = await syncHerDays(createAdminClient(), { deadline: Date.now() + 240_000, batch: 3 })
  if (report.found || (report.progress?.added ?? 0) > 0) revalidatePath('/days')
  return report
}

export type LineDecision = { kind: 'keep' } | { kind: 'mine'; text: string } | { kind: 'none' } | { kind: 'again' }

// Keep the drafted line, put his own instead, go without one, or ask for another.
export async function decideLine(draftId: string, decision: LineDecision): Promise<{ ok: true } | { error: string }> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  const { data: draft } = await db.from('caption_drafts').select('id, media_asset_id, draft, status').eq('id', draftId).maybeSingle()
  if (!draft || draft.status !== 'waiting') return { error: 'That line has already been sorted. Reload to see the next one.' }
  const now = new Date().toISOString()

  if (decision.kind === 'again') {
    await db.from('caption_drafts').update({ status: 'redrafted', decided_at: now }).eq('id', draftId)
    const { data } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
    const ids = new Set((data?.value as { media_ids?: string[] } | undefined)?.media_ids ?? [])
    ids.add(draft.media_asset_id as string)
    await db.from('her_days_state').upsert({ key: 'redraft', value: { media_ids: [...ids] }, updated_at: now })
    return { ok: true }
  }

  let caption: string | null
  let status: string
  if (decision.kind === 'keep') { caption = draft.draft as string; status = 'kept' }
  else if (decision.kind === 'none') { caption = null; status = 'no_line' }
  else {
    caption = decision.text.replace(/\s+/g, ' ').trim()
    if (!caption) return { error: 'Write the line first, or choose No line.' }
    if (caption.length > 200) return { error: 'That’s a bit long for under a photo. Keep it to a line.' }
    status = 'rewritten'
  }
  const saved = await db.from('media_assets').update({ caption }).eq('id', draft.media_asset_id)
  if (saved.error) return { error: 'That didn’t save. Try again.' }
  await db.from('caption_drafts').update({ status, final_text: caption, decided_at: now }).eq('id', draftId)
  revalidatePath('/', 'layout')
  return { ok: true }
}

// Takes a photo off the list of lines to be redone, once Sujith has dealt with it himself.
async function stopRedraft(db: ReturnType<typeof createAdminClient>, mediaId: string): Promise<boolean> {
  const { data, error } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
  if (error) return false
  const ids = (data?.value as { media_ids?: string[] } | undefined)?.media_ids ?? []
  if (!ids.includes(mediaId)) return true
  const saved = await db.from('her_days_state').upsert({ key: 'redraft', value: { media_ids: ids.filter(id => id !== mediaId) }, updated_at: new Date().toISOString() })
  return !saved.error
}

// A line Sujith writes himself for a photo that has no suggestion, or no line at all. A photo he
// has dealt with never comes back to be asked about again.
export async function writeLine(mediaId: string, line: { kind: 'mine'; text: string } | { kind: 'none' }): Promise<{ ok: true } | { error: string }> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  const now = new Date().toISOString()
  let caption: string | null = null
  if (line.kind === 'mine') {
    caption = line.text.replace(/\s+/g, ' ').trim()
    if (!caption) return { error: 'Write the line first, or choose No line.' }
    if (caption.length > 200) return { error: 'That’s a bit long for under a photo. Keep it to a line.' }
  }
  const saved = await db.from('media_assets').update({ caption }).eq('id', mediaId).select('id')
  if (saved.error || !saved.data?.length) return { error: 'That didn’t save. Try again.' }
  // Saving again is harmless, so a failure here is reported and he can simply try once more.
  const noted = await db.from('caption_drafts').insert({ media_asset_id: mediaId, draft: caption ?? '', status: caption ? 'rewritten' : 'no_line', final_text: caption, decided_at: now })
  if (noted.error || !(await stopRedraft(db, mediaId))) return { error: 'That didn’t save. Try again.' }
  revalidatePath('/', 'layout')
  return { ok: true }
}

// Show, hide, or fix the date of one photo on her days. A photo can only be shown on a day of
// her life so far, so nothing ends up neither waiting for a look nor on her days.
export async function updateTimelineItem(id: string, change: { visibility?: 'shown' | 'hidden'; date?: string }): Promise<{ ok: true } | { error: string }> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  const fields: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (change.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(change.date) || Number.isNaN(Date.parse(`${change.date}T00:00:00Z`))) return { error: 'That date doesn’t look right.' }
    // Midday in India, so the photo sits on that day whatever the clock.
    fields.taken_at = `${change.date}T12:00:00+05:30`
    fields.taken_at_source = 'set_by_hand'
  }
  if (change.visibility === 'shown' || change.visibility === 'hidden') fields.visibility = change.visibility
  if (change.visibility === 'shown') {
    let takenAt = fields.taken_at as string | undefined
    if (!takenAt) {
      const { data: row } = await db.from('timeline_media').select('taken_at').eq('id', id).maybeSingle()
      takenAt = row?.taken_at ?? undefined
    }
    if (!takenAt) return { error: 'Add the date it was taken first.' }
    const date = indiaDate(new Date(takenAt).toISOString())
    if (dayNumber(date) < 0) return { error: 'That date is before she was born.' }
    if (date > indiaDate(new Date().toISOString())) return { error: 'That date hasn’t come yet.' }
    fields.review_reason = null
  }
  if (change.visibility === 'hidden') fields.review_reason = null
  const { error } = await db.from('timeline_media').update(fields).eq('id', id)
  if (error) return { error: 'That didn’t save. Try again.' }
  revalidatePath('/days')
  revalidatePath('/admin/her-days')
  return { ok: true }
}
