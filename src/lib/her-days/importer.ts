// Brings her photos in from the Her days folder in Drive and from the album zip, a few at a time,
// so nothing is lost if a check is cut short: every new file is written down first (import_items),
// then claimed, copied and marked. A file already on her days is never added twice.

import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildUploadPath } from '@/lib/media/upload-path'
import { extractPalette } from '@/lib/media/palette'
import { createPrivatePlayerUrl, createPrivateTusUpload, deletePrivateVideo, getVideoState } from '@/lib/video/cloudflare'
import { exifTime, fileNameTime, indiaDate, reviewReason } from './days'

export const LONG_EDGE = 1600
export const MAX_PHOTO_BYTES = 60 * 1024 * 1024
export const MAX_VIDEO_BYTES = 500 * 1024 * 1024
const TUS_CHUNK = 50 * 1024 * 1024 // a multiple of 256 KiB, as Cloudflare asks

export type Source = 'google_drive' | 'takeout'

export interface ImportItemRow {
  id: string
  run_id: string
  source: Source
  source_item_id: string
  kind: 'photo' | 'video'
  filename: string | null
  taken_at: string | null
  taken_at_source: string | null
  description: string | null
  width: number | null
  height: number | null
  attempts: number
  video_asset_id: string | null
  drive_file_id: string | null
  zip_entry: unknown
}

// How to get an item's bytes, whichever source it came from.
export interface MediaReader {
  photo(item: ImportItemRow): Promise<{ bytes: Buffer; takenAt?: string | null; description?: string | null }>
  video(item: ImportItemRow): Promise<{ body: ReadableStream<Uint8Array>; size: number; takenAt?: string | null; description?: string | null }>
}

export interface Progress { total: number; pending: number; added: number; duplicate: number; failed: number; waiting: number }
export interface BatchResult { progress: Progress; claimed: number }

export class FriendlyError extends Error {}

// A new file found in the folder or the album, ready to be written down.
export interface FoundItem {
  sourceItemId: string
  kind: 'photo' | 'video'
  filename: string
  takenAt: string | null
  takenAtSource: string | null
  description: string | null
  width: number | null
  height: number | null
  driveFileId?: string | null
  zipEntry?: unknown
}

// Writes down the files that aren't on her days yet. Returns how many were new.
export async function recordFound(db: SupabaseClient, runId: string, source: Source, found: FoundItem[]): Promise<number> {
  const known = new Set<string>()
  const ids = [...new Set(found.map(item => item.sourceItemId))]
  for (let start = 0; start < ids.length; start += 200) {
    const slice = ids.slice(start, start + 200)
    const onDays = await db.from('timeline_media').select('source_item_id').eq('source', source).in('source_item_id', slice)
    if (onDays.error) throw new Error('Could not check which photos are already in')
    for (const row of onDays.data ?? []) known.add(row.source_item_id as string)
    // Already written down by an earlier check: never written twice. (Failed ones are tried again
    // in place by retryFailed.)
    const listed = await db.from('import_items').select('source_item_id').eq('source', source).in('source_item_id', slice)
    if (listed.error) throw new Error('Could not check which photos are already in')
    for (const row of listed.data ?? []) known.add(row.source_item_id as string)
  }
  const rows = found.filter((item, index) => !known.has(item.sourceItemId) && found.findIndex(other => other.sourceItemId === item.sourceItemId) === index).map(item => ({
    run_id: runId, source, source_item_id: item.sourceItemId, kind: item.kind, filename: item.filename,
    taken_at: item.takenAt, taken_at_source: item.takenAtSource, description: item.description,
    width: item.width, height: item.height, drive_file_id: item.driveFileId ?? null, zip_entry: item.zipEntry ?? null,
    status: 'pending', video_ready: true,
  }))
  for (let start = 0; start < rows.length; start += 200) {
    const { error } = await db.from('import_items').upsert(rows.slice(start, start + 200), { onConflict: 'run_id,source_item_id', ignoreDuplicates: true })
    if (error) throw new Error('Could not write down the new photos')
  }
  return rows.length
}

export async function progressFor(db: SupabaseClient, filter: { runId?: string; source?: Source }): Promise<Progress> {
  let query = db.from('import_items').select('status')
  if (filter.runId) query = query.eq('run_id', filter.runId)
  if (filter.source) query = query.eq('source', filter.source)
  const progress: Progress = { total: 0, pending: 0, added: 0, duplicate: 0, failed: 0, waiting: 0 }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999)
    if (error) throw new Error('Could not read the import')
    for (const row of data ?? []) {
      progress.total++
      const status = row.status as string
      if (status === 'pending' || status === 'working') progress.pending++
      else if (status === 'video_waiting') progress.waiting++
      else if (status === 'added') progress.added++
      else if (status === 'duplicate' || status === 'skipped') progress.duplicate++
      else if (status === 'failed') progress.failed++
    }
    if (!data || data.length < 1000) break
  }
  return progress
}

// Turns whatever arrives into the copy Pawpaw keeps: upright, at most 1600 pixels, JPEG.
export async function preparePhoto(bytes: Buffer) {
  const source = sharp(bytes, { failOn: 'error' })
  const metadata = await source.metadata()
  const { data, info } = await source.rotate().resize({ width: LONG_EDGE, height: LONG_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true }).toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height, takenAt: exifTime(metadata.exif) }
}

async function storePhoto(db: SupabaseClient, adminId: string, bytes: Buffer, altText: string, caption: string | null) {
  const photo = await preparePhoto(bytes)
  const path = buildUploadPath(adminId, 'image/jpeg')
  if (!path) throw new Error('No storage path')
  const upload = await db.storage.from('media').upload(path, photo.data, { contentType: 'image/jpeg', upsert: false })
  if (upload.error) throw new FriendlyError('This one didn’t save. Try again.')
  let palette: string[] | null = null
  try { palette = await extractPalette(photo.data) } catch { palette = null }
  const { data, error } = await db.from('media_assets').insert({
    storage_path: path, mime_type: 'image/jpeg', byte_size: photo.data.length, width: photo.width, height: photo.height,
    alt_text: altText, caption, extracted_palette: palette, processing_status: 'ready', created_by: adminId,
  }).select('id').single()
  if (error || !data) {
    await db.storage.from('media').remove([path])
    throw new FriendlyError('This one didn’t save. Try again.')
  }
  return { mediaId: data.id as string, path, width: photo.width, height: photo.height, takenAt: photo.takenAt }
}

async function removePhoto(db: SupabaseClient, stored: { mediaId: string; path: string }) {
  await db.from('media_assets').delete().eq('id', stored.mediaId)
  await db.storage.from('media').remove([stored.path])
}

// Streams a video into Cloudflare Stream in 50 MB pieces, without holding it all in memory.
export async function streamToCloudflare(body: ReadableStream<Uint8Array>, size: number, filename: string, upload = fetch): Promise<string> {
  if (!size) throw new FriendlyError('This video didn’t come through. Try again.')
  if (size > MAX_VIDEO_BYTES) throw new FriendlyError('This video is too long to add here. You can add it to a story instead.')
  const { uploadUrl, cloudflareUid } = await createPrivateTusUpload(size, filename)
  try {
    const reader = body.getReader()
    let offset = 0
    let pending: Uint8Array[] = []
    let pendingBytes = 0
    const send = async (chunk: Buffer) => {
      const sent = await upload(uploadUrl, { method: 'PATCH', headers: { 'Tus-Resumable': '1.0.0', 'Upload-Offset': String(offset), 'Content-Type': 'application/offset+octet-stream' }, body: new Uint8Array(chunk) })
      if (!sent.ok) throw new FriendlyError('This video didn’t come through. Try again.')
      offset += chunk.length
    }
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      pending.push(value)
      pendingBytes += value.length
      while (pendingBytes >= TUS_CHUNK) {
        const all = Buffer.concat(pending, pendingBytes)
        await send(all.subarray(0, TUS_CHUNK))
        const rest = all.subarray(TUS_CHUNK)
        pending = rest.length ? [rest] : []
        pendingBytes = rest.length
      }
    }
    if (pendingBytes) await send(Buffer.concat(pending, pendingBytes))
    if (offset !== size) throw new FriendlyError('This video didn’t come through. Try again.')
    return cloudflareUid
  } catch (error) {
    await deletePrivateVideo(cloudflareUid).catch(() => null)
    throw error
  }
}

function altFor(kind: 'photo' | 'video', takenAt: string | null) {
  if (!takenAt) return kind === 'video' ? 'A video of Varada' : 'A photo of Varada'
  const date = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${indiaDate(takenAt)}T00:00:00Z`))
  return kind === 'video' ? `A video of Varada from ${date}` : `A photo of Varada from ${date}`
}

// Best date we can be sure of, and where it came from. The camera's own clock (or Sujith's) wins,
// then the album's record of when it was taken, then the time hidden in the photo, then the file
// name, and last the day it was added.
const SURE = new Set(['camera', 'google_photos', 'set_by_hand'])
function settleDate(item: ImportItemRow, found?: string | null, fromPhoto?: string | null) {
  if (item.taken_at && item.taken_at_source && SURE.has(item.taken_at_source)) return { takenAt: item.taken_at, source: item.taken_at_source }
  if (found) return { takenAt: found, source: item.source === 'takeout' ? 'google_photos' : 'camera' }
  if (fromPhoto) return { takenAt: fromPhoto, source: 'camera' }
  const fromName = fileNameTime(item.filename)
  if (fromName) return { takenAt: fromName, source: 'file_name' }
  return { takenAt: item.taken_at, source: item.taken_at ? (item.taken_at_source ?? 'added') : 'unknown' }
}

async function placeOnDays(db: SupabaseClient, item: ImportItemRow, adminId: string, stored: { mediaId: string; width: number; height: number }, date: { takenAt: string | null; source: string }, videoId: string | null) {
  const reason = reviewReason({ takenAt: date.takenAt, filename: item.filename, takenAtSource: date.source })
  return db.from('timeline_media').insert({
    kind: item.kind, media_asset_id: stored.mediaId, video_asset_id: videoId,
    taken_at: date.takenAt, taken_at_source: date.source,
    visibility: reason ? 'review' : 'shown', review_reason: reason,
    source: item.source, source_item_id: item.source_item_id, source_filename: item.filename,
    width: stored.width, height: stored.height, created_by: adminId,
  }).select('id').single()
}

// The same photo can reach her days twice: once in the album and again shared to the folder.
// Same file name, taken within two minutes, from the other place: it's already there.
async function alreadyOnDays(db: SupabaseClient, item: ImportItemRow, takenAt: string | null) {
  if (!takenAt || !item.filename) return false
  const at = Date.parse(takenAt)
  const { data } = await db.from('timeline_media').select('id').eq('source_filename', item.filename).neq('source', item.source)
    .gte('taken_at', new Date(at - 120_000).toISOString()).lte('taken_at', new Date(at + 120_000).toISOString()).limit(1)
  return (data?.length ?? 0) > 0
}

async function markItem(db: SupabaseClient, id: string, fields: Record<string, unknown>) {
  await db.from('import_items').update({ ...fields, error: null, updated_at: new Date().toISOString() }).eq('id', id)
}

export async function importPhoto(db: SupabaseClient, reader: MediaReader, adminId: string, item: ImportItemRow): Promise<'added' | 'duplicate'> {
  const got = await reader.photo(item)
  if (got.bytes.length > MAX_PHOTO_BYTES) throw new FriendlyError('This photo is too big to add.')
  const description = got.description ?? item.description
  const preliminary = settleDate(item, got.takenAt)
  const stored = await storePhoto(db, adminId, got.bytes, altFor('photo', preliminary.takenAt), description)
  try {
    const date = settleDate(item, got.takenAt, stored.takenAt)
    const twin = await alreadyOnDays(db, item, date.takenAt)
    const { data, error } = twin ? { data: null, error: { code: '23505' } } : await placeOnDays(db, item, adminId, stored, date, null)
    if (error?.code === '23505') {
      await removePhoto(db, stored)
      await markItem(db, item.id, { status: 'duplicate' })
      return 'duplicate'
    }
    if (error || !data) throw new FriendlyError('This one didn’t save. Try again.')
    await markItem(db, item.id, { status: 'added', timeline_media_id: data.id })
    return 'added'
  } catch (error) {
    await removePhoto(db, stored)
    throw error
  }
}

// A video goes to the video service first; once it's ready (a few minutes later) its still is taken
// and it goes on her days (finishVideos).
export async function startVideo(db: SupabaseClient, reader: MediaReader, adminId: string, item: ImportItemRow): Promise<'waiting' | 'duplicate'> {
  const got = await reader.video(item)
  const date = settleDate(item, got.takenAt)
  if (date.source !== 'added' && await alreadyOnDays(db, item, date.takenAt)) {
    await got.body.cancel().catch(() => null)
    await markItem(db, item.id, { status: 'duplicate' })
    return 'duplicate'
  }
  const cloudflareUid = await streamToCloudflare(got.body, got.size, item.filename ?? 'video.mp4')
  const { data, error } = await db.from('video_assets').insert({ cloudflare_uid: cloudflareUid, caption: null, created_by: adminId, status: 'processing' }).select('id').single()
  if (error || !data) {
    await deletePrivateVideo(cloudflareUid).catch(() => null)
    throw new FriendlyError('This video didn’t save. Try again.')
  }
  await markItem(db, item.id, { status: 'video_waiting', video_asset_id: data.id, taken_at: date.takenAt, taken_at_source: date.source, description: got.description ?? item.description })
  return 'waiting'
}

export async function finishVideos(db: SupabaseClient, adminId: string, limit = 5, getStill = stillFromCloudflare): Promise<number> {
  const { data } = await db.from('import_items').select('*, video_assets(cloudflare_uid)').eq('status', 'video_waiting').order('updated_at', { ascending: true }).limit(limit)
  let done = 0
  for (const row of (data ?? []) as unknown as (ImportItemRow & { video_assets: { cloudflare_uid: string } | null })[]) {
    const uid = row.video_assets?.cloudflare_uid
    if (!uid || !row.video_asset_id) { await db.from('import_items').update({ status: 'failed', error: 'This video didn’t come through. Try again.' }).eq('id', row.id); continue }
    try {
      const state = await getVideoState(uid)
      if (state.status === 'processing') continue
      await db.from('video_assets').update({ status: state.status, duration_seconds: state.durationSeconds, updated_at: new Date().toISOString() }).eq('id', row.video_asset_id)
      if (state.status !== 'ready') { await db.from('import_items').update({ status: 'failed', error: 'This video didn’t come through. Try again.' }).eq('id', row.id); continue }
      const still = await getStill(uid)
      const stored = await storePhoto(db, adminId, still, altFor('video', row.taken_at), row.description)
      const { data: placed, error } = await placeOnDays(db, row, adminId, stored, { takenAt: row.taken_at, source: row.taken_at_source ?? (row.taken_at ? 'added' : 'unknown') }, row.video_asset_id)
      if (error?.code === '23505') { await removePhoto(db, stored); await markItem(db, row.id, { status: 'duplicate' }); continue }
      if (error || !placed) { await removePhoto(db, stored); continue }
      await markItem(db, row.id, { status: 'added', timeline_media_id: placed.id })
      done++
    } catch { /* tried again on the next check */ }
  }
  return done
}

// The video service's own still of a ready video, through the same private link the family uses.
async function stillFromCloudflare(cloudflareUid: string): Promise<Buffer> {
  const player = await createPrivatePlayerUrl(cloudflareUid, 600)
  const response = await fetch(player.replace(/\/iframe$/, '/thumbnails/thumbnail.jpg?time=1s&height=1600'), { cache: 'no-store' })
  if (!response.ok) throw new Error('No still yet')
  return Buffer.from(await response.arrayBuffer())
}

// Files that didn't come in get two more tries, on later checks.
export async function retryFailed(db: SupabaseClient, maxAttempts = 3): Promise<number> {
  const { data } = await db.from('import_items').update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('status', 'failed').lt('attempts', maxAttempts).select('id')
  return data?.length ?? 0
}

export function friendlyMessage(failure: unknown) {
  if (failure instanceof FriendlyError) return failure.message
  return 'This one didn’t come through. Try again.'
}

export async function importBatch(db: SupabaseClient, reader: MediaReader, adminId: string, runId: string | null, limit: number): Promise<BatchResult> {
  const { data, error } = await db.rpc('claim_import_items', { p_run_id: runId, p_limit: limit })
  if (error) throw new Error('Could not continue the import')
  const claimed = (data ?? []) as ImportItemRow[]
  // A few at once, except files with the same name (the album's copy and the folder's copy of one
  // photo), which go one after the other so the second can see the first is already there.
  const byName = new Map<string, ImportItemRow[]>()
  for (const item of claimed) {
    const name = (item.filename ?? item.id).toLowerCase()
    byName.set(name, [...(byName.get(name) ?? []), item])
  }
  await Promise.all([...byName.values()].map(async group => {
    for (const item of group) {
      try {
        if (item.kind === 'video') await startVideo(db, reader, adminId, item)
        else await importPhoto(db, reader, adminId, item)
      } catch (failure) {
        // Only plain-language reasons are kept: never a file address or a link.
        await db.from('import_items').update({ status: 'failed', error: friendlyMessage(failure), updated_at: new Date().toISOString() }).eq('id', item.id)
      }
    }
  }))
  const progress = await progressFor(db, runId ? { runId } : {})
  return { progress, claimed: claimed.length }
}
