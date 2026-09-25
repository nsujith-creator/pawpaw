// Her age at the time of a story, the way the family says it: "day 0", "day 2", "6 weeks",
// "1 month", "5 months", "2 years". Worked out from the story's date and her birthday.

export const BIRTHDAY = '2026-05-29'

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export function ageAt(date: string | null | undefined, precision: 'day' | 'month' | 'year' | null = 'day'): string | null {
  if (!date) return null
  if (precision === 'year') return null
  // Known only to the month: count whole months, never a made-up week or day.
  if (precision === 'month') {
    const [by, bm] = BIRTHDAY.split('-').map(Number)
    const [y, m] = date.split('-').map(Number)
    const months = (y - by) * 12 + (m - bm)
    if (months < 0) return null
    if (months < 1) return 'her first month'
    return months < 24 ? `about ${months} month${months === 1 ? '' : 's'}` : `about ${Math.floor(months / 12)} years`
  }
  const days = daysBetween(BIRTHDAY, date)
  if (!Number.isFinite(days) || days < 0) return null
  if (days < 14) return `day ${days}`
  const months = Math.round(days / 30.44)
  const nearMonth = Math.abs(days - months * 30.44) <= 1.5
  if (days < 120) {
    if (nearMonth && months >= 1) return `${months} month${months === 1 ? '' : 's'}`
    return `${Math.floor(days / 7)} weeks`
  }
  if (days < 730) return `${Math.floor(days / 30.44)} months`
  const years = Math.floor(days / 365.25)
  return `${years} year${years === 1 ? '' : 's'}`
}

export function familyDate(date: string | null | undefined): string | null {
  if (!date) return null
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

// A date as precisely as it is known: "25 September 2026", "September 2026" or "2026".
export function knownDate(date: string | null | undefined, precision: 'day' | 'month' | 'year' | null | undefined): string | null {
  if (!date || !precision) return null
  const options: Intl.DateTimeFormatOptions = precision === 'day'
    ? { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }
    : precision === 'month' ? { month: 'long', year: 'numeric', timeZone: 'UTC' } : { year: 'numeric', timeZone: 'UTC' }
  return new Intl.DateTimeFormat('en-IN', options).format(new Date(`${date}T00:00:00Z`))
}
