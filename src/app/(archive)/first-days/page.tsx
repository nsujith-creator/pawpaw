import Image from 'next/image'
import { getFirstDaysContent } from '@/lib/content/first-days'
import styles from './first-days.module.css'

export const dynamic = 'force-dynamic'

function placement(index: number): string {
  return ['wide', 'right', 'left', 'wide', 'left', 'right', 'narrow', 'right', 'left'][index] ?? 'left'
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
    </main>
  )
}
