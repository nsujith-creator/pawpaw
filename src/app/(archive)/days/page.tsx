import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { loadHerDays } from '@/lib/her-days/load'
import { syncHerDays } from '@/lib/her-days/sync'
import { createAdminClient } from '@/lib/supabase/admin'
import HerDays from '@/components/family/her-days'
import { dayNumber } from '@/lib/her-days/days'
import StatePage from '@/components/family/state-page'
import styles from '@/components/family/family.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Her days' }
export const maxDuration = 120

// Someone looking at her days is a good moment to look in the folder too (at most every 15 minutes),
// after the page has already gone out, so nobody waits for it.
async function lookInTheFolder() {
  const report = await syncHerDays(createAdminClient(), { deadline: Date.now() + 90_000, batch: 3, everySeconds: 900 })
  if (report.found || (report.progress?.added ?? 0) > 0) revalidatePath('/days')
}

export default async function HerDaysRoute({ searchParams }: { searchParams: Promise<{ week?: string; day?: string }> }) {
  const result = await loadHerDays()
  if (result.state === 'error') {
    return <StatePage colour="teal" title="Her days didn't load." body="Something went wrong on our side. Reload in a minute." action={{ href: '/', label: 'Home' }} />
  }
  after(lookInTheFolder)
  const params = await searchParams
  const number = (raw: string | undefined) => raw !== undefined && /^\d{1,5}$/.test(raw) ? Number(raw) : null
  const requested = number(params.week)
  const requestedDay = number(params.day)
  const days = dayNumber(result.today)
  return (
    <main>
      <section className={styles.daysCover}>
        <p className={styles.kicker}>Her days</p>
        <h1>{days.toLocaleString('en-IN')} day{days === 1 ? '' : 's'} of her, so far</h1>
        {result.media.length === 0 && <p>Her photos go here, day by day.</p>}
      </section>
      <HerDays media={result.media} stories={result.stories} today={result.today} requestedWeek={requested} requestedDay={requestedDay} />
    </main>
  )
}
