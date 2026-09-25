'use client'

// Keeps a reader's place. Going Back to a long story returns to where they were, whether the
// browser reloaded the page (the privacy guard does that on purpose) or Next.js navigated.
// Only scroll positions are stored, in this tab's session storage.

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const key = (path: string) => `pawpaw-scroll:${path}`

function restore(path: string) {
  let saved: number
  try { saved = Number(sessionStorage.getItem(key(path))) } catch { return }
  if (!Number.isFinite(saved) || saved <= 0) return
  const started = Date.now()
  // Photos may still be arriving; keep trying for a moment until the page is tall enough.
  const attempt = () => {
    const reachable = document.documentElement.scrollHeight - window.innerHeight >= saved - 4
    window.scrollTo(0, saved)
    if (!reachable && Date.now() - started < 2500) requestAnimationFrame(attempt)
  }
  attempt()
}

export default function ScrollKeeper() {
  const pathname = usePathname()

  useEffect(() => {
    let backwards = false
    try {
      if (sessionStorage.getItem('pawpaw-restore') === pathname) {
        sessionStorage.removeItem('pawpaw-restore')
        backwards = true
      }
    } catch { /* storage unavailable: start at the top */ }
    if (backwards || (window as unknown as { __pawpawPop?: boolean }).__pawpawPop) restore(pathname)
    ;(window as unknown as { __pawpawPop?: boolean }).__pawpawPop = false

    let frame = 0
    const save = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        try { sessionStorage.setItem(key(pathname), String(Math.round(window.scrollY))) } catch { /* ignore */ }
      })
    }
    const popped = () => { (window as unknown as { __pawpawPop?: boolean }).__pawpawPop = true }
    window.addEventListener('scroll', save, { passive: true })
    window.addEventListener('popstate', popped)
    return () => {
      window.removeEventListener('scroll', save)
      window.removeEventListener('popstate', popped)
      cancelAnimationFrame(frame)
    }
  }, [pathname])

  return null
}
