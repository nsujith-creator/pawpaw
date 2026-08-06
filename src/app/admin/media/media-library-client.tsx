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

interface Props {
  items: MediaLibraryItem[]
  targets: MediaTarget[]
}

export default function MediaLibraryClient({ items, targets }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({})
  const [targetDrafts, setTargetDrafts] = useState<Record<string, string>>({})

  async function run(op: () => Promise<{ ok?: boolean; error?: string }>, message: string) {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const result = await op()
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        setSuccess(message)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      setConfirmDeleteId(null)
    }
  }

  function saveDetails(item: MediaLibraryItem) {
    const data = new FormData()
    data.set('media_id', item.mediaId)
    data.set('alt_text', altDrafts[item.mediaId] ?? item.altText)
    data.set('caption', captionDrafts[item.mediaId] ?? item.caption ?? '')
    void run(() => updateMediaDetails(data), 'Photograph details updated.')
  }

  function attach(mediaId: string) {
    const contentId = targetDrafts[mediaId] ?? targets[0]?.id ?? ''
    if (!contentId) {
      setError('Save an eligible content item before attaching this photograph.')
      return
    }
    const data = new FormData()
    data.set('media_id', mediaId)
    data.set('content_id', contentId)
    const target = targets.find(item => item.id === contentId)
    void run(() => attachMediaToContent(data), `Photograph attached to ${target?.label ?? 'the selected content'}.`)
  }

  function deleteForever(mediaId: string) {
    const data = new FormData()
    data.set('media_id', mediaId)
    void run(() => deleteMediaForever(data), 'Photograph permanently deleted.')
  }

  const attached = items.filter(item => item.attachmentCount > 0)
  const unattached = items.filter(item => item.attachmentCount === 0)

  const renderItem = (item: MediaLibraryItem) => (
    <article key={item.mediaId} className={styles.mediaRow}>
      {item.signedUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.signedUrl} alt={item.altText} width={112} height={112} className={styles.mediaThumb} />
      ) : (
        <div className={styles.mediaPlaceholder}>preview unavailable</div>
      )}

      <div className={styles.mediaBody}>
        <p className={styles.meta}>
          {item.mimeType ?? 'Unknown type'}{item.sizeLabel ? ` · ${item.sizeLabel}` : ''}{' · '}
          <span className={item.attachmentCount > 0 ? styles.attachedState : styles.unattachedState}>
            {item.attachmentCount > 0 ? `Attached to ${item.attachmentCount} page${item.attachmentCount > 1 ? 's' : ''}` : 'Not attached'}
          </span>
        </p>
        <p className={styles.filename}>Added {formatAdminDateTime(item.createdAt)} · File: {item.fileName}</p>
        <p className={styles.usageText}>{item.usageTitles.length > 0 ? `Used on: ${item.usageTitles.join(', ')}` : 'Usage: not attached to any content'}</p>

        <div className={styles.fieldGroup}>
          <label htmlFor={`library-alt-${item.mediaId}`} className={styles.fieldLabel}>Alt text for screen readers</label>
          <input id={`library-alt-${item.mediaId}`} value={altDrafts[item.mediaId] ?? item.altText} onChange={event => setAltDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} />
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={`library-caption-${item.mediaId}`} className={styles.fieldLabel}>Caption (optional)</label>
          <div className={styles.fieldActionRow}>
            <input id={`library-caption-${item.mediaId}`} value={captionDrafts[item.mediaId] ?? item.caption ?? ''} onChange={event => setCaptionDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} />
            <button type="button" disabled={busy} onClick={() => saveDetails(item)} className={styles.secondaryAction}>Save details</button>
          </div>
        </div>

        <div className={styles.mediaTargetControl}>
          <label htmlFor={`target-${item.mediaId}`} className={styles.fieldLabel}>Attach to content</label>
          <div className={styles.fieldActionRow}>
            <select
              id={`target-${item.mediaId}`}
              className={styles.select}
              value={targetDrafts[item.mediaId] ?? targets[0]?.id ?? ''}
              onChange={event => setTargetDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))}
              disabled={busy || targets.length === 0}
            >
              {targets.length === 0 ? (
                <option value="">No eligible content</option>
              ) : targets.map(target => (
                <option key={target.id} value={target.id}>{target.label} · {target.type}</option>
              ))}
            </select>
            <button type="button" disabled={busy || targets.length === 0} onClick={() => attach(item.mediaId)} className={styles.secondaryAction}>Attach photograph</button>
          </div>
        </div>

        <div className={styles.actions}>
          {confirmDeleteId === item.mediaId ? (
            <div className={styles.confirmation} role="group" aria-label="Permanent delete confirmation">
              <span className={styles.confirmationText}>Delete this photograph forever from every use? This cannot be undone.</span>
              <div className={styles.confirmationActions}>
                <button type="button" disabled={busy} onClick={() => deleteForever(item.mediaId)} className={styles.dangerAction}>Yes, delete forever</button>
                <button type="button" disabled={busy} onClick={() => setConfirmDeleteId(null)} className={styles.secondaryAction}>Cancel</button>
              </div>
            </div>
          ) : (
            <button type="button" disabled={busy} onClick={() => { setError(''); setSuccess(''); setConfirmDeleteId(item.mediaId) }} className={styles.dangerAction}>Delete permanently…</button>
          )}
        </div>
      </div>
    </article>
  )

  return (
    <div className={styles.mediaList}>
      {attached.length > 0 && (
        <section aria-labelledby="attached-media-title">
          <div className={styles.sectionHeader}>
            <h2 id="attached-media-title" className={styles.sectionTitle}>Attached to a page ({attached.length})</h2>
          </div>
          <div className={styles.mediaList}>{attached.map(renderItem)}</div>
        </section>
      )}

      {unattached.length > 0 && (
        <section aria-labelledby="unattached-media-title">
          <div className={styles.sectionHeader}>
            <h2 id="unattached-media-title" className={styles.sectionTitle}>Unattached ({unattached.length})</h2>
          </div>
          <p className={styles.informationNotice}>These photographs are saved in the private library but not shown on any page. Choose an owned Home or chapter target to attach one.</p>
          <div className={styles.mediaList}>{unattached.map(renderItem)}</div>
        </section>
      )}

      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </div>
  )
}
