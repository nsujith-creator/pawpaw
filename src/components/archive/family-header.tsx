'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import LeaveButton from '@/components/home/leave-button'
import styles from './family-header.module.css'

const links = [
  { href: '/', label: 'Home' },
  { href: '/first-days', label: 'First Days' },
]

export default function FamilyHeader() {
  const pathname = usePathname()

  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Pawpaw home">
        pawpaw <span aria-hidden="true">♥</span>
      </Link>
      <nav className={styles.navigation} aria-label="Family navigation">
        {links.map(link => {
          const current = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={styles.link}
              aria-current={current ? 'page' : undefined}
            >
              {link.label}
            </Link>
          )
        })}
        <LeaveButton />
      </nav>
    </header>
  )
}
