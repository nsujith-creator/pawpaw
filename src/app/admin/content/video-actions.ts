'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { checkOrigin } from '@/lib/auth/origin'
import { createPrivateTusUpload, deletePrivateVideo, getVideoState, MAX_VIDEO_BYTES, VIDEO_ACCEPT } from '@/lib/video/cloudflare'

export type AttachedVideo = {
  id: string
  status: 'uploading' | 'processing' | 'ready' | 'errored'
  durationSeconds: number | null
  caption: string | null
}

async function admin() {
  checkOrigin(await headers())
  return requireActiveAdmin(await createClient())
}

export async function startVideoUpload(formData: FormData) {
  const user = await admin()
  const contentId = String(formData.get('content_id') ?? '')
  const fileName = String(formData.get('file_name') ?? '')
  const fileType = String(formData.get('file_type') ?? '')
  const fileSize = Number(formData.get('file_size') ?? 0)
  const caption = String(formData.get('caption') ?? '').trim() || null
  if (!contentId || !fileName || !VIDEO_ACCEPT.split(',').includes(fileType) || !Number.isFinite(fileSize) || fileSize < 1 || fileSize > MAX_VIDEO_BYTES) return { error: 'Choose an MP4, MOV, or WebM video up to 2 GB.' }
  try {
    const upload = await createPrivateTusUpload(fileSize, fileName)
    const db = createAdminClient()
    const { data, error } = await db.from('video_assets').insert({ cloudflare_uid: upload.cloudflareUid, caption, created_by: user.id }).select('id').single()
    if (error || !data) return { error: 'The private video record could not be created. Please try again.' }
    const { error: attachError } = await db.rpc('attach_owned_video', { p_admin_id: user.id, p_content_id: contentId, p_video_id: data.id })
    if (attachError) return { error: 'The video is private but could not be attached to this memory. Please try again.' }
    revalidatePath(`/admin/content/${contentId}`)
    return { ok: true as const, videoId: data.id, uploadUrl: upload.uploadUrl }
  } catch {
    return { error: 'Private video upload is not configured yet.' }
  }
}

export async function refreshVideoStatus(formData: FormData) {
  const user = await admin()
  const videoId = String(formData.get('video_id') ?? '')
  const contentId = String(formData.get('content_id') ?? '')
  const db = createAdminClient()
  const { data: video } = await db.from('video_assets').select('cloudflare_uid').eq('id', videoId).eq('created_by', user.id).maybeSingle()
  if (!video) return { error: 'That video could not be found.' }
  try {
    const state = await getVideoState(video.cloudflare_uid)
    const { error } = await db.from('video_assets').update({ status: state.status, duration_seconds: state.durationSeconds, updated_at: new Date().toISOString() }).eq('id', videoId)
    if (error) {
      console.error('video-status-update-failed', { code: error.code, message: error.message })
      return { error: 'The video status could not be saved.' }
    }
    revalidatePath(`/admin/content/${contentId}`)
    return { ok: true as const, status: state.status }
  } catch {
    return { error: 'The video is still being prepared. Please check again shortly.' }
  }
}

export async function listAttachedVideos(formData: FormData) {
  await admin()
  const contentId = String(formData.get('content_id') ?? '')
  if (!contentId) return { error: 'That memory could not be found.' }
  const db = createAdminClient()
  const { data, error } = await db.from('content_videos').select('sort_order, video_assets (id, status, duration_seconds, caption)').eq('content_id', contentId).order('sort_order', { ascending: true })
  if (error) return { error: 'Attached videos could not be loaded.' }
  type VideoRow = { id: string; status: AttachedVideo['status']; duration_seconds: number | null; caption: string | null }
  const rows = (data ?? []) as unknown as Array<{ video_assets: VideoRow | VideoRow[] | null }>
  const videos = rows.flatMap(row => {
    const video = Array.isArray(row.video_assets) ? row.video_assets[0] : row.video_assets
    return video ? [{ id: video.id, status: video.status, durationSeconds: video.duration_seconds, caption: video.caption }] : []
  })
  return { videos }
}

export async function deleteAttachedVideo(formData: FormData) {
  const user = await admin()
  const contentId = String(formData.get('content_id') ?? '')
  const videoId = String(formData.get('video_id') ?? '')
  if (!contentId || !videoId) return { error: 'That video could not be found.' }
  const db = createAdminClient()
  const { data: video } = await db.from('video_assets').select('cloudflare_uid').eq('id', videoId).eq('created_by', user.id).maybeSingle()
  if (!video) return { error: 'That private video could not be found.' }
  const { count: publishedCount, error: publishedError } = await db.from('content_revision_videos').select('*', { count: 'exact', head: true }).eq('video_id', videoId)
  if (publishedError) return { error: 'The video history could not be checked.' }
  if ((publishedCount ?? 0) > 0) return { error: 'Published family videos are preserved in family history and cannot be deleted here.' }
  const { data: attached } = await db.from('content_videos').select('video_id').eq('content_id', contentId).eq('video_id', videoId).maybeSingle()
  if (!attached) return { error: 'That video is not attached to this memory.' }
  try {
    await deletePrivateVideo(video.cloudflare_uid)
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Cloudflare could not remove the private video. Nothing was changed.' }
  }
  const { error: detachError } = await db.from('content_videos').delete().eq('content_id', contentId).eq('video_id', videoId)
  if (detachError) return { error: 'The video was removed from Cloudflare but could not be detached. Please contact support.' }
  const { error: deleteError } = await db.from('video_assets').delete().eq('id', videoId)
  if (deleteError) return { error: 'The video was removed from Cloudflare but its private record could not be removed. Please contact support.' }
  revalidatePath(`/admin/content/${contentId}`)
  return { ok: true as const }
}
