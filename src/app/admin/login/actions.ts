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

  const email    = (formData.get('email')    as string | null) ?? ''
  const password = (formData.get('password') as string | null) ?? ''

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: 'Invalid credentials.' }

  try {
    await requireActiveAdmin(supabase)
  } catch {
    await supabase.auth.signOut()
    return { error: 'Access denied. This account is not an administrator.' }
  }

  redirect('/admin')
}
