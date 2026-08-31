'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { checkOrigin } from '@/lib/auth/origin'

export interface AdminLoginState {
  error: string
}

export async function loginAdmin(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const headersList = await headers()
  checkOrigin(headersList)

  const email    = ((formData.get('email')    as string | null) ?? '').trim()
  const password = (formData.get('password') as string | null) ?? ''

  if (!email || !password) {
    return { error: 'Add your email and password to open the studio.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Those details did not open the studio. Check them and try again.' }

  try {
    await requireActiveAdmin(supabase)
  } catch {
    await supabase.auth.signOut()
    return { error: 'This account does not have a writing desk in Pawpaw.' }
  }

  redirect('/admin')
}
