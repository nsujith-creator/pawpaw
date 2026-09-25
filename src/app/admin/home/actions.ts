'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { bodyBlocksSchema } from '@/lib/content/schema'
import { plainTextToBlocks } from '@/lib/content/plain-text'
import {
  createHomeMutationStore,
  saveCanonicalHome,
  unpublishCanonicalHome,
} from '@/lib/content/manage-home'

// Generic user-facing message for unexpected persistence failures.
// Details go to the server log only — never to the browser.
async function adminOrNull() {
  try {
    checkOrigin(await headers())
    return await requireActiveAdmin(await createClient())
  } catch {
    return null
  }
}

const SIGNED_OUT = { error: "You've been signed out. Your words are still here; sign in again in another tab, then press Update Home again." }

export async function saveHomeContent(formData: FormData) {
  const admin = await adminOrNull()
  if (!admin) return SIGNED_OUT

  const title      = (formData.get('title') as string | null)?.trim() ?? ''
  const mode       = formData.get('mode') === 'json' ? 'json' : 'text'
  const action     = formData.get('action') as 'draft' | 'publish'
  const existingId = formData.get('id') as string | null

  if (!title) return { error: 'Home needs a title behind the scenes. Reload and try again.' }

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

  const status = action === 'publish' ? 'published' : 'draft'
  const result = await saveCanonicalHome(
    createHomeMutationStore(createAdminClient()),
    admin.id,
    existingId,
    {
    title,
    body_blocks: parsed.data,
    status,
    published_at: action === 'publish' ? new Date().toISOString() : null,
    },
  )
  if ('error' in result) return result

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true as const }
}

export async function unpublishHome() {
  const admin = await adminOrNull()
  if (!admin) return SIGNED_OUT
  const result = await unpublishCanonicalHome(
    createHomeMutationStore(createAdminClient()),
    admin.id,
  )
  if ('error' in result) return result

  revalidatePath('/')
  revalidatePath('/admin/home')
  return { ok: true as const }
}
