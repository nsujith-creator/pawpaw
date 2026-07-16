// Viewer session cookie: HMAC-SHA-256 signed, httpOnly, expiring, version-revocable.
// Uses only Web Crypto (SubtleCrypto) for Edge and Node compatibility.

export const VIEWER_COOKIE_NAME = 'pawpaw_viewer'

const DURATION_SECONDS = 60 * 60 * 24 * 30 // 30 days

interface Payload {
  ver: number  // session version — rotate to invalidate all sessions
  exp: number  // unix expiry
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf
  let binary = ''
  bytes.forEach(b => { binary += String.fromCharCode(b) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function b64urlDecode(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const base64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const arr = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i)
  return arr
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

export async function signViewerCookie(
  secret: string,
  sessionVersion: number,
): Promise<string> {
  const payload: Payload = {
    ver: sessionVersion,
    exp: Math.floor(Date.now() / 1000) + DURATION_SECONDS,
  }
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)))
  const key = await importKey(secret)
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64))
  return `${payloadB64}.${b64urlEncode(sig)}`
}

export async function verifyViewerCookie(
  value: string,
  secret: string,
  expectedVersion: number,
): Promise<{ valid: boolean; reason?: string }> {
  const parts = value.split('.')
  if (parts.length !== 2) return { valid: false, reason: 'malformed' }
  const [payloadB64, sigB64] = parts

  try {
    const key = await importKey(secret)
    const ok = await crypto.subtle.verify(
      'HMAC',
      key,
      b64urlDecode(sigB64),
      new TextEncoder().encode(payloadB64),
    )
    if (!ok) return { valid: false, reason: 'signature' }

    const payload = JSON.parse(
      new TextDecoder().decode(b64urlDecode(payloadB64)),
    ) as Payload

    if (payload.exp < Math.floor(Date.now() / 1000)) return { valid: false, reason: 'expired' }
    if (payload.ver !== expectedVersion)              return { valid: false, reason: 'version' }

    return { valid: true }
  } catch {
    return { valid: false, reason: 'invalid' }
  }
}

export const VIEWER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: DURATION_SECONDS,
}
