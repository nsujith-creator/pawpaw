import type { Metadata } from 'next'
import { unstable_noStore as noStore } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { getAdminChapter } from '@/lib/content/chapters'
import { getAdminVideos } from '@/lib/video/published-videos'
import ChapterRenderer from '@/components/content/chapter-renderer'
import styles from '../../../admin.module.css'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata: Metadata = {
  title: 'Private chapter preview',
  robots: { index: false, follow: false },
}

export default async function ChapterPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  noStore()
  const supabase = await createClient()
  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }
  const { id } = await params
  const result = await getAdminChapter(id)
  if (result.state === 'empty') notFound()
  if (result.state === 'error') {
    return (
      <div className={styles.pageNarrow}>
        <p role="alert" className={styles.errorNotice}>This preview could not be loaded safely.</p>
      </div>
    )
  }
  const videoResult = await getAdminVideos(result.content.id)

  return (
    <div className={styles.previewSurface}>
      <div className={styles.previewBanner} role="status">
        <strong>Private preview — not visible to family</strong>
        <span>Current private draft only. Previewing does not publish it; family continues to receive only the selected immutable revision.</span>
        <a href={`/admin/content/${result.content.id}`} className={styles.secondaryAction}>Edit chapter</a>
      </div>
      <ChapterRenderer
        content={result.content}
        mediaState={result.mediaState}
        videos={videoResult.videos}
        preview
      />
    </div>
  )
}
