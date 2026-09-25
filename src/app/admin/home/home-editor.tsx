'use client'

// Home: the note from acchan and the photos around her name.
// The note goes up when Update Home is pressed. Photo changes show on Home straight away,
// because Home has no separate draft for its photos.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { uploadPhotos } from '@/lib/admin/upload-photos'
import { photoSrcSet } from '@/lib/media/photo-srcset'
import { attachMediaToHome, detachContentMedia, reorderContentMedia, updateMediaDetails } from '../media/actions'
import { saveHomeContent } from './actions'
import AutoText from '../content/auto-text'
import PhotoPicker from '../content/photo-picker'
import styles from '../admin.module.css'
import editor from '../content/editor.module.css'

export interface HomePhoto { id: string; url: string; altText: string; caption: string | null }

interface Props { id: string | null; title: string; note: string; live: boolean; photos: HomePhoto[] }

const KEEP = 'pawpaw-draft:home'

export default function HomeEditor({ id, title, note: savedNote, live, photos }: Props) {
  const router = useRouter()
  const [note, setNote] = useState(savedNote)
  const [saved, setSaved] = useState(savedNote)
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [picker, setPicker] = useState(false)
  const [kept, setKept] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const changed = note !== saved

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(KEEP)
      if (value !== null && value !== savedNote) {
        const timer = window.setTimeout(() => setKept(value), 0)
        return () => window.clearTimeout(timer)
      }
      window.localStorage.removeItem(KEEP)
    } catch { /* storage unavailable */ }
  }, [savedNote])

  useEffect(() => {
    try { if (changed) window.localStorage.setItem(KEEP, note) } catch { /* private mode */ }
    const beforeUnload = (event: BeforeUnloadEvent) => { if (changed) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [changed, note])

  async function update() {
    setState('saving')
    setMessage('')
    const form = new FormData()
    form.set('title', title)
    form.set('mode', 'text')
    form.set('action', 'publish')
    form.set('body_text', note)
    if (id) form.set('id', id)
    const result = await saveHomeContent(form).catch(() => ({ error: "Not updated. Couldn't reach the server; check the connection and try again." }))
    if ('error' in result && result.error) { setState('failed'); setMessage(result.error); return }
    setSaved(note)
    setState('done')
    try { window.localStorage.removeItem(KEEP) } catch { /* nothing kept */ }
    router.refresh()
  }

  async function photoAction(action: (form: FormData) => Promise<unknown>, values: Record<string, string>, failure: string) {
    setBusy(true)
    const form = new FormData()
    for (const [name, value] of Object.entries(values)) form.set(name, value)
    const result = await action(form).catch(() => ({ error: failure })) as { error?: string }
    setBusy(false)
    setProblems(result?.error ? [result.error] : [])
    if (!result?.error) router.refresh()
  }

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (fileInput.current) fileInput.current.value = ''
    if (!files.length || !id) return
    const outcomes = await uploadPhotos(files, {
      contentId: id, altText: 'Varada',
      onProgress: (done, total) => setUploading(done < total ? `Adding photo ${done + 1} of ${total}…` : ''),
    })
    setUploading('')
    setProblems(outcomes.filter(outcome => outcome.error).map(outcome => `${outcome.name}: ${outcome.error}`))
    router.refresh()
  }

  async function onPicked(ids: string[]) {
    setPicker(false)
    const failed: string[] = []
    setBusy(true)
    for (const mediaId of ids) {
      if (photos.some(photo => photo.id === mediaId)) continue
      const form = new FormData()
      form.set('media_id', mediaId)
      const result = await attachMediaToHome(form).catch(() => ({ error: "Couldn't add it." }))
      if ('error' in result && result.error) failed.push(result.error)
    }
    setBusy(false)
    setProblems(failed)
    router.refresh()
  }

  function saveCaption(photo: HomePhoto, value: string) {
    const caption = value.trim()
    if (caption === (photo.caption ?? '').trim()) return
    void photoAction(updateMediaDetails, { media_id: photo.id, alt_text: photo.altText, caption }, "The caption didn't save.")
  }

  return (
    <div className={styles.homeEditor}>
      {kept !== null && (
        <div className={editor.restore} role="alert">
          <p>This browser kept a note that wasn&apos;t put up last time.</p>
          <div>
            <button type="button" className={styles.primary} onClick={() => { setNote(kept); setKept(null) }}>Bring it back</button>
            <button type="button" className={styles.ghost} onClick={() => { try { window.localStorage.removeItem(KEEP) } catch { /* */ } setKept(null) }}>Keep what&apos;s up</button>
          </div>
        </div>
      )}

      <section className={styles.block} aria-labelledby="note-title">
        <h2 id="note-title" className={styles.groupTitle}>A note from acchan</h2>
        <div className={styles.noteColumn}>
          <AutoText
            className={styles.note}
            value={note}
            onChange={event => setNote(event.target.value)}
            placeholder="Write the note for her Home page. A blank line starts a new paragraph."
            aria-label="The note on Home"
            rows={4}
          />
        </div>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primary} disabled={!changed || state === 'saving'} onClick={() => void update()}>
            {state === 'saving' ? 'Updating…' : 'Update Home'}
          </button>
          <p className={styles.quietNote} role="status">
            {state === 'failed' ? message : changed ? 'Changes not on Home yet.' : state === 'done' ? 'Home is updated.' : live ? 'This is what Home shows.' : 'Home is not up yet.'}
          </p>
        </div>
      </section>

      <section className={styles.block} aria-labelledby="home-photos-title">
        <h2 id="home-photos-title" className={styles.groupTitle}>Photos</h2>
        <p className={styles.quietNote}>The first faces her name. The rest sit under the note. Changes here show on Home straight away.</p>
        {photos.length > 0 && (
          <ol className={editor.trayGrid}>
            {photos.map((photo, index) => (
              <li key={photo.id} className={editor.trayItem}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${photo.url}?w=480`} srcSet={photoSrcSet(photo.url)} sizes="12rem" alt={photo.altText} loading="lazy" decoding="async" />
                {index === 0 && <p className={styles.firstTag}>Faces her name</p>}
                <input className={editor.caption} defaultValue={photo.caption ?? ''} onBlur={event => saveCaption(photo, event.target.value)} placeholder="Add a caption (optional)" aria-label="Caption" maxLength={500} />
                <div className={editor.trayTools}>
                  <button type="button" disabled={busy || index === 0} aria-label="Move earlier" onClick={() => void photoAction(reorderContentMedia, { content_id: id ?? '', media_id: photo.id, direction: 'earlier' }, "Couldn't move it.")}>↑</button>
                  <button type="button" disabled={busy || index === photos.length - 1} aria-label="Move later" onClick={() => void photoAction(reorderContentMedia, { content_id: id ?? '', media_id: photo.id, direction: 'later' }, "Couldn't move it.")}>↓</button>
                  <button type="button" disabled={busy} className={editor.toolQuiet} onClick={() => { if (window.confirm('Take this photo off Home? It stays in Photos.')) void photoAction(detachContentMedia, { content_id: id ?? '', media_id: photo.id }, "Couldn't take it off.") }}>Take off Home</button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => void onFiles(event.target.files)} />
        {id ? (
          <div className={styles.actionRow}>
            <button type="button" className={styles.primary} disabled={Boolean(uploading)} onClick={() => fileInput.current?.click()}>Add photos</button>
            <button type="button" className={styles.ghost} onClick={() => setPicker(true)}>Choose from Photos</button>
          </div>
        ) : <p className={styles.quietNote}>Update Home once, then add its photos.</p>}
        {uploading && <p className={styles.quietNote} role="status">{uploading}</p>}
        {problems.map(problem => <p key={problem} className={styles.error}>{problem}</p>)}
      </section>

      {picker && <PhotoPicker onDone={ids => void onPicked(ids)} onCancel={() => setPicker(false)} />}
    </div>
  )
}
