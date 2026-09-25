'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanNames, cleanPeople } from '@/lib/family/lists'

// Saves her names or her people. They show on Home straight away.
export async function saveFamilyList(key: 'her-names' | 'her-people', items: unknown): Promise<{ ok: true } | { error: string }> {
  let admin
  try {
    checkOrigin(await headers())
    admin = await requireActiveAdmin(await createClient())
  } catch {
    return { error: "You've been signed out. Your changes are still here; sign in again in another tab, then Save again." }
  }
  if (key !== 'her-names' && key !== 'her-people') return { error: 'Nothing to save.' }
  const raw = JSON.stringify(items ?? [])
  if (/<[^>]+>/.test(raw)) return { error: 'Names can’t contain < or > tags.' }
  const clean = key === 'her-names' ? cleanNames(items) : cleanPeople(items)
  const { error } = await createAdminClient().from('family_lists')
    .upsert({ key, items: clean, updated_at: new Date().toISOString(), updated_by: admin.id })
  if (error) return { error: "Couldn't save just now. Nothing was changed; try again." }
  revalidatePath('/')
  revalidatePath('/admin/names')
  return { ok: true }
}
