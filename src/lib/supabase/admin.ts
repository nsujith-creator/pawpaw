import { createClient } from '@supabase/supabase-js'
import { serverEnv } from '@/lib/env'

// Service-role client: bypasses RLS.
// Must never be used in client bundles or exposed outside server-side code.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serverEnv.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
