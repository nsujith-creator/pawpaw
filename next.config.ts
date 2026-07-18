import type { NextConfig } from 'next'

const protectedCacheHeaders = [
  { key: 'Cache-Control', value: 'private, no-store, no-cache, max-age=0, must-revalidate' },
]

const protectedRoutes = ['/', '/admin', '/admin/content', '/admin/home', '/admin/media']

const nextConfig: NextConfig = {
  // All media served through authenticated signed URLs — no external image domains needed.
  // No Server Action bodySizeLimit override: image bytes upload directly from
  // the browser to Supabase Storage (signed upload tokens), so every Server
  // Action body stays far below Next's 1 MB default — which also keeps
  // requests within Vercel's platform request-body cap.
  async headers() {
    return protectedRoutes.map(source => ({ source, headers: protectedCacheHeaders }))
  },
}

export default nextConfig
