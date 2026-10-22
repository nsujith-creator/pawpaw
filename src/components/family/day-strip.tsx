'use client'

// One day's photos in a row (it scrolls sideways on a phone). Tapping one opens it large,
// with Previous and Next (or a swipe) for the rest of that day. Escape or Close puts it back.

import { useEffect, useRef, useState } from 'react'
import FamilyVideo from './family-video'
import styles from './family.module.css'

export interface StripPhoto { id: string; url: string; width: number | null; height: number | null; playToken: string | null; kind: 'photo' | 'video' }

export default function DayStrip({ photos, label }: { photos: StripPhoto[]; label: string }) {
  const [open, setOpen] = useState<number | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const touchX = useRef<number | null>(null)

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (open !== null && !element.open) element.showModal()
    if (open === null && element.open) element.close()
  }, [open])

  const current = open === null ? null : photos[open]
  const move = (step: number) => setOpen(index => index === null ? null : (index + step + photos.length) % photos.length)

  return (
    <>
      <ul className={styles.dayStrip} aria-label={`Photos from ${label}`}>
        {photos.map((photo, index) => (
          <li key={photo.id}>
            <button type="button" onClick={() => setOpen(index)} aria-label={`${photo.kind === 'video' ? 'Video' : 'Photo'} ${index + 1} of ${photos.length}, ${label}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${photo.url}?w=480`} srcSet={`${photo.url}?w=480 480w, ${photo.url}?w=960 960w`} sizes="(min-width: 900px) 14rem, 45vw"
                alt="" width={photo.width ?? undefined} height={photo.height ?? undefined} loading="lazy" decoding="async" />
              {photo.kind === 'video' && <span className={styles.stripPlay} aria-hidden="true" />}
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={dialog} className={styles.viewer} onClose={() => setOpen(null)} onKeyDown={event => {
        if (event.key === 'ArrowRight') move(1)
        if (event.key === 'ArrowLeft') move(-1)
      }} aria-label={label}>
        {current && (
          <>
            <div className={styles.viewerStage}
              onTouchStart={event => { touchX.current = event.touches[0]?.clientX ?? null }}
              onTouchEnd={event => {
                const start = touchX.current
                touchX.current = null
                const end = event.changedTouches[0]?.clientX
                if (start === null || end === undefined || photos.length < 2) return
                if (end - start < -50) move(1)
                if (end - start > 50) move(-1)
              }}>
              {current.kind === 'video' ? (
                current.playToken
                  ? <FamilyVideo key={current.id} playToken={current.playToken} caption={null} />
                  : <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${current.url}?w=1600`} alt={`A video from ${label}`} />
                      <p className={styles.viewerNote}>This video is still being prepared. It plays here soon.</p>
                    </>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${current.url}?w=1600`} srcSet={`${current.url}?w=960 960w, ${current.url}?w=1600 1600w`} sizes="100vw" alt={`A photo from ${label}`} />
              )}
            </div>
            <div className={styles.viewerBar}>
              <span>{label}{photos.length > 1 ? ` · ${(open ?? 0) + 1} of ${photos.length}` : ''}</span>
              <div>
                {photos.length > 1 && <button type="button" onClick={() => move(-1)}>Previous</button>}
                {photos.length > 1 && <button type="button" onClick={() => move(1)}>Next</button>}
                <button type="button" onClick={() => setOpen(null)} autoFocus>Close</button>
              </div>
            </div>
          </>
        )}
      </dialog>
    </>
  )
}
