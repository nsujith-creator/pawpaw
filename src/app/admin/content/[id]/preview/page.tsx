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
        <strong>This is the family view.</strong>
        <span>Only you can see this preview. When it feels right, return to the final step to share it.</span>
        <a href={`/admin/content/${result.content.id}?step=review`} className={styles.action}>Looks good — back to share</a>
        <a href={`/admin/content/${result.content.id}?step=story`} className={styles.secondaryAction}>Keep editing</a>
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
