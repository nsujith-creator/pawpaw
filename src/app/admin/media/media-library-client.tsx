'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  attachMediaToHome,
  updateMediaDetails,
  deleteMediaForever,
} from './actions'
import { formatAdminDateTime } from '@/lib/admin/library-view'

export interface MediaLibraryItem {
  mediaId:         string
  signedUrl:       string | null
  altText:         string
  caption:         string | null
  mimeType:        string | null
  sizeLabel:       string
  createdAt:       string
  fileName:        string
  attachmentCount: number
  usageTitles:     string[]
}

interface Props { items: MediaLibraryItem[] }

const ERROR_COLOR   = '#dc2626'
const SUCCESS_COLOR = '#16a34a'

export default function MediaLibraryClient({ items }: Props) {
  const router = useRouter()
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState('')
  const [busy,            setBusy]            = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [altDrafts,       setAltDrafts]       = useState<Record<string, string>>({})
  const [captionDrafts,   setCaptionDrafts]   = useState<Record<string, string>>({})

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
    fd.set('caption',  captionDrafts[item.mediaId] ?? item.caption ?? '')
    void run(() => updateMediaDetails(fd), 'Details updated.')
  }

  function attach(mediaId: string) {
    const fd = new FormData()
    fd.set('media_id', mediaId)
    void run(
      () => attachMediaToHome(fd),
      'Photo attached to Home page. Open Home page to reorder or remove it.',
    )
  }

  function deleteForever(mediaId: string) {
    const fd = new FormData()
    fd.set('media_id', mediaId)
    void run(() => deleteMediaForever(fd), 'Photo permanently deleted.')
  }

  const smallBtn: React.CSSProperties = {
    padding: '0.25rem 0.625rem', borderRadius: '0.25rem', fontSize: '0.75rem',
    background: '#fff', color: '#1a1a2e', border: '1px solid #d1d5db',
    cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1,
  }
  const dangerBtn: React.CSSProperties = {
    ...smallBtn, color: ERROR_COLOR, borderColor: ERROR_COLOR,
  }
  const fieldLabel: React.CSSProperties = {
    fontSize: '0.6875rem', color: '#6b7280', display: 'block', marginBottom: '0.125rem',
  }
  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '0.375rem 0.5rem',
    border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.8125rem',
  }

  const attached   = items.filter(i => i.attachmentCount > 0)
  const unattached = items.filter(i => i.attachmentCount === 0)

  const sectionHeading: React.CSSProperties = {
    fontFamily: 'Georgia, serif', fontSize: '0.9375rem', color: '#1a1a2e',
    margin: '0.5rem 0 0',
  }

  const renderItem = (item: MediaLibraryItem) => (
        <div
          key={item.mediaId}
          style={{
            display: 'flex', gap: '1rem', alignItems: 'flex-start',
            border: '1px solid #e5e7eb', borderRadius: '0.5rem',
            padding: '0.75rem', background: '#fff',
          }}
        >
          {item.signedUrl ? (
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
              {item.mimeType ?? 'Unknown type'}
              {item.sizeLabel ? ` · ${item.sizeLabel}` : ''}
              {' · '}
              <span style={{ color: item.attachmentCount > 0 ? '#166534' : '#9ca3af' }}>
                {item.attachmentCount > 0
                  ? `Attached to ${item.attachmentCount} page${item.attachmentCount > 1 ? 's' : ''}`
                  : 'Not attached'}
              </span>
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', overflowWrap: 'anywhere' }}>
              Added {formatAdminDateTime(item.createdAt)} · File: {item.fileName}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              {item.usageTitles.length > 0
                ? `Used on: ${item.usageTitles.join(', ')}`
                : 'Usage: not attached to any content'}
            </p>

            <div>
              <label style={fieldLabel}>Alt text for screen readers</label>
              <input
                value={altDrafts[item.mediaId] ?? item.altText}
                onChange={e => setAltDrafts(d => ({ ...d, [item.mediaId]: e.target.value }))}
                style={fieldStyle}
                aria-label="Alt text for this photo"
              />
            </div>

            <div>
              <label style={fieldLabel}>Caption (optional)</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  value={captionDrafts[item.mediaId] ?? item.caption ?? ''}
                  onChange={e => setCaptionDrafts(d => ({ ...d, [item.mediaId]: e.target.value }))}
                  style={{ ...fieldStyle, flex: 1 }}
                  aria-label="Caption for this photo"
                />
                <button type="button" disabled={busy} onClick={() => saveDetails(item)} style={smallBtn}>
                  Save details
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button" disabled={busy}
                onClick={() => attach(item.mediaId)}
                style={smallBtn}
              >
                Attach to Home
              </button>
              {confirmDeleteId === item.mediaId ? (
                <span style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: ERROR_COLOR }}>
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
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {attached.length > 0 && (
        <>
          <h2 style={sectionHeading}>Attached to a page ({attached.length})</h2>
          {attached.map(renderItem)}
        </>
      )}

      {unattached.length > 0 && (
        <>
          <h2 style={sectionHeading}>Unattached ({unattached.length})</h2>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
            These photos are saved in your library but not shown on any page.
            Use “Attach to Home” to add one to the Home page.
          </p>
          {unattached.map(renderItem)}
        </>
      )}

      {error   && <p role="alert"  style={{ fontSize: '0.875rem', color: ERROR_COLOR   }}>{error}</p>}
      {success && <p role="status" style={{ fontSize: '0.875rem', color: SUCCESS_COLOR }}>{success}</p>}
    </div>
  )
}
