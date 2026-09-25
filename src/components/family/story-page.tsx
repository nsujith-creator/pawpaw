// One story, as the family reads it: a colour page facing its photograph, then the words on
// white with the story's colour running down beside them. The admin preview uses the same page.

import Link from 'next/link'
import type { ChapterContent, ChapterMedia } from '@/lib/content/chapters'
import type { PublishedVideo } from '@/lib/video/published-videos'
import { ageAt, familyDate } from '@/lib/family/age'
import { storyColour } from '@/lib/family/story-colour'
import FamilyVideo from './family-video'
import Photo from './photo'
import styles from './family.module.css'

interface Props {
  content: ChapterContent
  videos?: PublishedVideo[]
  mediaState?: 'complete' | 'degraded'
  next?: { href: string; title: string } | null
  preview?: boolean
}

const MALAYALAM = /[ഀ-ൿ]/

function caption(item: ChapterMedia) {
  return item.captionOverride?.trim() || item.caption?.trim() || null
}

function isPortrait(item: ChapterMedia) {
  return Boolean(item.width && item.height && item.height > item.width * 1.1)
}

function Figure({ item, override }: { item: ChapterMedia; override?: string }) {
  const text = override?.trim() || caption(item)
  return (
    <figure className={`${styles.figure} ${isPortrait(item) ? styles.figurePortrait : ''}`}>
      <Photo url={item.signedUrl} alt={item.altText} width={item.width} height={item.height} sizes="(min-width: 900px) 32rem, 92vw" />
      {text && <figcaption>{text}</figcaption>}
    </figure>
  )
}

// Photographs in a row are paced by size, so similar frames never read as a repeat.
const PACE = ['wide', 'pair', 'inset', 'wide', 'pair', 'small'] as const

function Sequence({ items }: { items: ChapterMedia[] }) {
  const rows: React.ReactNode[] = []
  let index = 0
  let step = 0
  while (index < items.length) {
    const pace = PACE[step % PACE.length]
    step += 1
    if (pace === 'pair' && index + 1 < items.length) {
      const pair = items.slice(index, index + 2)
      rows.push(
        <div key={pair[0].id} className={styles.seqPair}>
          {pair.map(item => (
            <figure key={item.id}>
              <Photo url={item.signedUrl} alt={item.altText} width={item.width} height={item.height} sizes="(min-width: 900px) 30rem, 46vw" />
              {caption(item) && <figcaption>{caption(item)}</figcaption>}
            </figure>
          ))}
        </div>,
      )
      index += 2
      continue
    }
    const item = items[index]
    const className = pace === 'inset' ? styles.seqInset : pace === 'small' ? styles.seqSmall : styles.seqWide
    rows.push(
      <figure key={item.id} className={className}>
        <Photo url={item.signedUrl} alt={item.altText} width={item.width} height={item.height} sizes="(min-width: 900px) 46rem, 92vw" />
        {caption(item) && <figcaption>{caption(item)}</figcaption>}
      </figure>,
    )
    index += 1
  }
  return <div className={styles.sequence}>{rows}</div>
}

function metaLine(content: ChapterContent, photoCount: number) {
  const parts: string[] = []
  const age = ageAt(content.eventDate, content.eventDatePrecision)
  if (age) parts.push(age)
  if (content.type === 'letter') {
    const from = content.authorDisplayName ? ` from ${content.authorDisplayName}` : ''
    const to = content.recipientDisplayName ? ` to ${content.recipientDisplayName}` : ''
    parts.push(`a letter${from}${to}`)
    const written = content.authoredDatePrecision === 'day' ? familyDate(content.authoredDate) : null
    if (written) parts.push(`written ${written}`)
  } else if (content.authorDisplayName) parts.push(`by ${content.authorDisplayName}`)
  else if (content.type === 'gallery' || content.bodyBlocks.length === 0) parts.push(`${photoCount} photograph${photoCount === 1 ? '' : 's'}`)
  if (content.placeText) parts.push(content.placeText)
  if (content.relationshipContext) parts.push(content.relationshipContext)
  return parts.join(' · ')
}

export default function StoryPage({ content, videos = [], mediaState = 'complete', next = null, preview = false }: Props) {
  const colour = storyColour(content.visualScene, content.slug)
  const cover = content.media.find(item => item.id === content.coverMediaId) ?? content.media[0] ?? null
  const mediaById = new Map(content.media.map(item => [item.id, item]))
  const videoById = new Map(videos.map(item => [item.id, item]))
  const placed = new Set<string>()
  const placedVideos = new Set<string>()
  // The cover faces the title, so it never repeats in the photos after the words.
  if (cover) placed.add(cover.id)

  const body = content.bodyBlocks.map((block, index) => {
    if (block.type === 'heading') return block.level === 3 ? <h3 key={index}>{block.text}</h3> : <h2 key={index}>{block.text}</h2>
    if (block.type === 'paragraph') return <p key={index}>{block.text}</p>
    if (block.type === 'quote') {
      return (
        <blockquote key={index} className={styles.said} data-long={block.text.length > 40 ? '' : undefined}>
          <p lang={MALAYALAM.test(block.text) ? 'ml' : undefined}>{block.text}</p>
          {block.attribution && <cite>{block.attribution}</cite>}
        </blockquote>
      )
    }
    const photo = mediaById.get(block.mediaId)
    if (photo) { placed.add(photo.id); return <Figure key={`${index}-${photo.id}`} item={photo} override={block.caption} /> }
    const video = videoById.get(block.mediaId)
    if (video) { placedVideos.add(video.id); return <FamilyVideo key={`${index}-${video.id}`} playToken={video.playToken} caption={block.caption?.trim() || video.caption} /> }
    return null
  })

  const leftover = content.media.filter(item => !placed.has(item.id))
  const leftoverVideos = videos.filter(item => !placedVideos.has(item.id))
  const meta = metaLine(content, content.media.length)

  return (
    <main data-colour={colour}>
      <div className={styles.opener} data-solo={cover ? undefined : ''}>
        <div className={styles.openerPage} data-solo={cover ? undefined : ''}>
          {meta && <p className={styles.openerMeta}>{preview ? `Preview · ${meta}` : meta}</p>}
          <h1 className={styles.openerTitle}>{content.title}</h1>
          {content.summary && <p className={styles.openerSummary}>{content.summary}</p>}
        </div>
        {cover && (
          <div className={styles.openerPhoto}>
            <figure>
              <Photo url={cover.signedUrl} alt={cover.altText} width={cover.width} height={cover.height} eager sizes="(min-width: 900px) 46vw, 100vw" />
              {caption(cover) && <figcaption>{caption(cover)}</figcaption>}
            </figure>
          </div>
        )}
      </div>

      {mediaState === 'degraded' && (
        <p className={styles.alert} role="status">A few photos didn&apos;t load. Reload the page to try again.</p>
      )}

      {(body.some(Boolean) || leftoverVideos.length > 0) && (
        <div className={styles.reading}>
          <div className={styles.column} data-colour={colour}>
            {body}
            {leftoverVideos.map(video => <FamilyVideo key={video.id} playToken={video.playToken} caption={video.caption} />)}
          </div>
        </div>
      )}

      {leftover.length > 0 && (
        <div className={styles.sequenceWrap}>
          <Sequence items={leftover} />
        </div>
      )}

      {!preview && (
        <nav className={styles.ending} aria-label="Keep reading">
          {next && (
            <Link href={next.href} className={styles.endingNext}>
              <span className={styles.endingNextLabel}>Next on her chart</span>
              <span className={styles.endingNextTitle} style={{ display: 'block' }}>{next.title}</span>
            </Link>
          )}
          <div className={styles.endingLinks}>
            <Link href="/">← Home</Link>
            <Link href="/chapters">All her stories</Link>
          </div>
        </nav>
      )}
    </main>
  )
}
