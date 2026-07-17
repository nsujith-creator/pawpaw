// Deterministic viewer session for E2E tests.
// The dev server verifies the pawpaw_viewer cookie with VIEWER_COOKIE_SECRET
// from .env.local — the same file the Playwright webServer command loads. So
// the test setup can mint a valid cookie with the identical signing code the
// app uses, with no manually pasted cookie and no passphrase involved.
// Secrets are read into memory only; nothing is logged or printed.

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { signViewerCookie } from '../../src/lib/auth/viewer-cookie'

export function loadEnvLocal(): Record<string, string> {
  const file = join(__dirname, '../../.env.local')
  if (!existsSync(file)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
  return out
}

// Order of precedence: explicit PLAYWRIGHT_VIEWER_COOKIE, then a cookie signed
// with the local secret. Returns null when neither is available (CI without
// credentials) so callers can skip.
export async function makeViewerCookieValue(): Promise<string | null> {
  if (process.env.PLAYWRIGHT_VIEWER_COOKIE) return process.env.PLAYWRIGHT_VIEWER_COOKIE

  const env     = loadEnvLocal()
  const secret  = process.env.VIEWER_COOKIE_SECRET ?? env.VIEWER_COOKIE_SECRET
  const version = Number(process.env.VIEWER_SESSION_VERSION ?? env.VIEWER_SESSION_VERSION ?? NaN)
  if (!secret || !Number.isFinite(version)) return null

  return signViewerCookie(secret, version)
}
