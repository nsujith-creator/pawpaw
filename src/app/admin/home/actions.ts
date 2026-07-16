'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { bodyBlocksSchema } from '@/lib/content/schema'

export async function saveHomeContent(formData: FormData) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  const admin    = await requireActiveAdmin(supabase)

  const title      = (formData.get('title') as string | null)?.trim() ?? ''
  const blocksJson = (formData.get('body_blocks') as string | null) ?? '[]'
  const action     = formData.get('action') as 'draft' | 'publish'
  const existingId = formData.get('id') as string | null

  if (!title) return { error: 'Title is required.' }

  let blocks: unknown
  try {
    blocks = JSON.parse(blocksJson)
  } catch {
    return { error: 'Invalid content structure.' }
  }

  const parsed = bodyBlocksSchema.safeParse(blocks)
  if (!parsed.success) {
    return { error: 'Content validation failed: ' + parsed.error.issues[0]?.message }
  }

  const db     = createAdminClient()
  const status = action === 'publish' ? 'published' : 'draft'

  const payload = {
    type:        'home',
    slug:        'home',
    title,
    body_blocks: parsed.data,
    status,
    published_at: action === 'publish' ? new Date().toISOString() : null,
    updated_by:  admin.id,
  }

  if (existingId) {
    const { error } = await db.from('content_items').update(payload).eq('id', existingId)
    if (error) return { error: 'Save failed: ' + error.message }
  } else {
    const { error } = await db.from('content_items').insert({ ...payload, created_by: admin.id })
    if (error) return { error: 'Save failed: ' + error.message }
  }

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true }
}

export async function unpublishHome(id: string) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  await requireActiveAdmin(supabase)

  const db = createAdminClient()
  const { error } = await db
    .from('content_items')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true }
}
