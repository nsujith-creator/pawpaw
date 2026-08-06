import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { readViewerAuthConfig, type ViewerAuthConfigResult } from '@/lib/env'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { verifyViewerCookie, VIEWER_COOKIE_NAME } from '@/lib/auth/viewer-cookie'

export type FamilyAccess = { kind: 'viewer' } | { kind: 'admin'; adminId: string }

export interface FamilyAccessChecks {
  viewerCookie?: string
  viewerConfig: ViewerAuthConfigResult
  verifyViewer: (value: string, secret: string, version: number) => Promise<{ valid: boolean }>
  verifyAdmin: () => Promise<{ id: string } | null>
}

export async function verifyFamilyAccess(checks: FamilyAccessChecks): Promise<FamilyAccess | null> {
  if (checks.viewerCookie && checks.viewerConfig.valid) {
    const viewer = await checks.verifyViewer(
      checks.viewerCookie,
      checks.viewerConfig.secret,
      checks.viewerConfig.sessionVersion,
    )
    if (viewer.valid) return { kind: 'viewer' }
  }

  const admin = await checks.verifyAdmin()
  return admin ? { kind: 'admin', adminId: admin.id } : null
}

export async function requireFamilyAccess(): Promise<FamilyAccess> {
  const cookieStore = await cookies()
  const access = await verifyFamilyAccess({
    viewerCookie: cookieStore.get(VIEWER_COOKIE_NAME)?.value,
    viewerConfig: readViewerAuthConfig(),
    verifyViewer: verifyViewerCookie,
    async verifyAdmin() {
      try {
        const supabase = await createClient()
        return await requireActiveAdmin(supabase)
      } catch {
        return null
      }
    },
  })

  if (!access) redirect('/family-login')
  return access
}

export async function loadAuthorizedFamilyData<T>(
  load: () => Promise<T>,
  authorize: () => Promise<unknown> = requireFamilyAccess,
): Promise<T> {
  await authorize()
  return load()
}
