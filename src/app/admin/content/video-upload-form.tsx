'use client'

import { useCallback, useEffect, useState } from 'react'
import * as tus from 'tus-js-client'
import { deleteAttachedVideo, listAttachedVideos, refreshVideoStatus, startVideoUpload, type AttachedVideo } from './video-actions'
import { VIDEO_ACCEPT } from '@/lib/video/cloudflare'
import styles from '../admin.module.css'

export default function VideoUploadForm({ contentId }: { contentId: string }) {
  const [message, setMessage] = useState('')
  const [messageIsError, setMessageIsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [videos, setVideos] = useState<AttachedVideo[]>([])

  const loadVideos = useCallback(async () => {
    const form = new FormData()
    form.set('content_id', contentId)
    const result = await listAttachedVideos(form)
    if ('videos' in result && result.videos) setVideos(result.videos)
    else {
      setMessageIsError(true)
      setMessage(result.error ?? 'Attached videos could not be loaded.')
    }
  }, [contentId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadVideos() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadVideos])

  async function refresh(videoId: string) {
    setBusy(true)
    const form = new FormData()
    form.set('content_id', contentId)
    form.set('video_id', videoId)
    const result = await refreshVideoStatus(form)
    setBusy(false)
    if ('error' in result || result.status === 'errored') {
      setMessageIsError(true)
      setMessage('error' in result ? result.error ?? 'Video processing failed. Check the status again or remove the private video.' : 'Video processing failed. Check the status again or remove the private video.')
    } else {
      setMessageIsError(false)
      setMessage(result.status === 'ready' ? 'Video is ready to publish.' : 'The video is still being prepared.')
    }
    await loadVideos()
  }

  async function remove(videoId: string) {
    if (!window.confirm('Remove this private video? This cannot be undone.')) return
    setBusy(true)
    const form = new FormData()
    form.set('content_id', contentId)
    form.set('video_id', videoId)
    const result = await deleteAttachedVideo(form)
    setBusy(false)
    setMessageIsError('error' in result)
    setMessage('error' in result ? result.error ?? 'The private video could not be removed.' : 'Private video removed.')
    await loadVideos()
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setMessageIsError(false)
    const form = event.currentTarget
    const formData = new FormData(form)
    const file = formData.get('file') as File | null
    if (!file) return
    setBusy(true)
    setMessage('Preparing private upload…')
    const start = new FormData()
    start.set('content_id', contentId)
    start.set('file_name', file.name)
    start.set('file_type', file.type)
    start.set('file_size', String(file.size))
    start.set('caption', String(formData.get('caption') ?? ''))
    const result = await startVideoUpload(start)
    if (!('ok' in result)) {
      setBusy(false)
      setMessageIsError(true)
      setMessage(result.error ?? 'The private upload could not be prepared.')
      return
    }
    const upload = new tus.Upload(file, {
      uploadUrl: result.uploadUrl,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => setMessage(`Uploading… ${Math.round(sent / total * 100)}%`),
      onError: () => { setBusy(false); setMessageIsError(true); setMessage('The upload paused or failed. Choose the video again to resume.') },
      onSuccess: async () => { setBusy(false); await refresh(result.videoId) },
    })
    upload.start()
  }

  return <div className={styles.formStack}>
    {videos.map(video => <div key={video.id} className={styles.fieldGroup}>
      <p role={video.status === 'errored' ? 'alert' : video.status === 'ready' ? 'status' : undefined} className={styles.meta}>
        {video.status === 'errored' ? 'Private video needs attention: processing failed.' : video.status === 'ready' ? 'Private video is ready to publish.' : `Video: ${video.status}`}
        {video.durationSeconds !== null ? ` · ${Math.round(video.durationSeconds)} sec` : ''}
      </p>
      {video.caption && <p className={styles.help}>{video.caption}</p>}
      <div className={styles.editorActionBar}>
        <button type="button" disabled={busy} onClick={() => void refresh(video.id)} className={styles.secondaryAction}>Check status</button>
        <button type="button" disabled={busy} onClick={() => void remove(video.id)} className={styles.dangerAction}>Remove private video</button>
      </div>
    </div>)}
    <form onSubmit={submit} className={styles.formStack}>
      <label className={styles.fieldLabel} htmlFor="video-file">Video (MP4, MOV, or WebM; up to 2 GB)</label>
      <input id="video-file" name="file" type="file" accept={VIDEO_ACCEPT} capture="environment" required className={styles.field} />
      <label className={styles.fieldLabel} htmlFor="video-caption">Caption (optional)</label>
      <input id="video-caption" name="caption" className={styles.field} placeholder="A line the family will see with this video" />
      <p className={styles.help}>Videos stay private, have no autoplay, and can publish only after processing is complete.</p>
      <button type="submit" disabled={busy} className={styles.action}>{busy ? 'Uploading…' : 'Upload video'}</button>
    </form>
    {message && <p role={messageIsError ? 'alert' : 'status'} className={messageIsError ? styles.errorNotice : styles.informationNotice}>{message}</p>}
  </div>
}
