import { createAdminClient } from '@/lib/supabase/admin'
import { loadAuthorizedFamilyData } from '@/lib/auth/family-access'
import { createPrivatePlayerUrl } from './cloudflare'

export interface PublishedVideo { id: string; playerUrl: string | null; caption: string | null; durationSeconds: number | null }

export async function getPublishedVideos(revisionId: string) {
  return loadAuthorizedFamilyData(async () => {
    const db = createAdminClient()
    const { data, error } = await db.from('content_revision_videos').select('video_id, cloudflare_uid, caption, caption_override, duration_seconds').eq('revision_id', revisionId).order('sort_order', { ascending: true })
    if (error) return { state: 'error' as const, videos: [] as PublishedVideo[] }
    const videos = await Promise.all((data ?? []).map(async row => {
      let playerUrl: string | null = null
      try { playerUrl = await createPrivatePlayerUrl(row.cloudflare_uid) } catch { /* keep written chapter available */ }
      return { id: row.video_id, playerUrl, caption: row.caption_override?.trim() || row.caption?.trim() || null, durationSeconds: row.duration_seconds }
    }))
    return { state: 'ready' as const, videos }
  })
}
