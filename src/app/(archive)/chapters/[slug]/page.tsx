import { notFound } from 'next/navigation'
import { getPublishedChapter } from '@/lib/content/chapters'
import { isReservedSlug, normalizeSlug } from '@/lib/content/manage-content'
import ChapterRenderer from '@/components/content/chapter-renderer'

export const dynamic = 'force-dynamic'

export default async function ChapterDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (normalizeSlug(slug) !== slug || isReservedSlug(slug)) notFound()
  const result = await getPublishedChapter(slug)
  if (result.state === 'empty') notFound()
  if (result.state === 'error') {
    return (
      <main>
        <p role="alert">This chapter could not be loaded safely. Please try again.</p>
      </main>
    )
  }
  return <ChapterRenderer content={result.content} mediaState={result.mediaState} />
}
