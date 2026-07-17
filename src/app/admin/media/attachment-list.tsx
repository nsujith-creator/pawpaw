'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  updateMediaDetails,
  reorderHomeMedia,
  detachHomeMedia,
  deleteMediaForever,
} from './actions'

export interface AttachmentItem {
  mediaId:   string
  signedUrl: string | null
  altText:   string
  caption:   string | null
  mimeType:  string | null
  byteSize:  number | null
  sortOrder: number
}

interface Props {
  contentId: string
  items:     AttachmentItem[]
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

const REFRESH_HINT = 'Refresh the family page to see the change.'

export default function AttachmentList({ contentId, items }: Props) {
  const router = useRouter()
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [busy,    setBusy]    = useState(false)
  // Which photo has a pending permanent-delete confirmation open.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  // Local edits only; anything not edited falls back to the fresh server
  // value, so refreshed data (new uploads, saved edits) shows immediately.
  const [altDrafts,     setAltDrafts]     = useState<Record<string, string>>({})
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
        // Pull fresh server-rendered data so stale cards disappear and new
        // values display immediately — only then announce success.
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
    const fd = new FormData()
    fd.set('media_id', item.mediaId)
    fd.set('alt_text', altDrafts[item.mediaId] ?? item.altText)
    fd.set('caption',  captionDrafts[item.mediaId] ?? item.caption ?? '')
    void run(() => updateMediaDetails(fd), `Details updated. ${REFRESH_HINT}`)
  }

  function move(mediaId: string, direction: 'earlier' | 'later') {
    const fd = new FormData()
    fd.set('content_id', contentId)
    fd.set('media_id', mediaId)
    fd.set('direction', direction)
    void run(() => reorderHomeMedia(fd), `Order updated. ${REFRESH_HINT}`)
  }

  function detach(mediaId: string) {
    const fd = new FormData()
    fd.set('content_id', contentId)
    fd.set('media_id', mediaId)
    void run(
      () => detachHomeMedia(fd),
      `Photo moved to Media Library (the file is not deleted). ${REFRESH_HINT}`,
    )
  }

  function deleteForever(mediaId: string) {
    const fd = new FormData()
    fd.set('media_id', mediaId)
    void run(() => deleteMediaForever(fd), `Photo permanently deleted. ${REFRESH_HINT}`)
  }

  const smallBtn: React.CSSProperties = {
    padding: '0.25rem 0.625rem', borderRadius: '0.25rem', fontSize: '0.75rem',
    background: '#fff', color: '#1a1a2e', border: '1px solid #d1d5db',
    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
  }
  const dangerBtn: React.CSSProperties = {
    ...smallBtn, color: '#dc2626', borderColor: '#dc2626',
  }
  const fieldStyle: React.CSSProperties = {
    flex: 1, minWidth: '10rem', padding: '0.375rem 0.5rem',
    border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8125rem',
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: '0.6875rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem',
  }

  if (items.length === 0) {
    return <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>No photos attached yet.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {items.map((item, index) => (
        <div
          key={item.mediaId}
          style={{
            display: 'flex', gap: '1rem', alignItems: 'flex-start',
            border: '1px solid #e5e7eb', borderRadius: '0.5rem', padding: '0.75rem',
          }}
        >
          {item.signedUrl ? (
            // Thumbnail served through a short-lived private signed URL.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.signedUrl}
              alt={item.altText}
              width={96}
              style={{ width: '6rem', height: '6rem', objectFit: 'cover', borderRadius: '0.375rem', flexShrink: 0 }}
            />
          ) : (
            <div style={{
              width: '6rem', height: '6rem', borderRadius: '0.375rem', flexShrink: 0,
              background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.6875rem', color: '#6b7280', textAlign: 'center',
            }}>
              preview unavailable
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 0 }}>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Position {index + 1} of {items.length}
              {item.mimeType ? ` · ${item.mimeType}` : ''}
              {item.byteSize ? ` · ${formatSize(item.byteSize)}` : ''}
            </p>

            <div>
              <label htmlFor={`alt-${item.mediaId}`} style={fieldLabel}>
                Alt text for screen readers (required, not shown on the page)
              </label>
              <input
                id={`alt-${item.mediaId}`}
                aria-label={`Alt text for photo ${index + 1}`}
                value={altDrafts[item.mediaId] ?? item.altText}
                onChange={e => setAltDrafts(d => ({ ...d, [item.mediaId]: e.target.value }))}
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor={`caption-${item.mediaId}`} style={fieldLabel}>
                Caption shown with the photo (optional)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                  id={`caption-${item.mediaId}`}
                  aria-label={`Caption for photo ${index + 1}`}
                  value={captionDrafts[item.mediaId] ?? item.caption ?? ''}
                  onChange={e => setCaptionDrafts(d => ({ ...d, [item.mediaId]: e.target.value }))}
                  style={fieldStyle}
                />
                <button type="button" disabled={busy} onClick={() => saveDetails(item)} style={smallBtn}>
                  Save details
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button" disabled={busy || index === 0}
                onClick={() => move(item.mediaId, 'earlier')}
                style={{ ...smallBtn, opacity: busy || index === 0 ? 0.5 : 1 }}
              >
                ↑ Move earlier
              </button>
              <button
                type="button" disabled={busy || index === items.length - 1}
                onClick={() => move(item.mediaId, 'later')}
                style={{ ...smallBtn, opacity: busy || index === items.length - 1 ? 0.5 : 1 }}
              >
                ↓ Move later
              </button>
              <button type="button" disabled={busy} onClick={() => detach(item.mediaId)} style={smallBtn}>
                Move to Media Library
              </button>
              {confirmDeleteId === item.mediaId ? (
                <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', color: '#dc2626' }}>
                    Delete this photo forever? This cannot be undone.
                  </span>
                  <button type="button" disabled={busy} onClick={() => deleteForever(item.mediaId)} style={dangerBtn}>
                    Yes, delete forever
                  </button>
                  <button type="button" disabled={busy} onClick={() => setConfirmDeleteId(null)} style={smallBtn}>
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button" disabled={busy}
                  onClick={() => { setError(''); setSuccess(''); setConfirmDeleteId(item.mediaId) }}
                  style={dangerBtn}
                >
                  Delete permanently…
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {error && (
        <p role="alert" style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
      )}
      {success && (
        <p role="status" style={{ fontSize: '0.875rem', color: '#16a34a' }}>{success}</p>
      )}
    </div>
  )
}
