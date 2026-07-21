import Image from 'next/image'
import { getPublishedHomeContent } from '@/lib/content/home'
import ContentDateline from '@/components/archive/content-dateline'
import HomeCarousel from '@/components/home/home-carousel'
import styles from './home.module.css'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const result = await getPublishedHomeContent()

  if (result.state === 'empty') {
    return (
      <main className={styles.empty}>
        <div className={styles.emptyPanel}>
          <p className={styles.emptyBrand}>pawpaw <span aria-hidden="true">♥</span></p>
          <p>Varada&apos;s world is being prepared. Come back soon.</p>
        </div>
      </main>
    )
  }

  if (result.state === 'error') {
    return (
      <main className={styles.empty}>
        <div className={styles.emptyPanel}>
          <p className={styles.emptyBrand}>pawpaw <span aria-hidden="true">♥</span></p>
          <p role="alert" className={styles.errorMessage}>
            Varada&apos;s page could not be loaded right now. Please try again.
          </p>
        </div>
      </main>
    )
  }

  const { content } = result

  return (
    <main className={styles.home}>
      <div className={styles.composition}>
        <div className={styles.mediaColumn}>
          {content.carousel.length > 0 && (
          <HomeCarousel items={content.carousel} title={content.title} />
          )}

          {result.mediaState === 'degraded' && (
            <p role="alert" className={styles.mediaWarning}>
              Some photos could not be loaded right now. The written Home content is still available.
            </p>
          )}
        </div>

        <section className={styles.prose}>
          <p className={styles.chapterLabel}>Home</p>
          <h1 className={styles.title}>{content.title}</h1>
          <ContentDateline
            date={content.publishedAt}
            context="V was 7 weeks and 2 days old"
          />
          <div className={styles.bodyCopy}>
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
          </div>

          <div className={styles.characterStage} aria-hidden="true">
            <Image
              src="/illustrations/varada/varada-wonder.png"
              alt=""
              width={1024}
              height={1024}
              sizes="(max-width: 767px) 10rem, 15rem"
              className={styles.character}
            />
          </div>
        </section>
      </div>
    </main>
  )
}
