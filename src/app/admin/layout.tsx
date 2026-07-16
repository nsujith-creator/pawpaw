// Admin shell layout. No auth check here — the proxy handles optimistic redirection
// and each page calls requireActiveAdmin() for the full allowlist check.

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', background: '#f9fafb' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', background: '#fff', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 600 }}>Varada — Admin</span>
        <form action="/logout/admin" method="post">
          <button type="submit" style={{ fontSize: '0.8125rem', color: '#6b7280', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
            Sign out
          </button>
        </form>
      </header>
      <main style={{ padding: '1.5rem 1.25rem', maxWidth: '56rem', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}
