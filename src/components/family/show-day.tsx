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
    const weekView = document.getElementById('week')
    let target = (day && document.getElementById(`day-${day}`)) || weekView
    if (!target) return
    // A day near the top of its week shows better with the week's heading above it.
    if (weekView && target !== weekView && target.getBoundingClientRect().top - weekView.getBoundingClientRect().top < 320) target = weekView
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = window.matchMedia('(min-width: 900px)').matches
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: wide ? 'nearest' : 'start' })
  }, [week, day])
  return null
}
