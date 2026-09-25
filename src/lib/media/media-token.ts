// Opaque, tamper-proof photo addresses.
// A page never receives a storage path or a signed storage link. It receives /p/<token>,
// where the token is the storage path encrypted with AES-GCM under a key derived from the
// viewer cookie secret. Tokens cannot be forged or edited, and they do not expire: access
// is decided on every request by the /p route, which checks the family or admin session.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'
import { serverEnv } from '@/lib/env'

const IV_BYTES = 12
const TAG_BYTES = 16

function key(secret: string): Buffer {
  return createHash('sha256').update(`${secret}:pawpaw-media-v1`).digest()
}

export function encodeMediaToken(storagePath: string, secret: string = serverEnv.viewerCookieSecret): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', key(secret), iv)
  const body = Buffer.concat([cipher.update(storagePath, 'utf8'), cipher.final()])
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url')
}

export function decodeMediaToken(token: string, secret: string = serverEnv.viewerCookieSecret): string | null {
  try {
    const raw = Buffer.from(token, 'base64url')
    if (raw.length <= IV_BYTES + TAG_BYTES) return null
    const decipher = createDecipheriv('aes-256-gcm', key(secret), raw.subarray(0, IV_BYTES))
    decipher.setAuthTag(raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES))
    const path = Buffer.concat([decipher.update(raw.subarray(IV_BYTES + TAG_BYTES)), decipher.final()]).toString('utf8')
    // Only ever a path inside the private media bucket, never a traversal.
    if (!path || path.startsWith('/') || path.includes('..')) return null
    return path
  } catch {
    return null
  }
}

// Photo widths the site asks for. Anything else is rounded to the nearest of these,
// so the derived-size cache stays small and predictable.
export const PHOTO_WIDTHS = [480, 960, 1600] as const
export type PhotoWidth = typeof PHOTO_WIDTHS[number]

export function nearestPhotoWidth(value: string | null): PhotoWidth {
  const requested = Number(value)
  if (!Number.isFinite(requested) || requested <= 0) return 1600
  return PHOTO_WIDTHS.find(width => width >= requested) ?? 1600
}
