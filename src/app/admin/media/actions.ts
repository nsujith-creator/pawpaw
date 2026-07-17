'use server'

// Direct-to-Storage upload flow. Image bytes NEVER pass through these
// Server Actions (and therefore never through a Vercel Function request):
//   1. authorizeUpload  — tiny request; verifies the active admin and issues
//      a short-lived signed upload token for a server-chosen path.
//   2. (browser)        — uploads bytes straight to the private bucket with
//      supabase-js uploadToSignedUrl (anon key + token only).
//   3. finalizeUpload   — tiny request; re-verifies the admin and the real
//      object (existence, size, MIME) before registering it.

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { validateUploadFile } from '@/lib/media/validate-upload'
import { buildUploadPath } from '@/lib/media/upload-path'
import { finalizeUploadCore } from '@/lib/media/finalize-upload'
import { sweepOrphans } from '@/lib/media/orphan-sweep'
import {
  updateMediaDetailsCore,
  reorderAttachmentCore,
  detachMediaCore,
  deleteMediaCore,
} from '@/lib/media/manage-media'

// Shared guard for every photo-management action: origin check plus active
// admin verification. Returns the admin identity.
async function requireAdminWithOrigin() {
  const headersList = await headers()
  checkOrigin(headersList)
  const supabase = await createClient()
  return requireActiveAdmin(supabase)
}

function revalidateHome() {
  revalidatePath('/')
  revalidatePath('/admin/home')
  revalidatePath('/admin/media')
}

export async function authorizeUpload(formData: FormData) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  const admin    = await requireActiveAdmin(supabase)

  const fileType = (formData.get('file_type') as string | null) ?? ''
  const fileSize = Number(formData.get('file_size') ?? 0)

  // UX-level pre-check on the client's claims. The trusted check happens in
  // finalizeUpload against what Storage actually recorded.
  const problem = validateUploadFile({ size: fileSize, type: fileType })
  if (problem) return { error: problem }

  const path = buildUploadPath(admin.id, fileType)
  if (!path) return { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }

  const db = createAdminClient()

  // Bounded reconciliation: clear this admin's abandoned uploads (>24 h old,
  // never finalized) before issuing a new authorization. Best-effort.
  await sweepOrphans(db, admin.id)

  const { data, error } = await db.storage.from('media').createSignedUploadUrl(path)
  if (error || !data?.token) {
    console.error('authorizeUpload createSignedUploadUrl failed:', error)
    return { error: 'Could not start the upload. Please try again in a moment.' }
  }

  // The token authorizes exactly this path for 2 hours; the service-role key
  // never leaves the server.
  return { ok: true as const, path: data.path, token: data.token }
}

export async function finalizeUpload(formData: FormData) {
  const headersList = await headers()
  checkOrigin(headersList)

  const supabase = await createClient()
  const admin    = await requireActiveAdmin(supabase)

  const path      = (formData.get('path') as string | null) ?? ''
  const altText   = (formData.get('alt_text') as string | null)?.trim() ?? ''
  const caption   = (formData.get('caption') as string | null) ?? null
  const contentId = (formData.get('content_id') as string | null) || null

  const db     = createAdminClient()
  const result = await finalizeUploadCore(db, admin.id, { path, altText, caption, contentId })

  if ('ok' in result) revalidateHome()
  return result
}

export async function updateMediaDetails(formData: FormData) {
  const admin   = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  const altText = (formData.get('alt_text') as string | null) ?? ''
  const caption = (formData.get('caption') as string | null) ?? null

  const result = await updateMediaDetailsCore(createAdminClient(), admin.id, mediaId, altText, caption)
  if ('ok' in result) revalidateHome()
  return result
}

export async function reorderHomeMedia(formData: FormData) {
  await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId   = (formData.get('media_id') as string | null) ?? ''
  const direction = formData.get('direction') === 'earlier' ? 'earlier' : 'later'

  if (!contentId || !mediaId) return { error: 'That photo could not be found.' }

  const result = await reorderAttachmentCore(createAdminClient(), contentId, mediaId, direction)
  if ('ok' in result) revalidateHome()
  return result
}

export async function detachHomeMedia(formData: FormData) {
  await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId   = (formData.get('media_id') as string | null) ?? ''

  if (!contentId || !mediaId) return { error: 'That photo could not be found.' }

  const result = await detachMediaCore(createAdminClient(), contentId, mediaId)
  if ('ok' in result) revalidateHome()
  return result
}

export async function deleteMediaForever(formData: FormData) {
  const admin   = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''

  const result = await deleteMediaCore(createAdminClient(), admin.id, mediaId)
  if ('ok' in result) revalidateHome()
  return result
}

export async function attachMediaToHome(formData: FormData) {
  const admin   = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!mediaId) return { error: 'Photo not specified.' }

  const db = createAdminClient()

  // Verify ownership.
  const { data: asset } = await db
    .from('media_assets')
    .select('id')
    .eq('id', mediaId)
    .eq('created_by', admin.id)
    .maybeSingle()
  if (!asset) return { error: 'Photo not found or not owned by you.' }

  // Find the Home content item.
  const { data: homeItem } = await db
    .from('content_items')
    .select('id')
    .eq('type', 'home')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!homeItem) return { error: 'No Home page has been saved yet. Go to Home page and save content first.' }

  // Prevent duplicate attachment. content_media has a composite primary key
  // (content_id, media_id) — there is no `id` column to select.
  const { data: existing, error: existingError } = await db
    .from('content_media')
    .select('content_id')
    .eq('content_id', homeItem.id)
    .eq('media_id', mediaId)
    .maybeSingle()
  if (existingError) {
    console.error('attachMediaToHome duplicate check failed:', existingError)
    return { error: 'Could not attach the photo. Please try again.' }
  }
  if (existing) return { error: 'This photo is already attached to the Home page.' }

  // Append after current last item.
  const { data: lastRow } = await db
    .from('content_media')
    .select('sort_order')
    .eq('content_id', homeItem.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await db.from('content_media').insert({
    content_id: homeItem.id,
    media_id:   mediaId,
    sort_order: (lastRow?.sort_order ?? -1) + 1,
  })
  if (error) {
    console.error('attachMediaToHome insert failed:', error)
    return { error: 'Could not attach the photo. Please try again.' }
  }

  revalidateHome()
  return { ok: true as const }
}
