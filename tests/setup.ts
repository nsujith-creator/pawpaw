// Vitest global setup: provides test values for all environment variables.
// None of these are production secrets.

process.env.NEXT_PUBLIC_SUPABASE_URL    = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-not-a-real-credential'
process.env.SUPABASE_SERVICE_ROLE_KEY   = 'test-service-role-not-a-real-credential'
process.env.VIEWER_PASSPHRASE_HASH      = 'scrypt:aabbccdd:eeff0011'
process.env.VIEWER_COOKIE_SECRET        = 'test-viewer-cookie-secret-32-chars!!'
process.env.VIEWER_SESSION_VERSION      = '1'
process.env.THROTTLE_KEY_SECRET         = 'test-throttle-key-secret-32-chars!!'
process.env.NEXT_PUBLIC_SITE_URL        = 'https://test.pawpaw.in'
// NODE_ENV is set to 'test' by Vitest itself and is read-only in @types/node.
