import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateSignedUrl } from '@/lib/media/private-url'
import { requireAdminPage } from '@/lib/admin/require-admin-page'
import { ageAt } from '@/lib/family/age'
import { storyColour } from '@/lib/family/story-colour'
import { chartOrder } from '@/lib/family/chart-order'
import AdminState from './admin-state'
import styles from './admin.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Stories' }

interface Row {
  id: string
  type: string
  slug: string
  title: string
  updated_at: string
  created_at: string
  event_date: string | null
  event_date_precision: 'day' | 'month' | 'year' | null
  author_display_name: string | null
  visual_scene: string | null
  cover_media_id: string | null
  active_published_revision_id: string | null
  content_media: { sort_order: number; media_assets: { id: string; storage_path: string } | null }[]
}

const KIND: Record<string, string> = { story: 'story', letter: 'letter', gallery: 'photos', moment: 'moment' }

export default async function StoriesPage() {
  await requireAdminPage()
  const db = createAdminClient()
  const { data, error } = await db.from('content_items')
    .select('id, type, slug, title, updated_at, created_at, event_date, event_date_precision, author_display_name, visual_scene, cover_media_id, active_published_revision_id, content_media(sort_order, media_assets(id, storage_path))')
    .neq('type', 'home')
  if (error) return <AdminState title="Her stories didn't load." body="Nothing was changed. Reload in a minute." />
  const rows = (data ?? []) as unknown as Row[]

  const revisionIds = rows.flatMap(row => row.active_published_revision_id ? [row.active_published_revision_id] : [])
  const revisions = revisionIds.length
    ? await db.from('content_revisions').select('id, created_at').in('id', revisionIds)
    : { data: [] as { id: string; created_at: string }[], error: null }
  const publishedAt = new Map((revisions.data ?? []).map(revision => [revision.id, revision.created_at]))

  const stories = await Promise.all(rows.map(async row => {
    const media = [...row.content_media].sort((a, b) => a.sort_order - b.sort_order).flatMap(item => item.media_assets ? [item.media_assets] : [])
    const cover = media.find(item => item.id === row.cover_media_id) ?? media[0] ?? null
    const liveAt = row.active_published_revision_id ? publishedAt.get(row.active_published_revision_id) ?? null : null
    const state = !liveAt ? 'draft' : new Date(row.updated_at) > new Date(liveAt) ? 'changed' : 'live'
    return {
      ...row,
      eventDate: row.event_date,
      publishedAt: liveAt ?? row.created_at,
      coverUrl: cover ? await generateSignedUrl(cover.storage_path) : null,
      photoCount: media.length,
      state,
    }
  }))

  const drafts = stories.filter(story => story.state === 'draft').sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  const onHerPage = chartOrder(stories.filter(story => story.state !== 'draft'))

  const list = (items: typeof stories) => (
    <ul className={styles.stories}>
      {items.map(story => {
        const age = ageAt(story.event_date, story.event_date_precision)
        const meta = [age, KIND[story.type] ?? story.type, story.author_display_name ? `by ${story.author_display_name}` : null,
          story.photoCount ? `${story.photoCount} photo${story.photoCount === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')
        return (
          <li key={story.id}>
            <Link href={`/admin/content/${story.id}`} className={styles.storyRow} data-colour={storyColour(story.visual_scene, story.slug)}>
              <span className={styles.storyThumb} aria-hidden="true">
                {story.coverUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={`${story.coverUrl}?w=480`} alt="" loading="lazy" decoding="async" />
                  : <span>{story.title.slice(0, 1)}</span>}
              </span>
              <span className={styles.storyText}>
                <strong>{story.title}</strong>
                {meta && <small>{meta}</small>}
              </span>
              <span className={styles.storyState} data-state={story.state}>
                {story.state === 'live' ? 'On her page' : story.state === 'changed' ? 'Changes not up yet' : 'Draft'}
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )

  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Her stories</h1>
        <Link href="/admin/content/new" className={styles.primary}>Write a new story</Link>
      </div>
      {stories.length === 0 && <p className={styles.lede}>Nothing written yet. The first story you put up hangs on her chart at her age when it happened.</p>}
      {drafts.length > 0 && (
        <section className={styles.group} aria-labelledby="drafts-title">
          <h2 id="drafts-title" className={styles.groupTitle}>Not on her page yet</h2>
          {list(drafts)}
        </section>
      )}
      {onHerPage.length > 0 && (
        <section className={styles.group} aria-labelledby="live-title">
          <h2 id="live-title" className={styles.groupTitle}>On her page</h2>
          {list(onHerPage)}
        </section>
      )}
    </main>
  )
}
