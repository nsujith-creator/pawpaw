import { createAdminClient } from '@/lib/supabase/admin'
import { loadAuthorizedFamilyData } from '@/lib/auth/family-access'
import { createPrivatePlayerUrl } from './cloudflare'

export interface PublishedVideo {
  id: string
  playerUrl: string | null
  caption: string | null
  durationSeconds: number | null
}

export interface AdminVideo extends PublishedVideo {
  status: 'uploading' | 'processing' | 'ready' | 'errored'
}

interface AdminVideoRow {
  sort_order: number
  caption_override: string | null
  video_assets: {
    id: string
    cloudflare_uid: string
    status: AdminVideo['status']
    caption: string | null
    duration_seconds: number | null
  } | {
    id: string
    cloudflare_uid: string
    status: AdminVideo['status']
    caption: string | null
    duration_seconds: number | null
  }[] | null
}

async function playerUrl(cloudflareUid: string): Promise<string | null> {
  try {
    return await createPrivatePlayerUrl(cloudflareUid)
  } catch {
    return null
  }
}

export async function getAdminVideos(contentId: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from('content_videos')
    .select('sort_order, caption_override, video_assets (id, cloudflare_uid, status, caption, duration_seconds)')
    .eq('content_id', contentId)
    .order('sort_order', { ascending: true })
  if (error) return { state: 'error' as const, videos: [] as AdminVideo[] }

  const videos: AdminVideo[] = []
  for (const row of (data ?? []) as unknown as AdminVideoRow[]) {
    const asset = Array.isArray(row.video_assets) ? row.video_assets[0] : row.video_assets
    if (!asset) continue
    videos.push({
      id: asset.id,
      playerUrl: asset.status === 'ready' ? await playerUrl(asset.cloudflare_uid) : null,
      caption: row.caption_override?.trim() || asset.caption?.trim() || null,
      durationSeconds: asset.duration_seconds,
      status: asset.status,
    })
  }

  return { state: 'ready' as const, videos }
}

export async function getPublishedVideos(revisionId: string) {
  return loadAuthorizedFamilyData(async () => {
    const db = createAdminClient()
    const { data, error } = await db.from('content_revision_videos').select('video_id, cloudflare_uid, caption, caption_override, duration_seconds').eq('revision_id', revisionId).order('sort_order', { ascending: true })
    if (error) return { state: 'error' as const, videos: [] as PublishedVideo[] }
    const videos = await Promise.all((data ?? []).map(async row => ({
      id: row.video_id,
      playerUrl: await playerUrl(row.cloudflare_uid),
      caption: row.caption_override?.trim() || row.caption?.trim() || null,
      durationSeconds: row.duration_seconds,
    })))
    return { state: 'ready' as const, videos }
  })
}
