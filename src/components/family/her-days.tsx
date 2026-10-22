// Her days: a square for every day of her life, a row for every week of her age, newest at the top.
// Tapping a day opens its week below (on wide screens, beside) as her height chart:
// each day hung at her age, with its stories and its photos.

import Link from 'next/link'
import { ageAt } from '@/lib/family/age'
import { storyColour } from '@/lib/family/story-colour'
import { dateOfDay, monthLabel, quiltWeeks, weekLabel, type QuiltWeek } from '@/lib/her-days/days'
import type { DayMedia, DayStory } from '@/lib/her-days/load'
import { BIRTHDAY } from '@/lib/family/age'
import { storyHref } from './story-chart'
import { Star } from './motifs'
import DayStrip from './day-strip'
import styles from './family.module.css'

type Entry = { day: number; media?: DayMedia; story?: DayStory }

function fullDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}
function shortDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

// Her age in whole years on a date: 0 in her first year.
function yearsOld(date: string) {
  const [by, bm, bd] = BIRTHDAY.split('-').map(Number)
  const [y, m, d] = date.split('-').map(Number)
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0)
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth', 'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth', 'twentieth']
function yearTitle(years: number) { return ORDINALS[years] ? `Her ${ORDINALS[years]} year` : `When she was ${years}` }
function weekTitle(week: number) { return week === 0 ? 'The week she was born' : `${weekLabel(week)} old` }

export function pickWeek(weeks: QuiltWeek<Entry>[], requested: number | null): number {
  if (requested !== null && weeks.some(week => week.week === requested)) return requested
  return weeks.find(week => week.days.some(day => day.items.length))?.week ?? weeks[0]?.week ?? 0
}

export default function HerDays({ media, stories, today, requestedWeek }: { media: DayMedia[]; stories: DayStory[]; today: string; requestedWeek: number | null }) {
  const entries: Entry[] = [
    ...media.map(item => ({ day: item.day, media: item })),
    ...stories.map(story => ({ day: story.day, story })),
  ]
  const weeks = quiltWeeks(entries, today)
  const selected = pickWeek(weeks, requestedWeek)
  const selectedWeek = weeks.find(week => week.week === selected)!
  const years = new Map<number, QuiltWeek<Entry>[]>()
  for (const week of weeks) {
    const age = yearsOld(dateOfDay(week.week * 7))
    years.set(age, [...(years.get(age) ?? []), week])
  }
  const newestYear = Math.max(...years.keys())
  const selectedYear = yearsOld(dateOfDay(selected * 7))

  return (
    <div className={styles.daysWrap}>
      <div>
        {[...years.entries()].map(([age, yearWeeks]) => {
          const count = yearWeeks.reduce((sum, week) => sum + week.days.reduce((n, day) => n + day.items.filter(item => item.media).length, 0), 0)
          return (
            <details key={age} className={styles.year} open={age === newestYear || age === selectedYear}>
              <summary className={styles.yearTitle}>{yearTitle(age)}{count > 0 && <small>{count.toLocaleString('en-IN')} photo{count === 1 ? '' : 's'}</small>}</summary>
              <div className={styles.quilt} role="list">
                {yearWeeks.map(week => (
                  <div key={week.week} className={styles.quiltRow} role="listitem" data-selected={week.week === selected ? '' : undefined}>
                    <p className={styles.quiltWeek}>{week.month !== null ? <b>{monthLabel(week.month)}</b> : week.week === 0 ? <b>born</b> : weekLabel(week.week)}</p>
                    {week.days.map(day => <Square key={day.day} day={day} week={week.week} today={today} />)}
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
      <WeekView week={selectedWeek} newest={weeks[0]?.week ?? 0} />
    </div>
  )
}

function Square({ day, week, today }: { day: QuiltWeek<Entry>['days'][number]; week: number; today: string }) {
  if (day.date > today) return <span className={styles.square} data-future="" aria-hidden="true" />
  const photos = day.items.filter(item => item.media).map(item => item.media!)
  const dayStories = day.items.filter(item => item.story).map(item => item.story!)
  const story = dayStories[0]
  const label = `${fullDate(day.date)}${photos.length ? `, ${photos.length} photo${photos.length === 1 ? '' : 's'}` : ''}${dayStories.map(entry => `, ${entry.item.title}`).join('')}`
  const href = `/days?week=${week}#day-${day.day}`
  if (photos.length) {
    return (
      <Link href={href} className={styles.square} aria-label={label}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`${photos[0].url}?w=480`} alt="" loading="lazy" decoding="async" />
        {story && <span className={styles.squareStory} data-colour={storyColour(story.item.visualScene, story.item.slug)} aria-hidden="true"><Star style={{ position: 'static', width: '70%' }} /></span>}
        {photos.length > 1 && <i aria-hidden="true">{photos.length}</i>}
      </Link>
    )
  }
  if (story) {
    return (
      <Link href={href} className={styles.square} data-story="" data-colour={storyColour(story.item.visualScene, story.item.slug)} aria-label={label}>
        <Star style={{ position: 'static', width: '56%' }} />
      </Link>
    )
  }
  return <Link href={href} className={styles.square} data-empty="" aria-label={fullDate(day.date)}>{Number(day.date.slice(8, 10))}</Link>
}

function WeekView({ week, newest }: { week: QuiltWeek<Entry>; newest: number }) {
  const first = week.days[0].date
  const last = week.days[6].date
  const days = [...week.days].reverse().filter(day => day.items.length)
  return (
    <section className={styles.weekView} id="week" aria-labelledby="week-title">
      <div className={styles.weekHead}>
        <h2 id="week-title">{weekTitle(week.week)}<small>{shortDate(first)} – {shortDate(last)}</small></h2>
        <nav className={styles.weekPager} aria-label="Other weeks">
          {week.week > 0 ? <Link href={`/days?week=${week.week - 1}#week`} scroll={false}>Earlier</Link> : <span />}
          {week.week < newest ? <Link href={`/days?week=${week.week + 1}#week`} scroll={false}>Later</Link> : <span />}
        </nav>
      </div>
      {days.length === 0 ? (
        <p className={styles.weekEmpty}>Nothing from this week yet.</p>
      ) : (
        <div className={styles.dayChart}>
          {days.map(day => {
            const photos = day.items.filter(item => item.media).map(item => item.media!)
            const dayStories = day.items.filter(item => item.story).map(item => item.story!)
            return (
              <div key={day.day} className={styles.dayMark} id={`day-${day.day}`}>
                <p className={styles.dayAge}>{ageAt(day.date)}<small>{fullDate(day.date)}</small></p>
                {dayStories.map(({ item }) => (
                  <Link key={item.id} href={storyHref(item.slug)} className={styles.dayBook} data-colour={storyColour(item.visualScene, item.slug)}>
                    <b>{item.title}</b>
                    {item.type === 'letter'
                      ? <span>{item.authorDisplayName ? `a letter from ${item.authorDisplayName}` : 'a letter'}</span>
                      : item.authorDisplayName && <span>by {item.authorDisplayName}</span>}
                  </Link>
                ))}
                {photos.length > 0 && <DayStrip photos={photos.map(photo => ({ id: photo.id, url: photo.url, width: photo.width, height: photo.height, playToken: photo.playToken, kind: photo.kind, videoFailed: photo.videoFailed }))} label={fullDate(day.date)} />}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
