'use client'

// Choose photos already in Photos. Tap to pick several, then add them in the order picked.

import { useEffect, useRef, useState } from 'react'
import { listLibraryPhotos, type LibraryPhoto } from '../media/actions'
import { photoSrcSet } from '@/lib/media/photo-srcset'
import styles from './editor.module.css'

export default function PhotoPicker({ onDone, onCancel }: { onDone: (ids: string[]) => void; onCancel: () => void }) {
  const [photos, setPhotos] = useState<LibraryPhoto[]>([])
  const [more, setMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)

  // Keyboard focus moves into the picker, stays inside it, and returns where it was on close.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    closeButton.current?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog.current) return
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, [tabindex]:not([tabindex="-1"])')]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', trap)
    return () => { document.removeEventListener('keydown', trap); before?.focus() }
  }, [])

  async function load(offset: number) {
    setLoading(true)
    const form = new FormData()
    form.set('offset', String(offset))
    const result = await listLibraryPhotos(form).catch(() => ({ error: "Photos didn't load. Try again." }))
    setLoading(false)
    if ('error' in result) { setError(result.error); return }
    setError('')
    setPhotos(current => [...current, ...result.photos])
    setMore(result.more)
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(0) }, 0)
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    window.addEventListener('keydown', escape)
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', escape) }
  }, [onCancel])

  function toggle(id: string) {
    setPicked(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  }

  return (
    <div className={styles.pickerBackdrop} role="dialog" aria-modal="true" aria-labelledby="picker-title">
      <div className={styles.picker} ref={dialog}>
        <header className={styles.pickerHead}>
          <h2 id="picker-title">Choose from Photos</h2>
          <button type="button" ref={closeButton} className={styles.ghost} onClick={onCancel}>Close</button>
        </header>
        <div className={styles.pickerGrid}>
          {photos.map(photo => {
            const order = picked.indexOf(photo.id)
            return (
              <button key={photo.id} type="button" className={styles.pickerItem} aria-pressed={order >= 0} onClick={() => toggle(photo.id)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${photo.url}?w=480`} srcSet={photoSrcSet(photo.url)} sizes="(min-width: 900px) 12rem, 30vw" alt={photo.altText} loading="lazy" decoding="async" />
                {order >= 0 && <span className={styles.pickerOrder}>{order + 1}</span>}
              </button>
            )
          })}
        </div>
        {loading && <p className={styles.trayNote}>Loading photos…</p>}
        {error && <p className={styles.fieldError}>{error}</p>}
        {!loading && !error && photos.length === 0 && <p className={styles.trayNote}>No photos yet. Add some from the story, or from Photos.</p>}
        {more && !loading && <button type="button" className={styles.ghost} onClick={() => void load(photos.length)}>Show more</button>}
        <footer className={styles.pickerFoot}>
          <button type="button" className={styles.primary} disabled={picked.length === 0} onClick={() => onDone(picked)}>
            {picked.length ? `Add ${picked.length} photo${picked.length === 1 ? '' : 's'}` : 'Pick photos'}
          </button>
        </footer>
      </div>
    </div>
  )
}
