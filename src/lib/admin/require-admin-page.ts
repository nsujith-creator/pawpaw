import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin, type AdminUser } from '@/lib/auth/admin'

// Every admin page starts here: signed in and on the admin list, or off to sign in.
export async function requireAdminPage(): Promise<AdminUser> {
  try {
    return await requireActiveAdmin(await createClient())
  } catch {
    redirect('/admin/login')
  }
}
