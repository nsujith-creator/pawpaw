'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { validateUploadFile } from '@/lib/media/validate-upload'
import { authorizeUpload, finalizeReplacementUpload, replaceContentMedia } from './actions'
import styles from '../admin.module.css'

export interface ReplacementPhoto {
  mediaId: string
  signedUrl: string | null
  altText: string
  caption: string | null
}

interface Props {
  contentId: string
  contentLabel: string
  oldPhoto: ReplacementPhoto
  candidates: ReplacementPhoto[]
  onClose: () => void
  onReplaced: (message: string) => void
}

export default function ReplacementPanel({
  contentId,
  contentLabel,
  oldPhoto,
  candidates,
  onClose,
  onReplaced,
}: Props) {
  const [mode, setMode] = useState<'existing' | 'upload'>('existing')
  const [selectedId, setSelectedId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [caption, setCaption] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const selected = candidates.find(item => item.mediaId === selectedId) ?? null
  const filePreview = useMemo(() => file ? URL.createObjectURL(file) : null, [file])

  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview)
  }, [filePreview])

  function resetChoice(nextMode: 'existing' | 'upload') {
    setMode(nextMode)
    setSelectedId('')
    setFile(null)
    setAltText('')
    setCaption('')
    setConfirming(false)
    setError('')
    setSuccess('')
  }

  async function confirmExisting() {
    if (!selected) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      const data = new FormData()
      data.set('content_id', contentId)
      data.set('old_media_id', oldPhoto.mediaId)
      data.set('new_media_id', selected.mediaId)
      const result = await replaceContentMedia(data)
      if (!('ok' in result)) {
        setError(result.error ?? 'The replacement could not be completed. The original photograph remains unchanged.')
        return
      }
      const message = result.message ?? 'Photograph replaced. The previous file remains in Media Library.'
      setSuccess(message)
      onReplaced(message)
    } catch {
      setError('The replacement could not be completed. The original photograph remains unchanged.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmUpload() {
    const problem = validateUploadFile(file)
    if (problem) {
      setError(problem)
      return
    }
    if (!altText.trim()) {
      setError('Alt text is required before the proposed photograph can be saved.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      setStep('Preparing…')
      const authorization = new FormData()
      authorization.set('file_type', file!.type)
      authorization.set('file_size', String(file!.size))
      const auth = await authorizeUpload(authorization)
      if ('error' in auth && auth.error) {
        setError(auth.error)
        return
      }
      if (!('ok' in auth) || !auth.path || !auth.token) {
        setError('Could not start the upload. The original photograph remains unchanged.')
        return
      }

      setStep('Uploading…')
      const supabase = createClient()
      const uploaded = await supabase.storage
        .from('media')
        .uploadToSignedUrl(auth.path, auth.token, file!, { contentType: file!.type })
      if (uploaded.error) {
        setError('The upload did not complete. The original photograph remains unchanged.')
        return
      }

      setStep('Replacing…')
      const data = new FormData()
      data.set('path', auth.path)
      data.set('alt_text', altText)
      data.set('caption', caption)
      data.set('content_id', contentId)
      data.set('old_media_id', oldPhoto.mediaId)
      const result = await finalizeReplacementUpload(data)
      if (!('ok' in result)) {
        setError(result.error ?? 'The replacement could not be completed. The original photograph remains unchanged.')
        return
      }
      const message = result.message ?? 'Photograph replaced. The previous file remains in Media Library.'
      setSuccess(message)
      onReplaced(message)
    } catch {
      setError('The replacement could not be completed. The original photograph remains unchanged.')
    } finally {
      setBusy(false)
      setStep('')
    }
  }

  const proposedUrl = mode === 'existing' ? selected?.signedUrl ?? null : filePreview
  const proposedAlt = mode === 'existing' ? selected?.altText ?? '' : altText || 'Proposed upload preview'
  const ready = mode === 'existing' ? Boolean(selected) : Boolean(file && altText.trim())

  return (
    <div className={styles.replacementPanel} aria-label={`Replace photograph in ${contentLabel}`}>
      <div className={styles.sectionHeader}>
        <div>
          <p className={styles.eyebrow}>Explicit replacement</p>
          <h3 className={styles.subsectionTitle}>Choose a proposed photograph</h3>
        </div>
        <button type="button" disabled={busy} className={styles.textButton} onClick={onClose}>Close</button>
      </div>

      <div className={styles.segmentedActions} role="group" aria-label="Replacement source">
        <button type="button" aria-pressed={mode === 'existing'} className={styles.secondaryAction} onClick={() => resetChoice('existing')}>Choose from Media Library</button>
        <button type="button" aria-pressed={mode === 'upload'} className={styles.secondaryAction} onClick={() => resetChoice('upload')}>Upload new photograph</button>
      </div>

      {mode === 'existing' ? (
        <div className={styles.fieldGroup}>
          <label htmlFor={`replacement-${oldPhoto.mediaId}`} className={styles.fieldLabel}>Eligible unattached photograph</label>
          <select id={`replacement-${oldPhoto.mediaId}`} className={styles.select} value={selectedId} onChange={event => { setSelectedId(event.target.value); setConfirming(false); setError('') }}>
            <option value="">Choose a photograph</option>
            {candidates.map((candidate, index) => (
              <option key={candidate.mediaId} value={candidate.mediaId}>
                {candidate.caption?.trim() || candidate.altText || `Media Library photograph ${index + 1}`}
              </option>
            ))}
          </select>
          {candidates.length === 0 && <p className={styles.emptyState}>No eligible unattached photographs are available. Upload a new one instead.</p>}
        </div>
      ) : (
        <div className={styles.formStack}>
          <div className={styles.fieldGroup}>
            <label htmlFor={`replacement-file-${oldPhoto.mediaId}`} className={styles.fieldLabel}>Photo (JPEG, PNG, or WebP, max 8 MB)</label>
            <input
              id={`replacement-file-${oldPhoto.mediaId}`}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.field}
              onChange={event => { setFile(event.target.files?.[0] ?? null); setConfirming(false); setError('') }}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor={`replacement-alt-${oldPhoto.mediaId}`} className={styles.fieldLabel}>Alt text (required)</label>
            <input id={`replacement-alt-${oldPhoto.mediaId}`} className={styles.field} value={altText} onChange={event => setAltText(event.target.value)} />
          </div>
          <div className={styles.fieldGroup}>
            <label htmlFor={`replacement-caption-${oldPhoto.mediaId}`} className={styles.fieldLabel}>Caption (optional)</label>
            <input id={`replacement-caption-${oldPhoto.mediaId}`} className={styles.field} value={caption} onChange={event => setCaption(event.target.value)} />
          </div>
        </div>
      )}

      {ready && (
        <div className={styles.replacementComparison}>
          <figure>
            <figcaption>Current photograph</figcaption>
            {oldPhoto.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={oldPhoto.signedUrl} alt={oldPhoto.altText} className={styles.replacementThumb} />
            ) : <div className={styles.mediaPlaceholder}>preview unavailable</div>}
          </figure>
          <figure>
            <figcaption>Proposed photograph</figcaption>
            {proposedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proposedUrl} alt={proposedAlt} className={styles.replacementThumb} />
            ) : <div className={styles.mediaPlaceholder}>preview unavailable</div>}
          </figure>
        </div>
      )}

      {ready && !confirming && (
        <button type="button" disabled={busy} className={styles.secondaryAction} onClick={() => setConfirming(true)}>Review replacement…</button>
      )}
      {confirming && (
        <div className={styles.confirmation} role="group" aria-label="Confirm photograph replacement">
          <p className={styles.confirmationText}>Replace this photograph in this chapter?</p>
          <p>The new photograph keeps this exact position. The previous file remains in Media Library and stays attached anywhere else it is used.</p>
          <div className={styles.confirmationActions}>
            <button type="button" disabled={busy} className={styles.action} onClick={() => void (mode === 'existing' ? confirmExisting() : confirmUpload())}>
              {busy ? step || 'Replacing…' : 'Confirm replacement'}
            </button>
            <button type="button" disabled={busy} className={styles.secondaryAction} onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}
    </div>
  )
}
