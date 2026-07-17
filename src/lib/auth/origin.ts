// Rejects cross-origin administrator mutations.
// Called in server actions before any state change.

import { publicEnv } from '@/lib/env'

export function checkOrigin(headers: Headers): void {
  const origin = headers.get('origin')
  if (!origin) return  // Same-origin requests may omit the Origin header.

  const allowed = new Set([
    new URL(publicEnv.siteUrl).origin,
    'http://localhost:3000',
  ])

  if (!allowed.has(origin)) {
    throw new Error(`Cross-origin mutation rejected: ${origin}`)
  }
}
