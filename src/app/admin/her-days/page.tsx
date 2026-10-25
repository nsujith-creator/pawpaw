import { requireAdminPage } from '@/lib/admin/require-admin-page'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { readServiceAccount } from '@/lib/her-days/google-drive'
import { lastChecked } from '@/lib/her-days/sync'
import { progressFor } from '@/lib/her-days/importer'
import { canDraft } from '@/lib/her-days/captions'
import { indiaDate } from '@/lib/her-days/days'
import AdminState from '../admin-state'
import HerDaysDesk, { type DeskLine, type DeskMonth, type DeskPhoto } from './her-days-desk'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'
// A check brings photos in for up to four minutes inside one call.
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

async function photosNeedingALine(db: ReturnType<typeof createAdminClient>, limit: number): Promise<DeskLine[]> {
  if (limit <= 0) return []
  type Media = { id: string; storage_path: string; caption: string | null }
  const picked: Media[] = []
  const { data: redo } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
  const redoIds = ((redo?.value as { media_ids?: string[] } | undefined)?.media_ids ?? []).slice(0, limit)
  if (redoIds.length) {
    const { data } = await db.from('media_assets').select('id, storage_path, caption').in('id', redoIds)
    picked.push(...((data ?? []) as Media[]))
  }
  if (picked.length < limit) {
    const { data } = await db.from('timeline_media').select('media_asset_id, media_assets!inner(id, storage_path, caption)')
      .eq('visibility', 'shown').is('media_assets.caption', null).order('taken_at', { ascending: false }).limit(200)
    const rows = (data ?? []) as unknown as { media_asset_id: string; media_assets: Media }[]
    const ids = rows.map(row => row.media_asset_id)
    const { data: done } = ids.length ? await db.from('caption_drafts').select('media_asset_id').in('media_asset_id', ids) : { data: [] }
    const seen = new Set((done ?? []).map(row => row.media_asset_id as string))
    for (const row of rows) {
      if (picked.length >= limit) break
      if (!seen.has(row.media_asset_id) && !picked.some(media => media.id === row.media_assets.id)) picked.push(row.media_assets)
    }
  }
  return Promise.all(picked.map(async media => ({ id: media.id, mediaId: media.id, draft: null, was: media.caption, url: await generateSignedUrl(media.storage_path) })))
}

export default async function HerDaysDeskPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  await requireAdminPage()
  const raw = (await searchParams).month
  const month = raw && /^\d{4}-\d{2}$/.test(raw) ? raw : null
  const db = createAdminClient()
  const select = 'id, kind, taken_at, review_reason, media_assets(storage_path)'
  const [reviewResult, recentResult, hiddenResult, shownCount, linesResult, failedResult] = await Promise.all([
    db.from('timeline_media').select(select).eq('visibility', 'review').order('created_at', { ascending: true }).limit(60),
    month
      // A month at India time: from the 1st to the 1st of the next month.
      ? db.from('timeline_media').select(select).eq('visibility', 'shown')
          .gte('taken_at', `${month}-01T00:00:00+05:30`).lt('taken_at', `${nextMonth(month)}-01T00:00:00+05:30`)
          .order('taken_at', { ascending: true }).limit(1000)
      : db.from('timeline_media').select(select).eq('visibility', 'shown').order('created_at', { ascending: false }).limit(24),
    db.from('timeline_media').select(select).eq('visibility', 'hidden').order('updated_at', { ascending: false }).limit(24),
    db.from('timeline_media').select('id', { count: 'exact', head: true }).eq('visibility', 'shown'),
    db.from('caption_drafts').select('id, draft, media_asset_id, media_assets(storage_path, caption)').eq('status', 'waiting').order('created_at', { ascending: true }).limit(40),
    db.from('import_items').select('filename, error').eq('status', 'failed').gte('attempts', 3).order('updated_at', { ascending: false }).limit(20),
  ])
  const months = await monthsOnHerDays(db)
  if (reviewResult.error || recentResult.error || hiddenResult.error || linesResult.error || !months) {
    return <AdminState title="Her days didn't load." body="Nothing was changed. Reload in a minute." />
  }
  const [progress, checkedAt] = await Promise.all([progressFor(db, {}).catch(() => null), lastChecked(db)])

  type LineRow = { id: string; draft: string; media_asset_id: string; media_assets: { storage_path: string; caption: string | null } | null }
  const lines: DeskLine[] = await Promise.all(((linesResult.data ?? []) as unknown as LineRow[]).filter(row => row.media_assets).map(async row => ({
    id: row.id, mediaId: row.media_asset_id, draft: row.draft, was: row.media_assets!.caption, url: await generateSignedUrl(row.media_assets!.storage_path),
  })))
  // With no suggestions switched on, the cards are photos that still need a line: the older lines
  // Sujith wants redone first, then the rest, newest first.
  if (!canDraft()) lines.push(...await photosNeedingALine(db, 40 - lines.length))
  const notIn = (failedResult.data ?? []).map(row => ({ name: row.filename as string | null, reason: row.error as string | null }))

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Her days</h1>
      </div>
      <p className={styles.lede}>Put photos in the Her days folder in Drive and they turn up here, and on her page.</p>
      <HerDaysDesk
        linked={readServiceAccount() !== null}
        checkedAt={checkedAt}
        progress={progress}
        lines={lines}
        notIn={notIn}
        shownCount={shownCount.count ?? 0}
        review={await photos((reviewResult.data ?? []) as unknown as TimelineRow[])}
        recent={await photos((recentResult.data ?? []) as unknown as TimelineRow[])}
        hidden={await photos((hiddenResult.data ?? []) as unknown as TimelineRow[])}
        months={months}
        month={month}
      />
    </main>
  )
}
