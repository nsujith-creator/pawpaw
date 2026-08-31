import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { getAdminChapter } from '@/lib/content/chapters'
import { getAdminVideos } from '@/lib/video/published-videos'
import ChapterEditor from '../chapter-editor'
import type { ReplacementCandidate } from '../../media/attachment-list'
import styles from '../../admin.module.css'

export default async function EditChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ step?: string }>
}) {
  const supabase = await createClient()
  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }
  const { id } = await params
  const requestedStep = (await searchParams).step
  const initialStep = requestedStep === 'story' || requestedStep === 'scene' || requestedStep === 'media' || requestedStep === 'review'
    ? requestedStep
    : 'details'
  const result = await getAdminChapter(id)
  if (result.state === 'empty') notFound()
  if (result.state === 'error') {
    return (
      <div className={styles.pageNarrow}>
        <h1 className={styles.pageTitle}>Chapter editor</h1>
        <p role="alert" className={styles.errorNotice}>This chapter could not be loaded safely. Nothing has been changed.</p>
      </div>
    )
  }
  const videoResult = await getAdminVideos(result.content.id)

  const db = createAdminClient()
  const { data: mediaRows, error: mediaError } = await db
    .from('media_assets')
    .select('id, storage_path, alt_text, caption')
    .eq('processing_status', 'ready')
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
  const replacementCandidates: ReplacementCandidate[] = mediaError ? [] : await Promise.all((mediaRows ?? []).map(async row => {
    let signedUrl: string | null = null
    try {
      signedUrl = await generateSignedUrl(row.storage_path)
    } catch {
      // The candidate remains listed without a thumbnail.
    }
    return {
      mediaId: row.id,
      signedUrl,
      altText: row.alt_text?.trim() || 'Family photograph',
      caption: row.caption,
    }
  }))

  return (
    <div className={styles.pageNarrow}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Your {result.content.type}</p>
          <h1 className={styles.pageTitle}>Shape this memory</h1>
          <p className={styles.lede}>One useful decision at a time. Save whenever you like; family sees nothing new until you share it.</p>
        </div>
        <Link href="/admin/content" className={styles.secondaryAction}>Back to content</Link>
      </header>
      {result.mediaState === 'degraded' && (
        <p role="alert" className={styles.warningNotice}>Some private photo previews are unavailable. The saved copy and photo records remain intact.</p>
      )}
      <section className={styles.editorSection}>
        <ChapterEditor
          existing={result.content}
          replacementCandidates={replacementCandidates}
          attachedVideos={videoResult.videos}
          initialStep={initialStep}
        />
      </section>
    </div>
  )
}
