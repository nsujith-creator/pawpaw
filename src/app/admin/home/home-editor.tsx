'use client'

import { useState } from 'react'
import { saveHomeContent, unpublishHome } from './actions'
import { plainTextToBlocks, blocksToPlainText, countNonParagraphBlocks } from '@/lib/content/plain-text'

interface Props {
  existing: {
    id:          string
    title:       string
    body_blocks: unknown[]
    status:      string
  } | null
}

export default function HomeEditor({ existing }: Props) {
  const initialBlocks = existing?.body_blocks ?? []

  const [title, setTitle] = useState(existing?.title ?? '')
  const [text,  setText]  = useState(blocksToPlainText(initialBlocks))
  const [json,  setJson]  = useState(JSON.stringify(initialBlocks, null, 2))
  // Content with heading/quote/media blocks opens in the advanced editor so
  // those blocks are never silently flattened to plain text.
  const [mode, setMode] = useState<'text' | 'json'>(
    countNonParagraphBlocks(initialBlocks) > 0 ? 'json' : 'text',
  )
  const [pendingSwitch, setPendingSwitch] = useState(false)
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [busy,    setBusy]    = useState(false)

  function clearMessages() {
    setError('')
    setSuccess('')
  }

  async function submit(action: 'draft' | 'publish') {
    clearMessages()
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set('title',  title)
      fd.set('mode',   mode)
      fd.set('action', action)
      if (mode === 'text') fd.set('body_text', text)
      else                 fd.set('body_blocks', json)
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

  // Switching to the advanced editor is always safe: if the JSON already holds
  // advanced blocks they are restored untouched; otherwise the JSON is rebuilt
  // from the current plain text.
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

  // Switching to plain text can drop advanced blocks, so it requires an
  // explicit second confirmation when any exist.
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
  const linkBtnStyle: React.CSSProperties = {
    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    fontSize: '0.8125rem', color: '#4b5563', textDecoration: 'underline',
  }

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

      {mode === 'text' ? (
        <div>
          <label htmlFor="body_text" style={labelStyle}>Your words</label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>
            Write normally. Leave a blank line between paragraphs. You can save with an empty body.
          </p>
          <textarea
            id="body_text"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={10}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
          />
          <button type="button" onClick={switchToJson} style={{ ...linkBtnStyle, marginTop: '0.5rem' }}>
            Advanced: edit blocks as JSON
          </button>
        </div>
      ) : (
        <div>
          <label htmlFor="body_blocks" style={labelStyle}>Advanced content blocks (JSON)</label>
          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.375rem' }}>
            This content includes advanced blocks (heading, quote, or media), so it is shown as JSON
            to keep them safe. Supported types: heading, paragraph, quote, media.
          </p>
          <textarea
            id="body_blocks"
            value={json}
            onChange={e => setJson(e.target.value)}
            rows={10}
            style={{ ...inputStyle, fontFamily: 'monospace', resize: 'vertical' }}
          />
          {pendingSwitch ? (
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', border: '1px solid #f59e0b', borderRadius: '0.375rem', background: '#fffbeb' }}>
              <p style={{ fontSize: '0.8125rem', marginBottom: '0.5rem' }}>
                This content has heading, quote, or media blocks. The simple editor keeps only
                paragraph text — the other blocks will be removed when you next save.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="button" onClick={() => switchToText(true)} style={linkBtnStyle}>
                  Continue with plain text
                </button>
                <button type="button" onClick={() => setPendingSwitch(false)} style={linkBtnStyle}>
                  Keep the JSON editor
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => switchToText()} style={{ ...linkBtnStyle, marginTop: '0.5rem' }}>
              Use the simple text editor
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button onClick={() => submit('draft')}   disabled={busy} style={btnStyle()}>Save draft</button>
        <button onClick={() => submit('publish')} disabled={busy} style={btnStyle(true)}>Publish</button>
        {existing?.status === 'published' && (
          <button onClick={doUnpublish} disabled={busy} style={btnStyle()}>Unpublish</button>
        )}
      </div>

      {error && (
        <p role="alert" style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
      )}
      {success && (
        <p role="status" style={{ fontSize: '0.875rem', color: '#16a34a' }}>{success}</p>
      )}
    </div>
  )
}
