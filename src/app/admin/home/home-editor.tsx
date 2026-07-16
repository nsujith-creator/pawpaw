'use client'

import { useState } from 'react'
import { saveHomeContent, unpublishHome } from './actions'

interface Props {
  existing: {
    id:          string
    title:       string
    body_blocks: unknown[]
    status:      string
  } | null
}

export default function HomeEditor({ existing }: Props) {
  const [title, setTitle]   = useState(existing?.title ?? '')
  const [blocks, setBlocks] = useState(
    existing?.body_blocks ? JSON.stringify(existing.body_blocks, null, 2) : '[]',
  )
  const [message, setMessage] = useState('')
  const [busy, setBusy]       = useState(false)

  async function submit(action: 'draft' | 'publish') {
    setBusy(true)
    setMessage('')
    const fd = new FormData()
    fd.set('title',       title)
    fd.set('body_blocks', blocks)
    fd.set('action',      action)
    if (existing?.id) fd.set('id', existing.id)
    const result = await saveHomeContent(fd)
    setMessage(result.error ?? (result.ok ? 'Saved.' : ''))
    setBusy(false)
  }

  async function doUnpublish() {
    if (!existing?.id) return
    setBusy(true)
    const result = await unpublishHome(existing.id)
    setMessage(result.error ?? (result.ok ? 'Unpublished.' : ''))
    setBusy(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.625rem 0.75rem',
    border: '1px solid #d1d5db', borderRadius: '0.375rem',
    fontSize: '0.9375rem', fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '0.875rem', marginBottom: '0.375rem', fontWeight: 500 }
  const btnStyle = (primary?: boolean): React.CSSProperties => ({
    padding: '0.625rem 1.25rem', borderRadius: '0.375rem', fontWeight: 600, fontSize: '0.9375rem', cursor: busy ? 'not-allowed' : 'pointer',
    background: primary ? '#1a1a2e' : '#fff',
    color:      primary ? '#fff'     : '#1a1a2e',
    border:     primary ? 'none'     : '1px solid #d1d5db',
    opacity: busy ? 0.6 : 1,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {existing && (
        <p style={{ fontSize: '0.875rem', color: existing.status === 'published' ? '#16a34a' : '#6b7280' }}>
          Status: {existing.status}
        </p>
      )}

      <div>
        <label htmlFor="title" style={labelStyle}>Title</label>
        <input id="title" value={title} onChange={e => setTitle(e.target.value)} style={inputStyle} />
      </div>

      <div>
        <label htmlFor="blocks" style={labelStyle}>
          Content blocks (JSON)
        </label>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>
          Array of blocks. Supported types: heading, paragraph, quote, media.
        </p>
        <textarea
          id="blocks"
          value={blocks}
          onChange={e => setBlocks(e.target.value)}
          rows={10}
          style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => submit('draft')}   disabled={busy} style={btnStyle()}>Save draft</button>
        <button onClick={() => submit('publish')} disabled={busy} style={btnStyle(true)}>Publish</button>
        {existing?.status === 'published' && (
          <button onClick={doUnpublish} disabled={busy} style={btnStyle()}>Unpublish</button>
        )}
      </div>

      {message && <p style={{ fontSize: '0.875rem', color: '#16a34a' }}>{message}</p>}
    </div>
  )
}
