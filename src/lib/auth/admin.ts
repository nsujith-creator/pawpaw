import { createAdminClient } from '@/lib/supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminUser {
  id: string
  email: string
}

// Verifies signed Supabase claims AND the admin_users allowlist.
// The request proxy refreshes expired auth cookies before this code runs.
export async function requireActiveAdmin(supabase: SupabaseClient): Promise<AdminUser> {
  const { data: { claims }, error } = await supabase.auth.getClaims()
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  if (error || !userId) throw new Error('Not authenticated')

  const db = createAdminClient()
  const { data: row, error: rowErr } = await db
    .from('admin_users')
    .select('active')
    .eq('user_id', userId)
    .maybeSingle()

  if (rowErr || !row?.active) throw new Error('Not authorized')

  return {
    id: userId,
    email: typeof claims.email === 'string' ? claims.email : '',
  }
}
