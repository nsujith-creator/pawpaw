import { afterAll, describe, expect, it } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'node:crypto'
import { FAILURE_THRESHOLD } from '@/lib/auth/throttle'
import { fixtureRunId } from './fixture-names'

const hasRealCredentials = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('test-project'),
)

describe.skipIf(!hasRealCredentials)('atomic live login throttle', () => {
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const keyHash = `7061777061777465${createHash('sha256').update(fixtureRunId()).digest('hex').slice(0, 48)}`

  afterAll(async () => {
    await db.from('viewer_login_attempts').delete().eq('key_hash', keyHash)
  })

  it('counts concurrent failures without lost increments and blocks at the threshold', async () => {
    const results = await Promise.all(Array.from({ length: FAILURE_THRESHOLD }, () =>
      db.rpc('record_viewer_login_failure', { p_key_hash: keyHash }),
    ))
    results.forEach(result => expect(result.error).toBeNull())

    const { data, error } = await db.from('viewer_login_attempts')
      .select('failure_count, blocked_until').eq('key_hash', keyHash).single()
    expect(error).toBeNull()
    expect(data?.failure_count).toBe(FAILURE_THRESHOLD)
    expect(Date.parse(data?.blocked_until ?? '')).toBeGreaterThan(Date.now())
  })
})
