'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from '@/app/admin/admin.module.css'

const LINKS = [
  { href: '/admin', label: 'Stories', current: (path: string) => path === '/admin' || path.startsWith('/admin/content') },
  { href: '/admin/home', label: 'Home', current: (path: string) => path.startsWith('/admin/home') },
  { href: '/admin/media', label: 'Photos', current: (path: string) => path.startsWith('/admin/media') },
]

export default function AdminNav() {
  const pathname = usePathname()
  if (pathname === '/admin/login') return null
  return (
    <header className={styles.top}>
      <Link href="/admin" className={styles.word}>pawpaw <span>desk</span></Link>
      <nav className={styles.nav} aria-label="Desk">
        {LINKS.map(link => (
          <Link key={link.href} href={link.href} aria-current={link.current(pathname) ? 'page' : undefined}>{link.label}</Link>
        ))}
      </nav>
      <div className={styles.topEnd}>
        <a href="/" target="_blank" rel="noreferrer" className={styles.herPage}>Her page ↗</a>
        <form action="/logout/admin" method="post">
          <button type="submit" className={styles.signOut}>Sign out</button>
        </form>
      </div>
    </header>
  )
}
