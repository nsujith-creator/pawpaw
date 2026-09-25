'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import LeaveButton, { LEAVE_CHANNEL } from './leave-button'
import styles from './family.module.css'

export default function FamilyHeader() {
  const pathname = usePathname()
  const onHome = pathname === '/'
  const inStories = pathname.startsWith('/chapters') || pathname === '/first-days'

  // If someone presses Leave in another tab, this one goes back to the front door too.
  useEffect(() => {
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(LEAVE_CHANNEL)
      channel.onmessage = () => {
        document.documentElement.setAttribute('data-pawpaw-private-hidden', '')
        window.location.replace('/family-login')
      }
    } catch { /* older browsers: the session check on the next request still applies */ }
    return () => channel?.close()
  }, [])

  return (
    <header className={styles.top} data-plain={onHome ? '' : undefined}>
      <Link href="/" className={styles.word}>pawpaw</Link>
      <nav className={styles.nav} aria-label="Family pages">
        <Link href="/" aria-current={onHome ? 'page' : undefined}>Home</Link>
        <Link href="/chapters" aria-current={inStories ? 'page' : undefined}>Stories</Link>
        <LeaveButton />
      </nav>
    </header>
  )
}
