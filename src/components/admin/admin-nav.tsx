'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './admin-nav.module.css'

const links = [
  { href: '/admin',         label: 'Today',        exact: true  },
  { href: '/admin/content', label: 'Memories',     exact: false },
  { href: '/admin/media',   label: 'Photo shelf',  exact: false },
  { href: '/admin/home',    label: 'Welcome page', exact: false },
] as const

export default function AdminNav() {
  const pathname = usePathname()

  if (pathname === '/admin/login') return null

  return (
    <nav className={styles.nav} aria-label="Admin navigation">
      <p className={styles.navLabel}>Write</p>
      <div className={styles.destinationList}>
        {links.map(({ href, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={active ? `${styles.link} ${styles.active}` : styles.link}
              aria-current={active ? 'page' : undefined}
            >
              <span>{label}</span>
              {active && <span className={styles.currentCue}>Current</span>}
            </Link>
          )
        })}
      </div>
      <form action="/logout/admin" method="post" className={styles.signOutForm}>
        <button type="submit" className={styles.signOut}>Sign out</button>
      </form>
      <p className={styles.privacyNote}>Your desk is ready.</p>
    </nav>
  )
}
