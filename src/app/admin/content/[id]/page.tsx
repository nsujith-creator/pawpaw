import { notFound } from 'next/navigation'
import { getAdminChapter } from '@/lib/content/chapters'
import { getAdminVideos } from '@/lib/video/published-videos'
import { contentFingerprint } from '@/lib/content/fingerprint'
import { requireAdminPage } from '@/lib/admin/require-admin-page'
import StoryEditor from '../story-editor'
import AdminState from '../../admin-state'

export const dynamic = 'force-dynamic'

export default async function EditStoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage()
  const { id } = await params
  const result = await getAdminChapter(id)
  if (result.state === 'empty') notFound()
  if (result.state === 'error') {
    return <AdminState title="This story didn't open." body="Nothing was changed. Reload in a minute." />
  }
  const videos = await getAdminVideos(result.content.id)
  const story = result.content
  const fingerprint = contentFingerprint({
    title: story.title, summary: story.summary, body_blocks: story.bodyBlocks, event_date: story.eventDate,
    event_date_precision: story.eventDatePrecision, authored_date: story.authoredDate,
    author_display_name: story.authorDisplayName, recipient_display_name: story.recipientDisplayName, visual_scene: story.visualScene,
  })
  return <StoryEditor story={story} videos={videos.videos} fingerprint={fingerprint} />
}
