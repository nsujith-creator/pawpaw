'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyPassphrase } from '@/lib/auth/viewer-passphrase'
import { signViewerCookie, VIEWER_COOKIE_NAME, VIEWER_COOKIE_OPTIONS } from '@/lib/auth/viewer-cookie'
import { checkThrottle, recordFailure, clearThrottle } from '@/lib/auth/throttle'
import { serverEnv } from '@/lib/env'

function getClientId(headersList: Headers): string {
  // Use forwarded IP as the throttle identifier. HMAC-SHA-256 is applied before storage.
  return (
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ??
    headersList.get('x-real-ip') ??
    'unknown'
  )
}

export interface LoginState {
  error: string
}

export async function loginViewer(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const submitted = ((formData.get('passphrase') as string | null) ?? '').trim()
  if (!submitted) {
    return { error: 'Pop in the family passphrase first.' }
  }

  const headersList = await headers()
  const clientId    = getClientId(headersList)

  const { blocked } = await checkThrottle(clientId)
  if (blocked) {
    return { error: 'Too many failed attempts. Please try again later.' }
  }

  const valid     = await verifyPassphrase(submitted)

  if (!valid) {
    try {
      await recordFailure(clientId)
    } catch {
      return { error: 'Login is temporarily unavailable. Please try again later.' }
    }
    return { error: 'That passphrase did not open the door. Have another go.' }
  }

  try {
    await clearThrottle(clientId)
  } catch {
    return { error: 'Login is temporarily unavailable. Please try again later.' }
  }

  const cookieValue = await signViewerCookie(
    serverEnv.viewerCookieSecret,
    serverEnv.viewerSessionVersion,
  )

  const cookieStore = await cookies()
  cookieStore.set(VIEWER_COOKIE_NAME, cookieValue, VIEWER_COOKIE_OPTIONS)

  redirect('/')
}
