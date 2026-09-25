import { listPublishedChapters } from '@/lib/content/chapters'
import StoryChart from '@/components/family/story-chart'
import StatePage from '@/components/family/state-page'
import styles from '@/components/family/family.module.css'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Her stories' }

export default async function StoriesRoute() {
  const result = await listPublishedChapters()
  if (result.state === 'error') {
    return <StatePage colour="rose" title="Her stories didn't load." body="Something went wrong on our side. Reload in a minute." action={{ href: '/', label: 'Home' }} />
  }
  return (
    <main>
      <section className={`${styles.section} ${styles.stories}`} aria-labelledby="stories-title">
        <h1 className={styles.sectionTitle} id="stories-title">Her stories</h1>
        <p className={styles.lede}>Hung on her height chart, at her age when each one happened. Newest at the top.</p>
        <StoryChart items={result.items} />
      </section>
    </main>
  )
}
