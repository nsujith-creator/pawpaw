// Her age at the time of a story, the way the family says it: "day 0", "day 2", "6 weeks",
// "1 month", "5 months", "2 years". Worked out from the story's date and her birthday.

export const BIRTHDAY = '2026-05-29'

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

export function ageAt(date: string | null | undefined, precision: 'day' | 'month' | 'year' | null = 'day'): string | null {
  if (!date) return null
  const days = daysBetween(BIRTHDAY, date)
  if (!Number.isFinite(days) || days < 0) return null
  if (precision === 'year') return null
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
