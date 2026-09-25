'use client'

// A family video that asks for its playback link only when someone presses play.
// Nothing loads from the video service until then, and a page left open for hours still plays.

import { useState } from 'react'
import styles from './family.module.css'

type State = 'idle' | 'loading' | 'playing' | 'failed' | 'signed-out'

export default function FamilyVideo({ playToken, caption }: { playToken: string | null; caption: string | null }) {
  const [state, setState] = useState<State>(playToken ? 'idle' : 'failed')
  const [url, setUrl] = useState<string | null>(null)

  async function play() {
    if (!playToken) return
    setState('loading')
    try {
      const response = await fetch(`/v/${playToken}`, { method: 'POST', cache: 'no-store' })
      if (response.status === 401) return setState('signed-out')
      const body = await response.json() as { url?: string }
      if (!response.ok || !body.url) return setState('failed')
      setUrl(`${body.url}?autoplay=true`)
      setState('playing')
    } catch {
      setState('failed')
    }
  }

  return (
    <figure className={styles.video}>
      {state === 'playing' && url ? (
        <iframe
          src={url}
          title={caption || 'A family video'}
          className={styles.videoFrame}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
          allowFullScreen
        />
      ) : (
        <div className={styles.videoTile}>
          {state === 'failed' ? (
            <p className={styles.videoNote}>The video wouldn&apos;t start. <button type="button" onClick={play} className={styles.linkButton}>Try again</button></p>
          ) : state === 'signed-out' ? (
            <p className={styles.videoNote}>You&apos;ve been signed out. <a href="/family-login">Come back in</a> to watch.</p>
          ) : (
            <button type="button" className={styles.playButton} onClick={play} disabled={state === 'loading'} aria-label={caption ? `Play: ${caption}` : 'Play the video'}>
              <span aria-hidden="true" className={styles.playIcon} />
              <span className={styles.playLabel}>{state === 'loading' ? 'Starting…' : 'Play'}</span>
            </button>
          )}
        </div>
      )}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}
