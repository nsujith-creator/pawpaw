import { requireAdminPage } from '@/lib/admin/require-admin-page'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { GOOGLE_CLIENT_ID } from '@/lib/her-days/google-config'
import { indiaDate } from '@/lib/her-days/days'
import AdminState from '../admin-state'
import HerDaysDesk, { type DeskMonth, type DeskPhoto, type DeskRun } from './her-days-desk'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'
// Bringing a video in streams it from Google to the video service inside one call.
export const maxDuration = 300
export const metadata = { title: 'Her days' }

interface TimelineRow {
  id: string
  kind: 'photo' | 'video'
  taken_at: string | null
  review_reason: string | null
  media_assets: { storage_path: string } | null
}

async function photos(rows: TimelineRow[]): Promise<DeskPhoto[]> {
  return Promise.all(rows.map(async row => ({
    id: row.id,
    kind: row.kind,
    date: row.taken_at ? indiaDate(row.taken_at) : null,
    reason: row.review_reason,
    url: row.media_assets ? await generateSignedUrl(row.media_assets.storage_path) : null,
  })))
}

function nextMonth(month: string) {
  const [year, m] = month.split('-').map(Number)
  return m === 12 ? `${year + 1}-01` : `${year}-${String(m + 1).padStart(2, '0')}`
}

// Every month that has photos on her days, newest first, so any photo can be found again.
async function monthsOnHerDays(db: ReturnType<typeof createAdminClient>): Promise<DeskMonth[] | null> {
  const counts = new Map<string, number>()
  for (let from = 0; from < 100_000; from += 1000) {
    const { data, error } = await db.from('timeline_media').select('taken_at').eq('visibility', 'shown').not('taken_at', 'is', null)
      .order('taken_at', { ascending: true }).order('id', { ascending: true }).range(from, from + 999)
    if (error) return null
    for (const row of data ?? []) { const key = indiaDate(row.taken_at as string).slice(0, 7); counts.set(key, (counts.get(key) ?? 0) + 1) }
    if (!data || data.length < 1000) break
  }
  return [...counts.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([key, count]) => ({
    key, count,
    label: new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${key}-01T00:00:00Z`)),
  }))
}

export default async function HerDaysDeskPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage()
  const raw = (await searchParams).month
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : null
  const db = createAdminClient()
  const select = 'id, kind, taken_at, review_reason, media_assets(storage_path)'
  const [runsResult, reviewResult, recentResult, hiddenResult, shownCount] = await Promise.all([
    db.from('import_runs').select('id, status, started_at, finished_at').order('started_at', { ascending: false }).limit(8),
    db.from('timeline_media').select(select).eq('visibility', 'review').order('created_at', { ascending: true }).limit(60),
    month
      // A month at India time: from the 1st to the 1st of the next month.
      ? db.from('timeline_media').select(select).eq('visibility', 'shown')
          .gte('taken_at', `${month}-01T00:00:00+05:30`).lt('taken_at', `${nextMonth(month)}-01T00:00:00+05:30`)
          .order('taken_at', { ascending: true }).limit(1000)
      : db.from('timeline_media').select(select).eq('visibility', 'shown').order('created_at', { ascending: false }).limit(24),
    db.from('timeline_media').select(select).eq('visibility', 'hidden').order('updated_at', { ascending: false }).limit(24),
    db.from('timeline_media').select('id', { count: 'exact', head: true }).eq('visibility', 'shown'),
  ])
  const months = await monthsOnHerDays(db)
  if (runsResult.error || reviewResult.error || recentResult.error || hiddenResult.error || !months) {
    return <AdminState title="Her days didn't load." body="Nothing was changed. Reload in a minute." />
  }

  const runIds = (runsResult.data ?? []).map(run => run.id)
  const { data: itemRows } = runIds.length
    ? await db.from('import_items').select('run_id, status, error, google_base_url').in('run_id', runIds)
    : { data: [] }
  const runs: DeskRun[] = (runsResult.data ?? []).map(run => {
    const items = (itemRows ?? []).filter(item => item.run_id === run.id)
    const count = (status: string) => items.filter(item => item.status === status).length
    const reasons = [...new Set(items.filter(item => item.status === 'failed' && item.error).map(item => item.error as string))]
    return {
      id: run.id, status: run.status, startedAt: run.started_at,
      total: items.length, added: count('added'), duplicate: count('duplicate'), failed: count('failed'),
      pending: count('pending') + count('working'),
      retryable: items.filter(item => item.status === 'failed' && item.google_base_url).length,
      reasons,
    }
  })

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Her days</h1>
      </div>
      <p className={styles.lede}>Add her photos from Google Photos.</p>
      <HerDaysDesk
        clientId={GOOGLE_CLIENT_ID}
        shownCount={shownCount.count ?? 0}
        runs={runs}
        review={await photos((reviewResult.data ?? []) as unknown as TimelineRow[])}
        recent={await photos((recentResult.data ?? []) as unknown as TimelineRow[])}
        hidden={await photos((hiddenResult.data ?? []) as unknown as TimelineRow[])}
        months={months}
        month={month}
      />
    </main>
  )
}
