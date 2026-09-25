'use client'

// Videos in a story. They go straight to the private video service and appear after the
// words once they finish processing.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as tus from 'tus-js-client'
import { deleteAttachedVideo, listAttachedVideos, refreshVideoStatus, startVideoUpload, type AttachedVideo } from './video-actions'
import { VIDEO_ACCEPT } from '@/lib/video/cloudflare'
import styles from './editor.module.css'

const STATUS: Record<string, string> = {
  uploading: 'Still uploading',
  processing: 'Processing. It can take a few minutes.',
  ready: 'Ready',
  errored: "Couldn't be processed. Remove it and try again.",
}

export default function StoryVideos({ contentId, onChange }: { contentId: string; onChange: () => void }) {
  const [videos, setVideos] = useState<AttachedVideo[]>([])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [caption, setCaption] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const form = new FormData()
    form.set('content_id', contentId)
    const result = await listAttachedVideos(form).catch(() => ({ error: "Videos didn't load." }))
    if ('videos' in result && result.videos) setVideos(result.videos)
    else setMessage(('error' in result && result.error) || "Videos didn't load.")
  }, [contentId])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  async function check(videoId: string) {
    const form = new FormData()
    form.set('content_id', contentId)
    form.set('video_id', videoId)
    const result = await refreshVideoStatus(form).catch(() => ({ error: "Couldn't check just now." }))
    setMessage('error' in result ? result.error ?? '' : result.status === 'ready' ? 'The video is ready.' : 'Still processing. Check again in a minute.')
    await load()
    onChange()
  }

  async function remove(videoId: string) {
    if (!window.confirm('Remove this video for good?')) return
    setBusy(true)
    const form = new FormData()
    form.set('content_id', contentId)
    form.set('video_id', videoId)
    const result = await deleteAttachedVideo(form).catch(() => ({ error: "Couldn't remove it just now." }))
    setBusy(false)
    setMessage('error' in result ? result.error ?? '' : 'Removed.')
    await load()
    onChange()
  }

  async function upload(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = ''
    if (!file) return
    setBusy(true)
    setMessage('Getting ready…')
    const start = new FormData()
    start.set('content_id', contentId)
    start.set('file_name', file.name)
    start.set('file_type', file.type)
    start.set('file_size', String(file.size))
    start.set('caption', caption)
    const result = await startVideoUpload(start).catch(() => ({ error: "Couldn't start the upload. You may have been signed out." }))
    if (!('ok' in result)) { setBusy(false); setMessage(result.error ?? "Couldn't start the upload."); return }
    new tus.Upload(file, {
      uploadUrl: result.uploadUrl,
      retryDelays: [0, 1000, 3000, 5000],
      removeFingerprintOnSuccess: true,
      onProgress: (sent, total) => setMessage(`Uploading the video… ${Math.round(sent / total * 100)}%`),
      onError: () => { setBusy(false); setMessage('The upload stopped. Choose the video again and it picks up where it left off.') },
      onSuccess: async () => { setBusy(false); setCaption(''); await check(result.videoId) },
    }).start()
  }

  return (
    <section className={styles.tray} aria-labelledby="videos-title">
      <h2 id="videos-title">Videos</h2>
      <p className={styles.trayNote}>Videos play only when someone presses play, and only for family.</p>
      {videos.length > 0 && (
        <ul className={styles.videoList}>
          {videos.map(video => (
            <li key={video.id}>
              <p><strong>{video.caption || 'Video'}</strong>{video.durationSeconds ? ` · ${Math.round(video.durationSeconds)} sec` : ''}</p>
              <p className={styles.trayNote}>{STATUS[video.status] ?? video.status}</p>
              <div className={styles.trayTools}>
                {video.status !== 'ready' && <button type="button" disabled={busy} onClick={() => void check(video.id)}>Check again</button>}
                <button type="button" disabled={busy} className={styles.toolQuiet} onClick={() => void remove(video.id)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input ref={fileInput} type="file" accept={VIDEO_ACCEPT} hidden onChange={event => void upload(event.target.files?.[0])} />
      <div className={styles.trayAdd}>
        <input className={styles.caption} value={caption} onChange={event => setCaption(event.target.value)} placeholder="Caption for the next video (optional)" aria-label="Video caption" maxLength={500} />
        <button type="button" className={styles.ghost} disabled={busy} onClick={() => fileInput.current?.click()}>{busy ? 'Uploading…' : 'Add a video'}</button>
      </div>
      {message && <p className={styles.trayNote} role="status">{message}</p>}
    </section>
  )
}
