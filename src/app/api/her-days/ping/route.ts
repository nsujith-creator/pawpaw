// Knocked on every couple of minutes by the database's own timer (see the migration), so a photo
// put in the Her days folder is picked up by itself, with nobody opening the site. The knock
// carries a key that lives only in the database. A knock while a look is already running, or
// right after one, does nothing.

import { after } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncHerDays } from '@/lib/her-days/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function allowed(db: SupabaseClient, header: string | null) {
  if (!header) return false
  const { data } = await db.from('her_days_state').select('value').eq('key', 'ping').maybeSingle()
  const key = (data?.value as { key?: string } | undefined)?.key
  if (!key) return false
  const expected = Buffer.from(`Bearer ${key}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  const db = createAdminClient()
  if (!(await allowed(db, request.headers.get('authorization')))) return new Response('Not allowed', { status: 401 })
  // Answer at once; the look carries on after the answer, for up to about four and a half minutes.
  after(async () => {
    const report = await syncHerDays(db, { deadline: Date.now() + 270_000, batch: 3, everySeconds: 90 })
    if (report.found || (report.progress?.added ?? 0) > 0) revalidatePath('/days')
  })
  return new Response('ok')
}
