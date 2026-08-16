// Request gate for archive and admin routes.
// Validates the signed viewer cookie with Edge-compatible Web Crypto.
// Refreshes Supabase sessions only when an admin session cookie is present.
// Injects X-Robots-Tag: noindex, nofollow, noarchive on every permitted protected response.

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { verifyViewerCookie, VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'
import { readViewerAuthConfig } from '@/lib/env'

const ROBOTS_HEADER = 'X-Robots-Tag'
const ROBOTS_VALUE  = 'noindex, nofollow, noarchive'
const PRIVATE_CACHE = 'private, no-store, no-cache, max-age=0, must-revalidate'

function withPrivateHeaders(res: NextResponse): NextResponse {
  res.headers.set(ROBOTS_HEADER, ROBOTS_VALUE)
  res.headers.set('Cache-Control', PRIVATE_CACHE)
  const vary = res.headers.get('Vary')
  if (!vary) res.headers.set('Vary', 'Cookie')
  else if (!vary.toLowerCase().split(',').map(value => value.trim()).includes('cookie')) {
    res.headers.set('Vary', `${vary}, Cookie`)
  }
  return res
}

// Server Components cannot write refreshed auth cookies. Keep refresh work here,
// where the replacement cookies can be sent to both this request and the browser.
async function refreshAdminSession(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          response = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  await supabase.auth.getClaims()
  return response
}

export function isArchiveRoute(pathname: string): boolean {
  if (pathname === '/manifest.webmanifest' || pathname === '/robots.txt' || pathname === '/service-worker.js' || pathname === '/offline.html') return false

  // Everything that is not a public route, static asset, or API path.
  const publicPrefixes = [
    '/family-login',
    '/admin',
    '/auth',
    '/logout',
    '/api',
    '/favicon',
  ]
  return !publicPrefixes.some(p => pathname.startsWith(p))
}

export function isProtectedAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

export function hasAdminSessionCandidate(req: NextRequest): boolean {
  return req.cookies.getAll().some(
    cookie => cookie.name.startsWith('sb-') && /-auth-token(?:\.\d+)?$/.test(cookie.name),
  )
}

function familyLoginRedirect(req: NextRequest, clearViewerCookie = false): NextResponse {
  const response = withPrivateHeaders(
    NextResponse.redirect(new URL('/family-login', req.url)),
  )
  if (clearViewerCookie) response.cookies.delete(VIEWER_COOKIE_NAME)
  return response
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  if (isArchiveRoute(pathname)) {
    const cookieValue = req.cookies.get(VIEWER_COOKIE_NAME)?.value
    const hasAdminCandidate = hasAdminSessionCandidate(req)
    const adminResponse = hasAdminCandidate ? await refreshAdminSession(req) : null
    const continueToArchive = () => withPrivateHeaders(adminResponse ?? NextResponse.next())

    if (!cookieValue) {
      return hasAdminCandidate
        ? continueToArchive()
        : familyLoginRedirect(req)
    }

    const authConfig = readViewerAuthConfig()
    if (!authConfig.valid) {
      if (hasAdminCandidate) {
        const response = continueToArchive()
        response.cookies.delete(VIEWER_COOKIE_NAME)
        return response
      }
      return familyLoginRedirect(req, true)
    }

    const { valid } = await verifyViewerCookie(
      cookieValue,
      authConfig.secret,
      authConfig.sessionVersion,
    )

    if (!valid) {
      if (hasAdminCandidate) {
        const response = continueToArchive()
        response.cookies.delete(VIEWER_COOKIE_NAME)
        return response
      }
      return familyLoginRedirect(req, true)
    }

    return continueToArchive()
  }

  if (isProtectedAdminRoute(pathname)) {
    // Presence is only a fast route gate. Server code still verifies the signed
    // claims and the active admin_users allowlist before any private data loads.
    if (!hasAdminSessionCandidate(req)) {
      return withPrivateHeaders(NextResponse.redirect(new URL('/admin/login', req.url)))
    }
    return withPrivateHeaders(await refreshAdminSession(req))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
