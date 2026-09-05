'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { attachMediaToContent, updateMediaDetails, deleteMediaForever } from './actions'
import { formatAdminDateTime } from '@/lib/admin/library-view'
import styles from '../admin.module.css'

export interface MediaLibraryItem {
  mediaId: string
  signedUrl: string | null
  altText: string
  caption: string | null
  mimeType: string | null
  sizeLabel: string
  createdAt: string
  fileName: string
  attachmentCount: number
  usageTitles: string[]
}

export interface MediaTarget {
  id: string
  label: string
  type: string
}

export default function MediaLibraryClient({ items, targets }: { items: MediaLibraryItem[]; targets: MediaTarget[] }) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(items[0]?.mediaId ?? '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const selected = items.find(item => item.mediaId === selectedId) ?? items[0]
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({})
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({})

  async function run(op: () => Promise<{ ok?: boolean; error?: string }>, message: string) {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const result = await op()
      if (result.error) setError(result.error)
      else {
        setSuccess(message)
        router.refresh()
      }
    } catch {
      setError('That did not work this time. Nothing else was changed—please try once more.')
    } finally {
      setBusy(false)
      setConfirmDelete(false)
    }
  }

  if (!selected) return null

  function saveDetails() {
    const data = new FormData()
    data.set('media_id', selected.mediaId)
    data.set('alt_text', altDrafts[selected.mediaId] ?? selected.altText)
    data.set('caption', captionDrafts[selected.mediaId] ?? selected.caption ?? '')
    void run(() => updateMediaDetails(data), 'Description and caption saved.')
  }

  function attach() {
    const contentId = targetDrafts[selected.mediaId] ?? ''
    if (!contentId) {
      setError('Begin and save a memory before adding this photograph to it.')
      return
    }
    const data = new FormData()
    data.set('media_id', selected.mediaId)
    data.set('content_id', contentId)
    const target = targets.find(item => item.id === contentId)
    void run(() => attachMediaToContent(data), `Added to ${target?.label ?? 'the selected memory'}.`)
  }

  function removeForever() {
    const data = new FormData()
    data.set('media_id', selected.mediaId)
    void run(() => deleteMediaForever(data), 'Photograph permanently deleted.')
  }

  return (
    <div className={styles.photoShelf}>
      <div className={styles.photoGrid} role="listbox" aria-label="Photographs">
        {items.map(item => (
          <button
            key={item.mediaId}
            type="button"
            role="option"
            className={styles.photoTile}
            aria-selected={item.mediaId === selected.mediaId}
            onClick={() => { setSelectedId(item.mediaId); setError(''); setSuccess(''); setConfirmDelete(false) }}
          >
            {item.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.signedUrl} alt="" loading="lazy" decoding="async" />
            ) : <span className={styles.mediaPlaceholder}>Preview resting</span>}
            <span>{item.caption?.trim() || item.altText?.trim() || 'Untitled photograph'}</span>
            <small>{item.attachmentCount > 0 ? `In ${item.attachmentCount} memory${item.attachmentCount === 1 ? '' : 's'}` : 'Not used yet'}</small>
          </button>
        ))}
      </div>

      <aside className={styles.photoInspector} aria-label="Selected photograph">
        <div className={styles.photoInspectorImage}>
          {selected.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selected.signedUrl} alt={selected.altText} />
          ) : <div className={styles.mediaPlaceholder}>Preview unavailable</div>}
        </div>
        <p className={styles.meta}>Added {formatAdminDateTime(selected.createdAt)} · {selected.sizeLabel || selected.mimeType || 'photograph'}</p>
        {selected.usageTitles.length > 0 && <p className={styles.usageText}>Appears in {selected.usageTitles.join(', ')}</p>}

        <div className={styles.fieldGroup}>
          <label htmlFor="selected-photo-alt" className={styles.fieldLabel}>What is happening in this photograph?</label>
          <textarea id="selected-photo-alt" rows={3} value={altDrafts[selected.mediaId] ?? selected.altText} onChange={event => setAltDrafts(drafts => ({ ...drafts, [selected.mediaId]: event.target.value }))} className={styles.textareaCompact} />
          <p className={styles.help}>A short, natural description helps anyone who cannot see the image clearly.</p>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor="selected-photo-caption" className={styles.fieldLabel}>Caption <span className={styles.optional}>(optional)</span></label>
          <input id="selected-photo-caption" value={captionDrafts[selected.mediaId] ?? selected.caption ?? ''} onChange={event => setCaptionDrafts(drafts => ({ ...drafts, [selected.mediaId]: event.target.value }))} className={styles.field} />
        </div>
        <button type="button" disabled={busy} onClick={saveDetails} className={styles.secondaryAction}>Save words</button>

        <div className={styles.attachComposer}>
          <label htmlFor="selected-photo-target" className={styles.fieldLabel}>Add this photograph to</label>
          <select id="selected-photo-target" className={styles.select} value={targetDrafts[selected.mediaId] ?? ''} onChange={event => setTargetDrafts(drafts => ({ ...drafts, [selected.mediaId]: event.target.value }))} disabled={busy || targets.length === 0}>
            <option value="">{targets.length === 0 ? 'No saved memories yet' : 'Choose a memory…'}</option>
            {targets.map(target => <option key={target.id} value={target.id}>{target.label}</option>)}
          </select>
          <button type="button" disabled={busy || targets.length === 0 || !targetDrafts[selected.mediaId]} onClick={attach} className={styles.action}>Add to memory</button>
        </div>

        <div className={styles.photoFeedback} aria-live="polite">
          {busy && <p role="status" className={styles.informationNotice}>Taking care of that…</p>}
          {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
          {success && <p role="status" className={styles.successNotice}>{success}</p>}
        </div>

        <details className={styles.dangerDetails} open={confirmDelete}>
          <summary onClick={event => { event.preventDefault(); setConfirmDelete(value => !value) }}>Remove this photograph forever</summary>
          <p>This removes the original from every memory. It cannot be undone.</p>
          <div className={styles.confirmationActions}>
            <button type="button" disabled={busy} onClick={removeForever} className={styles.dangerAction}>Yes, delete forever</button>
            <button type="button" disabled={busy} onClick={() => setConfirmDelete(false)} className={styles.secondaryAction}>Keep it</button>
          </div>
        </details>
      </aside>
    </div>
  )
}
