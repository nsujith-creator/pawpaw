// Admin shell layout. No auth check here — the proxy handles optimistic redirection
// and each page calls requireActiveAdmin() for the full allowlist check.

import AdminNav from '@/components/admin/admin-nav'
import PrivateHistoryGuard from '@/components/auth/private-history-guard'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb' }}>
      <PrivateHistoryGuard />
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0.75rem 1.25rem' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>Varada — Admin</span>
      </header>
      <AdminNav />
      <main style={{ padding: '1.5rem 1.25rem', maxWidth: '64rem', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
