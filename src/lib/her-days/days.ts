// Her days, counted the way the family counts them: day 0 is the day she was born, in India time.
// Photos carry the moment they were taken (UTC). Each one belongs to the Indian calendar day of
// that moment, so a photo taken at 1 a.m. on 13 June in Kochi is on 13 June, not 12 June.

import { BIRTHDAY } from '@/lib/family/age'

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000

// "2026-06-12T19:00:00Z" -> "2026-06-13" (India is 5h30 ahead and has no daylight saving).
export function indiaDate(iso: string): string {
  return new Date(Date.parse(iso) + IST_OFFSET_MS).toISOString().slice(0, 10)
}

export function dayNumber(date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${BIRTHDAY}T00:00:00Z`)) / 86_400_000)
}

export function dateOfDay(day: number): string {
  return new Date(Date.parse(`${BIRTHDAY}T00:00:00Z`) + day * 86_400_000).toISOString().slice(0, 10)
}

// A camera's own clock, as photos record it ("2026:06:12 10:30:00", no time zone). The family's
// phones are in India, so the time is read as India time.
export function cameraTime(value: string | null | undefined): string | null {
  const match = value ? /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(value.trim()) : null
  if (!match) return null
  const [, y, mo, d, h, mi, s] = match
  const time = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}+05:30`)
  return Number.isNaN(time) || Number(y) < 2000 ? null : new Date(time).toISOString()
}

// Phones write the moment into the file name: IMG_20260612_103000.jpg, VID_20260612_103000.mp4,
// 20260612_103000.jpg, Screenshot_20260612-103000.png in the phone's own (India) time, and Pixel's
// PXL_20260612_050000123.jpg in UTC.
export function fileNameTime(name: string | null | undefined): string | null {
  const match = name ? /(?:^|[^0-9])(20\d{2})(\d{2})(\d{2})[_-](\d{2})(\d{2})(\d{2})/.exec(name) : null
  if (!match) return null
  const [, y, mo, d, h, mi, s] = match
  if (/^PXL_/i.test(name!)) {
    const time = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`)
    return Number.isNaN(time) ? null : new Date(time).toISOString()
  }
  return cameraTime(`${y}:${mo}:${d} ${h}:${mi}:${s}`)
}

// The camera's time, hidden in a photo's EXIF block (sharp hands it over as raw bytes).
export function exifTime(exif: Buffer | undefined): string | null {
  if (!exif) return null
  const text = exif.toString('latin1')
  const match = /(20\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2})/.exec(text)
  return match ? cameraTime(match[1]) : null
}

// Why a picked photo should wait for a person instead of going straight onto her days.
// Only mechanical facts: Pawpaw never guesses who is in a photo or what it means.
// A photo put in the folder with no date of its own (a screenshot, a download) goes on the day it was
// put there, but only if that was just now. An older file moved in has a Drive date that isn't the
// day it came, and a video is never given the benefit: both wait for a look.
const FRESH_MS = 12 * 3_600_000

export function reviewReason(item: { takenAt: string | null; filename: string | null; takenAtSource?: string | null; kind?: 'photo' | 'video' }, now = Date.now()): string | null {
  if (!item.takenAt) return 'No date on this one. When was it taken?'
  if (item.takenAtSource === 'added' && (item.kind === 'video' || Date.parse(item.takenAt) < now - FRESH_MS)) return 'This has no date of its own. When was it taken?'
  const day = dayNumber(indiaDate(item.takenAt))
  if (day < 0) return 'This says it was taken before she was born.'
  if (Date.parse(item.takenAt) > now + 86_400_000) return 'This says it was taken on a day that hasn’t come yet.'
  const name = item.filename ?? ''
  if (/^IMG-\d{8}-WA\d+/i.test(name) || /whatsapp/i.test(name)) return 'This came on WhatsApp, so the date may be when it was sent.'
  if (/^screenshot/i.test(name) || /^screen[ _-]?shot/i.test(name)) return 'This is a screenshot.'
  return null
}

export interface DayPhoto { id: string; day: number; takenAt: string }

export interface QuiltDay<T> { day: number; date: string; items: T[] }
export interface QuiltWeek<T> { week: number; days: QuiltDay<T>[]; month: number | null }

// Weeks of her life, newest first. Week 0 holds days 0–6. "month" marks the week in which she
// turned that many months old (the same day of the month as her birthday).
export function quiltWeeks<T extends { day: number }>(items: T[], today: string): QuiltWeek<T>[] {
  const lastDay = Math.max(0, dayNumber(today))
  const byDay = new Map<number, T[]>()
  for (const item of items) {
    if (item.day < 0 || item.day > lastDay) continue
    const list = byDay.get(item.day) ?? []
    list.push(item)
    byDay.set(item.day, list)
  }
  const birthDayOfMonth = Number(BIRTHDAY.slice(8, 10))
  const weeks: QuiltWeek<T>[] = []
  for (let week = Math.floor(lastDay / 7); week >= 0; week--) {
    const days: QuiltDay<T>[] = []
    let month: number | null = null
    for (let day = week * 7; day < week * 7 + 7; day++) {
      const date = dateOfDay(day)
      days.push({ day, date, items: day <= lastDay ? byDay.get(day) ?? [] : [] })
      if (day > 0 && day <= lastDay && monthDay(date, birthDayOfMonth)) month = monthsOld(date)
    }
    weeks.push({ week, days, month })
  }
  return weeks
}

// The months she turns on this date ("1" on 29 June), or null on any other day.
export function monthsTurned(date: string): number | null {
  const day = dayNumber(date)
  if (day <= 0) return null
  return monthDay(date, Number(BIRTHDAY.slice(8, 10))) ? monthsOld(date) : null
}

// The day each month she turns a month older. A 31st birthday falls on the last day of shorter months.
function monthDay(date: string, birthDayOfMonth: number): boolean {
  const [y, m, d] = date.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return d === Math.min(birthDayOfMonth, last)
}

function monthsOld(date: string): number {
  const [by, bm] = BIRTHDAY.split('-').map(Number)
  const [y, m] = date.split('-').map(Number)
  return (y - by) * 12 + (m - bm)
}

// Her age in a row of the quilt, the way the family says it: "born", "1 week", "16 weeks".
export function weekLabel(week: number) { return week === 0 ? 'born' : `${week} week${week === 1 ? '' : 's'}` }

export function monthLabel(months: number) {
  if (months % 12 === 0) return months === 12 ? '1 year' : `${months / 12} years`
  return `${months} month${months === 1 ? '' : 's'}`
}
