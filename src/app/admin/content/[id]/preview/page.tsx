import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAdminChapter } from '@/lib/content/chapters'
import { getAdminVideos } from '@/lib/video/published-videos'
import { requireAdminPage } from '@/lib/admin/require-admin-page'
import StoryPage from '@/components/family/story-page'
import AdminState from '../../../admin-state'
import styles from '../../../admin.module.css'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Preview', robots: { index: false, follow: false } }

export default async function StoryPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage()
  const { id } = await params
  const result = await getAdminChapter(id)
  if (result.state === 'empty') notFound()
  if (result.state === 'error') return <AdminState title="The preview didn't open." body="Nothing was changed. Reload in a minute." />
  const videos = await getAdminVideos(result.content.id)
  return (
    <>
      <p className={styles.previewBar} role="status">
        <span>Preview. This is how the family will see it{result.content.activeRevisionId ? ' after you update her page' : ''}.</span>
        <Link href={`/admin/content/${result.content.id}`}>Back to writing</Link>
      </p>
      <StoryPage content={result.content} mediaState={result.mediaState} videos={videos.videos} preview />
    </>
  )
}
