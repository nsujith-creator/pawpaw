'use client'

import { useState, useCallback, useRef } from 'react'
import type { CarouselItem } from '@/lib/content/home'
import { createAmbientTheme } from '@/lib/media/ambient-color'
import AmbientFrame from './ambient-frame'
import CarouselControls from './carousel-controls'
import styles from './home-carousel.module.css'

interface Props {
  items: CarouselItem[]
  title: string
}

type MediaStyle = React.CSSProperties & {
  '--media-aspect': string
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

  const ambientTheme = createAmbientTheme(item.extractedPalette)
  const mediaStyle: MediaStyle = {
    '--media-aspect': `${item.width ?? 4} / ${item.height ?? 3}`,
  }

  return (
    <AmbientFrame theme={ambientTheme}>
      <section
        className={styles.carousel}
        aria-label={`${title} photo gallery`}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') {
            event.preventDefault()
            prev()
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault()
            next()
          }
        }}
        tabIndex={0}
      >
        <div
          className={styles.frame}
          style={mediaStyle}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={item.id}
            src={item.signedUrl}
            alt={item.altText ?? `Photo ${index + 1} of ${items.length}`}
            data-media-id={item.id}
            className={styles.image}
          />
        </div>

        <CarouselControls
          total={items.length}
          current={index}
          onPrev={prev}
          onNext={next}
          onGoto={setIndex}
        />

        {item.caption && (
          <p className={styles.caption}>{item.caption}</p>
        )}
      </section>
    </AmbientFrame>
  )
}
