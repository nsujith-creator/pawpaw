'use client'

import Link from 'next/link'
import VaradaScene from '@/components/archive/varada-scene'
import styles from './journey-state.module.css'

interface Props {
  eyebrow?: string
  title: string
  message: string
  scene?: 'reader' | 'explorer' | 'base-wave' | 'gardener' | 'artist'
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  onRetry?: () => void
  loading?: boolean
}

export default function JourneyState({
  eyebrow = 'Pawpaw',
  title,
  message,
  scene = 'reader',
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  onRetry,
  loading = false,
}: Props) {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-live={loading ? 'polite' : undefined}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1>{title}</h1>
          <p className={styles.message}>{message}</p>
          {loading && (
            <div className={styles.dots} aria-label="Loading">
              <span /><span /><span />
            </div>
          )}
          <div className={styles.actions}>
            {onRetry && <button type="button" onClick={onRetry} className={styles.primary}>Try again</button>}
            {primaryHref && primaryLabel && <Link href={primaryHref} className={styles.primary}>{primaryLabel}</Link>}
            {secondaryHref && secondaryLabel && <Link href={secondaryHref} className={styles.secondary}>{secondaryLabel}</Link>}
          </div>
        </div>
        <div className={styles.sceneWrap}>
          <VaradaScene sceneId={scene} sizes="(max-width: 560px) 9rem, 16rem" className={styles.scene} />
          {!loading && <p className={styles.aside}>We kept your place warm.</p>}
        </div>
      </section>
    </main>
  )
}
