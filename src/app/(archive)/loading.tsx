import VaradaScene from '@/components/archive/varada-scene'
import styles from './home.module.css'

export default function ArchiveLoading() {
  return (
    <main className={`${styles.home} ${styles.loadingHome}`} aria-busy="true" aria-live="polite">
      <div className={styles.composition}>
        <div className={styles.loadingMedia} aria-hidden="true">
          <div className={styles.loadingGlow} />
          <VaradaScene sceneId="reader" sizes="(max-width: 899px) 10rem, 15rem" className={styles.loadingCharacter} />
        </div>

        <section className={`${styles.prose} ${styles.loadingProse}`}>
          <p className={styles.chapterLabel}>Home</p>
          <h1 className={styles.title}>Opening Varada&apos;s world…</h1>
          <p className={styles.loadingMessage}>
            The door is open. Her photographs are settling into place.
          </p>
          <div className={styles.loadingLines} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </section>
      </div>
    </main>
  )
}
