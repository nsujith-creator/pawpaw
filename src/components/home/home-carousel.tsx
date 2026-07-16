'use client'

import { useState, useCallback, useRef } from 'react'
import type { CarouselItem } from '@/lib/content/home'
import CarouselControls from './carousel-controls'

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

  const objectPosition = item.focalX != null && item.focalY != null
    ? `${item.focalX * 100}% ${item.focalY * 100}%`
    : 'center center'

  return (
    <section
      aria-label={`${title} photo gallery`}
      style={{ position: 'relative', width: '100%', aspectRatio: '4/3', overflow: 'hidden', background: '#1a1a2e' }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft')  prev()
        if (e.key === 'ArrowRight') next()
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      tabIndex={0}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={item.id}
        src={item.signedUrl}
        alt={item.altText ?? `Photo ${index + 1} of ${items.length}`}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition,
          display: 'block',
        }}
      />

      {item.caption && (
        <p style={{
          position: 'absolute', bottom: '3rem', left: '1rem', right: '4rem',
          color: '#fff', fontSize: '0.875rem', textShadow: '0 1px 3px rgba(0,0,0,0.7)',
        }}>
          {item.caption}
        </p>
      )}

      <CarouselControls
        total={items.length}
        current={index}
        onPrev={prev}
        onNext={next}
        onGoto={setIndex}
      />
    </section>
  )
}
