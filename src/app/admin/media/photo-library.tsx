'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { uploadPhotos } from '@/lib/admin/upload-photos'
import { photoSrcSet } from '@/lib/media/photo-srcset'
import { deleteMediaForever, updateMediaDetails } from './actions'
import styles from '../admin.module.css'
import editor from '../content/editor.module.css'

export interface LibraryItem {
  id: string
  url: string
  altText: string
  caption: string | null
  usedIn: { id: string; title: string; home: boolean }[]
  deletable: boolean
}

export default function PhotoLibrary({ items }: { items: LibraryItem[] }) {
  const router = useRouter()
  const fileInput = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [done, setDone] = useState('')
  const [busy, setBusy] = useState(false)

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (fileInput.current) fileInput.current.value = ''
    if (!files.length) return
    setDone('')
    setProblems([])
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', guard)
    const outcomes = await uploadPhotos(files, {
      contentId: null, altText: 'Family photograph',
      onProgress: (count, total) => setProgress(count < total ? `Adding photo ${count + 1} of ${total}. Keep this page open.` : ''),
    })
    window.removeEventListener('beforeunload', guard)
    setProgress('')
    const added = outcomes.filter(outcome => outcome.mediaId).length
    setDone(added ? `${added} photo${added === 1 ? '' : 's'} added.` : '')
    setProblems(outcomes.filter(outcome => outcome.error).map(outcome => `${outcome.name}: ${outcome.error}`))
    router.refresh()
  }

  async function act(action: (form: FormData) => Promise<unknown>, values: Record<string, string>, failure: string) {
    setBusy(true)
    const form = new FormData()
    for (const [name, value] of Object.entries(values)) form.set(name, value)
    const result = await action(form).catch(() => ({ error: failure })) as { error?: string }
    setBusy(false)
    setProblems(result?.error ? [result.error] : [])
    if (!result?.error) router.refresh()
  }

  function saveCaption(item: LibraryItem, value: string) {
    const caption = value.trim()
    if (caption === (item.caption ?? '').trim()) return
    const altIsDefault = item.altText === 'Family photograph' || item.altText.startsWith('A photograph from')
    void act(updateMediaDetails, { media_id: item.id, alt_text: caption && altIsDefault ? caption : item.altText, caption }, "The caption didn't save.")
  }

  return (
    <>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => void onFiles(event.target.files)} />
      <div className={styles.actionRow}>
        <button type="button" className={styles.primary} disabled={Boolean(progress)} onClick={() => fileInput.current?.click()}>Add photos</button>
        <p className={styles.quietNote} role="status" aria-live="polite">{progress || done}</p>
      </div>
      {problems.map(problem => <p key={problem} className={styles.error}>{problem}</p>)}
      {items.length === 0 ? (
        <p className={styles.lede}>No photos yet.</p>
      ) : (
        <ul className={editor.trayGrid}>
          {items.map(item => (
            <li key={item.id} className={editor.trayItem}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${item.url}?w=480`} srcSet={photoSrcSet(item.url)} sizes="12rem" alt={item.altText} loading="lazy" decoding="async" />
              <input className={editor.caption} defaultValue={item.caption ?? ''} onBlur={event => saveCaption(item, event.target.value)} placeholder="Add a caption (optional)" aria-label="Caption" maxLength={500} />
              <p className={styles.usedIn}>
                {item.usedIn.length === 0 ? 'Not in a story yet' : <>In {item.usedIn.map((use, index) => (
                  <span key={use.id}>{index > 0 && ', '}<Link href={use.home ? '/admin/home' : `/admin/content/${use.id}`}>{use.title}</Link></span>
                ))}</>}
              </p>
              {item.deletable && (
                <div className={editor.trayTools}>
                  <button type="button" disabled={busy} className={editor.toolQuiet} onClick={() => { if (window.confirm('Delete this photo for good? This can’t be undone.')) void act(deleteMediaForever, { media_id: item.id }, "Couldn't delete it.") }}>Delete</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
