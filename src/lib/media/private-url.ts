// Generates short-lived signed URLs for private Storage objects.
// Only called from server-side code after session validation.
// Signed URLs have a 5-minute expiry — copied links work until expiry (accepted limitation).

import { createAdminClient } from '@/lib/supabase/admin'

const SIGNED_URL_EXPIRY_SECONDS = 300  // 5 minutes

export async function generateSignedUrl(storagePath: string): Promise<string> {
  const db = createAdminClient()
  const { data, error } = await db.storage
    .from('media')
    .createSignedUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS)

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL for ${storagePath}: ${error?.message}`)
  }

  return data.signedUrl
}
