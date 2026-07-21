'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authorizeUpload, finalizeUpload } from './actions'
import { createClient } from '@/lib/supabase/client'
import { validateUploadFile } from '@/lib/media/validate-upload'
import styles from '../admin.module.css'

// Direct-to-Storage upload: image bytes go from the browser straight to the
// private bucket with a short-lived token. The 8 MB limit is rechecked by the server.
export default function UploadForm({ contentItemId }: { contentItemId: string | null }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const form = event.currentTarget
    const fd = new FormData(form)
    const file = fd.get('file') as File | null
    const fileProblem = validateUploadFile(file)
    if (fileProblem) {
      setError(fileProblem)
      return
    }

    setBusy(true)
    try {
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

      setStep('Uploading…')
      const supabase = createClient()
      const { error: uploadError } = await supabase.storage
        .from('media')
        .uploadToSignedUrl(auth.path, auth.token, file!, { contentType: file!.type })
      if (uploadError) {
        setError('The upload did not complete. Check your connection and try again.')
        return
      }

      setStep('Finishing…')
      const finalFd = new FormData()
      finalFd.set('path', auth.path)
      finalFd.set('alt_text', (fd.get('alt_text') as string | null) ?? '')
      finalFd.set('caption', (fd.get('caption') as string | null) ?? '')
      if (contentItemId) finalFd.set('content_id', contentItemId)
      const result = await finalizeUpload(finalFd)
      if ('error' in result && result.error) {
        setError(result.error)
        return
      }

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

  return (
    <form onSubmit={handleSubmit} className={styles.formStack}>
      <div className={styles.fieldGroup}>
        <label htmlFor="file" className={styles.fieldLabel}>Photo (JPEG, PNG, or WebP, max 8 MB)</label>
        <input id="file" name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={styles.field} />
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="alt_text" className={styles.fieldLabel}>Alt text for screen readers (required)</label>
        <input id="alt_text" name="alt_text" type="text" required placeholder="Describe what is in the photo" className={styles.field} />
        <p className={styles.help}>Alt text is read aloud by screen readers for accessibility. It is not normally displayed on the page or when hovering the photo.</p>
      </div>
      <div className={styles.fieldGroup}>
        <label htmlFor="caption" className={styles.fieldLabel}>Caption shown with the photo (optional)</label>
        <input id="caption" name="caption" type="text" placeholder="A line the family will see under the photo" className={styles.field} />
      </div>
      <button type="submit" disabled={busy} className={styles.action}>{busy ? (step || 'Uploading…') : 'Upload photo'}</button>
      {!contentItemId && <p className={styles.informationNotice}>Save Home content first, then upload to attach the photo automatically.</p>}
      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </form>
  )
}
