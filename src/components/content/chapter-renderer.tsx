import type { ChapterContent, ChapterMedia } from '@/lib/content/chapters'
import type { PublishedVideo } from '@/lib/video/published-videos'
import VaradaScene from '@/components/archive/varada-scene'
import styles from './chapter-renderer.module.css'

interface Props {
  content: ChapterContent
  mediaState: 'complete' | 'degraded'
  preview?: boolean
  videos?: PublishedVideo[]
}

function Photo({ item }: { item: ChapterMedia }) {
  const caption = item.captionOverride?.trim() || item.caption?.trim()
  return (
    <figure className={styles.figure}>
      <div className={styles.photoFrame}>
        {item.signedUrl ? (
          // Signed private media is short-lived and must not be statically optimised.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.signedUrl}
            alt={item.altText}
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
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

function formatFamilyDate(value: string, precision: 'day' | 'month' | 'year', approximate: boolean): string {
  const date = new Date(`${value}T00:00:00Z`)
  const options: Intl.DateTimeFormatOptions = precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : precision === 'month'
      ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
      : { year: 'numeric', timeZone: 'UTC' }
  return `${approximate ? 'Around ' : ''}${new Intl.DateTimeFormat('en-IN', options).format(date)}`
}

export default function ChapterRenderer({ content, mediaState, preview = false, videos = [] }: Props) {
  const mediaById = new Map(content.media.map(item => [item.id, item]))
  const placed = new Set<string>()

  return (
    <article className={`${styles.chapter} ${styles[content.type]}`} data-content-type={content.type}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
        <p className={styles.eyebrow}>{preview ? 'Private chapter preview' : `Private family ${content.type}`}</p>
        <h1>{content.title}</h1>
        {content.summary && <p className={styles.summary}>{content.summary}</p>}
        {content.eventDate && content.eventDatePrecision && <p className={styles.publicationContext}>{formatFamilyDate(content.eventDate, content.eventDatePrecision, content.eventDateIsApproximate)}</p>}
        {content.authoredDate && content.authoredDatePrecision && <p className={styles.publicationContext}>Written {formatFamilyDate(content.authoredDate, content.authoredDatePrecision, content.authoredDateIsApproximate)}</p>}
        {content.authorDisplayName && <p className={styles.publicationContext}>By {content.authorDisplayName}</p>}
        {content.recipientDisplayName && <p className={styles.publicationContext}>For {content.recipientDisplayName}</p>}
        {content.placeText && <p className={styles.publicationContext}>{content.placeText}</p>}
        {content.relationshipContext && <p className={styles.publicationContext}>{content.relationshipContext}</p>}
        </div>
        <VaradaScene sceneId={content.visualScene} className={styles.scene} sizes="(max-width: 52rem) 11rem, 17rem" />
      </header>

      {mediaState === 'degraded' && (
        <p role="alert" className={styles.warning}>
          Some photographs could not be loaded right now. The written chapter remains available.
        </p>
      )}

      <div className={styles.body}>
        {content.bodyBlocks.map((block, index) => {
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
          const item = mediaById.get(block.mediaId)
          if (!item) return null
          placed.add(item.id)
          return <Photo key={`${index}-${item.id}`} item={item} />
        })}
      </div>

      {content.media.some(item => !placed.has(item.id)) && (
        <div className={styles.mediaGallery} aria-label="Chapter photographs">
          {content.media.filter(item => !placed.has(item.id)).map(item => (
            <Photo key={item.id} item={item} />
          ))}
        </div>
      )}
      {videos.length > 0 && <section className={styles.videoGallery} aria-label="Chapter videos">
        {videos.map(video => <figure key={video.id} className={styles.videoFigure}>
          {video.playerUrl ? <iframe src={video.playerUrl} title={video.caption || 'Family video'} className={styles.video} allow="accelerometer; gyroscope; encrypted-media; picture-in-picture;" allowFullScreen /> : <div className={styles.unavailable}>Video temporarily unavailable</div>}
          {video.caption && <figcaption>{video.caption}</figcaption>}
        </figure>)}
      </section>}
    </article>
  )
}
