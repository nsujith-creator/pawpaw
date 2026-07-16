import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'

export default async function AdminDashboard() {
  const supabase = await createClient()

  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', marginBottom: '1.5rem' }}>Dashboard</h1>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '20rem' }}>
        <a
          href="/admin/home"
          style={{ display: 'block', padding: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontWeight: 500 }}
        >
          Home content &amp; photos →
        </a>
      </nav>
    </div>
  )
}
