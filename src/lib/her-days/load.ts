// Everything on her days for a family reader: photos and videos that are shown, and published
// stories and letters with a known day. Nothing hidden or waiting for review ever leaves here.

import { createAdminClient } from '@/lib/supabase/admin'
import { loadAuthorizedFamilyData } from '@/lib/auth/family-access'
import { generateSignedUrl } from '@/lib/media/private-url'
import { encodeMediaToken } from '@/lib/media/media-token'
import { listPublishedChapters, type ChapterIndexItem } from '@/lib/content/chapters'
import { getVideoState } from '@/lib/video/cloudflare'
import { dayNumber, indiaDate } from './days'

export interface DayMedia {
  id: string
  kind: 'photo' | 'video'
  day: number
  takenAt: string
  url: string
  caption: string | null
  width: number | null
  height: number | null
  playToken: string | null
  videoFailed: boolean
}

export interface DayStory { day: number; item: ChapterIndexItem }

export type HerDaysResult = { state: 'error' } | { state: 'ready'; media: DayMedia[]; stories: DayStory[]; today: string }

interface Row {
  id: string
  kind: 'photo' | 'video'
  taken_at: string
  width: number | null
  height: number | null
  media_assets: { storage_path: string; caption: string | null } | null
  video_assets: { cloudflare_uid: string; status: string } | null
}

export async function loadHerDays(now = Date.now()): Promise<HerDaysResult> {
  return loadAuthorizedFamilyData(async () => {
    const db = createAdminClient()
    const rows: Row[] = []
    // Pages of 1,000 so a few years of photos still load in full.
    for (let from = 0; from < 50_000; from += 1000) {
      const { data, error } = await db.from('timeline_media')
        .select('id, kind, taken_at, width, height, media_assets(storage_path, caption), video_assets(cloudflare_uid, status)')
        .eq('visibility', 'shown').not('taken_at', 'is', null)
        .order('taken_at', { ascending: true }).order('id', { ascending: true })
        .range(from, from + 999)
      if (error) return { state: 'error' as const }
      rows.push(...((data ?? []) as unknown as Row[]))
      if (!data || data.length < 1000) break
    }
    // A video brought in from Google Photos takes a few minutes to be ready to play. Check a few
    // still-preparing ones on each visit, so they start playing without anyone pressing anything.
    const preparing = rows.filter(row => row.kind === 'video' && row.video_assets?.status === 'processing').slice(0, 5)
    await Promise.all(preparing.map(async row => {
      try {
        const state = await getVideoState(row.video_assets!.cloudflare_uid)
        if (state.status === 'processing') return
        await db.from('video_assets').update({ status: state.status, duration_seconds: state.durationSeconds, updated_at: new Date().toISOString() })
          .eq('cloudflare_uid', row.video_assets!.cloudflare_uid)
        row.video_assets!.status = state.status
      } catch { /* still shown as a still photo; checked again next visit */ }
    }))

    const stories = await listPublishedChapters()
    if (stories.state === 'error') return { state: 'error' as const }

    const media = (await Promise.all(rows.map(async row => {
      if (!row.media_assets) return null
      const day = dayNumber(indiaDate(row.taken_at))
      if (day < 0) return null
      const video = row.kind === 'video' && row.video_assets?.status === 'ready' ? row.video_assets.cloudflare_uid : null
      let playToken: string | null = null
      if (video) { try { playToken = encodeMediaToken(`video:${video}`) } catch { playToken = null } }
      return {
        id: row.id, kind: row.kind, day, takenAt: row.taken_at, caption: row.media_assets.caption?.trim() || null, width: row.width, height: row.height,
        url: await generateSignedUrl(row.media_assets.storage_path), playToken,
        videoFailed: row.kind === 'video' && row.video_assets?.status === 'errored',
      } satisfies DayMedia
    }))).filter((item): item is DayMedia => item !== null)

    const dayStories = stories.items
      .filter(item => item.eventDate && item.eventDatePrecision === 'day')
      .map(item => ({ day: dayNumber(item.eventDate!), item }))
      .filter(story => story.day >= 0)

    return { state: 'ready' as const, media, stories: dayStories, today: indiaDate(new Date(now).toISOString()) }
  })
}
