// Vitest global setup: provides safe stub values for any environment variable
// not already supplied to the test process. None of these are production secrets.
//
// `??=` only assigns when the variable is undefined, so real credentials
// (loaded via `npm run test:integration:live`, which runs Vitest in `live`
// mode and reads .env.local) are never overwritten. Plain `npm test` supplies
// nothing, so every variable falls back to the stub and the live integration
// tests skip themselves.

process.env.NEXT_PUBLIC_SUPABASE_URL      ??= 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key-not-a-real-credential'
process.env.SUPABASE_SERVICE_ROLE_KEY     ??= 'test-service-role-not-a-real-credential'
process.env.VIEWER_PASSPHRASE_HASH        ??= 'scrypt:aabbccdd:eeff0011'
process.env.VIEWER_COOKIE_SECRET          ??= 'test-viewer-cookie-secret-32-chars!!'
process.env.VIEWER_SESSION_VERSION        ??= '1'
process.env.THROTTLE_KEY_SECRET           ??= 'test-throttle-key-secret-32-chars!!'
process.env.NEXT_PUBLIC_SITE_URL          ??= 'https://test.pawpaw.in'
// NODE_ENV is set to 'test' by Vitest itself and is read-only in @types/node.
