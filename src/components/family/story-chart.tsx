// Her stories on a height chart: newest at the top, each hung at her age when it happened.
// Direction C's graphite line and crayon ticks, carrying Direction B's book covers.

import Link from 'next/link'
import type { ChapterIndexItem } from '@/lib/content/chapters'
import { ageAt, familyDate } from '@/lib/family/age'
import { storyColour } from '@/lib/family/story-colour'
import { chartOrder } from '@/lib/family/chart-order'
import Photo from './photo'
import styles from './family.module.css'

export function storyHref(slug: string) {
  return slug === 'first-days' ? '/first-days' : `/chapters/${slug}`
}

function storyMeta(item: ChapterIndexItem): string {
  const parts: string[] = []
  if (item.type === 'letter') parts.push(item.authorDisplayName ? `a letter from ${item.authorDisplayName}` : 'a letter')
  else if (item.authorDisplayName) parts.push(`by ${item.authorDisplayName}`)
  if (item.summary && parts.length === 0) parts.push(item.summary)
  return parts.join(' · ')
}

export default function StoryChart({ items }: { items: ChapterIndexItem[] }) {
  if (items.length === 0) {
    return <p className={styles.chartEmpty}>Nothing written yet. The first story will hang here, at her age when it happened.</p>
  }

  // Group stories that share an age, so one tick carries them all.
  const sorted = chartOrder(items)
  const groups: { age: string | null; date: string | null; items: ChapterIndexItem[] }[] = []
  for (const item of sorted) {
    const age = ageAt(item.eventDate, item.eventDatePrecision)
    const last = groups[groups.length - 1]
    if (last && last.age === age && age !== null) last.items.push(item)
    else groups.push({ age, date: item.eventDatePrecision === 'day' ? familyDate(item.eventDate) : null, items: [item] })
  }

  return (
    <div className={styles.chart}>
      {groups.map((group, index) => (
        <div className={styles.mark} key={`${group.age}-${index}`}>
          <p className={styles.age}>
            {group.age ?? 'undated'}
            {group.date && <small>{group.date}</small>}
          </p>
          {group.items.map(item => {
            const colour = storyColour(item.visualScene, item.slug)
            const meta = storyMeta(item)
            return (
              <Link key={item.id} href={storyHref(item.slug)} className={styles.book} data-colour={colour}>
                {item.cover ? (
                  <Photo url={item.cover.signedUrl} alt="" className={styles.bookCover} sizes="(min-width: 900px) 22rem, 90vw" />
                ) : (
                  <div className={styles.bookBlank} aria-hidden="true"><span>{item.title.slice(0, 1)}</span></div>
                )}
                <div className={styles.bookBand}>
                  <p className={styles.bookTitle}>{item.title}</p>
                  {meta && <p className={styles.bookMeta}>{meta}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      ))}
    </div>
  )
}
