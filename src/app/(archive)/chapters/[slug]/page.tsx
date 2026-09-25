import { notFound } from 'next/navigation'
import { getPublishedChapter, listPublishedChapters } from '@/lib/content/chapters'
import { isReservedSlug, normalizeSlug } from '@/lib/content/manage-content'
import { getPublishedVideos } from '@/lib/video/published-videos'
import { nextOnChart } from '@/lib/family/chart-order'
import StoryPage from '@/components/family/story-page'
import StatePage from '@/components/family/state-page'
import { storyHref } from '@/components/family/story-chart'

export const dynamic = 'force-dynamic'

export default async function StoryRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (normalizeSlug(slug) !== slug || isReservedSlug(slug)) notFound()
  const [result, stories] = await Promise.all([getPublishedChapter(slug), listPublishedChapters()])
  if (result.state === 'empty') notFound()
  if (result.state === 'error') {
    return <StatePage colour="rose" title="This story didn't load." body="Something went wrong on our side. Reload in a minute." action={{ href: '/chapters', label: 'All her stories' }} secondary={{ href: '/', label: 'Home' }} />
  }
  const videos = result.content.activeRevisionId ? await getPublishedVideos(result.content.activeRevisionId) : { videos: [] }
  const next = stories.state === 'ready' ? nextOnChart(stories.items, slug) : null
  return (
    <StoryPage
      content={result.content}
      mediaState={result.mediaState}
      videos={videos.videos}
      next={next ? { href: storyHref(next.slug), title: next.title } : null}
    />
  )
}
