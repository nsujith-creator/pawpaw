'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanNames, cleanPeople } from '@/lib/family/lists'

export type SaveListResult =
  | { ok: true; items: unknown[]; savedAt: string }
  | { error: string; conflict?: true }

// Saves her names or her people, only if nobody else has saved that list since this page
// loaded. They show on Home straight away. Returns the list exactly as saved.
export async function saveFamilyList(key: 'her-names' | 'her-people', items: unknown, loadedAt: string | null): Promise<SaveListResult> {
  let admin
  try {
    checkOrigin(await headers())
    admin = await requireActiveAdmin(await createClient())
  } catch {
    return { error: "You've been signed out. Your changes are still here; sign in again in another tab, then Save again." }
  }
  if (key !== 'her-names' && key !== 'her-people') return { error: 'Nothing to save.' }
  if (/<[^>]+>/.test(JSON.stringify(items ?? []))) return { error: 'Names can’t contain < or > tags.' }
  const clean = key === 'her-names' ? cleanNames(items) : cleanPeople(items)
  const db = createAdminClient()
  const savedAt = new Date().toISOString()
  const row = { items: clean, updated_at: savedAt, updated_by: admin.id }
  const conflict = { conflict: true as const, error: 'Someone saved this list somewhere else since you opened this page. Reload to see it; copy anything you want to keep first.' }
  if (loadedAt) {
    const { data, error } = await db.from('family_lists').update(row).eq('key', key).eq('updated_at', loadedAt).select('key')
    if (error) return { error: "Couldn't save just now. Nothing was changed; try again." }
    if (!data || data.length === 0) return conflict
  } else {
    const { error } = await db.from('family_lists').insert({ key, ...row })
    if (error) return error.code === '23505' ? conflict : { error: "Couldn't save just now. Nothing was changed; try again." }
  }
  revalidatePath('/')
  revalidatePath('/admin/names')
  return { ok: true, items: clean, savedAt }
}
