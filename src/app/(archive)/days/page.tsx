import { loadHerDays } from '@/lib/her-days/load'
import HerDays from '@/components/family/her-days'
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
  const photos = result.media.length
  return (
    <main>
      <section className={styles.daysCover}>
        <p className={styles.kicker}>Her days</p>
        <h1>A square for every day</h1>
        <p>
          {photos ? `${photos} photo${photos === 1 ? '' : 's'} of her, each on the day it was taken. ` : 'Photos fill these squares as they come in. '}
          Each row is one week, newest at the top. Tap a day to open its week.
        </p>
      </section>
      <HerDays media={result.media} stories={result.stories} today={result.today} requestedWeek={requested} />
    </main>
  )
}
