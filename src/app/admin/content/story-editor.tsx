'use client'

// The story editor. It is laid out like the family's story page: the colour page with the
// title, then the words on white beside the story's colour. Everything saves by itself a
// moment after you stop typing. Words are also kept in this browser until the server has
// them, so a dropped connection or an expired sign-in never loses a sentence.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ChapterContent, ChapterMedia } from '@/lib/content/chapters'
import type { ContentBlock } from '@/lib/content/schema'
import type { FieldErrors } from '@/lib/content/manage-content'
import type { AdminVideo } from '@/lib/video/published-videos'
import { ageAt } from '@/lib/family/age'
import { STORY_COLOURS, STORY_COLOUR_NAMES, storyColour, type StoryColour } from '@/lib/family/story-colour'
import { addressFor, cleanBlocks, passageToBlock } from '@/lib/admin/manuscript'
import { uploadPhotos } from '@/lib/admin/upload-photos'
import { photoSrcSet } from '@/lib/media/photo-srcset'
import { attachMediaToContent, detachContentMedia, reorderContentMedia, setContentCover, updateMediaDetails } from '../media/actions'
import { deleteChapter, saveChapter, unpublishChapter, type ContentActionResult } from './actions'
import AutoText from './auto-text'
import PhotoPicker from './photo-picker'
import StoryVideos from './story-videos'
import styles from './editor.module.css'

interface Props {
  story: ChapterContent
  videos: AdminVideo[]
  fingerprint: string
}

type Item = { key: string; block: ContentBlock }
type SaveState = 'saved' | 'dirty' | 'saving' | 'failed' | 'signed-out' | 'conflict'

interface Draft {
  title: string
  summary: string
  colour: StoryColour
  eventDate: string
  author: string
  recipient: string
  authoredDate: string
  blocks: ContentBlock[]
}

const SAVE_DELAY = 1200
let keyCounter = 0
const newKey = () => `b${++keyCounter}`
const toItems = (blocks: ContentBlock[]): Item[] => blocks.map(block => ({ key: newKey(), block }))

function Thumb({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  if (!url) return <div className={styles.photoMissing}>This photo didn&apos;t load.</div>
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`${url}?w=960`} srcSet={photoSrcSet(url)} sizes="(min-width: 900px) 36rem, 92vw" alt={alt} className={className} loading="lazy" decoding="async" />
}

export default function StoryEditor({ story, videos, fingerprint: loadedFingerprint }: Props) {
  const router = useRouter()
  const storageKey = `pawpaw-draft:${story.id}`
  const addressLocked = story.revisionNumber !== null || story.slug === 'first-days'
  const isLetter = story.type === 'letter'

  const initial: Draft = useMemo(() => ({
    title: story.title,
    summary: story.summary ?? '',
    colour: storyColour(story.visualScene, story.slug),
    eventDate: story.eventDate ?? '',
    author: story.authorDisplayName ?? '',
    recipient: story.recipientDisplayName ?? '',
    authoredDate: story.authoredDate ?? '',
    blocks: story.bodyBlocks,
  }), [story])

  const [title, setTitle] = useState(initial.title)
  const [summary, setSummary] = useState(initial.summary)
  const [colour, setColour] = useState<StoryColour>(initial.colour)
  const [eventDate, setEventDate] = useState(initial.eventDate)
  const [author, setAuthor] = useState(initial.author)
  const [recipient, setRecipient] = useState(initial.recipient)
  const [authoredDate, setAuthoredDate] = useState(initial.authoredDate)
  const [items, setItems] = useState<Item[]>(() => toItems(initial.blocks))
  const [activeKey, setActiveKey] = useState<string | null>(null)

  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [live, setLive] = useState(Boolean(story.activeRevisionId))
  const [changedSinceLive, setChangedSinceLive] = useState(story.publicationState === 'published-draft')
  const [publishing, setPublishing] = useState(false)
  const [restore, setRestore] = useState<Draft | null>(null)
  const [uploading, setUploading] = useState('')
  const [uploadProblems, setUploadProblems] = useState<string[]>([])
  const [pickerFor, setPickerFor] = useState<null | { at: number | 'tray' }>(null)
  const [pendingPhotos, setPendingPhotos] = useState<Set<string>>(new Set())
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [busyMedia, setBusyMedia] = useState(false)

  const fileInput = useRef<HTMLInputElement>(null)
  const uploadTarget = useRef<number | 'tray'>('tray')
  const fields = useRef(new Map<string, HTMLTextAreaElement | null>())
  const focusNext = useRef<{ key: string; at: 'start' | 'end' | number } | null>(null)
  const fingerprint = useRef(loadedFingerprint)
  const inFlight = useRef<Promise<ContentActionResult> | null>(null)
  const timer = useRef<number | null>(null)

  const blocks = useMemo(() => cleanBlocks(items.map(item => item.block)), [items])
  const draft: Draft = { title, summary, colour, eventDate, author, recipient, authoredDate, blocks }
  const snapshot = JSON.stringify(draft)
  const savedSnapshot = useRef(JSON.stringify({ ...initial, blocks: cleanBlocks(initial.blocks) }))
  const latest = useRef({ draft, snapshot })
  useLayoutEffect(() => { latest.current = { draft, snapshot } })

  const mediaById = useMemo(() => new Map(story.media.map(item => [item.id, item])), [story.media])
  const videoById = useMemo(() => new Map(videos.map(item => [item.id, item])), [videos])
  const placedIds = new Set(blocks.flatMap(block => block.type === 'media' ? [block.mediaId] : []))
  const tray = story.media.filter(item => !placedIds.has(item.id))
  const cover = story.media.find(item => item.id === story.coverMediaId) ?? story.media[0] ?? null
  const age = ageAt(eventDate || null, story.eventDatePrecision ?? 'day')

  // Words the server never received, kept from last time in this browser.
  useEffect(() => {
    try {
      const kept = window.localStorage.getItem(storageKey)
      if (!kept) return
      const parsed = JSON.parse(kept) as { at: number; draft: Draft }
      if (JSON.stringify(parsed.draft) !== savedSnapshot.current && parsed.at > new Date(story.updatedAt).getTime()) {
        const timerId = window.setTimeout(() => setRestore(parsed.draft), 0)
        return () => window.clearTimeout(timerId)
      }
      window.localStorage.removeItem(storageKey)
    } catch { /* storage unavailable: nothing to bring back */ }
  }, [storageKey, story.updatedAt])

  const save = useCallback(async (intent: 'save' | 'publish' = 'save'): Promise<boolean> => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null }
    while (inFlight.current) await inFlight.current
    const { draft: current, snapshot: currentSnapshot } = latest.current
    if (intent === 'save' && currentSnapshot === savedSnapshot.current) {
      setSaveState('saved')
      return true
    }
    if (!current.title.trim()) {
      setSaveState('failed')
      setNotice('Give it a title and it saves itself.')
      setFieldErrors({ title: 'It needs a title.' })
      return false
    }

    const form = new FormData()
    form.set('id', story.id)
    form.set('intent', intent)
    form.set('expected_fingerprint', fingerprint.current)
    form.set('type', story.type)
    form.set('title', current.title)
    form.set('slug', addressLocked ? story.slug : addressFor(current.title, story.slug))
    form.set('summary', current.summary)
    form.set('body_blocks', JSON.stringify(current.blocks))
    const eventDateChanged = current.eventDate !== (story.eventDate ?? '')
    form.set('event_date', current.eventDate)
    form.set('event_date_precision', current.eventDate ? (eventDateChanged ? 'day' : story.eventDatePrecision ?? 'day') : '')
    form.set('event_date_is_approximate', !eventDateChanged && story.eventDateIsApproximate ? 'true' : 'false')
    form.set('authored_date', current.authoredDate)
    form.set('authored_date_precision', current.authoredDate ? (current.authoredDate !== (story.authoredDate ?? '') ? 'day' : story.authoredDatePrecision ?? 'day') : '')
    form.set('authored_date_is_approximate', current.authoredDate === (story.authoredDate ?? '') && story.authoredDateIsApproximate ? 'true' : 'false')
    form.set('author_display_name', current.author)
    form.set('recipient_display_name', current.recipient)
    form.set('place_text', story.placeText ?? '')
    form.set('relationship_context', story.relationshipContext ?? '')
    form.set('visual_scene', current.colour)

    setSaveState('saving')
    const request = saveChapter(form).catch((): ContentActionResult => ({ error: "Not saved. Couldn't reach the server; check the connection and retry." }))
    inFlight.current = request
    const result = await request
    inFlight.current = null

    if (result.fingerprint) fingerprint.current = result.fingerprint
    if (result.ok) {
      const changed = currentSnapshot !== savedSnapshot.current
      savedSnapshot.current = currentSnapshot
      setFieldErrors({})
      setNotice('')
      if (intent === 'publish') { setLive(true); setChangedSinceLive(false) }
      else if (changed) setChangedSinceLive(true)
      if (latest.current.snapshot === currentSnapshot) {
        setSaveState('saved')
        try { window.localStorage.removeItem(storageKey) } catch { /* nothing kept */ }
      } else {
        setSaveState('dirty')
      }
      return true
    }
    setFieldErrors(result.fieldErrors ?? {})
    setNotice(result.error ?? "Not saved. Retry in a moment.")
    setSaveState(result.signedOut ? 'signed-out' : result.conflict ? 'conflict' : 'failed')
    return false
  }, [addressLocked, story, storageKey])

  // Save a moment after typing stops, and keep a copy in this browser until then.
  useEffect(() => {
    if (snapshot === savedSnapshot.current) return
    try { window.localStorage.setItem(storageKey, JSON.stringify({ at: Date.now(), draft: latest.current.draft })) } catch { /* private mode */ }
    const stateTimer = window.setTimeout(() => setSaveState(state => state === 'saving' ? state : 'dirty'), 0)
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => { void save() }, SAVE_DELAY)
    return () => window.clearTimeout(stateTimer)
  }, [snapshot, save, storageKey])

  // Leaving with words the server doesn't have yet: save now, and let the browser ask.
  useEffect(() => {
    const unsaved = () => latest.current.snapshot !== savedSnapshot.current
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!unsaved()) return
      void save()
      event.preventDefault()
      event.returnValue = ''
    }
    const hidden = () => { if (document.visibilityState === 'hidden' && unsaved()) void save() }
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); void save() }
    }
    window.addEventListener('beforeunload', beforeUnload)
    document.addEventListener('visibilitychange', hidden)
    window.addEventListener('keydown', shortcut)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      document.removeEventListener('visibilitychange', hidden)
      window.removeEventListener('keydown', shortcut)
    }
  }, [save])

  // Put the caret where the last edit said it should go.
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    const field = fields.current.get(target.key)
    if (!field) return
    focusNext.current = null
    field.focus()
    const position = target.at === 'start' ? 0 : target.at === 'end' ? field.value.length : target.at
    field.setSelectionRange(position, position)
  })

  function bringBack(kept: Draft) {
    setTitle(kept.title); setSummary(kept.summary); setColour(kept.colour); setEventDate(kept.eventDate)
    setAuthor(kept.author); setRecipient(kept.recipient); setAuthoredDate(kept.authoredDate); setItems(toItems(kept.blocks))
    setRestore(null)
  }

  function discardKept() {
    try { window.localStorage.removeItem(storageKey) } catch { /* nothing kept */ }
    setRestore(null)
  }

  // ---------- words ----------
  function replaceItem(key: string, next: ContentBlock[], focus?: { index: number; at: 'start' | 'end' | number }) {
    setItems(current => {
      const index = current.findIndex(item => item.key === key)
      if (index < 0) return current
      const created = next.map((block, offset) => offset === 0 ? { key, block } : { key: newKey(), block })
      if (focus) focusNext.current = { key: created[focus.index].key, at: focus.at }
      return [...current.slice(0, index), ...created, ...current.slice(index + 1)]
    })
  }

  function updateText(item: Item, value: string, caret: number) {
    const block = item.block
    if (block.type === 'media') return
    // A blank line starts a new passage, typed or pasted.
    if (block.type === 'paragraph' && /\n[ \t]*\n/.test(value)) {
      const parts = value.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/)
      const before = value.slice(0, caret).replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/).length - 1
      const next = parts.map((part, index) => {
        const text = index === parts.length - 1 ? part.replace(/^\s+/, '') : part.trim()
        return text.startsWith('## ') || text.startsWith('### ') || text.startsWith('> ') ? passageToBlock(text) : { type: 'paragraph' as const, text }
      })
      replaceItem(item.key, next, { index: Math.min(before, next.length - 1), at: before === 0 ? caret : 'start' })
      return
    }
    // "## " at the start makes a heading, "> " makes something someone said.
    if (block.type === 'paragraph' && value.startsWith('## ')) {
      replaceItem(item.key, [{ type: 'heading', level: 2, text: value.slice(3) }], { index: 0, at: 'end' })
      return
    }
    if (block.type === 'paragraph' && value.startsWith('> ')) {
      replaceItem(item.key, [{ type: 'quote', text: value.slice(2) }], { index: 0, at: 'end' })
      return
    }
    replaceItem(item.key, [{ ...block, text: value }])
  }

  function handleKey(item: Item, index: number, event: React.KeyboardEvent<HTMLTextAreaElement>) {
    const field = event.currentTarget
    const block = item.block
    if (block.type === 'media') return
    if (event.key === 'Enter' && !event.shiftKey && block.type !== 'paragraph') {
      event.preventDefault()
      insertAt(index + 1, { type: 'paragraph', text: '' })
      return
    }
    if (event.key !== 'Backspace' || field.selectionStart !== 0 || field.selectionEnd !== 0) return
    if (block.type !== 'paragraph') {
      event.preventDefault()
      replaceItem(item.key, [{ type: 'paragraph', text: block.text }], { index: 0, at: 'start' })
      return
    }
    const previous = items[index - 1]
    if (!previous || previous.block.type === 'media') {
      if (!block.text && items.length > 1) { event.preventDefault(); removeItem(item.key) }
      return
    }
    event.preventDefault()
    const joinAt = previous.block.text.length
    setItems(current => {
      const at = current.findIndex(entry => entry.key === item.key)
      const before = current[at - 1]
      if (!before || before.block.type === 'media') return current
      focusNext.current = { key: before.key, at: joinAt }
      return [...current.slice(0, at - 1), { key: before.key, block: { ...before.block, text: before.block.text + block.text } }, ...current.slice(at + 1)]
    })
  }

  function insertAt(index: number, block: ContentBlock) {
    const key = newKey()
    focusNext.current = block.type === 'media' ? null : { key, at: 'start' }
    setItems(current => [...current.slice(0, index), { key, block }, ...current.slice(index)])
    setActiveKey(key)
  }

  function removeItem(key: string) {
    setItems(current => {
      const index = current.findIndex(item => item.key === key)
      const previous = current[index - 1]
      if (previous && previous.block.type !== 'media') focusNext.current = { key: previous.key, at: 'end' }
      return current.filter(item => item.key !== key)
    })
  }

  function moveItem(key: string, direction: -1 | 1) {
    setItems(current => {
      const index = current.findIndex(item => item.key === key)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function turnInto(item: Item, type: 'paragraph' | 'quote' | 'heading') {
    if (item.block.type === 'media') return
    const text = item.block.text
    const block: ContentBlock = type === 'heading' ? { type, level: 2, text } : type === 'quote' ? { type, text } : { type, text }
    replaceItem(item.key, [block], { index: 0, at: 'end' })
  }

  // ---------- photos ----------
  async function afterMediaChange() {
    if (live) setChangedSinceLive(true)
    router.refresh()
  }

  function choosePhotos(at: number | 'tray') {
    uploadTarget.current = at
    fileInput.current?.click()
  }

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? [])
    if (fileInput.current) fileInput.current.value = ''
    if (files.length === 0) return
    const at = uploadTarget.current
    setUploadProblems([])
    const outcomes = await uploadPhotos(files, {
      contentId: story.id,
      altText: `A photograph from “${title.trim() || 'her story'}”`,
      onProgress: (done, total) => setUploading(done < total ? `Adding photo ${done + 1} of ${total}…` : ''),
    })
    setUploading('')
    const added = outcomes.flatMap(outcome => outcome.mediaId ? [outcome.mediaId] : [])
    const failed = outcomes.filter(outcome => outcome.error).map(outcome => `${outcome.name}: ${outcome.error}`)
    setUploadProblems(failed)
    if (added.length && at !== 'tray') {
      setPendingPhotos(current => new Set([...current, ...added]))
      setItems(current => [...current.slice(0, at), ...added.map(mediaId => ({ key: newKey(), block: { type: 'media' as const, mediaId } })), ...current.slice(at)])
    }
    if (added.length) await afterMediaChange()
  }

  async function onPicked(mediaIds: string[]) {
    const at = pickerFor?.at ?? 'tray'
    setPickerFor(null)
    if (mediaIds.length === 0) return
    setBusyMedia(true)
    const problems: string[] = []
    const added: string[] = []
    for (const mediaId of mediaIds) {
      if (!mediaById.has(mediaId)) {
        const form = new FormData()
        form.set('media_id', mediaId)
        form.set('content_id', story.id)
        const result = await attachMediaToContent(form).catch(() => ({ error: "Couldn't add it. You may have been signed out." }))
        if ('error' in result && result.error) { problems.push(result.error); continue }
      }
      added.push(mediaId)
    }
    setBusyMedia(false)
    setUploadProblems(problems)
    if (added.length && at !== 'tray') {
      setPendingPhotos(current => new Set([...current, ...added.filter(id => !mediaById.has(id))]))
      setItems(current => [...current.slice(0, at), ...added.map(mediaId => ({ key: newKey(), block: { type: 'media' as const, mediaId } })), ...current.slice(at)])
    }
    if (added.length) await afterMediaChange()
  }

  async function mediaAction(action: (form: FormData) => Promise<unknown>, values: Record<string, string>, failure: string) {
    setBusyMedia(true)
    const form = new FormData()
    for (const [name, value] of Object.entries(values)) form.set(name, value)
    const result = await action(form).catch(() => ({ error: failure })) as { error?: string }
    setBusyMedia(false)
    if (result?.error) { setUploadProblems([result.error]); return false }
    setUploadProblems([])
    await afterMediaChange()
    return true
  }

  function removePhoto(item: ChapterMedia) {
    if (!window.confirm('Take this photo out of the story? It stays in Photos.')) return
    void mediaAction(detachContentMedia, { content_id: story.id, media_id: item.id }, "Couldn't take it out just now.")
  }

  function saveTrayCaption(item: ChapterMedia, value: string) {
    const caption = value.trim()
    if (caption === (item.caption ?? '').trim()) return
    const altIsDefault = item.altText.startsWith('A photograph from') || item.altText === 'Family photograph'
    void mediaAction(updateMediaDetails, { media_id: item.id, alt_text: caption && altIsDefault ? caption : item.altText, caption }, "The caption didn't save. Try again.")
  }

  // ---------- publishing ----------
  async function publish() {
    setPublishing(true)
    const ok = await save('publish')
    setPublishing(false)
    if (ok) router.refresh()
  }

  async function takeDown() {
    if (!window.confirm('Take this story off her page? It stays here as a draft, and you can put it back any time.')) return
    await save()
    const form = new FormData()
    form.set('id', story.id)
    const result = await unpublishChapter(form).catch((): ContentActionResult => ({ error: "Couldn't reach the server. It's still on her page." }))
    if (result.ok) { setLive(false); setChangedSinceLive(false); setNotice(''); router.refresh() }
    else setNotice(result.error ?? "Couldn't take it down.")
  }

  async function remove() {
    const form = new FormData()
    form.set('id', story.id)
    form.set('confirmed_title', deleteTitle)
    const result = await deleteChapter(form).catch((): ContentActionResult => ({ error: "Couldn't reach the server. Nothing was deleted." }))
    if (result.ok) {
      try { window.localStorage.removeItem(storageKey) } catch { /* nothing kept */ }
      savedSnapshot.current = latest.current.snapshot
      router.push('/admin')
    } else setNotice(result.error ?? "Couldn't delete it.")
  }

  async function openPreview() {
    const tab = window.open('about:blank', '_blank')
    await save()
    if (tab) tab.location.href = `/admin/content/${story.id}/preview`
  }

  // ---------- status ----------
  const unsaved = saveState !== 'saved'
  const status = saveState === 'saving' ? 'Saving…'
    : saveState === 'dirty' ? 'Saving soon'
      : saveState === 'saved' ? 'Saved'
        : 'Not saved'
  const where = !live ? 'Not on her page yet' : changedSinceLive ? 'Changes not on her page yet' : 'On her page'
  const publishLabel = publishing ? 'Putting it up…' : !live ? 'Put it on her page' : changedSinceLive ? 'Update her page' : 'On her page'
  const publishDisabled = publishing || (live && !changedSinceLive && !unsaved)

  const toolbarFor = (item: Item, index: number) => activeKey === item.key && (
    <div className={styles.tools} onPointerDown={event => event.preventDefault()}>
      {item.block.type !== 'media' && (
        <div className={styles.kinds} role="group" aria-label="This passage is">
          <button type="button" aria-pressed={item.block.type === 'paragraph'} onClick={() => turnInto(item, 'paragraph')}>Words</button>
          <button type="button" aria-pressed={item.block.type === 'quote'} onClick={() => turnInto(item, 'quote')}>Said</button>
          <button type="button" aria-pressed={item.block.type === 'heading'} onClick={() => turnInto(item, 'heading')}>Heading</button>
        </div>
      )}
      <button type="button" onClick={() => choosePhotos(index + 1)} disabled={Boolean(uploading)}>Photo below</button>
      <button type="button" onClick={() => setPickerFor({ at: index + 1 })}>From Photos</button>
      <button type="button" onClick={() => moveItem(item.key, -1)} disabled={index === 0} aria-label="Move up">↑</button>
      <button type="button" onClick={() => moveItem(item.key, 1)} disabled={index === items.length - 1} aria-label="Move down">↓</button>
      <button type="button" onClick={() => removeItem(item.key)} className={styles.toolQuiet}>
        {item.block.type === 'media' ? 'Out of the words' : 'Remove'}
      </button>
    </div>
  )

  return (
    <div className={styles.editor} data-colour={colour}>
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={event => void onFiles(event.target.files)} />

      <div className={styles.bar}>
        <Link href="/admin" className={styles.back}>← Stories</Link>
        <p className={styles.status} data-state={saveState} role="status" aria-live="polite">
          <span className={styles.statusDot} aria-hidden="true" />
          {status}
          <span className={styles.where}> · {where}</span>
          {(saveState === 'failed' || saveState === 'signed-out') && (
            <button type="button" className={styles.retry} onClick={() => void save()}>Retry</button>
          )}
          {saveState === 'conflict' && (
            <button type="button" className={styles.retry} onClick={() => { savedSnapshot.current = latest.current.snapshot; window.location.reload() }}>Reload</button>
          )}
        </p>
        <div className={styles.barActions}>
          <button type="button" className={styles.ghost} onClick={() => void openPreview()}>Preview</button>
          <button type="button" className={styles.primary} onClick={() => void publish()} disabled={publishDisabled}>{publishLabel}</button>
        </div>
      </div>

      {(notice || saveState === 'signed-out') && (
        <p className={styles.notice} role="alert">
          {notice}
          {saveState === 'signed-out' && <> <a href="/admin/login" target="_blank" rel="noreferrer">Sign in again</a></>}
        </p>
      )}

      {restore && (
        <div className={styles.restore} role="alert">
          <p>This browser kept words that didn&apos;t reach the server last time.</p>
          <div>
            <button type="button" className={styles.primary} onClick={() => bringBack(restore)}>Bring them back</button>
            <button type="button" className={styles.ghost} onClick={discardKept}>Keep the saved version</button>
          </div>
        </div>
      )}

      <div className={styles.opener} data-solo={cover ? undefined : ''}>
        <div className={styles.openerPage}>
          <p className={styles.meta}>
            {[age, isLetter ? (author ? `a letter from ${author}` : 'a letter') : author ? `by ${author}` : null].filter(Boolean).join(' · ') || 'Her story'}
          </p>
          <AutoText
            className={styles.title}
            value={title}
            onChange={event => setTitle(event.target.value.replace(/\n/g, ' '))}
            placeholder="Title"
            aria-label="Title"
            aria-invalid={Boolean(fieldErrors.title || fieldErrors.slug)}
            rows={1}
          />
          {(fieldErrors.title || fieldErrors.slug) && <p className={styles.fieldError}>{fieldErrors.title ?? fieldErrors.slug}</p>}
          <AutoText
            className={styles.summary}
            value={summary}
            onChange={event => setSummary(event.target.value)}
            placeholder="A line under the title (optional)"
            aria-label="A line under the title"
            rows={1}
          />
        </div>
        {cover && (
          <div className={styles.openerPhoto}>
            <Thumb url={cover.signedUrl} alt={cover.altText} />
          </div>
        )}
      </div>

      <div className={styles.details}>
        <fieldset className={styles.swatches}>
          <legend>Page colour</legend>
          {STORY_COLOURS.map(option => (
            <label key={option} className={styles.swatch} data-colour={option}>
              <input type="radio" name="colour" value={option} checked={colour === option} onChange={() => setColour(option)} />
              <span className={styles.swatchChip} aria-hidden="true" />
              <span className={styles.swatchName}>{STORY_COLOUR_NAMES[option]}</span>
            </label>
          ))}
        </fieldset>
        <label className={styles.detail}>
          <span>When did it happen?</span>
          <input type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} aria-invalid={Boolean(fieldErrors.eventDate)} />
          <small>{age ? `She was ${age.replace(/^day /, 'on day ')}.` : 'Her age appears on the chart from this.'}</small>
          {fieldErrors.eventDate && <em className={styles.fieldError}>{fieldErrors.eventDate}</em>}
        </label>
        <label className={styles.detail}>
          <span>{isLetter ? 'From' : 'Written by'}</span>
          <input value={author} onChange={event => setAuthor(event.target.value)} placeholder="acchan" aria-invalid={Boolean(fieldErrors.authorDisplayName)} />
          {fieldErrors.authorDisplayName && <em className={styles.fieldError}>{fieldErrors.authorDisplayName}</em>}
        </label>
        {isLetter && (
          <>
            <label className={styles.detail}>
              <span>To</span>
              <input value={recipient} onChange={event => setRecipient(event.target.value)} placeholder="Varada" aria-invalid={Boolean(fieldErrors.recipientDisplayName)} />
              {fieldErrors.recipientDisplayName && <em className={styles.fieldError}>{fieldErrors.recipientDisplayName}</em>}
            </label>
            <label className={styles.detail}>
              <span>Written on</span>
              <input type="date" value={authoredDate} onChange={event => setAuthoredDate(event.target.value)} aria-invalid={Boolean(fieldErrors.authoredDate)} />
              {fieldErrors.authoredDate && <em className={styles.fieldError}>{fieldErrors.authoredDate}</em>}
            </label>
          </>
        )}
      </div>

      <div className={styles.reading}>
        <div className={styles.column}>
          {items.map((item, index) => {
            const block = item.block
            const common = {
              onFocus: () => setActiveKey(item.key),
            }
            if (block.type === 'media') {
              const photo = mediaById.get(block.mediaId)
              const video = videoById.get(block.mediaId)
              return (
                <figure key={item.key} className={styles.figure} data-active={activeKey === item.key || undefined} onFocus={common.onFocus} onClick={() => setActiveKey(item.key)}>
                  {photo ? <Thumb url={photo.signedUrl} alt={photo.altText} />
                    : video ? <div className={styles.videoStub}>Video · {video.status === 'ready' ? 'ready' : 'still processing'}</div>
                      : <div className={styles.photoMissing}>{pendingPhotos.has(block.mediaId) ? 'Adding the photo…' : 'This photo is no longer in the story.'}</div>}
                  <input
                    className={styles.caption}
                    value={block.caption ?? ''}
                    onChange={event => replaceItem(item.key, [{ ...block, caption: event.target.value }])}
                    placeholder="Add a caption (optional)"
                    aria-label="Caption"
                    maxLength={500}
                  />
                  {toolbarFor(item, index)}
                </figure>
              )
            }
            return (
              <div key={item.key} className={styles.passage} data-kind={block.type} data-active={activeKey === item.key || undefined}>
                <AutoText
                  ref={element => { fields.current.set(item.key, element) }}
                  className={block.type === 'heading' ? styles.heading : block.type === 'quote' ? styles.said : styles.words}
                  value={block.text}
                  lang={/[ഀ-ൿ]/.test(block.text) ? 'ml' : undefined}
                  onChange={event => updateText(item, event.target.value, event.target.selectionStart)}
                  onKeyDown={event => handleKey(item, index, event)}
                  placeholder={block.type === 'heading' ? 'Heading' : block.type === 'quote' ? 'Something someone said' : index === 0 ? 'Start writing. A blank line starts a new paragraph.' : ''}
                  aria-label={block.type === 'heading' ? 'Heading' : block.type === 'quote' ? 'Something someone said' : 'Words'}
                  rows={1}
                  {...common}
                />
                {block.type === 'quote' && (
                  <input
                    className={styles.cite}
                    value={block.attribution ?? ''}
                    onChange={event => replaceItem(item.key, [{ ...block, attribution: event.target.value }])}
                    onFocus={common.onFocus}
                    placeholder="who said it (optional)"
                    aria-label="Who said it"
                    maxLength={200}
                  />
                )}
                {toolbarFor(item, index)}
              </div>
            )
          })}

          <div className={styles.adders} onPointerDown={event => event.preventDefault()}>
            <button type="button" onClick={() => insertAt(items.length, { type: 'paragraph', text: '' })}>+ Words</button>
            <button type="button" onClick={() => insertAt(items.length, { type: 'quote', text: '' })}>+ Said</button>
            <button type="button" onClick={() => insertAt(items.length, { type: 'heading', level: 2, text: '' })}>+ Heading</button>
            <button type="button" onClick={() => choosePhotos(items.length)} disabled={Boolean(uploading)}>+ Photos</button>
          </div>
          {fieldErrors.bodyBlocks && <p className={styles.fieldError}>{fieldErrors.bodyBlocks}</p>}
        </div>
      </div>

      {(uploading || uploadProblems.length > 0) && (
        <div className={styles.uploads} role="status" aria-live="polite">
          {uploading && <p>{uploading}</p>}
          {uploadProblems.map(problem => <p key={problem} className={styles.fieldError}>{problem}</p>)}
        </div>
      )}

      <section className={styles.tray} aria-labelledby="tray-title">
        <h2 id="tray-title">Photos after the words</h2>
        <p className={styles.trayNote}>
          {tray.length ? 'These follow the words on her page, paced big and small. The first photo, or the one marked cover, faces the title.' : 'Photos you add here follow the words on her page.'}
        </p>
        {tray.length > 0 && (
          <ol className={styles.trayGrid}>
            {tray.map((item, index) => (
              <li key={item.id} className={styles.trayItem}>
                <Thumb url={item.signedUrl} alt={item.altText} />
                <input
                  className={styles.caption}
                  defaultValue={item.caption ?? ''}
                  onBlur={event => saveTrayCaption(item, event.target.value)}
                  placeholder="Add a caption (optional)"
                  aria-label="Caption"
                  maxLength={500}
                />
                <div className={styles.trayTools}>
                  <button type="button" disabled={busyMedia} aria-pressed={cover?.id === item.id} onClick={() => void mediaAction(setContentCover, { content_id: story.id, media_id: item.id }, "Couldn't change the cover.")}>
                    {cover?.id === item.id ? 'Cover' : 'Make cover'}
                  </button>
                  <button type="button" disabled={busyMedia} onClick={() => insertAt(items.length, { type: 'media', mediaId: item.id })}>Into the words</button>
                  <button type="button" disabled={busyMedia || index === 0} aria-label="Move earlier" onClick={() => void mediaAction(reorderContentMedia, { content_id: story.id, media_id: item.id, direction: 'earlier' }, "Couldn't move it.")}>↑</button>
                  <button type="button" disabled={busyMedia || index === tray.length - 1} aria-label="Move later" onClick={() => void mediaAction(reorderContentMedia, { content_id: story.id, media_id: item.id, direction: 'later' }, "Couldn't move it.")}>↓</button>
                  <button type="button" disabled={busyMedia} className={styles.toolQuiet} onClick={() => removePhoto(item)}>Take out</button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <div className={styles.trayAdd}>
          <button type="button" className={styles.primary} onClick={() => choosePhotos('tray')} disabled={Boolean(uploading)}>Add photos</button>
          <button type="button" className={styles.ghost} onClick={() => setPickerFor({ at: 'tray' })}>Choose from Photos</button>
        </div>
      </section>

      <StoryVideos contentId={story.id} onChange={afterMediaChange} />

      <section className={styles.endZone} aria-label="Take down or delete">
        {live && <button type="button" className={styles.ghost} onClick={() => void takeDown()}>Take it off her page</button>}
        {!live && story.revisionNumber === null && story.slug !== 'first-days' && (
          deleteOpen ? (
            <div className={styles.confirm}>
              <label>
                <span>Type the title to delete this draft for good. Its photos stay in Photos.</span>
                <input value={deleteTitle} onChange={event => setDeleteTitle(event.target.value)} placeholder={title} />
              </label>
              <div>
                <button type="button" className={styles.danger} disabled={deleteTitle !== title} onClick={() => void remove()}>Delete it</button>
                <button type="button" className={styles.ghost} onClick={() => { setDeleteOpen(false); setDeleteTitle('') }}>Keep it</button>
              </div>
            </div>
          ) : (
            <button type="button" className={styles.quiet} onClick={() => setDeleteOpen(true)}>Delete this draft</button>
          )
        )}
      </section>

      {pickerFor && <PhotoPicker onDone={ids => void onPicked(ids)} onCancel={() => setPickerFor(null)} />}
    </div>
  )
}
