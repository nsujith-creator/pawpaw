import { requireAdminPage } from '@/lib/admin/require-admin-page'
import { getFamilyLists } from '@/lib/family/lists'
import { listPublishedChapters } from '@/lib/content/chapters'
import NamesEditor from './names-editor'
import styles from '../admin.module.css'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Names' }

export default async function NamesPage() {
  await requireAdminPage()
  const [lists, stories] = await Promise.all([getFamilyLists(), listPublishedChapters().catch(() => ({ state: 'error' as const }))])
  const storyOptions = stories.state === 'ready'
    ? stories.items.map(item => ({ href: item.slug === 'first-days' ? '/first-days' : `/chapters/${item.slug}`, title: item.title }))
    : []
  return (
    <main className={styles.page}>
      <div className={styles.pageHead}>
        <h1 className={styles.pageTitle}>Her names and her people</h1>
      </div>
      <p className={styles.lede}>What shows on Home. Changes go up when you press Save.</p>
      <NamesEditor names={lists.names} people={lists.people} stories={storyOptions} />
    </main>
  )
}
