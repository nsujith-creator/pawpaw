'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateMediaDetails,
  reorderContentMedia,
  detachContentMedia,
  deleteMediaForever,
  setContentCover,
} from './actions'
import ReplacementPanel, { type ReplacementPhoto } from './replacement-panel'
import styles from '../admin.module.css'

export interface AttachmentItem {
  mediaId: string
  signedUrl: string | null
  altText: string
  caption: string | null
  mimeType: string | null
  byteSize: number | null
  sortOrder: number
  isCover?: boolean
}

export type ReplacementCandidate = ReplacementPhoto

interface Props {
  contentId: string
  items: AttachmentItem[]
  contentLabel?: string
  contentSlug?: string
  replacementCandidates?: ReplacementCandidate[]
  allowCover?: boolean
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function AttachmentList({
  contentId,
  items,
  contentLabel = 'Home',
  replacementCandidates = [],
  allowCover = false,
}: Props) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [replaceId, setReplaceId] = useState<string | null>(null)
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({})
  const [captionDrafts, setCaptionDrafts] = useState<Record<string, string>>({})

  async function run(op: () => Promise<{ ok?: boolean; error?: string }>, successMessage: string) {
    setError('')
    setSuccess('')
    setBusy(true)
    try {
      const result = await op()
      if (result.error) {
        setError(result.error)
      } else {
        router.refresh()
        setSuccess(successMessage)
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setBusy(false)
      setConfirmDeleteId(null)
    }
  }

  function saveDetails(item: AttachmentItem) {
    const data = new FormData()
    data.set('media_id', item.mediaId)
    data.set('alt_text', altDrafts[item.mediaId] ?? item.altText)
    data.set('caption', captionDrafts[item.mediaId] ?? item.caption ?? '')
    void run(() => updateMediaDetails(data), 'Photograph details updated.')
  }

  function move(mediaId: string, direction: 'earlier' | 'later') {
    const data = new FormData()
    data.set('content_id', contentId)
    data.set('media_id', mediaId)
    data.set('direction', direction)
    void run(() => reorderContentMedia(data), 'Photograph order updated.')
  }

  function detach(mediaId: string) {
    const data = new FormData()
    data.set('content_id', contentId)
    data.set('media_id', mediaId)
    void run(() => detachContentMedia(data), 'Photograph detached. The file remains in Media Library.')
  }

  function setCover(mediaId: string) {
    const data = new FormData()
    data.set('content_id', contentId)
    data.set('media_id', mediaId)
    void run(() => setContentCover(data), 'Chapter cover updated.')
  }

  function deleteForever(mediaId: string) {
    const data = new FormData()
    data.set('media_id', mediaId)
    void run(() => deleteMediaForever(data), 'Photograph permanently deleted.')
  }

  if (items.length === 0) return <p className={styles.emptyState}>No photos attached yet.</p>

  const attachedIds = new Set(items.map(item => item.mediaId))

  return (
    <div className={styles.mediaList}>
      {items.map((item, index) => (
        <article key={item.mediaId} className={styles.mediaRow}>
          {item.signedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.signedUrl} alt={item.altText} width={112} height={112} className={styles.mediaThumb} />
          ) : (
            <div className={styles.mediaPlaceholder}>preview unavailable</div>
          )}

          <div className={styles.mediaBody}>
            <p className={styles.meta}>
              Position {index + 1} of {items.length}
              {item.mimeType ? ` · ${item.mimeType}` : ''}
              {item.byteSize ? ` · ${formatSize(item.byteSize)}` : ''}
              {item.isCover ? ' · Chapter cover' : ''}
            </p>

            <div className={styles.fieldGroup}>
              <label htmlFor={`alt-${item.mediaId}`} className={styles.fieldLabel}>Alt text for screen readers (required, not shown on the page)</label>
              <input id={`alt-${item.mediaId}`} aria-label={`Alt text for photo ${index + 1}`} value={altDrafts[item.mediaId] ?? item.altText} onChange={event => setAltDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} />
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={`caption-${item.mediaId}`} className={styles.fieldLabel}>Caption shown with the photo (optional)</label>
              <div className={styles.fieldActionRow}>
                <input id={`caption-${item.mediaId}`} aria-label={`Caption for photo ${index + 1}`} value={captionDrafts[item.mediaId] ?? item.caption ?? ''} onChange={event => setCaptionDrafts(drafts => ({ ...drafts, [item.mediaId]: event.target.value }))} className={styles.field} />
                <button type="button" disabled={busy} onClick={() => saveDetails(item)} className={styles.secondaryAction}>Save details</button>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" disabled={busy || index === 0} onClick={() => move(item.mediaId, 'earlier')} className={styles.secondaryAction}>↑ Move earlier</button>
              <button type="button" disabled={busy || index === items.length - 1} onClick={() => move(item.mediaId, 'later')} className={styles.secondaryAction}>↓ Move later</button>
              {allowCover && !item.isCover && <button type="button" disabled={busy} onClick={() => setCover(item.mediaId)} className={styles.secondaryAction}>Set as cover</button>}
              <button type="button" disabled={busy} onClick={() => detach(item.mediaId)} className={styles.secondaryAction}>Detach</button>
              <button type="button" disabled={busy} onClick={() => { setReplaceId(item.mediaId); setError(''); setSuccess('') }} className={styles.secondaryAction}>Replace photograph…</button>
              {confirmDeleteId === item.mediaId ? (
                <div className={styles.confirmation} role="group" aria-label={`Permanent delete confirmation for photo ${index + 1}`}>
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

            {replaceId === item.mediaId && (
              <ReplacementPanel
                contentId={contentId}
                contentLabel={contentLabel}
                oldPhoto={item}
                candidates={replacementCandidates.filter(candidate => !attachedIds.has(candidate.mediaId))}
                onClose={() => setReplaceId(null)}
                onReplaced={message => {
                  setSuccess(message)
                  setReplaceId(null)
                  router.refresh()
                }}
              />
            )}
          </div>
        </article>
      ))}

      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </div>
  )
}
