// One check of her photos: looks in the Her days folder (and, the first time, through the album zip),
// writes down anything new, brings in as much as time allows, finishes videos that are ready, and
// drafts lines for photos that have none. Safe to run often and from several places: each file goes
// in once, and work left over is picked up by the next check.

import { createInflateRaw } from 'node:zlib'
import { Readable } from 'node:stream'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ALBUM_ZIP_FILE_ID, GROWTH_TIMELINE_FOLDER_ID, HER_DAYS_FOLDER_NAME,
  accessToken, download, downloadRange, fileSize, findChildFolder, listFolder, readServiceAccount, type DriveFile, type Fetcher,
} from './google-drive'
import { dataStart, isMedia, isVideo, matchSidecars, parseSidecar, readEntries, readEntry, type ZipEntry } from './zip'
import { cameraTime, fileNameTime } from './days'
import { finishVideos, importBatch, progressFor, recordFound, retryFailed, type FoundItem, type ImportItemRow, type MediaReader, type Progress } from './importer'
import { draftMissingLines } from './captions'

export type SyncState = 'not_linked' | 'no_folder' | 'ok' | 'busy' | 'error'
export interface SyncReport { state: SyncState; found: number; progress: Progress | null; drafted: number; checkedAt: string | null }

const isPhotoMime = (mime: string) => mime.startsWith('image/') && mime !== 'image/svg+xml'
const isVideoMime = (mime: string) => mime.startsWith('video/')

// What a file in the folder tells us about when it was taken.
export function folderItem(file: DriveFile): FoundItem | null {
  const kind = isPhotoMime(file.mimeType) ? 'photo' : isVideoMime(file.mimeType) ? 'video' : null
  if (!kind) return null
  const camera = cameraTime(file.imageTime)
  const named = camera ? null : fileNameTime(file.name)
  const takenAt = camera ?? named ?? file.createdTime
  return {
    sourceItemId: file.id, kind, filename: file.name, description: file.description,
    takenAt, takenAtSource: camera ? 'camera' : named ? 'file_name' : takenAt ? 'added' : null,
    width: file.width, height: file.height, driveFileId: file.id,
  }
}

interface ZipRef { entry: ZipEntry; sidecar: ZipEntry | null }

export function albumItems(entries: ZipEntry[]): FoundItem[] {
  const sidecars = matchSidecars(entries)
  return entries.filter(entry => isMedia(entry.name)).map(entry => {
    const filename = entry.name.slice(entry.name.lastIndexOf('/') + 1)
    const named = fileNameTime(filename)
    return {
      sourceItemId: entry.name, kind: isVideo(entry.name) ? 'video' : 'photo', filename, description: null,
      takenAt: named, takenAtSource: named ? 'file_name' : null, width: null, height: null,
      zipEntry: { entry, sidecar: sidecars.get(entry.name) ?? null } satisfies ZipRef,
    }
  })
}

export function makeReader(fetcher: Fetcher, token: string): MediaReader {
  const readZip = (start: number, end: number) => downloadRange(fetcher, token, ALBUM_ZIP_FILE_ID, start, end)
  const sidecarOf = async (ref: ZipRef) => ref.sidecar ? parseSidecar(await readEntry(readZip, ref.sidecar)) : null
  return {
    async photo(item: ImportItemRow) {
      if (item.source === 'google_drive' && item.drive_file_id) {
        const response = await download(fetcher, token, item.drive_file_id)
        return { bytes: Buffer.from(await response.arrayBuffer()) }
      }
      const ref = item.zip_entry as ZipRef
      const [bytes, sidecar] = await Promise.all([readEntry(readZip, ref.entry), sidecarOf(ref)])
      return { bytes, takenAt: sidecar?.takenAt ?? null, description: sidecar?.description ?? null }
    },
    async video(item: ImportItemRow) {
      if (item.source === 'google_drive' && item.drive_file_id) {
        const response = await download(fetcher, token, item.drive_file_id)
        const size = Number(response.headers.get('content-length') ?? 0)
        return { body: response.body!, size }
      }
      // A video from the album is read straight out of the zip as a stream, so even a big one
      // never sits in memory all at once. A squeezed (deflated) video is unsqueezed on the way.
      const ref = item.zip_entry as ZipRef
      const sidecar = await sidecarOf(ref)
      const start = await dataStart(readZip, ref.entry)
      const response = await download(fetcher, token, ALBUM_ZIP_FILE_ID, { start, end: start + ref.entry.compressedSize - 1 })
      let body: ReadableStream<Uint8Array> = response.body!
      if (ref.entry.method === 8) body = Readable.toWeb(Readable.fromWeb(body as never).pipe(createInflateRaw())) as unknown as ReadableStream<Uint8Array>
      else if (ref.entry.method !== 0) throw new Error('Unsupported zip compression')
      return { body, size: ref.entry.size, takenAt: sidecar?.takenAt ?? null, description: sidecar?.description ?? null }
    },
  }
}

// The account that photos brought in by a check are filed under: the first active admin.
export async function ownerId(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from('admin_users').select('user_id').eq('active', true).order('created_at', { ascending: true }).limit(1).maybeSingle()
  return (data?.user_id as string | undefined) ?? null
}

async function newRun(db: SupabaseClient, source: 'google_drive' | 'takeout', adminId: string) {
  const { data, error } = await db.from('import_runs').insert({ source, status: 'importing', started_by: adminId }).select('id').single()
  if (error || !data) throw new Error('Could not start a check')
  return data.id as string
}

async function noteState(db: SupabaseClient, key: string, value: Record<string, unknown>) {
  const { data } = await db.from('her_days_state').select('value').eq('key', key).maybeSingle()
  const next = { ...((data?.value as Record<string, unknown>) ?? {}), ...value }
  await db.from('her_days_state').upsert({ key, value: next, updated_at: new Date().toISOString() })
}

export async function lastChecked(db: SupabaseClient): Promise<string | null> {
  const { data } = await db.from('her_days_state').select('value').eq('key', 'folder').maybeSingle()
  return ((data?.value as { checked_at?: string } | undefined)?.checked_at) ?? null
}

export interface SyncOptions {
  deadline: number          // ms timestamp to stop starting new work
  batch?: number            // files per round
  everySeconds?: number     // skip if a check finished this recently (0 = always run)
  draftLines?: boolean
  fetcher?: Fetcher
}

export async function syncHerDays(db: SupabaseClient, options: SyncOptions): Promise<SyncReport> {
  const fetcher = options.fetcher ?? fetch
  const account = readServiceAccount()
  if (!account) return { state: 'not_linked', found: 0, progress: null, drafted: 0, checkedAt: await lastChecked(db) }

  const { data: turn } = await db.rpc('take_her_days_turn', { p_key: 'folder', p_every_seconds: options.everySeconds ?? 0 })
  if (turn !== true) return { state: 'busy', found: 0, progress: await progressFor(db, {}), drafted: 0, checkedAt: await lastChecked(db) }

  let state: SyncState = 'ok'
  let found = 0
  let drafted = 0
  try {
    const adminId = await ownerId(db)
    if (!adminId) throw new Error('No admin to file photos under')
    const token = await accessToken(account, fetcher)

    // 1. The Her days folder: anything new since last time.
    const folderId = await findChildFolder(fetcher, token, GROWTH_TIMELINE_FOLDER_ID, HER_DAYS_FOLDER_NAME)
    if (folderId) {
      const items = (await listFolder(fetcher, token, folderId)).map(folderItem).filter((item): item is FoundItem => item !== null)
      if (items.length) {
        const runId = await newRun(db, 'google_drive', adminId)
        found += await recordFound(db, runId, 'google_drive', items)
      }
    } else {
      state = 'no_folder'
    }

    // 2. The album, once: its table of contents is read and every photo written down.
    const { data: album } = await db.from('her_days_state').select('value').eq('key', 'album').maybeSingle()
    if (!(album?.value as { listed?: boolean } | undefined)?.listed) {
      const size = await fileSize(fetcher, token, ALBUM_ZIP_FILE_ID)
      const entries = await readEntries((start, end) => downloadRange(fetcher, token, ALBUM_ZIP_FILE_ID, start, end), size)
      const items = albumItems(entries)
      const runId = await newRun(db, 'takeout', adminId)
      found += await recordFound(db, runId, 'takeout', items)
      await noteState(db, 'album', { listed: true, files: items.length })
    }

    // 3. Bring in as much as time allows, finish ready videos, then draft lines.
    await retryFailed(db)
    const reader = makeReader(fetcher, token)
    while (Date.now() < options.deadline) {
      const { claimed } = await importBatch(db, reader, adminId, null, options.batch ?? 3)
      if (claimed === 0) break
    }
    if (Date.now() < options.deadline) await finishVideos(db, adminId)
    if (options.draftLines !== false && Date.now() < options.deadline) drafted = await draftMissingLines(db, { deadline: options.deadline })
  } catch (error) {
    state = 'error'
    console.error('Her days check stopped early.', { message: error instanceof Error ? error.message.slice(0, 200) : 'unknown' })
  } finally {
    await noteState(db, 'folder', { running_since: null, checked_at: new Date().toISOString(), state })
  }
  return { state, found, progress: await progressFor(db, {}), drafted, checkedAt: new Date().toISOString() }
}
