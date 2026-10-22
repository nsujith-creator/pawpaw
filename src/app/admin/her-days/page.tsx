import { requireAdminPage } from '@/lib/admin/require-admin-page'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { GOOGLE_CLIENT_ID } from '@/lib/her-days/google-config'
import { indiaDate } from '@/lib/her-days/days'
import AdminState from '../admin-state'
import HerDaysDesk, { type DeskPhoto, type DeskRun } from './her-days-desk'
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

export default async function HerDaysDeskPage() {
  await requireAdminPage()
  const db = createAdminClient()
  const select = 'id, kind, taken_at, review_reason, media_assets(storage_path)'
  const [runsResult, reviewResult, recentResult, hiddenResult, shownCount] = await Promise.all([
    db.from('import_runs').select('id, status, started_at, finished_at').order('started_at', { ascending: false }).limit(8),
    db.from('timeline_media').select(select).eq('visibility', 'review').order('created_at', { ascending: true }).limit(60),
    db.from('timeline_media').select(select).eq('visibility', 'shown').order('created_at', { ascending: false }).limit(24),
    db.from('timeline_media').select(select).eq('visibility', 'hidden').order('updated_at', { ascending: false }).limit(24),
    db.from('timeline_media').select('id', { count: 'exact', head: true }).eq('visibility', 'shown'),
  ])
  if (runsResult.error || reviewResult.error || recentResult.error || hiddenResult.error) {
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
      <p className={styles.lede}>
        Bring her photos in from Google Photos. Each one lands on her days at the moment it was taken.
        Picking one that&apos;s already in does nothing, so pick freely.
      </p>
      <HerDaysDesk
        clientId={GOOGLE_CLIENT_ID}
        shownCount={shownCount.count ?? 0}
        runs={runs}
        review={await photos((reviewResult.data ?? []) as unknown as TimelineRow[])}
        recent={await photos((recentResult.data ?? []) as unknown as TimelineRow[])}
        hidden={await photos((hiddenResult.data ?? []) as unknown as TimelineRow[])}
      />
    </main>
  )
}
