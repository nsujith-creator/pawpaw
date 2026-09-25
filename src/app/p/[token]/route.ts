// Serves one private family photo at a sensible size.
// 1. The caller must be signed in as family (viewer cookie) or as an active admin.
// 2. The token must decrypt to a path in the private media bucket.
// 3. A resized WebP copy is made once with sharp and kept under derived/ in the same private
//    bucket (outside every admin folder, so the orphan sweep never touches it).
// Responses are never stored by the browser or any cache: after Leave, nothing remains.

import { createHash } from 'node:crypto'
import { cookies } from 'next/headers'
import sharp from 'sharp'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { verifyFamilyAccess } from '@/lib/auth/family-access'
import { readViewerAuthConfig } from '@/lib/env'
import { verifyViewerCookie, VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'
import { decodeMediaToken, nearestPhotoWidth } from '@/lib/media/media-token'

export const dynamic = 'force-dynamic'

const PRIVATE = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
}

async function hasFamilyAccess(): Promise<boolean> {
  const cookieStore = await cookies()
  const access = await verifyFamilyAccess({
    viewerCookie: cookieStore.get(VIEWER_COOKIE_NAME)?.value,
    viewerConfig: readViewerAuthConfig(),
    verifyViewer: verifyViewerCookie,
    async verifyAdmin() {
      try { return await requireActiveAdmin(await createClient()) } catch { return null }
    },
  })
  return access !== null
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!(await hasFamilyAccess())) return new Response(null, { status: 401, headers: PRIVATE })

  const { token } = await params
  const path = decodeMediaToken(token)
  if (!path) return new Response(null, { status: 404, headers: PRIVATE })

  const width = nearestPhotoWidth(new URL(request.url).searchParams.get('w'))
  const derivedPath = `derived/${createHash('sha256').update(path).digest('hex').slice(0, 40)}-${width}.webp`
  const bucket = createAdminClient().storage.from('media')

  const cached = await bucket.download(derivedPath)
  if (cached.data) {
    return new Response(await cached.data.arrayBuffer(), { headers: { ...PRIVATE, 'Content-Type': 'image/webp' } })
  }

  const original = await bucket.download(path)
  if (!original.data) return new Response(null, { status: 404, headers: PRIVATE })

  try {
    const resized = await sharp(Buffer.from(await original.data.arrayBuffer()))
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    // Keep the copy for next time. If storing fails, this visitor still gets the photo.
    await bucket.upload(derivedPath, resized, { contentType: 'image/webp', upsert: true }).catch(() => null)
    return new Response(new Uint8Array(resized), { headers: { ...PRIVATE, 'Content-Type': 'image/webp' } })
  } catch {
    // An image sharp cannot read is still shown, just unresized.
    return new Response(await original.data.arrayBuffer(), {
      headers: { ...PRIVATE, 'Content-Type': original.data.type || 'application/octet-stream' },
    })
  }
}
