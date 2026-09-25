import styles from '@/components/family/family.module.css'

export default function Loading() {
  return <main className={styles.loading} aria-busy="true"><p role="status">Opening…</p></main>
}
