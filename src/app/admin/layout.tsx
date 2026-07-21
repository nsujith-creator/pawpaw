// Admin shell layout. No auth check here — the proxy handles optimistic redirection
// and each page calls requireActiveAdmin() for the full allowlist check.

import AdminNav from '@/components/admin/admin-nav'
import PrivateHistoryGuard from '@/components/auth/private-history-guard'
import styles from './admin.module.css'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.adminRoot}>
      <PrivateHistoryGuard />
      <header className={styles.brandHeader}>
        <span className={styles.brand}>pawpaw</span>
        <span className={styles.brandContext}>author&apos;s studio</span>
      </header>
      <div className={styles.studioLayout}>
        <AdminNav />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
