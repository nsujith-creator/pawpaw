'use server'

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
  attachMediaCore,
  updateMediaDetailsCore,
  reorderAttachmentCore,
  detachMediaCore,
  deleteMediaCore,
} from '@/lib/media/manage-media'

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
  const admin = await requireAdminWithOrigin()
  const fileType = (formData.get('file_type') as string | null) ?? ''
  const fileSize = Number(formData.get('file_size') ?? 0)
  const problem = validateUploadFile({ size: fileSize, type: fileType })
  if (problem) return { error: problem }

  const path = buildUploadPath(admin.id, fileType)
  if (!path) return { error: 'Unsupported file type. Use JPEG, PNG, or WebP.' }

  const db = createAdminClient()
  await sweepOrphans(db, admin.id)
  const { data, error } = await db.storage.from('media').createSignedUploadUrl(path)
  if (error || !data?.token) {
    console.error('authorizeUpload createSignedUploadUrl failed')
    return { error: 'Could not start the upload. Please try again in a moment.' }
  }
  return { ok: true as const, path: data.path, token: data.token }
}

export async function finalizeUpload(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const result = await finalizeUploadCore(createAdminClient(), admin.id, {
    path: (formData.get('path') as string | null) ?? '',
    altText: (formData.get('alt_text') as string | null)?.trim() ?? '',
    caption: (formData.get('caption') as string | null) ?? null,
    contentId: (formData.get('content_id') as string | null) || null,
  })
  if ('ok' in result) revalidateHome()
  return result
}

export async function updateMediaDetails(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const result = await updateMediaDetailsCore(
    createAdminClient(),
    admin.id,
    (formData.get('media_id') as string | null) ?? '',
    (formData.get('alt_text') as string | null) ?? '',
    (formData.get('caption') as string | null) ?? null,
  )
  if ('ok' in result) revalidateHome()
  return result
}

export async function reorderHomeMedia(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!contentId || !mediaId) return { error: 'That photo could not be found.' }
  const result = await reorderAttachmentCore(
    createAdminClient(), admin.id, contentId, mediaId,
    formData.get('direction') === 'earlier' ? 'earlier' : 'later',
  )
  if ('ok' in result) revalidateHome()
  return result
}

export async function detachHomeMedia(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const contentId = (formData.get('content_id') as string | null) ?? ''
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!contentId || !mediaId) return { error: 'That photo could not be found.' }
  const result = await detachMediaCore(createAdminClient(), admin.id, contentId, mediaId)
  if ('ok' in result) revalidateHome()
  return result
}

export async function deleteMediaForever(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  const result = await deleteMediaCore(createAdminClient(), admin.id, mediaId)
  if ('ok' in result) revalidateHome()
  return result
}

export async function attachMediaToHome(formData: FormData) {
  const admin = await requireAdminWithOrigin()
  const mediaId = (formData.get('media_id') as string | null) ?? ''
  if (!mediaId) return { error: 'Photo not specified.' }

  const db = createAdminClient()
  const { data: homes, error } = await db
    .from('content_items')
    .select('id')
    .eq('type', 'home')
    .eq('slug', 'home')
    .eq('created_by', admin.id)
    .limit(2)
  if (error || homes === null || homes.length !== 1) {
    return { error: 'No Home page owned by you is available for this photo.' }
  }

  const result = await attachMediaCore(db, admin.id, homes[0].id, mediaId)
  if ('error' in result) return result
  revalidateHome()
  return { ok: true as const }
}
