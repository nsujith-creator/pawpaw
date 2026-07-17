'use client'

import { useState, useCallback, useRef } from 'react'
import type { CarouselItem } from '@/lib/content/home'
import CarouselControls from './carousel-controls'
import styles from './home-carousel.module.css'

interface Props {
  items: CarouselItem[]
  title: string
}

export default function HomeCarousel({ items, title }: Props) {
  const [index, setIndex] = useState(0)

  const prev = useCallback(() => setIndex(i => (i - 1 + items.length) % items.length), [items.length])
  const next = useCallback(() => setIndex(i => (i + 1) % items.length), [items.length])

  // Touch swipe: horizontal drag beyond the threshold moves the carousel.
  const touchStartX = useRef<number | null>(null)
  const SWIPE_THRESHOLD_PX = 40

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const endX  = e.changedTouches[0]?.clientX ?? touchStartX.current
    const delta = endX - touchStartX.current
    touchStartX.current = null
    if (delta > SWIPE_THRESHOLD_PX)  prev()
    if (delta < -SWIPE_THRESHOLD_PX) next()
  }, [prev, next])

  const item = items[index]
  if (!item) return null

  return (
    <section
      aria-label={`${title} photo gallery`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft')  prev()
        if (e.key === 'ArrowRight') next()
      }}
      tabIndex={0}
    >
      <div
        className={styles.frame}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Blurred copy of the photo fills the letterboxed space.
            Decorative only — hidden from assistive technology. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={`bg-${item.id}`}
          src={item.signedUrl}
          alt=""
          aria-hidden="true"
          className={styles.blurredBg}
        />

        {/* Semi-transparent gradient overlay on top of the blurred background. */}
        <div className={styles.overlay} />

        {/* The alt attribute carries the accessibility text; the visible
            caption is rendered separately below the frame. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={item.id}
          src={item.signedUrl}
          alt={item.altText ?? `Photo ${index + 1} of ${items.length}`}
          className={styles.image}
        />

        <CarouselControls
          total={items.length}
          current={index}
          onPrev={prev}
          onNext={next}
          onGoto={setIndex}
        />
      </div>

      {item.caption && (
        <p className={styles.caption}>{item.caption}</p>
      )}
    </section>
  )
}
