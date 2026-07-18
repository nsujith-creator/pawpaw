import { NextResponse } from 'next/server'
import { VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'

export async function POST() {
  const res = NextResponse.redirect(
    new URL('/family-login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    303,
  )
  res.cookies.delete(VIEWER_COOKIE_NAME)
  return res
}
