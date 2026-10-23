import { describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

vi.mock('@/components/family/show-day', () => ({ default: () => null }))
vi.mock('@/components/family/day-strip', () => ({ default: () => null }))

const { default: HerDays } = await import('@/components/family/her-days')

const photo = (id: string, day: number) => ({ id, kind: 'photo' as const, day, takenAt: '2026-07-10T08:00:00Z', url: `/p/${id}`, caption: null, width: 100, height: 100, playToken: null, videoFailed: false })

describe('her days: tapping a day on the calendar', () => {
  it('says what a tap does, and every day links to itself', () => {
    const html = renderToStaticMarkup(createElement(HerDays, { media: [photo('a', 42)], stories: [], today: '2026-10-23', requestedWeek: null }))
    expect(html).toContain('Tap a day to see it.')
    expect(html).toContain('href="/days?week=6&amp;day=42"')
    expect(html).toContain('href="/days?week=6&amp;day=43"')
    expect(html).not.toContain('#day-')
  })

  it('marks the tapped day, and says so plainly when nothing is on it', () => {
    const html = renderToStaticMarkup(createElement(HerDays, { media: [photo('a', 42)], stories: [], today: '2026-10-23', requestedWeek: 6, requestedDay: 43 }))
    expect(html).toMatch(/aria-current="date"[^>]*data-picked=""|data-picked=""[^>]*aria-current="date"/)
    expect(html).toContain('id="day-43"')
    expect(html).toContain('Nothing from Saturday, 11 July yet.')
    expect(html).toContain('id="day-42"')
    expect(html).toContain('href="#calendar"')
  })

  it('ignores a day that is not in the week being shown', () => {
    const html = renderToStaticMarkup(createElement(HerDays, { media: [photo('a', 42)], stories: [], today: '2026-10-23', requestedWeek: 6, requestedDay: 100 }))
    expect(html).not.toContain('aria-current="date"')
  })
})
