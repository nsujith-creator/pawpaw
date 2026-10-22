// Talks to the Google Photos Picker API on behalf of the admin who is signed in to Google.
// Google stopped letting apps read a whole photo library on 31 March 2025. The Picker is the
// supported way in: the person chooses photos in Google Photos, and the app may then copy them.
// The Google access token comes from the admin's browser for each call and is never stored.

const API = 'https://photospicker.googleapis.com/v1'

export type Fetcher = typeof fetch

export interface PickerSession {
  id: string
  pickerUri: string
  mediaItemsSet: boolean
  expireTime: string | null
  pollIntervalMs: number
}

export interface PickedItem {
  id: string
  kind: 'photo' | 'video'
  createTime: string | null
  mimeType: string | null
  filename: string | null
  width: number | null
  height: number | null
  baseUrl: string
  videoReady: boolean
}

export class GoogleError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

function seconds(value: unknown, fallbackMs: number) {
  const match = typeof value === 'string' ? /^([\d.]+)s$/.exec(value) : null
  return match ? Math.round(Number(match[1]) * 1000) : fallbackMs
}

async function call<T>(fetcher: Fetcher, token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetcher(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  if (!response.ok) throw new GoogleError(response.status, `Google Photos answered ${response.status}`)
  return (await response.json()) as T
}

interface RawSession { id?: string; pickerUri?: string; mediaItemsSet?: boolean; expireTime?: string; pollingConfig?: { pollInterval?: string } }

function session(raw: RawSession): PickerSession {
  if (!raw.id || !raw.pickerUri) throw new GoogleError(502, 'Google Photos did not start a session')
  return {
    id: raw.id,
    pickerUri: raw.pickerUri,
    mediaItemsSet: raw.mediaItemsSet === true,
    expireTime: raw.expireTime ?? null,
    pollIntervalMs: Math.min(Math.max(seconds(raw.pollingConfig?.pollInterval, 4000), 2000), 15000),
  }
}

export async function createSession(fetcher: Fetcher, token: string): Promise<PickerSession> {
  return session(await call<RawSession>(fetcher, token, '/sessions', { method: 'POST', body: JSON.stringify({ pickingConfig: { maxItemCount: '2000' } }) }))
}

export async function getSession(fetcher: Fetcher, token: string, id: string): Promise<PickerSession> {
  return session(await call<RawSession>(fetcher, token, `/sessions/${encodeURIComponent(id)}`))
}

export async function deleteSession(fetcher: Fetcher, token: string, id: string): Promise<void> {
  await fetcher(`${API}/sessions/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }).catch(() => null)
}

interface RawItem {
  id?: string
  createTime?: string
  type?: string
  mediaFile?: {
    baseUrl?: string
    mimeType?: string
    filename?: string
    mediaFileMetadata?: { width?: number; height?: number; videoMetadata?: { processingStatus?: string } }
  }
}

export function toPickedItem(raw: RawItem): PickedItem | null {
  const file = raw.mediaFile
  if (!raw.id || !file?.baseUrl) return null
  const isVideo = raw.type === 'VIDEO' || (file.mimeType ?? '').startsWith('video/')
  const meta = file.mediaFileMetadata
  const time = raw.createTime && !Number.isNaN(Date.parse(raw.createTime)) ? new Date(raw.createTime).toISOString() : null
  return {
    id: raw.id,
    kind: isVideo ? 'video' : 'photo',
    createTime: time,
    mimeType: file.mimeType ?? null,
    filename: file.filename ?? null,
    width: Number.isFinite(meta?.width) ? Number(meta?.width) : null,
    height: Number.isFinite(meta?.height) ? Number(meta?.height) : null,
    baseUrl: file.baseUrl,
    videoReady: !isVideo || (meta?.videoMetadata?.processingStatus ?? 'READY') === 'READY',
  }
}

export async function listPicked(fetcher: Fetcher, token: string, sessionId: string): Promise<PickedItem[]> {
  const items: PickedItem[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 40; page++) {
    const query = new URLSearchParams({ sessionId, pageSize: '100' })
    if (pageToken) query.set('pageToken', pageToken)
    const body = await call<{ mediaItems?: RawItem[]; nextPageToken?: string }>(fetcher, token, `/mediaItems?${query}`)
    for (const raw of body.mediaItems ?? []) { const item = toPickedItem(raw); if (item) items.push(item) }
    pageToken = body.nextPageToken
    if (!pageToken) break
  }
  return items
}

// Picked items carry a download address that works for about an hour, with the same token.
// "=w1600-h1600" asks Google for a copy no larger than 1600 pixels; "=dv" is the video file.
export function photoUrl(baseUrl: string, longEdge = 1600) { return `${baseUrl}=w${longEdge}-h${longEdge}` }
export function videoUrl(baseUrl: string) { return `${baseUrl}=dv` }

export async function download(fetcher: Fetcher, token: string, url: string): Promise<Response> {
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) throw new GoogleError(response.status, `Google Photos download answered ${response.status}`)
  return response
}
