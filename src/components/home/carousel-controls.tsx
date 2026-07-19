'use client'

import styles from './home-carousel.module.css'

interface Props {
  total:   number
  current: number
  onPrev:  () => void
  onNext:  () => void
  onGoto:  (i: number) => void
}

export default function CarouselControls({ total, current, onPrev, onNext, onGoto }: Props) {
  if (total <= 1) return null

  return (
    <div className={styles.controls}>
      <button
        type="button"
        aria-label="Previous photo"
        onClick={onPrev}
        className={styles.arrow}
      >
        <span aria-hidden="true">‹</span>
      </button>

      <div className={styles.positionGroup}>
        <div role="tablist" aria-label="Photo position" className={styles.positions}>
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Photo ${i + 1}`}
              onClick={() => onGoto(i)}
              className={styles.dot}
            />
          ))}
        </div>
        <span className={styles.count} aria-live="polite" aria-atomic="true">
          {current + 1} of {total}
        </span>
      </div>

      <button
        type="button"
        aria-label="Next photo"
        onClick={onNext}
        className={styles.arrow}
      >
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}
