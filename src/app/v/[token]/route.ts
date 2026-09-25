// Turns a sealed video token into a fresh private Cloudflare playback link.
// Called when someone presses play, so the link is new at that moment and lasts four hours.
// The caller must be signed in as family or as an active admin.

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { verifyFamilyAccess } from '@/lib/auth/family-access'
import { readViewerAuthConfig } from '@/lib/env'
import { verifyViewerCookie, VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'
import { decodeMediaToken } from '@/lib/media/media-token'
import { createPrivatePlayerUrl } from '@/lib/video/cloudflare'

export const dynamic = 'force-dynamic'
const PRIVATE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow, noarchive' }

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const cookieStore = await cookies()
  const access = await verifyFamilyAccess({
    viewerCookie: cookieStore.get(VIEWER_COOKIE_NAME)?.value,
    viewerConfig: readViewerAuthConfig(),
    verifyViewer: verifyViewerCookie,
    async verifyAdmin() {
      try { return await requireActiveAdmin(await createClient()) } catch { return null }
    },
  })
  if (!access) return Response.json({ error: 'signed-out' }, { status: 401, headers: PRIVATE })

  const decoded = decodeMediaToken((await params).token)
  if (!decoded?.startsWith('video:')) return Response.json({ error: 'unknown' }, { status: 404, headers: PRIVATE })

  try {
    const url = await createPrivatePlayerUrl(decoded.slice('video:'.length))
    return Response.json({ url }, { headers: PRIVATE })
  } catch {
    return Response.json({ error: 'unavailable' }, { status: 503, headers: PRIVATE })
  }
}
