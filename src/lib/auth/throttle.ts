// Database-backed viewer login throttle.
// Consistent across all Vercel instances because state lives in Postgres.
// key_hash = HMAC-SHA-256(normalized_client_id, THROTTLE_KEY_SECRET).
// Raw client identifiers are never stored or logged.

import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'

export const FAILURE_THRESHOLD = 10
export const WINDOW_SECONDS    = 15 * 60  // 15 minutes
export const BLOCK_SECONDS     = 30 * 60  // 30 minutes

export async function computeThrottleKey(rawClientId: string): Promise<string> {
  const normalized = rawClientId.toLowerCase().trim()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serverEnv.throttleKeySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(normalized))
  return Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function checkThrottle(rawClientId: string): Promise<{ blocked: boolean }> {
  let keyHash: string
  try {
    keyHash = await computeThrottleKey(rawClientId)
  } catch {
    return { blocked: true }  // fail safe: secret missing or crypto error
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('viewer_login_attempts')
    .select('failure_count, blocked_until')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) return { blocked: true }  // fail safe on DB error
  if (!data)  return { blocked: false }

  if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
    return { blocked: true }
  }

  return { blocked: false }
}

export async function recordFailure(rawClientId: string): Promise<void> {
  let keyHash: string
  try {
    keyHash = await computeThrottleKey(rawClientId)
  } catch {
    return  // cannot persist — acceptable; throttle is defence in depth
  }

  const db = createAdminClient()
  const now = new Date()

  const { data: existing } = await db
    .from('viewer_login_attempts')
    .select('failure_count, window_started_at')
    .eq('key_hash', keyHash)
    .maybeSingle()

  const windowExpired = existing
    ? (now.getTime() - new Date(existing.window_started_at).getTime()) > WINDOW_SECONDS * 1000
    : false

  const newCount       = windowExpired ? 1 : (existing?.failure_count ?? 0) + 1
  const newWindowStart = (windowExpired || !existing)
    ? now.toISOString()
    : existing.window_started_at
  const blockedUntil   = newCount >= FAILURE_THRESHOLD
    ? new Date(now.getTime() + BLOCK_SECONDS * 1000).toISOString()
    : null

  await db.from('viewer_login_attempts').upsert({
    key_hash:          keyHash,
    failure_count:     newCount,
    window_started_at: newWindowStart,
    blocked_until:     blockedUntil,
    updated_at:        now.toISOString(),
  })
}

export async function clearThrottle(rawClientId: string): Promise<void> {
  let keyHash: string
  try {
    keyHash = await computeThrottleKey(rawClientId)
  } catch {
    return
  }

  const db = createAdminClient()
  await db.from('viewer_login_attempts').delete().eq('key_hash', keyHash)
}
