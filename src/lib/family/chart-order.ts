// The order stories hang on her chart: newest at the top. Stories without a date sit by when
// they were added. The chart and the "Next on her chart" link both use this, so they agree.

import type { ChapterIndexItem } from '@/lib/content/chapters'

function sortKey(item: Pick<ChapterIndexItem, 'eventDate' | 'publishedAt'>) {
  return item.eventDate ?? item.publishedAt.slice(0, 10)
}

export function chartOrder<T extends Pick<ChapterIndexItem, 'eventDate' | 'publishedAt' | 'slug'>>(items: T[]): T[] {
  return [...items].sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || a.slug.localeCompare(b.slug))
}

// The story hanging just below this one. The oldest story has none.
export function nextOnChart<T extends Pick<ChapterIndexItem, 'eventDate' | 'publishedAt' | 'slug'>>(items: T[], slug: string): T | null {
  const ordered = chartOrder(items)
  const index = ordered.findIndex(item => item.slug === slug)
  return index >= 0 ? ordered[index + 1] ?? null : null
}
