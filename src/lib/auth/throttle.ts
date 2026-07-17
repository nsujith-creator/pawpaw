// Database-backed viewer login throttle. Failure increments are atomic in
// Postgres so concurrent requests cannot lose counts.

import { createAdminClient } from '@/lib/supabase/admin'
import { serverEnv } from '@/lib/env'

export const FAILURE_THRESHOLD = 10
export const WINDOW_SECONDS = 15 * 60
export const BLOCK_SECONDS = 30 * 60

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
    return { blocked: true }
  }

  const db = createAdminClient()
  const { data, error } = await db
    .from('viewer_login_attempts')
    .select('failure_count, blocked_until')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (error) return { blocked: true }
  if (!data) return { blocked: false }
  return { blocked: Boolean(data.blocked_until && new Date(data.blocked_until) > new Date()) }
}

export async function recordFailure(rawClientId: string): Promise<void> {
  const keyHash = await computeThrottleKey(rawClientId)
  const db = createAdminClient()
  const { error } = await db.rpc('record_viewer_login_failure', { p_key_hash: keyHash })
  if (error) throw new Error('Throttle datastore unavailable')
}

export async function clearThrottle(rawClientId: string): Promise<void> {
  const keyHash = await computeThrottleKey(rawClientId)
  const db = createAdminClient()
  const { error } = await db.from('viewer_login_attempts').delete().eq('key_hash', keyHash)
  if (error) throw new Error('Throttle datastore unavailable')
}
