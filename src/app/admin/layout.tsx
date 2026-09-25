// The admin shell: one quiet bar across the top. Each page checks the admin sign-in itself.

import AdminNav from '@/components/admin/admin-nav'
import PrivateHistoryGuard from '@/components/auth/private-history-guard'
import styles from './admin.module.css'

export const metadata = { title: { default: 'Desk', template: '%s · pawpaw desk' } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.root}>
      <PrivateHistoryGuard />
      <AdminNav />
      {children}
    </div>
  )
}
