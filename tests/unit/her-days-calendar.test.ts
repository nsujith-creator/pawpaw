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

describe('her days: months fold so a long year stays short', () => {
  // A photo every few days for her first year and a bit.
  const year = Array.from({ length: 130 }, (_, index) => photo(`p${index}`, index * 3))
  const render = (props: Record<string, unknown> = {}) => renderToStaticMarkup(createElement(HerDays, { media: year, stories: [], today: '2027-06-10', requestedWeek: null, ...props }))

  it('groups the weeks into the months of her life, newest first', async () => {
    const { monthsOf } = await import('@/components/family/her-days')
    const { quiltWeeks } = await import('@/lib/her-days/days')
    const groups = monthsOf(quiltWeeks(year, '2026-10-23'))
    expect(groups.map(group => group.month)).toEqual([4, 3, 2, 1, 0])
    expect(groups.at(-1)!.weeks.at(-1)!.week).toBe(0)
    expect(groups.flatMap(group => group.weeks)).toHaveLength(22)
    expect(groups[1].weeks.at(-1)!.month).toBe(3) // each month starts with the week she turned it
  })

  it('keeps this month open and folds every earlier one to a line with its photos', () => {
    const html = render()
    const months = html.match(/<details class="[^"]*month[^"]*"( open="")?>/g) ?? []
    expect(months.length).toBeGreaterThanOrEqual(13)
    expect(months.filter(tag => tag.includes('open'))).toHaveLength(1)
    expect(html).toContain('12 months')
    expect(html).toMatch(/1 year/)
    expect(html).toMatch(/\d+ photos/)
  })

  it('opens the month of the week being looked at', () => {
    const html = render({ requestedWeek: 6 })
    const months = html.match(/<details class="[^"]*month[^"]*"( open="")?>/g) ?? []
    expect(months.filter(tag => tag.includes('open'))).toHaveLength(2)
  })
})
