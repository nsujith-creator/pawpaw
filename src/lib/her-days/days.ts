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

// Why a picked photo should wait for a person instead of going straight onto her days.
// Only mechanical facts: Pawpaw never guesses who is in a photo or what it means.
export function reviewReason(item: { takenAt: string | null; filename: string | null }, now = Date.now()): string | null {
  if (!item.takenAt) return 'It has no date. When was it taken?'
  const day = dayNumber(indiaDate(item.takenAt))
  if (day < 0) return 'Its date is before she was born.'
  if (Date.parse(item.takenAt) > now + 86_400_000) return 'Its date is in the future.'
  const name = item.filename ?? ''
  if (/^IMG-\d{8}-WA\d+/i.test(name) || /whatsapp/i.test(name)) return 'It came through WhatsApp, so its date may be when it arrived, not when it was taken.'
  if (/^screenshot/i.test(name) || /^screen[ _-]?shot/i.test(name)) return 'It is a screenshot.'
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

export function weekLabel(week: number) { return `week ${week + 1}` }

export function monthLabel(months: number) {
  if (months % 12 === 0) return months === 12 ? '1 year' : `${months / 12} years`
  return `${months} month${months === 1 ? '' : 's'}`
}
