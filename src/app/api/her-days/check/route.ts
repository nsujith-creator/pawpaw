// The daily look in the Her days folder (Vercel calls this once a day, see vercel.json), so new
// photos turn up even when nobody opens the site. Only Vercel's scheduler knows the secret.

import { timingSafeEqual } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncHerDays } from '@/lib/her-days/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function allowed(header: string | null) {
  const secret = process.env.CRON_SECRET
  if (!secret || !header) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export async function GET(request: Request) {
  if (!allowed(request.headers.get('authorization'))) return new Response('Not allowed', { status: 401 })
  const report = await syncHerDays(createAdminClient(), { deadline: Date.now() + 270_000, batch: 3 })
  if (report.found || (report.progress?.added ?? 0) > 0) revalidatePath('/days')
  return Response.json({ state: report.state, found: report.found, drafted: report.drafted, progress: report.progress })
}
