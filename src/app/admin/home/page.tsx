import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import HomeEditor from './home-editor'
import UploadForm from '../media/upload-form'

export default async function AdminHomePage() {
  const supabase = await createClient()

  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  const db = createAdminClient()

  const { data: item } = await db
    .from('content_items')
    .select('id, title, body_blocks, status, content_media(sort_order, media_assets(id, storage_path, alt_text, caption, width, height))')
    .eq('type', 'home')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <div>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', marginBottom: '1.5rem' }}>Home</h1>
      <HomeEditor existing={item ?? null} />
      <hr style={{ margin: '2rem 0', borderColor: '#e5e7eb' }} />
      <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '1rem', marginBottom: '1rem' }}>Upload a photo</h2>
      <UploadForm contentItemId={item?.id ?? null} />
    </div>
  )
}
