import { requireAdminPage } from '@/lib/admin/require-admin-page'
import NewStory from './new-story'
import styles from '../../admin.module.css'

export const metadata = { title: 'New story' }

export default async function NewStoryPage() {
  await requireAdminPage()
  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>A new story</h1>
      <NewStory />
    </main>
  )
}
