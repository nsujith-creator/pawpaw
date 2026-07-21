import { describe, expect, it } from 'vitest'
import { formatDisplayDate } from '@/lib/content/display-date'

describe('human-readable archive dates', () => {
  it('formats the published Home timestamp in English and Asia/Kolkata', () => {
    expect(formatDisplayDate('2026-07-19T13:28:44.637Z')).toBe('19 July 2026')
  })

  it('uses Asia/Kolkata explicitly across a UTC date boundary', () => {
    expect(formatDisplayDate('2026-07-18T19:00:00.000Z')).toBe('19 July 2026')
  })

  it('returns no display value for invalid or absent input', () => {
    expect(formatDisplayDate(null)).toBeNull()
    expect(formatDisplayDate('not-a-date')).toBeNull()
  })
})
