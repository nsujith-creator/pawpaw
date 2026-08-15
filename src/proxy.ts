// Request gate for archive and admin routes.
// Validates the signed viewer cookie with Edge-compatible Web Crypto.
// Does not perform database-heavy authorization — full admin check is in server actions.
// Injects X-Robots-Tag: noindex, nofollow, noarchive on every permitted protected response.

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

async function refreshAdminSession(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return req.cookies.getAll()
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        response = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })

  try {
    await supabase.auth.getClaims()
  } catch {
    // The page authorization gate handles invalid or unavailable sessions.
  }
  return response
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

    if (!cookieValue) {
      return hasAdminCandidate
        ? withPrivateHeaders(await refreshAdminSession(req))
        : familyLoginRedirect(req)
    }

    const authConfig = readViewerAuthConfig()
    if (!authConfig.valid) {
      if (hasAdminCandidate) {
        const response = withPrivateHeaders(await refreshAdminSession(req))
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
        const response = withPrivateHeaders(await refreshAdminSession(req))
        response.cookies.delete(VIEWER_COOKIE_NAME)
        return response
      }
      return familyLoginRedirect(req, true)
    }

    return withPrivateHeaders(hasAdminSessionCandidate(req) ? await refreshAdminSession(req) : NextResponse.next())
  }

  if (isProtectedAdminRoute(pathname)) {
    // Optimistic check: presence of a Supabase auth cookie.
    // Full admin_users allowlist check happens in server components and actions.
    const hasSession = hasAdminSessionCandidate(req)
    if (!hasSession) {
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
