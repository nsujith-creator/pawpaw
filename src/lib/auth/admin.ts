import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  email: string
}

// Verifies the Supabase session AND the admin_users allowlist.
// Throws if not authenticated or not an active admin.
export async function requireActiveAdmin(supabase: SupabaseClient): Promise<AdminUser> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')

  const db = createAdminClient()
  const { data: row, error: rowErr } = await db
    .from('admin_users')
    .select('active')
    .eq('user_id', user.id)
    .maybeSingle()

  if (rowErr || !row?.active) throw new Error('Not authorized')

  return { id: user.id, email: user.email ?? '' }
}
