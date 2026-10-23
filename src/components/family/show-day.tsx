'use client'

// After a day on her calendar is tapped, brings that day into view. On a phone the week opens
// below the calendar, so without this the tap looks like it did nothing.

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function ShowDay() {
  const params = useSearchParams()
  const week = params.get('week')
  const day = params.get('day')
  useEffect(() => {
    if (week === null) return
    const target = (day && document.getElementById(`day-${day}`)) || document.getElementById('week')
    if (!target) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = window.matchMedia('(min-width: 900px)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: wide ? 'nearest' : 'start' })
  }, [week, day])
  return null
}
