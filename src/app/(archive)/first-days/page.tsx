import Image from 'next/image'
import Link from 'next/link'
import { getFirstDaysContent } from '@/lib/content/first-days'
import styles from './first-days.module.css'

export const dynamic = 'force-dynamic'

function placement(index: number): string {
  return ['wide', 'right', 'left', 'wide', 'left', 'right', 'narrow', 'right', 'left'][index] ?? 'left'
}

function formatEventDate(value: string, precision: 'day' | 'month' | 'year', approximate: boolean) {
  const date = new Date(`${value}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions = precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : precision === 'month' ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { year: 'numeric', timeZone: 'UTC' }
  return `${approximate ? 'Around ' : ''}${new Intl.DateTimeFormat('en-IN', options).format(date)}`
}

export default async function FirstDaysPage() {
  const result = await getFirstDaysContent()

  if (result.state === 'empty') {
    return (
      <main className={styles.state}>
        <h1>First Days</h1>
        <p>This chapter is being prepared.</p>
      </main>
    )
  }

  if (result.state === 'error') {
    return (
      <main className={styles.state}>
        <h1>First Days</h1>
        <p role="alert">This chapter could not be loaded right now. Please try again.</p>
      </main>
    )
  }

  return (
    <main className={styles.chapter} data-chapter="first-days">
      <header className={styles.introduction} data-chapter-header>
        <div className={styles.titleGroup}>
          <p className={styles.eyebrow}>Private family chapter</p>
          <h1>{result.content.title}</h1>
        </div>
        <div className={styles.illustrationZone} aria-hidden="true" data-chapter-illustration-zone>
          <Image
            src="/illustrations/varada/varada-sleepy.png"
            alt=""
            width={1024}
            height={1024}
            sizes="(max-width: 599px) 8.5rem, 15rem"
            className={styles.character}
            data-chapter-character
          />
        </div>
      </header>

      {(result.content.summary || result.content.eventDate || result.content.authorDisplayName || result.content.placeText || result.content.relationshipContext || result.content.bodyBlocks.some(block => block.type !== 'media' && block.text.trim())) && (
        <section className={styles.readingSurface} aria-label="First Days introduction">
          {result.content.summary && <p className={styles.summary}>{result.content.summary}</p>}
          {result.content.eventDate && result.content.eventDatePrecision && <p>{formatEventDate(result.content.eventDate, result.content.eventDatePrecision, result.content.eventDateIsApproximate)}</p>}
          {result.content.authorDisplayName && <p>By {result.content.authorDisplayName}</p>}
          {result.content.placeText && <p>{result.content.placeText}</p>}
          {result.content.relationshipContext && <p>{result.content.relationshipContext}</p>}
          <div className={styles.copy}>
            {result.content.bodyBlocks.map((block, index) => {
              if (block.type === 'heading') {
                const Tag = block.level === 3 ? 'h3' : 'h2'
                return <Tag key={index}>{block.text}</Tag>
              }
              if (block.type === 'paragraph') return <p key={index}>{block.text}</p>
              if (block.type === 'quote') {
                return (
                  <blockquote key={index}>
                    <p>{block.text}</p>
                    {block.attribution && <cite>{block.attribution}</cite>}
                  </blockquote>
                )
              }
              return null
            })}
          </div>
        </section>
      )}

      {result.mediaState === 'degraded' && (
        <p role="alert" className={styles.warning}>
          Some photographs could not be loaded right now. Their places and captions remain in the chapter.
        </p>
      )}

      <div className={styles.story}>
        {result.content.media.map((item, index) => {
          const orientation = (item.width ?? 1) >= (item.height ?? 1) ? 'landscape' : 'portrait'
          return (
            <figure
              key={item.id}
              className={`${styles.figure} ${styles[placement(index)]}`}
              data-orientation={orientation}
            >
              <div className={styles.photoFrame}>
                {item.signedUrl ? (
                  // Signed private media is short-lived and cannot use static image optimisation.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.signedUrl}
                    alt={item.altText}
                    data-media-id={item.id}
                    width={item.width ?? undefined}
                    height={item.height ?? undefined}
                    className={styles.photo}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    decoding="async"
                  />
                ) : (
                  <div className={styles.unavailable} role="img" aria-label={item.altText}>
                    Photograph temporarily unavailable
                  </div>
                )}
              </div>
              <figcaption>{item.caption}</figcaption>
            </figure>
          )
        })}
      </div>
      <footer className={styles.ending}>
        <p className={styles.endingMark} aria-hidden="true">✦</p>
        <p className={styles.endingTitle}>And that was only the beginning.</p>
        <p className={styles.endingCopy}>There are more small days, big feelings, and family stories waiting nearby.</p>
        <div className={styles.endingLinks}>
          <Link href="/chapters">Find another chapter</Link>
          <Link href="/">Back to Home</Link>
        </div>
      </footer>
    </main>
  )
}
