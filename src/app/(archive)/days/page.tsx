import { loadHerDays } from '@/lib/her-days/load'
import HerDays from '@/components/family/her-days'
import { dayNumber } from '@/lib/her-days/days'
import StatePage from '@/components/family/state-page'
import styles from '@/components/family/family.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Her days' }

export default async function HerDaysRoute({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const result = await loadHerDays()
  if (result.state === 'error') {
    return <StatePage colour="teal" title="Her days didn't load." body="Something went wrong on our side. Reload in a minute." action={{ href: '/', label: 'Home' }} />
  }
  const raw = (await searchParams).week
  const requested = raw !== undefined && /^\d{1,4}$/.test(raw) ? Number(raw) : null
  const days = dayNumber(result.today)
  return (
    <main>
      <section className={styles.daysCover}>
        <p className={styles.kicker}>Her days</p>
        <h1>{days.toLocaleString('en-IN')} day{days === 1 ? '' : 's'} of her, so far</h1>
        {result.media.length === 0 && <p>Her photos go here, day by day.</p>}
      </section>
      <HerDays media={result.media} stories={result.stories} today={result.today} requestedWeek={requested} />
    </main>
  )
}
