// Lazy environment variable accessors.
// Server-only vars are accessed at call time so tests can set process.env before import.

function req(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required environment variable: ${name}`)
  return v
}

export const serverEnv = {
  get supabaseServiceRoleKey() { return req('SUPABASE_SERVICE_ROLE_KEY') },
  get viewerPassphraseHash()   { return req('VIEWER_PASSPHRASE_HASH') },
  get viewerCookieSecret()     { return req('VIEWER_COOKIE_SECRET') },
  get viewerSessionVersion() {
    const v = parseInt(process.env.VIEWER_SESSION_VERSION ?? '1', 10)
    if (isNaN(v)) throw new Error('VIEWER_SESSION_VERSION must be an integer')
    return v
  },
  get throttleKeySecret() { return req('THROTTLE_KEY_SECRET') },
}

// Public vars are safe to reference at module load time.
export const publicEnv = {
  supabaseUrl:     process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  siteUrl:         process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
}
