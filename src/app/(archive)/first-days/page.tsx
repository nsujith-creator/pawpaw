import { getPublishedStory, listPublishedChapters } from '@/lib/content/chapters'
import { getPublishedVideos } from '@/lib/video/published-videos'
import { nextOnChart } from '@/lib/family/chart-order'
import StoryPage from '@/components/family/story-page'
import StatePage from '@/components/family/state-page'
import { storyHref } from '@/components/family/story-chart'

export const dynamic = 'force-dynamic'

export default async function FirstDaysRoute() {
  const [result, stories] = await Promise.all([getPublishedStory('first-days'), listPublishedChapters()])
  if (result.state === 'empty' || (result.state === 'ready' && result.content.slug !== 'first-days')) {
    return <StatePage colour="duck" title="First Days isn't up yet." body="The photographs are still being sorted. Her other stories are on the chart." action={{ href: '/chapters', label: 'Her stories' }} secondary={{ href: '/', label: 'Home' }} />
  }
  if (result.state === 'error') {
    return <StatePage colour="rose" title="First Days didn't load." body="Something went wrong on our side. Reload in a minute." action={{ href: '/chapters', label: 'All her stories' }} secondary={{ href: '/', label: 'Home' }} />
  }
  const videos = result.content.activeRevisionId ? await getPublishedVideos(result.content.activeRevisionId) : { videos: [] }
  const next = stories.state === 'ready' ? nextOnChart(stories.items, 'first-days') : null
  return (
    <StoryPage
      content={result.content}
      mediaState={result.mediaState}
      videos={videos.videos}
      next={next ? { href: storyHref(next.slug), title: next.title } : null}
    />
  )
}
