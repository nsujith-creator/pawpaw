import Link from 'next/link'
import { listPublishedChapters } from '@/lib/content/chapters'
import styles from './chapters.module.css'

export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  story: 'Story',
  gallery: 'Gallery',
  letter: 'Letter',
  moment: 'Moment',
}

function formatEventDate(value: string, precision: 'day' | 'month' | 'year', approximate: boolean) {
  const date = new Date(`${value}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions = precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : precision === 'month' ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { year: 'numeric', timeZone: 'UTC' }
  return `${approximate ? 'Around ' : ''}${new Intl.DateTimeFormat('en-IN', options).format(date)}`
}

export default async function ChaptersPage() {
  const result = await listPublishedChapters()
  if (result.state === 'error') {
    return (
      <main className={styles.state}>
        <h1>Chapters</h1>
        <p role="alert">The family chapters could not be loaded right now. Please try again.</p>
      </main>
    )
  }

  return (
    <main className={styles.index}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Private family archive</p>
        <h1>Chapters</h1>
        <p>Published stories, photographs, letters, and moments kept for Varada and her family.</p>
      </header>

      {result.items.length === 0 ? (
        <p className={styles.empty}>
          No other chapters are published yet. <Link href="/first-days">Read First Days.</Link>
        </p>
      ) : (
        <div className={styles.grid}>
          {result.items.map(item => {
            const href = item.slug === 'first-days' ? '/first-days' : `/chapters/${item.slug}`
            return (
              <article key={item.id} className={`${styles.card} ${styles[item.type]}`}>
                <Link href={href} className={styles.cardLink}>
                  <div className={styles.cover}>
                    {item.cover ? (
                      // Signed private media is short-lived and must not be statically optimised.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.cover.signedUrl} alt={item.cover.altText} />
                    ) : (
                      <div className={styles.placeholder} aria-hidden="true">
                        <span>{TYPE_LABELS[item.type] ?? item.type}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <p className={styles.type}>{TYPE_LABELS[item.type] ?? item.type}</p>
                    <h2>{item.title}</h2>
                    {item.summary && <p className={styles.summary}>{item.summary}</p>}
                    {item.eventDate && item.eventDatePrecision && <p className={styles.date}>{formatEventDate(item.eventDate, item.eventDatePrecision, item.eventDateIsApproximate)}</p>}
                    {item.authorDisplayName && <p className={styles.date}>By {item.authorDisplayName}</p>}
                    {item.recipientDisplayName && <p className={styles.date}>For {item.recipientDisplayName}</p>}
                    <span className={styles.read}>Read chapter →</span>
                  </div>
                </Link>
              </article>
            )
          })}
        </div>
      )}
    </main>
  )
}
