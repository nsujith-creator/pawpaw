// Lazy environment variable accessors.
// Server-only vars are accessed at call time so tests can set process.env before import.

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable: ${name}`)
  return v
}

export const MIN_VIEWER_COOKIE_SECRET_BYTES = 32

export type ViewerAuthConfigResult =
  | { valid: true; secret: string; sessionVersion: number }
  | { valid: false }

export function readViewerAuthConfig(
  source: Record<string, string | undefined> = process.env,
): ViewerAuthConfigResult {
  const secret = source.VIEWER_COOKIE_SECRET
  const rawVersion = source.VIEWER_SESSION_VERSION

  if (!secret || !rawVersion || !/^[1-9]\d*$/.test(rawVersion)) {
    return { valid: false }
  }

  const secretBytes = new TextEncoder().encode(secret)
  const distinctCharacters = new Set(secret).size
  if (secretBytes.byteLength < MIN_VIEWER_COOKIE_SECRET_BYTES || distinctCharacters < 16) {
    return { valid: false }
  }

  const sessionVersion = Number(rawVersion)
  if (!Number.isSafeInteger(sessionVersion)) return { valid: false }

  return { valid: true, secret, sessionVersion }
}

function viewerAuthConfig() {
  const result = readViewerAuthConfig()
  if (!result.valid) throw new Error('Viewer authentication configuration is invalid')
  return result
}

export const serverEnv = {
  get supabaseServiceRoleKey() { return req('SUPABASE_SERVICE_ROLE_KEY') },
  get viewerPassphraseHash()   { return req('VIEWER_PASSPHRASE_HASH') },
  get viewerCookieSecret()     { return viewerAuthConfig().secret },
  get viewerSessionVersion()   { return viewerAuthConfig().sessionVersion },
  get throttleKeySecret() { return req('THROTTLE_KEY_SECRET') },
}

// Public vars are safe to reference at module load time.
export const publicEnv = {
  supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  siteUrl:         process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
}
