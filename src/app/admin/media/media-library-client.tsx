'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { attachMediaToHome, updateMediaDetails, deleteMediaForever } from './actions'
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

interface Props { items: MediaLibraryItem[] }

export default function MediaLibraryClient({ items }: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({})

  async function run(op: () => Promise<{ ok?: boolean; error?: string }>, msg: string) {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const result = await op()
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        setSuccess(msg)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      setConfirmDeleteId(null)
    }
  }

  function saveDetails(item: MediaLibraryItem) {
    const fd = new FormData()
    fd.set('media_id', item.mediaId)
    fd.set('alt_text', altDrafts[item.mediaId] ?? item.altText)
    fd.set('caption', captionDrafts[item.mediaId] ?? item.caption ?? '')
    void run(() => updateMediaDetails(fd), 'Details updated.')
  }

  function attach(mediaId: string) {
    const fd = new FormData()
    fd.set('media_id', mediaId)
    void run(() => attachMediaToHome(fd), 'Photo attached to Home page. Open Home page to reorder or remove it.')
  }

  function deleteForever(mediaId: string) {
    const fd = new FormData()
    fd.set('media_id', mediaId)
    void run(() => deleteMediaForever(fd), 'Photo permanently deleted.')
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
          <label className={styles.fieldLabel}>Alt text for screen readers</label>
          <input value={altDrafts[item.mediaId] ?? item.altText} onChange={event => setAltDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} aria-label="Alt text for this photo" />
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel}>Caption (optional)</label>
          <div className={styles.fieldActionRow}>
            <input value={captionDrafts[item.mediaId] ?? item.caption ?? ''} onChange={event => setCaptionDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} aria-label="Caption for this photo" />
            <button type="button" disabled={busy} onClick={() => saveDetails(item)} className={styles.secondaryAction}>Save details</button>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={() => attach(item.mediaId)} className={styles.secondaryAction}>Attach to Home</button>
          {confirmDeleteId === item.mediaId ? (
            <div className={styles.confirmation} role="group" aria-label="Permanent delete confirmation">
              <span className={styles.confirmationText}>Delete this photo forever? This cannot be undone.</span>
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
          <p className={styles.informationNotice}>These photos are saved in your library but not shown on any page. Use “Attach to Home” to add one to the Home page.</p>
          <div className={styles.mediaList}>{unattached.map(renderItem)}</div>
        </section>
      )}

      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </div>
  )
}
