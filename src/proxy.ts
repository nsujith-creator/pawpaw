// Request gate for archive and admin routes.
// Validates the signed viewer cookie with Edge-compatible Web Crypto.
// Does not perform database-heavy authorization — full admin check is in server actions.
// Injects X-Robots-Tag: noindex, nofollow, noarchive on every permitted protected response.

import { NextRequest, NextResponse } from 'next/server'
import { verifyViewerCookie, VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'
import { readViewerAuthConfig } from '@/lib/env'

const ROBOTS_HEADER = 'X-Robots-Tag'
const ROBOTS_VALUE  = 'noindex, nofollow, noarchive'

function withRobots(res: NextResponse): NextResponse {
  res.headers.set(ROBOTS_HEADER, ROBOTS_VALUE)
  return res
}

function isArchiveRoute(pathname: string): boolean {
  // Everything that is not a public route, static asset, or API path.
  const publicPrefixes = [
    '/family-login',
    '/admin',
    '/auth',
    '/logout',
    '/_next',
    '/api',
    '/favicon',
  ]
  return !publicPrefixes.some(p => pathname.startsWith(p))
}

function isProtectedAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && pathname !== '/admin/login'
}

export default async function proxy(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl

  if (isArchiveRoute(pathname)) {
    const cookieValue = req.cookies.get(VIEWER_COOKIE_NAME)?.value

    if (!cookieValue) {
      return NextResponse.redirect(new URL('/family-login', req.url))
    }

    const authConfig = readViewerAuthConfig()
    if (!authConfig.valid) {
      const res = NextResponse.redirect(new URL('/family-login', req.url))
      res.cookies.delete(VIEWER_COOKIE_NAME)
      return res
    }

    const { valid } = await verifyViewerCookie(
      cookieValue,
      authConfig.secret,
      authConfig.sessionVersion,
    )

    if (!valid) {
      const res = NextResponse.redirect(new URL('/family-login', req.url))
      res.cookies.delete(VIEWER_COOKIE_NAME)
      return res
    }

    return withRobots(NextResponse.next())
  }

  if (isProtectedAdminRoute(pathname)) {
    // Optimistic check: presence of a Supabase auth cookie.
    // Full admin_users allowlist check happens in server components and actions.
    const hasSession = req.cookies.getAll().some(
      c => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'),
    )
    if (!hasSession) {
      return NextResponse.redirect(new URL('/admin/login', req.url))
    }
    return withRobots(NextResponse.next())
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
