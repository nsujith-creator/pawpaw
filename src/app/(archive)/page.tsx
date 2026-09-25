import Link from 'next/link'
import { getPublishedHomeContent } from '@/lib/content/home'
import { listPublishedChapters } from '@/lib/content/chapters'
import { MALAYALAM, alsoCalled } from '@/lib/family/her-names'
import { getFamilyLists } from '@/lib/family/lists'
import HerPeople from '@/components/family/her-people'
import AlsoCalled from '@/components/family/also-called'
import StoryChart, { storyHref } from '@/components/family/story-chart'
import Photo from '@/components/family/photo'
import { Balloon, Duck, Star } from '@/components/family/motifs'
import StatePage from '@/components/family/state-page'
import styles from '@/components/family/family.module.css'

export const dynamic = 'force-dynamic'

function noteDate(value: string | null) {
  if (!value) return null
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' }).format(new Date(value))
}

export default async function HomePage() {
  const [home, stories, lists] = await Promise.all([getPublishedHomeContent(), listPublishedChapters(), getFamilyLists()])

  if (home.state === 'error') {
    return <StatePage colour="rose" title="Home didn't load." body="Something went wrong on our side. Reload in a minute, or open her stories instead." action={{ href: '/chapters', label: 'Her stories' }} />
  }

  const content = home.state === 'published' ? home.content : null
  const [first, ...rest] = content?.carousel ?? []
  const items = stories.state === 'ready' ? stories.items : []
  const published = new Set(items.map(item => storyHref(item.slug)))

  return (
    <main>
      <div className={styles.spread}>
        <div className={styles.photoPage}>
          {first && <Photo url={first.signedUrl} alt={first.altText || 'Varada'} width={first.width} height={first.height} eager sizes="(min-width: 900px) 46vw, 100vw" />}
        </div>
        <div className={styles.namePage}>
          <p className={styles.kicker}>Varada&apos;s family pages</p>
          <h1 className={styles.herName} lang="ml">വരദ</h1>
          <p className={styles.nameSub}>Varada</p>
          <AlsoCalled names={alsoCalled(lists.names)} />
          <Duck style={{ right: '6%', bottom: '6%', width: '42%', maxWidth: 250 }} />
          <Balloon style={{ right: '50%', bottom: '16%', width: '12%', maxWidth: 66 }} />
          <Star style={{ right: '8%', top: '10%', width: '10%', maxWidth: 56 }} />
        </div>
      </div>

      {home.state === 'published' && home.mediaState === 'degraded' && (
        <p className={styles.alert} role="status">A few photos didn&apos;t load. Reload the page to try again.</p>
      )}

      <div className={styles.pair}>
        <section className={styles.section} aria-labelledby="stories-title">
          <h2 className={styles.sectionTitle} id="stories-title">Her stories</h2>
          {stories.state === 'error'
            ? <p className={styles.chartEmpty} role="status">Her stories didn&apos;t load. Reload the page in a minute.</p>
            : <StoryChart items={items} />}
        </section>

        {content && (content.bodyBlocks.length > 0 || rest.length > 0) && (
          <section className={`${styles.section} ${styles.note}`} aria-labelledby="note-title">
            <h2 className={styles.label} id="note-title">
              {content.bodyBlocks.length > 0
                ? `A note from acchan${noteDate(content.publishedAt) ? ` · ${noteDate(content.publishedAt)}` : ''}`
                : 'More of her'}
            </h2>
            {content.bodyBlocks.map((block, index) =>
              block.type === 'paragraph' || block.type === 'heading' || block.type === 'quote'
                ? <p key={index}>{block.text}</p>
                : null,
            )}
            {rest.length > 0 && (
              <div className={styles.strip}>
                {rest.map(item => (
                  <figure key={item.id}>
                    <Photo url={item.signedUrl} alt={item.altText || 'Varada'} width={item.width} height={item.height} sizes="(min-width: 900px) 12rem, 45vw" />
                    {item.caption && <figcaption>{item.caption}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <section className={`${styles.section} ${styles.namesPage}`} aria-labelledby="names-title">
        <h2 className={styles.label} id="names-title">Her names</h2>
        <ol className={styles.copybook}>
          {lists.names.map(name => {
            const ml = MALAYALAM.test(name.text)
            const word = <span className={ml ? styles.nameMl : name.text.includes('·') ? styles.nameSmall : styles.nameLat} lang={ml ? 'ml' : undefined}>{name.text}</span>
            return (
              <li key={name.text}>
                {name.href && published.has(name.href) ? <Link href={name.href} className={styles.nameLink}>{word}</Link> : word}
                {name.note && <span className={styles.nameNote}>{name.note}</span>}
              </li>
            )
          })}
        </ol>
      </section>

      <section className={`${styles.section} ${styles.peoplePage}`} aria-labelledby="people-title">
        <h2 className={styles.label} id="people-title">Her people</h2>
        <p className={styles.utter}>“…4 things out of an infinite number of things shes yet to utter!” · acchan</p>
        <HerPeople people={lists.people} />
      </section>

      <footer className={styles.footer}>
        <span>pawpaw · kept for Varada, by acchan and amma</span>
      </footer>
    </main>
  )
}
