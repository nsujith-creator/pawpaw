import Link from 'next/link'
import styles from './admin.module.css'

// When an admin page can't load: say what happened, and that nothing was lost.
export default function AdminState({ title, body }: { title: string; body: string }) {
  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.lede}>{body}</p>
      <p><Link href="/admin" className={styles.ghost}>Back to her stories</Link></p>
    </main>
  )
}
