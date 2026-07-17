'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { bodyBlocksSchema } from '@/lib/content/schema'
import { plainTextToBlocks } from '@/lib/content/plain-text'

// Generic user-facing message for unexpected persistence failures.
// Details go to the server log only — never to the browser.
const SAVE_FAILED = 'Could not save right now. Please try again in a moment.'

export async function saveHomeContent(formData: FormData) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  const admin    = await requireActiveAdmin(supabase)

  const title      = (formData.get('title') as string | null)?.trim() ?? ''
  const mode       = formData.get('mode') === 'json' ? 'json' : 'text'
  const action     = formData.get('action') as 'draft' | 'publish'
  const existingId = formData.get('id') as string | null

  if (!title) return { error: 'Please enter a title before saving.' }

  let blocks: unknown
  if (mode === 'text') {
    // Normal path: the owner writes plain text; paragraphs are separated by
    // blank lines. An empty body is allowed (saves an empty draft).
    blocks = plainTextToBlocks((formData.get('body_text') as string | null) ?? '')
  } else {
    // Advanced path: explicit JSON block editing.
    try {
      blocks = JSON.parse((formData.get('body_blocks') as string | null) ?? '[]')
    } catch {
      return { error: 'The advanced JSON is not valid JSON. Fix the syntax (or switch back to the simple editor).' }
    }
  }

  const parsed = bodyBlocksSchema.safeParse(blocks)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const blockNo = typeof issue?.path[0] === 'number' ? ` (block ${(issue.path[0] as number) + 1})` : ''
    return { error: `Content is not valid${blockNo}: ${issue?.message ?? 'unknown problem'}.` }
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
    if (error) {
      console.error('saveHomeContent update failed:', error)
      return { error: SAVE_FAILED }
    }
  } else {
    const { error } = await db.from('content_items').insert({ ...payload, created_by: admin.id })
    if (error) {
      console.error('saveHomeContent insert failed:', error)
      return { error: SAVE_FAILED }
    }
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

  if (error) {
    console.error('unpublishHome failed:', error)
    return { error: SAVE_FAILED }
  }

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true }
}
