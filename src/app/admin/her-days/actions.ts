'use server'

// The desk side of "Bring in from Google Photos". The browser signs in to Google and passes its
// short-lived Google token with each call; it is used for that call only and never stored.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSession, deleteSession, getSession, GoogleError, listPicked } from '@/lib/her-days/google-picker'
import { importBatch, recordPicked, refreshFailed, runProgress, type Progress } from '@/lib/her-days/importer'
import { dayNumber, indiaDate } from '@/lib/her-days/days'

const SIGNED_OUT = 'You’ve been signed out. Sign in again, then try once more.'

async function admin() {
  checkOrigin(await headers())
  return requireActiveAdmin(await createClient())
}

function googleTrouble(error: unknown) {
  if (error instanceof GoogleError && (error.status === 401 || error.status === 403)) return 'Google wants you to sign in again. Press the button once more.'
  return 'Google Photos isn’t answering right now. Try again in a minute.'
}

export async function startPick(token: string): Promise<{ runId: string; pickerUri: string; pollIntervalMs: number } | { error: string }> {
  let user
  try { user = await admin() } catch { return { error: SIGNED_OUT } }
  if (!token) return { error: 'Sign in to Google first.' }
  let session
  try { session = await createSession(fetch, token) } catch (error) { return { error: googleTrouble(error) } }
  const { data, error } = await createAdminClient().from('import_runs').insert({
    source: 'google_photos', picker_session_id: session.id, picker_expires_at: session.expireTime, started_by: user.id,
  }).select('id').single()
  if (error || !data) return { error: 'Something went wrong. Try again.' }
  return { runId: data.id, pickerUri: session.pickerUri, pollIntervalMs: session.pollIntervalMs }
}

export type PickState = { waiting: true } | { progress: Progress } | { error: string; expired?: true }

// Called every few seconds while the person is choosing in Google Photos.
export async function checkPick(runId: string, token: string): Promise<PickState> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  const { data: run } = await db.from('import_runs').select('id, status, picker_session_id, picker_expires_at').eq('id', runId).maybeSingle()
  if (!run) return { error: 'Something went wrong. Start again.' }
  if (run.status !== 'picking') return { progress: await runProgress(db, runId) }
  if (run.picker_expires_at && Date.parse(run.picker_expires_at) < Date.now()) {
    await db.from('import_runs').update({ status: 'expired', finished_at: new Date().toISOString() }).eq('id', runId).eq('status', 'picking')
    return { error: 'Nothing was picked in time. Press the button to start again.', expired: true }
  }
  try {
    const session = await getSession(fetch, token, run.picker_session_id)
    if (!session.mediaItemsSet) return { waiting: true }
    const items = await listPicked(fetch, token, run.picker_session_id)
    // The session stays open: Google's download addresses belong to it. It is closed once
    // everything is in (see importMore), or simply expires.
    await recordPicked(db, runId, items)
    return { progress: await runProgress(db, runId) }
  } catch (error) {
    if (error instanceof GoogleError) return { error: googleTrouble(error) }
    return { error: 'Something went wrong while adding these. Try again; nothing gets added twice.' }
  }
}

// Brings the next few in. The browser keeps calling this until nothing is left.
export async function importMore(runId: string, token: string): Promise<{ progress: Progress; claimed: number } | { error: string }> {
  let user
  try { user = await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  try {
    const result = await importBatch(db, fetch, token, user.id, runId, 3)
    if (result.progress.added) revalidatePath('/days')
    if (result.progress.pending === 0 && result.progress.failed === 0) {
      const { data: run } = await db.from('import_runs').select('picker_session_id').eq('id', runId).maybeSingle()
      if (run?.picker_session_id) await deleteSession(fetch, token, run.picker_session_id)
    }
    return result
  } catch {
    return { error: 'Adding stopped part-way. Press ‘Finish adding them’ to carry on.' }
  }
}

// Puts the ones that didn't come in back in the queue, with fresh links from Google when the
// picker session is still open (Google keeps it for a while after picking).
export async function retryFailed(runId: string, token: string): Promise<{ ok: true; count: number } | { error: string }> {
  try { await admin() } catch { return { error: SIGNED_OUT } }
  const db = createAdminClient()
  const { data: run } = await db.from('import_runs').select('picker_session_id').eq('id', runId).maybeSingle()
  if (!run) return { error: 'Something went wrong. Start again.' }
  let picked = null
  if (run.picker_session_id && token) {
    try { picked = await listPicked(fetch, token, run.picker_session_id) } catch { picked = null }
  }
  try {
    const count = await refreshFailed(db, runId, picked)
    if (!count) return { error: 'Pick these again in Google Photos. Anything already here is skipped.' }
    return { ok: true, count }
  } catch {
    return { error: 'That didn’t work just now. Try again in a minute.' }
  }
}

// Show, hide, or fix the date of one photo on her days. A photo can only be shown on a day of
// her life so far, so nothing ends up neither waiting for review nor on her days.
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
