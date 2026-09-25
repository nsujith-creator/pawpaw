'use client'

// Starting a story: what it's called, and whether it's a story or a letter.
// Everything else happens in the editor, which saves by itself.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { addressFor } from '@/lib/admin/manuscript'
import { storyColour } from '@/lib/family/story-colour'
import { saveChapter } from '../actions'
import styles from '../../admin.module.css'

const KINDS = [
  { value: 'story', label: 'A story', note: 'Words first, with photos where they belong.' },
  { value: 'letter', label: 'A letter', note: 'Written to someone, usually her.' },
  { value: 'gallery', label: 'Mostly photos', note: 'A few words, then the photos.' },
] as const

export default function NewStory() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<typeof KINDS[number]['value']>('story')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) { setError('It needs a title. You can change it later.'); return }
    setBusy(true)
    setError('')
    const slug = addressFor(title, `story-${Date.now().toString(36)}`)
    const form = new FormData()
    form.set('intent', 'save')
    form.set('type', kind)
    form.set('title', title)
    form.set('slug', slug)
    form.set('summary', '')
    form.set('body_blocks', '[]')
    form.set('visual_scene', storyColour(null, slug))
    if (kind === 'letter') form.set('recipient_display_name', 'Varada')
    const result = await saveChapter(form).catch(() => ({ error: "Couldn't reach the server. Check the connection and try again." } as { error: string; id?: string }))
    if (result.id && !result.error) { router.replace(`/admin/content/${result.id}`); return }
    setBusy(false)
    setError(result.error ?? "Couldn't start it. Try again.")
  }

  return (
    <form className={styles.start} onSubmit={start}>
      <label className={styles.startTitle}>
        <span>What&apos;s it called?</span>
        <input value={title} onChange={event => setTitle(event.target.value)} placeholder="Title" autoFocus maxLength={200} aria-invalid={Boolean(error)} />
      </label>
      <fieldset className={styles.kinds}>
        <legend>It&apos;s…</legend>
        {KINDS.map(option => (
          <label key={option.value} className={styles.kind}>
            <input type="radio" name="kind" value={option.value} checked={kind === option.value} onChange={() => setKind(option.value)} />
            <strong>{option.label}</strong>
            <small>{option.note}</small>
          </label>
        ))}
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <button type="submit" className={styles.primary} disabled={busy}>{busy ? 'Starting…' : 'Start writing'}</button>
    </form>
  )
}
