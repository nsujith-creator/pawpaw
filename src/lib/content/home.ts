// Fetches published Home content for viewer delivery.
// Uses the service-role client — viewer browsers never touch the database directly.
// Returns only published rows; drafts are excluded.

import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import type { ContentBlock } from '@/lib/content/schema'

export interface CarouselItem {
  id:               string
  signedUrl:        string
  altText:          string | null
  caption:          string | null
  focalX:           number | null
  focalY:           number | null
  width:            number | null
  height:           number | null
  extractedPalette: string[] | null
}

interface MediaAssetRow {
  id:                string
  storage_path:      string
  alt_text:          string | null
  caption:           string | null
  focal_x:           number | null
  focal_y:           number | null
  width:             number | null
  height:            number | null
  extracted_palette: string[] | null
}

interface ContentMediaRow {
  sort_order:   number
  media_assets: MediaAssetRow
}

export interface HomeContent {
  id:           string
  title:        string
  bodyBlocks:   ContentBlock[]
  carousel:     CarouselItem[]
  publishedAt:  string
}

export async function getPublishedHomeContent(): Promise<HomeContent | null> {
  const db = createAdminClient()

  const { data, error } = await db
    .from('content_items')
    .select(`
      id, title, body_blocks, published_at,
      content_media (
        sort_order,
        media_assets (
          id, storage_path, alt_text, caption,
          focal_x, focal_y, width, height, extracted_palette
        )
      )
    `)
    .eq('type', 'home')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null

  const sorted = (data.content_media as unknown as ContentMediaRow[])
    .sort((a, b) => a.sort_order - b.sort_order)

  const carousel: CarouselItem[] = await Promise.all(
    sorted.map(async (cm) => {
      const a = cm.media_assets
      return {
        id:               a.id,
        signedUrl:        await generateSignedUrl(a.storage_path),
        altText:          a.alt_text,
        caption:          a.caption,
        focalX:           a.focal_x,
        focalY:           a.focal_y,
        width:            a.width,
        height:           a.height,
        extractedPalette: a.extracted_palette,
      }
    }),
  )

  return {
    id:          data.id,
    title:       data.title,
    bodyBlocks:  data.body_blocks as ContentBlock[],
    carousel,
    publishedAt: data.published_at,
  }
}
