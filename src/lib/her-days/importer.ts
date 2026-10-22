// Brings picked Google Photos into Pawpaw, a few at a time, so it never matters if a tab closes:
// every picked item is written down first (import_items), then claimed, copied and marked.
// A photo already on her days is skipped (same Google id). Re-picking old photos is harmless.

import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildUploadPath } from '@/lib/media/upload-path'
import { extractPalette } from '@/lib/media/palette'
import { createPrivateTusUpload, deletePrivateVideo } from '@/lib/video/cloudflare'
import { download, photoUrl, videoUrl, type Fetcher, type PickedItem } from './google-picker'
import { indiaDate, reviewReason } from './days'

export const LONG_EDGE = 1600
const MAX_PHOTO_BYTES = 40 * 1024 * 1024
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const TUS_CHUNK = 50 * 1024 * 1024 // a multiple of 256 KiB, as Cloudflare asks

export interface ImportItemRow {
  id: string
  run_id: string
  source_item_id: string
  kind: 'photo' | 'video'
  filename: string | null
  taken_at: string | null
  width: number | null
  height: number | null
  google_base_url: string | null
  video_ready: boolean
  attempts: number
}

export interface Progress { total: number; pending: number; added: number; duplicate: number; failed: number }

// claimed: how many this call took on. 0 while some are still pending means another call (an
// earlier tab, or one that ran out of time) holds them, so the caller should stop and come back.
export interface BatchResult { progress: Progress; claimed: number }

// Decides, before anything is downloaded, which picked items are already on her days.
export function planListing(items: PickedItem[], existingIds: ReadonlySet<string>) {
  const seen = new Set<string>()
  return items.flatMap(item => {
    if (seen.has(item.id)) return []
    seen.add(item.id)
    return [{ item, status: existingIds.has(item.id) ? 'duplicate' as const : 'pending' as const }]
  })
}

export async function recordPicked(db: SupabaseClient, runId: string, items: PickedItem[]): Promise<void> {
  const existing = new Set<string>()
  const ids = [...new Set(items.map(item => item.id))]
  for (let start = 0; start < ids.length; start += 200) {
    const { data, error } = await db.from('timeline_media').select('source_item_id').eq('source', 'google_photos').in('source_item_id', ids.slice(start, start + 200))
    if (error) throw new Error('Could not check which photos are already in')
    for (const row of data ?? []) existing.add(row.source_item_id as string)
  }
  const rows = planListing(items, existing).map(({ item, status }) => ({
    run_id: runId,
    source_item_id: item.id,
    kind: item.kind,
    mime_type: item.mimeType,
    filename: item.filename,
    taken_at: item.createTime,
    width: item.width,
    height: item.height,
    google_base_url: status === 'pending' ? item.baseUrl : null,
    video_ready: item.videoReady,
    status,
  }))
  for (let start = 0; start < rows.length; start += 200) {
    const { error } = await db.from('import_items').upsert(rows.slice(start, start + 200), { onConflict: 'run_id,source_item_id', ignoreDuplicates: true })
    if (error) throw new Error('Could not write down the picked photos')
  }
  const { error } = await db.from('import_runs').update({ status: 'importing', listed_at: new Date().toISOString() }).eq('id', runId)
  if (error) throw new Error('Could not start the import')
}

export async function runProgress(db: SupabaseClient, runId: string): Promise<Progress> {
  const { data, error } = await db.from('import_items').select('status').eq('run_id', runId)
  if (error) throw new Error('Could not read the import')
  const progress: Progress = { total: 0, pending: 0, added: 0, duplicate: 0, failed: 0 }
  for (const row of data ?? []) {
    progress.total++
    const status = row.status as string
    if (status === 'pending' || status === 'working') progress.pending++
    else if (status === 'added') progress.added++
    else if (status === 'duplicate') progress.duplicate++
    else if (status === 'failed') progress.failed++
  }
  return progress
}

// Turns whatever Google sent into the copy Pawpaw keeps: upright, at most 1600 pixels, JPEG.
export async function preparePhoto(bytes: Buffer) {
  const image = sharp(bytes, { failOn: 'error' }).rotate().resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
  const { data, info } = await image.jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}

async function readLimited(response: Response, limit: number): Promise<Buffer> {
  const length = Number(response.headers.get('content-length') ?? 0)
  if (length > limit) throw new FriendlyError('This photo is too big to add.')
  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.length > limit) throw new FriendlyError('This photo is too big to add.')
  return buffer
}

export class FriendlyError extends Error {}

async function storePhoto(db: SupabaseClient, adminId: string, bytes: Buffer, altText: string) {
  const photo = await preparePhoto(bytes)
  const path = buildUploadPath(adminId, 'image/jpeg')
  if (!path) throw new Error('No storage path')
  const upload = await db.storage.from('media').upload(path, photo.data, { contentType: 'image/jpeg', upsert: false })
  if (upload.error) throw new FriendlyError('This one didn’t save. Try again.')
  let palette: string[] | null = null
  try { palette = await extractPalette(photo.data) } catch { palette = null }
  const { data, error } = await db.from('media_assets').insert({
    storage_path: path, mime_type: 'image/jpeg', byte_size: photo.data.length, width: photo.width, height: photo.height,
    alt_text: altText, caption: null, extracted_palette: palette, processing_status: 'ready', created_by: adminId,
  }).select('id').single()
  if (error || !data) {
    await db.storage.from('media').remove([path])
    throw new FriendlyError('This one didn’t save. Try again.')
  }
  return { mediaId: data.id as string, path, width: photo.width, height: photo.height }
}

async function removePhoto(db: SupabaseClient, stored: { mediaId: string; path: string }) {
  await db.from('media_assets').delete().eq('id', stored.mediaId)
  await db.storage.from('media').remove([stored.path])
}

// Streams a Google video into Cloudflare Stream in 50 MB pieces, without holding it all in memory.
async function storeVideo(fetcher: Fetcher, token: string, item: ImportItemRow): Promise<string> {
  if (!item.video_ready) throw new FriendlyError('Google is still getting this video ready. Try again later.')
  const response = await download(fetcher, token, videoUrl(item.google_base_url!))
  const size = Number(response.headers.get('content-length') ?? 0)
  if (!size) throw new FriendlyError('This video didn’t come through. Try again.')
  if (size > MAX_VIDEO_BYTES) throw new FriendlyError('This video is too long to add here. You can add it to a story instead.')
  const { uploadUrl, cloudflareUid } = await createPrivateTusUpload(size, item.filename ?? 'video.mp4')
  try {
    const reader = response.body!.getReader()
    let offset = 0
    let pending: Uint8Array[] = []
    let pendingBytes = 0
    const send = async (final: boolean) => {
      if (!pendingBytes) return
      const chunk = Buffer.concat(pending, pendingBytes)
      const sent = await fetch(uploadUrl, { method: 'PATCH', headers: { 'Tus-Resumable': '1.0.0', 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream' }, body: chunk })
      if (!sent.ok) throw new FriendlyError('This video didn’t come through. Try again.')
      offset += chunk.length
      pending = []
      pendingBytes = 0
      if (final && offset !== size) throw new FriendlyError('This video didn’t come through. Try again.')
    }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      pending.push(value)
      pendingBytes += value.length
      if (pendingBytes >= TUS_CHUNK) {
        // Send whole 50 MB pieces and keep the remainder for the next one.
        const all = Buffer.concat(pending, pendingBytes)
        pending = [all.subarray(0, TUS_CHUNK)]
        pendingBytes = TUS_CHUNK
        const rest = all.subarray(TUS_CHUNK)
        await send(false)
        if (rest.length) { pending = [rest]; pendingBytes = rest.length }
      }
    }
    await send(true)
    return cloudflareUid
  } catch (error) {
    await deletePrivateVideo(cloudflareUid).catch(() => null)
    throw error
  }
}

function altFor(item: ImportItemRow) {
  if (!item.taken_at) return 'A photo from Google Photos'
  const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${indiaDate(item.taken_at)}T00:00:00Z`))
  return item.kind === 'video' ? `A video from ${date}` : `A photo from ${date}`
}

export async function importOne(db: SupabaseClient, fetcher: Fetcher, token: string, adminId: string, item: ImportItemRow): Promise<'added' | 'duplicate'> {
  if (!item.google_base_url) throw new FriendlyError('Pick this one again in Google Photos.')
  const still = await readLimited(await download(fetcher, token, photoUrl(item.google_base_url, LONG_EDGE)), MAX_PHOTO_BYTES)
  const stored = await storePhoto(db, adminId, still, altFor(item))
  let videoId: string | null = null
  let cloudflareUid: string | null = null
  try {
    if (item.kind === 'video') {
      cloudflareUid = await storeVideo(fetcher, token, item)
      const { data, error } = await db.from('video_assets').insert({ cloudflare_uid: cloudflareUid, caption: null, created_by: adminId, status: 'processing' }).select('id').single()
      if (error || !data) throw new FriendlyError('This one didn’t save. Try again.')
      videoId = data.id as string
    }
    const reason = reviewReason({ takenAt: item.taken_at, filename: item.filename })
    const { data, error } = await db.from('timeline_media').insert({
      kind: item.kind, media_asset_id: stored.mediaId, video_asset_id: videoId,
      taken_at: item.taken_at, taken_at_source: item.taken_at ? 'camera' : 'unknown',
      visibility: reason ? 'review' : 'shown', review_reason: reason,
      source: 'google_photos', source_item_id: item.source_item_id, source_filename: item.filename,
      width: stored.width, height: stored.height, created_by: adminId,
    }).select('id').single()
    if (error?.code === '23505') {
      // Another tab brought the same photo in a moment ago.
      await removePhoto(db, stored)
      if (videoId) await db.from('video_assets').delete().eq('id', videoId)
      if (cloudflareUid) await deletePrivateVideo(cloudflareUid).catch(() => null)
      await markItem(db, item.id, { status: 'duplicate' })
      return 'duplicate'
    }
    if (error || !data) throw new FriendlyError('This one didn’t save. Try again.')
    await markItem(db, item.id, { status: 'added', timeline_media_id: data.id })
    return 'added'
  } catch (error) {
    await removePhoto(db, stored)
    if (videoId) await db.from('video_assets').delete().eq('id', videoId)
    if (cloudflareUid) await deletePrivateVideo(cloudflareUid).catch(() => null)
    throw error
  }
}

async function markItem(db: SupabaseClient, id: string, fields: Record<string, unknown>) {
  await db.from('import_items').update({ ...fields, error: null, google_base_url: null, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function importBatch(db: SupabaseClient, fetcher: Fetcher, token: string, adminId: string, runId: string, limit: number): Promise<BatchResult> {
  const { data, error } = await db.rpc('claim_import_items', { p_run_id: runId, p_limit: limit })
  if (error) throw new Error('Could not continue the import')
  const claimed = (data ?? []) as ImportItemRow[]
  await Promise.all(claimed.map(async item => {
    try {
      await importOne(db, fetcher, token, adminId, item)
    } catch (failure) {
      const message = failure instanceof FriendlyError ? failure.message
        : failure instanceof Error && /answered (401|403)/.test(failure.message) ? 'Google wants you to sign in again. Then try again.'
        : 'This one didn’t come through. Try again.'
      // Only plain-language reasons are kept: never a photo address or a Google link.
      await db.from('import_items').update({ status: 'failed', error: message, updated_at: new Date().toISOString() }).eq('id', item.id)
    }
  }))
  const progress = await runProgress(db, runId)
  if (progress.pending === 0) await db.from('import_runs').update({ status: 'done', finished_at: new Date().toISOString() }).eq('id', runId).eq('status', 'importing')
  return { progress, claimed: claimed.length }
}

// Before trying failed items again, ask Google for fresh download addresses and whether each
// video is ready now. If the picker session has ended, only items whose old address may still
// work are put back in the queue.
export async function refreshFailed(db: SupabaseClient, runId: string, picked: PickedItem[] | null): Promise<number> {
  const { data, error } = await db.from('import_items').select('id, source_item_id, google_base_url').eq('run_id', runId).eq('status', 'failed')
  if (error) throw new Error('Could not read the import')
  const fresh = new Map((picked ?? []).map(item => [item.id, item]))
  let count = 0
  for (const row of data ?? []) {
    const item = fresh.get(row.source_item_id as string)
    if (!item && !row.google_base_url) continue
    const fields: Record<string, unknown> = { status: 'pending', error: null, updated_at: new Date().toISOString() }
    if (item) { fields.google_base_url = item.baseUrl; fields.video_ready = item.videoReady }
    const { error: updateError } = await db.from('import_items').update(fields).eq('id', row.id)
    if (!updateError) count++
  }
  if (count) await db.from('import_runs').update({ status: 'importing', finished_at: null }).eq('id', runId)
  return count
}
