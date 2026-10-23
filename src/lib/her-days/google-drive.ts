// Reads the Her days folder and the album zip in Sujith's Google Drive.
// Pawpaw signs in as its own Google helper (a service account) that the folder is shared with, so
// nothing depends on anyone staying signed in. The helper's key lives only in the server's
// environment (GOOGLE_SERVICE_ACCOUNT) and is never sent to a browser.

import { createSign } from 'node:crypto'

const DRIVE = 'https://www.googleapis.com/drive/v3'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly'

// Where her photos live. Folder and file ids are not secrets; the helper can only read what
// Sujith shares with it.
export const GROWTH_TIMELINE_FOLDER_ID = '1mhCZ8rh2QzeqR3IQUn_D_vsRUt99K1Mx'
export const ALBUM_ZIP_FILE_ID = '1_ma0V_ZSCZICMbUL9t4schh82ZR4Y4-K'
export const HER_DAYS_FOLDER_NAME = 'Her days'

export type Fetcher = typeof fetch

interface ServiceAccount { client_email: string; private_key: string }

export function readServiceAccount(raw = process.env.GOOGLE_SERVICE_ACCOUNT): ServiceAccount | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>
    if (!parsed.client_email || !parsed.private_key) return null
    return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, '\n') }
  } catch {
    return null
  }
}

export class DriveError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const base64url = (input: Buffer | string) => Buffer.from(input).toString('base64url')

let cached: { token: string; expiresAt: number; email: string } | null = null

export async function accessToken(account: ServiceAccount, fetcher: Fetcher = fetch, now = Date.now()): Promise<string> {
  if (cached && cached.email === account.client_email && cached.expiresAt - 60_000 > now) return cached.token
  const issued = Math.floor(now / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(JSON.stringify({ iss: account.client_email, scope: SCOPE, aud: TOKEN_URL, iat: issued, exp: issued + 3600 }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const assertion = `${header}.${claims}.${base64url(signer.sign(account.private_key))}`
  const response = await fetcher(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  const body = await response.json().catch(() => ({})) as { access_token?: string; expires_in?: number }
  if (!response.ok || !body.access_token) throw new DriveError(response.status, 'Google did not let Pawpaw in')
  cached = { token: body.access_token, expiresAt: now + (body.expires_in ?? 3600) * 1000, email: account.client_email }
  return body.access_token
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: number | null
  createdTime: string | null
  description: string | null
  imageTime: string | null
  width: number | null
  height: number | null
}

interface RawFile {
  id?: string; name?: string; mimeType?: string; size?: string; createdTime?: string; description?: string
  imageMediaMetadata?: { time?: string; width?: number; height?: number }
  videoMediaMetadata?: { width?: number; height?: number }
}

const FILE_FIELDS = 'id,name,mimeType,size,createdTime,description,imageMediaMetadata(time,width,height),videoMediaMetadata(width,height)'

export function toDriveFile(raw: RawFile): DriveFile | null {
  if (!raw.id || !raw.name || !raw.mimeType) return null
  const media = raw.imageMediaMetadata ?? raw.videoMediaMetadata
  return {
    id: raw.id, name: raw.name, mimeType: raw.mimeType,
    size: raw.size ? Number(raw.size) : null,
    createdTime: raw.createdTime ?? null,
    description: raw.description?.trim() || null,
    imageTime: raw.imageMediaMetadata?.time ?? null,
    width: Number.isFinite(media?.width) ? Number(media!.width) : null,
    height: Number.isFinite(media?.height) ? Number(media!.height) : null,
  }
}

async function driveJson<T>(fetcher: Fetcher, token: string, path: string): Promise<T> {
  const response = await fetcher(`${DRIVE}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' })
  if (!response.ok) throw new DriveError(response.status, `Google Drive answered ${response.status}`)
  return (await response.json()) as T
}

// Every file inside a folder (one level), newest first, following every page.
export async function listFolder(fetcher: Fetcher, token: string, folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken: string | undefined
  for (let page = 0; page < 100; page++) {
    const query = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false`,
      fields: `nextPageToken,files(${FILE_FIELDS})`,
      pageSize: '1000', orderBy: 'createdTime desc',
      supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
    })
    if (pageToken) query.set('pageToken', pageToken)
    const body = await driveJson<{ files?: RawFile[]; nextPageToken?: string }>(fetcher, token, `/files?${query}`)
    for (const raw of body.files ?? []) { const file = toDriveFile(raw); if (file) files.push(file) }
    pageToken = body.nextPageToken
    if (!pageToken) break
  }
  return files
}

export async function findChildFolder(fetcher: Fetcher, token: string, parentId: string, name: string): Promise<string | null> {
  const query = new URLSearchParams({
    q: `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
  })
  const body = await driveJson<{ files?: { id: string }[] }>(fetcher, token, `/files?${query}`)
  return body.files?.[0]?.id ?? null
}

export async function fileSize(fetcher: Fetcher, token: string, fileId: string): Promise<number> {
  const body = await driveJson<{ size?: string }>(fetcher, token, `/files/${encodeURIComponent(fileId)}?fields=size&supportsAllDrives=true`)
  const size = Number(body.size)
  if (!Number.isFinite(size) || size <= 0) throw new DriveError(404, 'That file has no size')
  return size
}

// A file's bytes, or just bytes start..end (inclusive) of it.
export async function download(fetcher: Fetcher, token: string, fileId: string, range?: { start: number; end: number }): Promise<Response> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (range) headers.Range = `bytes=${range.start}-${range.end}`
  const response = await fetcher(`${DRIVE}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`, { headers, cache: 'no-store' })
  if (!response.ok) throw new DriveError(response.status, `Google Drive download answered ${response.status}`)
  return response
}

export async function downloadRange(fetcher: Fetcher, token: string, fileId: string, start: number, end: number): Promise<Buffer> {
  const response = await download(fetcher, token, fileId, { start, end })
  const buffer = Buffer.from(await response.arrayBuffer())
  // A server that ignores Range sends the whole file; keep only what was asked for.
  if (response.status === 200 && buffer.length > end - start + 1) return buffer.subarray(start, end + 1)
  return buffer
}
