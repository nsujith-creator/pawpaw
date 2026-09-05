// Rejects cross-origin administrator mutations.
// Called in server actions before any state change.

import { publicEnv } from '@/lib/env'

export function checkOrigin(headers: Headers): void {
  const origin = headers.get('origin')
  if (!origin) return  // Same-origin requests may omit the Origin header.

  const configuredOrigin = new URL(publicEnv.siteUrl).origin
  const allowed = new Set([
    configuredOrigin,
    'http://localhost:3000',
  ])

  if (allowed.has(origin)) return

  // Preview deployments have their own HTTPS hostname. Comparing Origin with
  // the request Host preserves the same-origin boundary without hardcoding a
  // temporary Vercel URL or weakening the check to a domain suffix.
  const requestHost = headers.get('host')?.split(',')[0]?.trim().toLowerCase()

  try {
    const parsedOrigin = new URL(origin)
    if (
      requestHost &&
      parsedOrigin.protocol === 'https:' &&
      parsedOrigin.host.toLowerCase() === requestHost
    ) {
      return
    }
  } catch {
    // Fall through to the same truthful rejection used for unknown origins.
  }

  throw new Error(`Cross-origin mutation rejected: ${origin}`)
}
