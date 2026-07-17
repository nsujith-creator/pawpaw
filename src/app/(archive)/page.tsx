import { getPublishedHomeContent } from '@/lib/content/home'
import HomeCarousel from '@/components/home/home-carousel'
import AmbientFrame from '@/components/home/ambient-frame'
import LeaveButton from '@/components/home/leave-button'
import styles from './home.module.css'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const result = await getPublishedHomeContent()

  if (result.state === 'empty') {
    return (
      <main className={styles.empty}>
        <p>Varada&apos;s world is being prepared. Come back soon.</p>
        <LeaveButton />
      </main>
    )
  }

  if (result.state === 'error') {
    return (
      <main className={styles.empty}>
        <p role="alert">Varada&apos;s page could not be loaded right now. Please try again.</p>
        <LeaveButton />
      </main>
    )
  }

  const { content } = result

  return (
    <main className={styles.home}>
      {content.carousel.length > 0 && (
        <AmbientFrame initialPalette={content.carousel[0]?.extractedPalette ?? null}>
          <HomeCarousel items={content.carousel} title={content.title} />
        </AmbientFrame>
      )}

      {result.mediaState === 'degraded' && (
        <p role="alert" className={styles.mediaWarning}>
          Some photos could not be loaded right now. The written Home content is still available.
        </p>
      )}

      <section className={styles.prose}>
        <h1 className={styles.title}>{content.title}</h1>
        {content.bodyBlocks.map((block, i) => {
          if (block.type === 'heading') {
            const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3'
            return <Tag key={i} className={styles.heading}>{block.text}</Tag>
          }
          if (block.type === 'paragraph') {
            return <p key={i} className={styles.paragraph}>{block.text}</p>
          }
          if (block.type === 'quote') {
            return (
              <blockquote key={i} className={styles.quote}>
                <p>{block.text}</p>
                {block.attribution && <cite>{block.attribution}</cite>}
              </blockquote>
            )
          }
          return null
        })}
      </section>

      <LeaveButton />
    </main>
  )
}
