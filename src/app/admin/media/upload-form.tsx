'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authorizeUpload, finalizeUpload } from './actions'
import { createClient } from '@/lib/supabase/client'
import { validateUploadFile } from '@/lib/media/validate-upload'

// Direct-to-Storage upload: the image bytes go from the browser straight to
// the private Supabase bucket using a short-lived signed upload token. Only
// two tiny requests (authorize, finalize) touch the Pawpaw server, so the
// full 8 MB works on Vercel regardless of its request-body cap.

export default function UploadForm({ contentItemId }: { contentItemId: string | null }) {
  const router = useRouter()
  const [error,   setError]   = useState('')
  const [success, setSuccess] = useState('')
  const [busy,    setBusy]    = useState(false)
  const [step,    setStep]    = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const form = e.currentTarget
    const fd   = new FormData(form)

    // Pre-check locally so an oversized or wrong-type file fails instantly.
    // The server re-validates at authorization and again at finalization.
    const file = fd.get('file') as File | null
    const fileProblem = validateUploadFile(file)
    if (fileProblem) {
      setError(fileProblem)
      return
    }

    setBusy(true)
    try {
      // 1. Ask the server for a signed upload authorization (no bytes sent).
      setStep('Preparing…')
      const authFd = new FormData()
      authFd.set('file_type', file!.type)
      authFd.set('file_size', String(file!.size))
      const auth = await authorizeUpload(authFd)
      if ('error' in auth && auth.error) {
        setError(auth.error)
        return
      }
      if (!('ok' in auth) || !auth.path || !auth.token) {
        setError('Could not start the upload. Please try again.')
        return
      }

      // 2. Upload the bytes directly to the private bucket with the token.
      setStep('Uploading…')
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('media')
        .uploadToSignedUrl(auth.path, auth.token, file!, { contentType: file!.type })
      if (uploadError) {
        setError('The upload did not complete. Check your connection and try again.')
        return
      }

      // 3. Ask the server to verify and register the uploaded object.
      setStep('Finishing…')
      const finalFd = new FormData()
      finalFd.set('path', auth.path)
      finalFd.set('alt_text', (fd.get('alt_text') as string | null) ?? '')
      finalFd.set('caption', (fd.get('caption') as string | null) ?? '')
      if (contentItemId) finalFd.set('content_id', contentItemId)
      const result = await finalizeUpload(finalFd)
      if ('error' in result && result.error) {
        // Entered values are preserved: the form is only reset on success.
        setError(result.error)
        return
      }

      // Refresh the server-rendered attachment list so the new photo appears
      // immediately with the alt text and caption just entered — then clear
      // the form for the next upload.
      router.refresh()
      setSuccess('Photo saved and attached to Home. To make it visible to the family, publish the Home page.')
      form.reset()
    } catch {
      setError('Upload failed before it completed. Check your connection and try again.')
    } finally {
      setBusy(false)
      setStep('')
    }
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
        <label htmlFor="alt_text" style={labelStyle}>Alt text for screen readers (required)</label>
        <input
          id="alt_text"
          name="alt_text"
          type="text"
          required
          placeholder="Describe what is in the photo"
          style={inputStyle}
        />
        <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
          Alt text is read aloud by screen readers for accessibility. It is not
          normally displayed on the page or when hovering the photo.
        </p>
      </div>
      <div>
        <label htmlFor="caption" style={labelStyle}>Caption shown with the photo (optional)</label>
        <input
          id="caption"
          name="caption"
          type="text"
          placeholder="A line the family will see under the photo"
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
        {busy ? (step || 'Uploading…') : 'Upload photo'}
      </button>
      {!contentItemId && (
        <p style={{ fontSize: '0.75rem', color: '#6b7280' }}>
          Save Home content first, then upload to attach the photo automatically.
        </p>
      )}
      {error && (
        <p role="alert" style={{ fontSize: '0.875rem', color: '#dc2626' }}>{error}</p>
      )}
      {success && (
        <p role="status" style={{ fontSize: '0.875rem', color: '#16a34a' }}>{success}</p>
      )}
    </form>
  )
}
