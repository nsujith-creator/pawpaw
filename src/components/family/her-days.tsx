// Her days: a square for every day of her life, a row for every week of her age, newest at the top.
// Tapping a day opens its week below (on wide screens, beside) as her height chart:
// each day hung at her age, with its stories and its photos.

import Link from 'next/link'
import { ageAt } from '@/lib/family/age'
import { storyColour } from '@/lib/family/story-colour'
import { dateOfDay, monthLabel, monthsTurned, quiltWeeks, weekLabel, type QuiltWeek } from '@/lib/her-days/days'
import type { DayMedia, DayStory } from '@/lib/her-days/load'
import { BIRTHDAY } from '@/lib/family/age'
import { storyHref } from './story-chart'
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
        <Legend />
      </div>
      <WeekView week={selectedWeek} newest={weeks[0]?.week ?? 0} />
    </div>
  )
}

type Sticker = { kind: 'born' | 'cake' | 'days' | 'star' | 'letter'; text?: string; colour?: string; label: string }

// What makes a day special, from facts alone: the day she was born, the days she turned another
// month (or year) older, her 28th and 100th days, and stories or letters about that day.
function stickersFor(day: QuiltWeek<Entry>['days'][number]): Sticker[] {
  const stickers: Sticker[] = []
  if (day.day === 0) stickers.push({ kind: 'born', label: 'the day she was born' })
  const months = monthsTurned(day.date)
  if (months !== null) stickers.push({ kind: 'cake', text: months % 12 === 0 ? `${months / 12}` : `${months}`, colour: months % 12 === 0 ? 'rose' : 'duck', label: `she turned ${monthLabel(months)}` })
  if (day.day === 28 || day.day === 100) stickers.push({ kind: 'days', text: `${day.day}`, label: `${day.day} days old` })
  for (const { item } of day.items.filter(entry => entry.story).map(entry => entry.story!)) {
    stickers.push({ kind: item.type === 'letter' ? 'letter' : 'star', colour: storyColour(item.visualScene, item.slug), label: item.title })
  }
  return stickers
}

function StickerIcon({ sticker }: { sticker: Sticker }) {
  const shape = {
    born: <path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.9c0 5.4-7.5 10-7.5 10z" fill="#fff" />,
    star: <path d="M12 2.5l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.5l-5.8 3.3 1.5-6.4L2.8 9.1l6.5-.6z" fill="#fff" />,
    letter: <><rect x="3" y="6" width="18" height="12.5" rx="1.5" fill="#fff" /><path d="M3.5 7l8.5 6.5L20.5 7" stroke="currentColor" strokeWidth="1.8" fill="none" /></>,
    cake: <><rect x="4" y="11" width="16" height="9" rx="1.5" fill="#fff" /><path d="M4 14.5q2 1.6 4 0t4 0 4 0 4 0" stroke="currentColor" strokeWidth="1.5" fill="none" /><rect x="11" y="5.5" width="2" height="5" fill="#fff" /><path d="M12 2.5q1.6 1.7 0 3q-1.6-1.3 0-3z" fill="#ffc93c" /></>,
    days: null,
  }[sticker.kind]
  return (
    <span className={styles.sticker} data-kind={sticker.kind} data-colour={sticker.colour} title={sticker.label}>
      {shape ? <svg viewBox="0 0 24 24" aria-hidden="true">{shape}</svg> : null}
      {sticker.text && <b>{sticker.text}</b>}
    </span>
  )
}

function Square({ day, week, today }: { day: QuiltWeek<Entry>['days'][number]; week: number; today: string }) {
  if (day.date > today) return <span className={styles.square} data-future="" aria-hidden="true" />
  const photos = day.items.filter(item => item.media).map(item => item.media!)
  const videos = photos.filter(photo => photo.kind === 'video').length
  const stickers = stickersFor(day)
  const isToday = day.date === today
  const dayOfMonth = Number(day.date.slice(8, 10))
  const label = [fullDate(day.date), isToday ? 'today' : null,
    photos.length ? `${photos.length} photo${photos.length === 1 ? '' : 's'}` : null,
    ...stickers.map(sticker => sticker.label)].filter(Boolean).join(', ')
  const href = `/days?week=${week}#day-${day.day}`
  // Busy days get a bolder count: a few photos, a good handful, or a whole album's worth.
  const busy = photos.length >= 10 ? 'lots' : photos.length >= 5 ? 'many' : 'some'
  const lead = stickers.find(sticker => sticker.kind === 'star' || sticker.kind === 'letter')
  return (
    <Link href={href} className={styles.square} aria-label={label}
      data-photo={photos.length ? '' : undefined}
      data-story={!photos.length && lead ? '' : undefined}
      data-colour={!photos.length && lead ? lead.colour : undefined}
      data-empty={!photos.length && !lead ? '' : undefined}
      data-today={isToday ? '' : undefined}
      data-birthday={monthsTurned(day.date) !== null ? '' : undefined}>
      {photos.length > 0 && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`${photos[0].url}?w=480`} alt="" loading="lazy" decoding="async" />
      )}
      {!photos.length && !lead && (
        <span className={styles.squareDate}>{dayOfMonth}{dayOfMonth === 1 && <small>{shortMonth(day.date)}</small>}</span>
      )}
      {stickers.length > 0 && (
        <span className={styles.stickers} aria-hidden="true">
          {stickers.filter(sticker => photos.length || sticker !== lead).slice(0, 2).map((sticker, index) => <StickerIcon key={index} sticker={sticker} />)}
        </span>
      )}
      {!photos.length && lead && <span className={styles.squareStar} aria-hidden="true"><StickerIcon sticker={{ ...lead, colour: undefined }} /></span>}
      {videos > 0 && <span className={styles.squarePlay} aria-hidden="true" />}
      {photos.length > 1 && <i aria-hidden="true" data-busy={busy}>{photos.length}</i>}
      {isToday && <span className={styles.squareToday} aria-hidden="true">today</span>}
    </Link>
  )
}

function shortMonth(date: string) {
  return new Intl.DateTimeFormat('en-IN', { month: 'short', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function Legend() {
  return (
    <ul className={styles.legend} aria-label="What the marks mean">
      <li><StickerIcon sticker={{ kind: 'cake', text: '1', colour: 'duck', label: '' }} /> turned a month older</li>
      <li><StickerIcon sticker={{ kind: 'star', colour: 'sky', label: '' }} /> a story</li>
      <li><StickerIcon sticker={{ kind: 'letter', colour: 'rose', label: '' }} /> a letter</li>
      <li><span className={styles.legendPlay} aria-hidden="true" /> a video</li>
      <li><i className={styles.legendCount} data-busy="lots">12</i> photos that day</li>
    </ul>
  )
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
                {photos.length > 0 && <DayStrip photos={photos.map(photo => ({ id: photo.id, url: photo.url, caption: photo.caption, width: photo.width, height: photo.height, playToken: photo.playToken, kind: photo.kind, videoFailed: photo.videoFailed }))} label={fullDate(day.date)} />}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
