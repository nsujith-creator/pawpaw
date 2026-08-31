import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireActiveAdmin } from '@/lib/auth/admin'
import ChapterEditor from '../chapter-editor'
import styles from '../../admin.module.css'

export default async function NewChapterPage() {
  const supabase = await createClient()
  try {
    await requireActiveAdmin(supabase)
  } catch {
    redirect('/admin/login')
  }

  return (
    <div className={styles.pageNarrow}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>A new page for Varada</p>
          <h1 className={styles.pageTitle}>Begin a memory</h1>
          <p className={styles.lede}>Start small. A title and a few true words are already enough.</p>
        </div>
        <Link href="/admin/content" className={styles.secondaryAction}>Back to content</Link>
      </header>
      <section className={styles.editorSection}>
        <ChapterEditor existing={null} />
      </section>
    </div>
  )
}
