'use client'

import { useState } from 'react'
import { saveHomeContent, unpublishHome } from './actions'
import { plainTextToBlocks, blocksToPlainText, countNonParagraphBlocks } from '@/lib/content/plain-text'
import styles from '../admin.module.css'

interface Props {
  existing: {
    id: string
    title: string
    body_blocks: unknown[]
    status: string
  } | null
}

export default function HomeEditor({ existing }: Props) {
  const initialBlocks = existing?.body_blocks ?? []
  const [title, setTitle] = useState(existing?.title ?? '')
  const [text, setText] = useState(blocksToPlainText(initialBlocks))
  const [json, setJson] = useState(JSON.stringify(initialBlocks, null, 2))
  const [mode, setMode] = useState<'text' | 'json'>(countNonParagraphBlocks(initialBlocks) > 0 ? 'json' : 'text')
  const [pendingSwitch, setPendingSwitch] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function submit(action: 'draft' | 'publish') {
    clearMessages()
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('title', title)
      fd.set('mode', mode)
      fd.set('action', action)
      if (mode === 'text') fd.set('body_text', text)
      else fd.set('body_blocks', json)
      if (existing?.id) fd.set('id', existing.id)

      const result = await saveHomeContent(fd)
      if ('error' in result && result.error) setError(result.error)
      else setSuccess(action === 'publish' ? 'Published. The family page is live.' : 'Draft saved.')
    } catch {
      setError('Something went wrong while saving. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function doUnpublish() {
    if (!existing?.id) return
    clearMessages()
    setBusy(true)
    try {
      const result = await unpublishHome()
      if ('error' in result && result.error) setError(result.error)
      else setSuccess('Unpublished. The family page now shows the waiting message.')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function switchToJson() {
    clearMessages()
    let advancedInJson = 0
    try {
      const parsed = JSON.parse(json)
      advancedInJson = Array.isArray(parsed) ? countNonParagraphBlocks(parsed) : 0
    } catch { advancedInJson = 0 }
    if (advancedInJson === 0) setJson(JSON.stringify(plainTextToBlocks(text), null, 2))
    setPendingSwitch(false)
    setMode('json')
  }

  function switchToText(confirmed = false) {
    clearMessages()
    let blocks: unknown[]
    try {
      const parsed = JSON.parse(json)
      blocks = Array.isArray(parsed) ? parsed : []
    } catch {
      setError('Cannot switch: the advanced JSON is not valid. Fix it first, or reload the page.')
      return
    }
    const advanced = countNonParagraphBlocks(blocks)
    if (advanced > 0 && !confirmed) {
      setPendingSwitch(true)
      return
    }
    setText(blocksToPlainText(blocks))
    setPendingSwitch(false)
    setMode('text')
  }

  return (
    <div className={styles.editorStack}>
      {existing && (
        <p className={`${styles.statusLine} ${existing.status === 'published' ? styles.statusPublished : styles.statusDraft}`}>
          Status: {existing.status}
        </p>
      )}

      <div className={styles.fieldGroup}>
        <label htmlFor="title" className={styles.fieldLabel}>Title</label>
        <input id="title" value={title} onChange={event => setTitle(event.target.value)} className={styles.field} />
      </div>

      {mode === 'text' ? (
        <div className={styles.fieldGroup}>
          <label htmlFor="body_text" className={styles.fieldLabel}>Your words</label>
          <p className={styles.help}>Write normally. Leave a blank line between paragraphs. You can save with an empty body.</p>
          <textarea id="body_text" value={text} onChange={event => setText(event.target.value)} rows={10} className={styles.textarea} />
          <button type="button" onClick={switchToJson} className={styles.textButton}>Advanced: edit blocks as JSON</button>
        </div>
      ) : (
        <div className={styles.fieldGroup}>
          <label htmlFor="body_blocks" className={styles.fieldLabel}>Advanced content blocks (JSON)</label>
          <p className={styles.help}>This content includes advanced blocks (heading, quote, or media), so it is shown as JSON to keep them safe. Supported types: heading, paragraph, quote, media.</p>
          <textarea id="body_blocks" value={json} onChange={event => setJson(event.target.value)} rows={10} className={`${styles.textarea} ${styles.codeTextarea}`} />
          {pendingSwitch ? (
            <div className={styles.warningNotice}>
              <p>This content has heading, quote, or media blocks. The simple editor keeps only paragraph text — the other blocks will be removed when you next save.</p>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => switchToText(true)} className={styles.textButton}>Continue with plain text</button>
                <button type="button" onClick={() => setPendingSwitch(false)} className={styles.textButton}>Keep the JSON editor</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => switchToText()} className={styles.textButton}>Use the simple text editor</button>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button onClick={() => submit('draft')} disabled={busy} className={styles.secondaryAction}>Save draft</button>
        <button onClick={() => submit('publish')} disabled={busy} className={styles.action}>Publish</button>
        {existing?.status === 'published' && (
          <button onClick={doUnpublish} disabled={busy} className={styles.secondaryAction}>Unpublish</button>
        )}
      </div>

      {busy && <p role="status" className={styles.informationNotice}>Saving your changes…</p>}
      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </div>
  )
}
