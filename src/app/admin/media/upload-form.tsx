'use client'

import { useState } from 'react'
import { uploadMedia } from './actions'

export default function UploadForm({ contentItemId }: { contentItemId: string | null }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy]       = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true)
    setMessage('')
    const fd = new FormData(e.currentTarget)
    if (contentItemId) fd.set('content_id', contentItemId)
    const result = await uploadMedia(fd)
    setMessage(result.error ?? (result.ok ? 'Photo uploaded and attached.' : ''))
    setBusy(false)
    if (result.ok) (e.target as HTMLFormElement).reset()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem',
    fontSize: '0.9375rem', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', fontWeight: 500 }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '28rem' }}>
      <div>
        <label htmlFor="file" style={labelStyle}>Photo (JPEG, PNG, or WebP, max 8 MB)</label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          style={inputStyle}
        />
      </div>
      <div>
        <label htmlFor="alt_text" style={labelStyle}>Alt text (required)</label>
        <input
          id="alt_text"
          name="alt_text"
          type="text"
          required
          placeholder="Describe the photo for accessibility"
          style={inputStyle}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        style={{
          padding: '0.625rem 1.25rem', background: '#1a1a2e', color: '#fff',
          border: 'none', borderRadius: '0.375rem', fontWeight: 600,
          fontSize: '0.9375rem', cursor: busy ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? 'Uploading…' : 'Upload photo'}
      </button>
      {!contentItemId && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Save Home content first, then upload to attach the photo automatically.
        </p>
      )}
      {message && (
        <p style={{ fontSize: '0.875rem', color: message.startsWith('Photo') ? '#16a34a' : '#dc2626' }}>
          {message}
        </p>
      )}
    </form>
  )
}
