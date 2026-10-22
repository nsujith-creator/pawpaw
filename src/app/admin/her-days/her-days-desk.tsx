'use client'

// Add photos from Google Photos: sign in to Google, pick there, and Pawpaw copies what was picked,
// a few at a time, showing how far it has got. Below: what needs a look, the latest (or a chosen
// month), what is hidden, and earlier adds.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PICKER_SCOPE } from '@/lib/her-days/google-config'
import type { Progress } from '@/lib/her-days/importer'
import { checkPick, importMore, retryFailed, startPick, updateTimelineItem } from './actions'
import styles from '../admin.module.css'

export interface DeskRun {
  id: string; status: string; startedAt: string
  total: number; added: number; duplicate: number; failed: number; pending: number; retryable: number
  reasons: string[]
}
export interface DeskPhoto { id: string; kind: 'photo' | 'video'; date: string | null; reason: string | null; url: string | null }

interface TokenClient { requestAccessToken(options?: { prompt?: string }): void }
declare global {
  interface Window {
    google?: { accounts: { oauth2: { initTokenClient(config: { client_id: string; scope: string; callback: (response: { access_token?: string; error?: string }) => void; error_callback?: (error: { type?: string }) => void }): TokenClient } } }
  }
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'signing-in' }
  | { kind: 'picking'; runId: string; pickerUri: string; pollIntervalMs: number }
  | { kind: 'importing'; runId: string; progress: Progress | null }
  | { kind: 'done'; progress: Progress }
  | { kind: 'error'; message: string }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

function when(iso: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(iso))
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function summary(p: Progress) {
  const parts = [`${p.added} added`]
  if (p.duplicate) parts.push(`${p.duplicate} ${p.duplicate === 1 ? 'was' : 'were'} already here`)
  if (p.failed) parts.push(`${p.failed} didn’t come through`)
  return parts.join(', ')
}

export interface DeskMonth { key: string; label: string; count: number }

export default function HerDaysDesk({ clientId, shownCount, runs, review, recent, hidden, months, month }: {
  clientId: string; shownCount: number; runs: DeskRun[]; review: DeskPhoto[]; recent: DeskPhoto[]; hidden: DeskPhoto[]; months: DeskMonth[]; month: string | null
}) {
  const router = useRouter()
  const [stage, setStage] = useState<Stage>({ kind: 'idle' })
  const [ready, setReady] = useState(false)
  const tokenClient = useRef<TokenClient | null>(null)
  const token = useRef<string | null>(null)
  const pendingAfterSignIn = useRef<((token: string) => void) | null>(null)
  const alive = useRef(true)
  const cancelled = useRef(false)

  useEffect(() => {
    alive.current = true
    if (!clientId) return
    const init = () => {
      if (!window.google) return
      tokenClient.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: PICKER_SCOPE,
        callback: response => {
          const next = pendingAfterSignIn.current
          pendingAfterSignIn.current = null
          if (!response.access_token) { setStage({ kind: 'error', message: 'Google sign-in didn’t finish. Press the button to try again.' }); return }
          token.current = response.access_token
          next?.(response.access_token)
        },
        error_callback: () => {
          pendingAfterSignIn.current = null
          setStage({ kind: 'error', message: 'Google sign-in was closed. Press the button to try again.' })
        },
      })
      setReady(true)
    }
    if (window.google) { init(); return }
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = init
    script.onerror = () => setStage({ kind: 'error', message: 'Google didn’t open. Check your internet and reload the page.' })
    document.head.appendChild(script)
    return () => { alive.current = false }
  }, [clientId])

  // Every Google step starts from a tap, so the sign-in window is allowed to open.
  function withGoogle(then: (token: string) => void) {
    if (!tokenClient.current) return
    setStage({ kind: 'signing-in' })
    pendingAfterSignIn.current = then
    tokenClient.current.requestAccessToken({ prompt: token.current ? '' : 'consent' })
  }

  async function bringIn(runId: string, accessToken: string) {
    setStage({ kind: 'importing', runId, progress: null })
    for (let round = 0; round < 2000 && alive.current; round++) {
      const result = await importMore(runId, accessToken)
      if ('error' in result) { setStage({ kind: 'error', message: result.error }); router.refresh(); return }
      setStage({ kind: 'importing', runId, progress: result.progress })
      if (result.progress.pending === 0) { setStage({ kind: 'done', progress: result.progress }); router.refresh(); return }
      // Nothing was free to take: an earlier try still holds the rest. Stop instead of spinning.
      if (result.claimed === 0) {
        setStage({ kind: 'error', message: `${result.progress.pending} are still finishing from before. Give it ten minutes, then press ‘Finish adding them’.` })
        router.refresh()
        return
      }
    }
  }

  async function waitForPick(runId: string, accessToken: string, pollIntervalMs: number) {
    // Give up after about half an hour of nothing being picked.
    const rounds = Math.ceil((30 * 60 * 1000) / pollIntervalMs)
    cancelled.current = false
    for (let round = 0; round < rounds && alive.current; round++) {
      await sleep(pollIntervalMs)
      if (cancelled.current) { setStage({ kind: 'idle' }); return }
      const result = await checkPick(runId, accessToken)
      if ('error' in result) { setStage({ kind: 'error', message: result.error }); return }
      if ('progress' in result) {
        if (result.progress.total === 0) { setStage({ kind: 'done', progress: result.progress }); return }
        return bringIn(runId, accessToken)
      }
    }
    if (alive.current) setStage({ kind: 'error', message: 'Nothing was picked in time. Press the button to start again.' })
  }

  function start() {
    withGoogle(async accessToken => {
      const result = await startPick(accessToken)
      if ('error' in result) { setStage({ kind: 'error', message: result.error }); return }
      setStage({ kind: 'picking', ...result })
      void waitForPick(result.runId, accessToken, result.pollIntervalMs)
    })
  }

  function carryOn(runId: string) { withGoogle(accessToken => void bringIn(runId, accessToken)) }

  function tryAgain(runId: string) {
    withGoogle(async accessToken => {
      const result = await retryFailed(runId, accessToken)
      if ('error' in result) { setStage({ kind: 'error', message: result.error }); return }
      void bringIn(runId, accessToken)
    })
  }

  const busy = stage.kind === 'signing-in' || stage.kind === 'picking' || stage.kind === 'importing'
  const stopped = runs.find(run => run.status === 'importing' && run.pending > 0)

  return (
    <>
      <section className={styles.group} aria-live="polite">
        {!clientId ? (
          <p className={styles.quietNote}>Google Photos isn&apos;t linked yet. Once it is, you can add her photos from here.</p>
        ) : (
          <>
            <div className={styles.actionRow}>
              <button type="button" className={styles.primary} onClick={start} disabled={!ready || busy}>
                {stage.kind === 'signing-in' ? 'Opening Google…' : 'Add photos from Google Photos'}
              </button>
              <span className={styles.quietNote}>{shownCount.toLocaleString('en-IN')} photo{shownCount === 1 ? '' : 's'} on her days</span>
            </div>
            {stage.kind === 'picking' && (
              <div className={styles.dayStep}>
                <a className={styles.ghost} href={`${stage.pickerUri}/autoclose`} target="_blank" rel="noreferrer">Open Google Photos ↗</a>
                <p className={styles.quietNote}>Pick her photos and press Done, then come back here.</p>
                <button type="button" className={styles.linkish} onClick={() => { cancelled.current = true }}>Cancel</button>
              </div>
            )}
            {stage.kind === 'importing' && (
              <div className={styles.dayStep}>
                <p className={styles.dayCount}>{stage.progress ? `Adding ${stage.progress.total - stage.progress.pending} of ${stage.progress.total}` : 'Adding…'}</p>
                {stage.progress && <progress className={styles.dayBar} max={stage.progress.total} value={stage.progress.total - stage.progress.pending} />}
                <p className={styles.quietNote}>Keep this open till it&apos;s finished.</p>
              </div>
            )}
            {stage.kind === 'done' && (
              <p className={styles.dayStep}>{stage.progress.total === 0 ? 'Nothing was picked.' : `Done. ${summary(stage.progress)}.`}</p>
            )}
            {stage.kind === 'error' && <p className={styles.error} role="alert">{stage.message}</p>}
            {stopped && !busy && (
              <div className={styles.actionRow}>
                <span className={styles.quietNote}>{stopped.pending === 1 ? 'One photo from last time didn’t finish.' : `${stopped.pending} photos from last time didn’t finish.`}</span>
                <button type="button" className={styles.ghost} onClick={() => carryOn(stopped.id)} disabled={!ready}>Finish adding them</button>
              </div>
            )}
          </>
        )}
      </section>

      {review.length > 0 && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Have a look at these</h2>
          <p className={styles.quietNote}>They aren&apos;t on her days until you add them.</p>
          <ul className={styles.dayGrid}>
            {review.map(photo => <ReviewTile key={photo.id} photo={photo} onDone={() => router.refresh()} />)}
          </ul>
        </section>
      )}

      {(recent.length > 0 || months.length > 0) && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>On her days</h2>
          {months.length > 0 && (
            <nav className={styles.monthChips} aria-label="Months">
              <a href="/admin/her-days" aria-current={month ? undefined : 'page'}>Latest</a>
              {months.map(entry => (
                <a key={entry.key} href={`/admin/her-days?month=${entry.key}`} aria-current={entry.key === month ? 'page' : undefined}>{entry.label} <small>{entry.count}</small></a>
              ))}
            </nav>
          )}
          <ul className={styles.dayGrid}>
            {recent.map(photo => (
              <Tile key={photo.id} photo={photo}>
                <DateFix photo={photo} onDone={() => router.refresh()} />
                <ActionButton label="Hide" run={() => updateTimelineItem(photo.id, { visibility: 'hidden' })} onDone={() => router.refresh()} />
              </Tile>
            ))}
          </ul>
        </section>
      )}

      {hidden.length > 0 && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Hidden</h2>
          <ul className={styles.dayGrid}>
            {hidden.map(photo => (
              <Tile key={photo.id} photo={photo}>
                <DateFix photo={photo} onDone={() => router.refresh()} />
                <ActionButton label="Put it back" run={() => updateTimelineItem(photo.id, { visibility: 'shown' })} onDone={() => router.refresh()} />
              </Tile>
            ))}
          </ul>
        </section>
      )}

      {runs.length > 0 && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Added before</h2>
          <ul className={styles.runList}>
            {runs.map(run => (
              <li key={run.id}>
                <strong>{when(run.startedAt)}</strong>
                <span>{run.status === 'picking' ? 'Waiting for you to pick' : run.total === 0 ? 'Nothing was picked' : `${run.total} picked. ${summary(run)}${run.pending ? `, ${run.pending} still to finish` : ''}.`}</span>
                {run.reasons.filter(reason => reason !== 'This one didn’t come through. Try again.').map(reason => <small key={reason}>{reason}</small>)}
                {run.retryable > 0 && !busy && clientId && (
                  <button type="button" className={styles.linkish} onClick={() => tryAgain(run.id)} disabled={!ready}>Try again</button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function Tile({ photo, children }: { photo: DeskPhoto; children: React.ReactNode }) {
  return (
    <li className={styles.dayTile}>
      {photo.url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={`${photo.url}?w=480`} alt={photo.date ? `From ${dayLabel(photo.date)}` : 'Undated'} loading="lazy" />
        : <div className={styles.dayMissing}>No preview</div>}
      {photo.kind === 'video' && <span className={styles.dayVideo}>video</span>}
      <div className={styles.dayTileText}>{photo.date ? dayLabel(photo.date) : 'No date'}</div>
      {children}
    </li>
  )
}

function ActionButton({ label, run, onDone }: { label: string; run: () => Promise<{ ok: true } | { error: string }>; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button type="button" className={styles.linkish} disabled={busy} onClick={async () => {
        setBusy(true); setError(null)
        const result = await run()
        setBusy(false)
        if ('error' in result) setError(result.error); else onDone()
      }}>{busy ? '…' : label}</button>
      {error && <small className={styles.error}>{error}</small>}
    </>
  )
}

function ReviewTile({ photo, onDone }: { photo: DeskPhoto; onDone: () => void }) {
  const [date, setDate] = useState(photo.date ?? '')
  const changed = date !== (photo.date ?? '')
  return (
    <Tile photo={photo}>
      {photo.reason && <small className={styles.dayReason}>{photo.reason}</small>}
      <label className={styles.dayDate}>
        <span>Taken on</span>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
      </label>
      <ActionButton label="Add to her days" onDone={onDone} run={async () => {
        if (!date) return { error: 'Add the date first.' }
        if (changed) { const saved = await updateTimelineItem(photo.id, { date }); if ('error' in saved) return saved }
        return updateTimelineItem(photo.id, { visibility: 'shown' })
      }} />
      <ActionButton label="Leave it off" onDone={onDone} run={() => updateTimelineItem(photo.id, { visibility: 'hidden' })} />
    </Tile>
  )
}

// A shown or hidden photo whose camera date is wrong can be moved to the right day.
function DateFix({ photo, onDone }: { photo: DeskPhoto; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(photo.date ?? '')
  if (!open) return <button type="button" className={styles.linkish} onClick={() => setOpen(true)}>Change date</button>
  return (
    <>
      <label className={styles.dayDate}>
        <span>Taken on</span>
        <input type="date" value={date} onChange={event => setDate(event.target.value)} />
      </label>
      <ActionButton label="Save" onDone={() => { setOpen(false); onDone() }} run={async () => date ? updateTimelineItem(photo.id, { date }) : { error: 'Add the date first.' }} />
    </>
  )
}
