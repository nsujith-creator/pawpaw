'use client'

// Her days on the desk: how the folder is doing, lines waiting for a yes, photos that need a look,
// the latest (or any month), what is hidden, and anything that didn't come through.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Progress } from '@/lib/her-days/importer'
import { checkNow, decideLine, updateTimelineItem, writeLine } from './actions'
import styles from '../admin.module.css'

export interface DeskPhoto { id: string; kind: 'photo' | 'video'; date: string | null; reason: string | null; url: string | null }
export interface DeskMonth { key: string; label: string; count: number }
// draft is null for a photo nobody has suggested a line for: Sujith writes it himself.
export interface DeskLine { id: string; mediaId: string; draft: string | null; was: string | null; url: string }

function dayLabel(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
}

function sinceWords(iso: string | null) {
  if (!iso) return null
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000))
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export default function HerDaysDesk({ linked, checkedAt, progress, lines, notIn, shownCount, review, recent, hidden, months, month }: {
  linked: boolean; checkedAt: string | null; progress: Progress | null
  lines: DeskLine[]; notIn: { name: string | null; reason: string | null }[]; shownCount: number
  review: DeskPhoto[]; recent: DeskPhoto[]; hidden: DeskPhoto[]; months: DeskMonth[]; month: string | null
}) {
  const router = useRouter()
  const [now, setNow] = useState<Progress | null>(progress)
  const [checking, setChecking] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [checked, setChecked] = useState(checkedAt)
  const alive = useRef(true)
  useEffect(() => () => { alive.current = false }, [])

  // Keeps checking while there are photos still coming in, then refreshes the page. If a round
  // brings nothing new in (an earlier look may still be holding some), it waits before trying again.
  const check = useCallback(async () => {
    setChecking(true)
    setNote(null)
    let before: Progress | null = null
    let stuck = 0
    try {
      for (let round = 0; round < 200 && alive.current; round++) {
        const report = await checkNow()
        if ('error' in report) { setNote(report.error); break }
        setNow(report.progress)
        setChecked(report.checkedAt)
        if (report.state === 'not_linked') break
        if (report.state === 'error') { setNote('The folder didn’t answer just now. It will try again by itself.'); break }
        router.refresh()
        if (report.state === 'busy') { await sleep(20_000); continue }
        const after = report.progress
        if (!after || after.pending === 0) break
        const moved = !before || after.pending !== before.pending || after.added !== before.added
        before = after
        stuck = moved ? 0 : stuck + 1
        if (stuck >= 3) break
        if (stuck > 0) await sleep(20_000)
      }
    } catch {
      setNote('The folder didn’t answer just now. It will try again by itself.')
    } finally {
      setChecking(false)
    }
  }, [router])

  // Opening the desk starts a check when it's been a while, or when photos are still coming in.
  const started = useRef(false)
  useEffect(() => {
    if (!linked) return
    const timer = setTimeout(() => {
      if (started.current) return
      started.current = true
      const stale = !checkedAt || Date.now() - Date.parse(checkedAt) > 10 * 60_000
      if (stale || (progress?.pending ?? 0) > 0) void check()
    }, 0)
    return () => clearTimeout(timer)
  }, [check, checkedAt, linked, progress])

  const coming = now ? now.pending + now.waiting : 0

  return (
    <>
      <section className={styles.group} aria-live="polite">
        {!linked ? (
          <p className={styles.quietNote}>Pawpaw can&apos;t see the Her days folder yet. Once you share it, her photos come in from there.</p>
        ) : (
          <>
            <div className={styles.actionRow}>
              <button type="button" className={styles.ghost} onClick={() => void check()} disabled={checking}>
                {checking ? 'Looking in the folder…' : 'Look in the folder now'}
              </button>
              <span className={styles.quietNote}>
                {shownCount.toLocaleString('en-IN')} photo{shownCount === 1 ? '' : 's'} on her days
                {checked && !checking ? ` · looked ${sinceWords(checked)}` : ''}
              </span>
            </div>
            {coming > 0 && now && (
              <div className={styles.dayStep}>
                <p className={styles.dayCount}>{`${(now.total - coming).toLocaleString('en-IN')} of ${now.total.toLocaleString('en-IN')} in`}</p>
                <progress className={styles.dayBar} max={now.total} value={now.total - coming} />
                <p className={styles.quietNote}>{checking ? 'Keep this open and they come in faster. They keep coming in on their own too.' : 'The rest keep coming in on their own.'}</p>
              </div>
            )}
            {note && <p className={styles.error} role="alert">{note}</p>}
          </>
        )}
      </section>

      {lines.length > 0 && <LineQueue lines={lines} onDone={() => router.refresh()} />}

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

      {notIn.length > 0 && (
        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Didn&apos;t come through</h2>
          <p className={styles.quietNote}>These were tried three times. Put them in the folder again to have another go.</p>
          <ul className={styles.runList}>
            {notIn.map((item, index) => (
              <li key={index}><strong>{item.name ?? 'A photo'}</strong>{item.reason && <span>{item.reason}</span>}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

// One line at a time, big, so a hundred can be sorted over a cup of tea. Lines already sorted are
// skipped, even when the list behind them is refreshed.
function LineQueue({ lines, onDone }: { lines: DeskLine[]; onDone: () => void }) {
  const [sorted, setSorted] = useState<string[]>([])
  const left = lines.filter(line => !sorted.includes(line.id))
  const line = left[0]
  if (!line) return null
  return (
    <section className={styles.group}>
      <h2 className={styles.groupTitle}>Lines for you · {left.length} to go</h2>
      <LineCard key={line.id} line={line} onSorted={() => {
        setSorted(done => [...done, line.id])
        if (left.length === 1) onDone()
      }} />
    </section>
  )
}

function LineCard({ line, onSorted }: { line: DeskLine; onSorted: () => void }) {
  const mine = line.draft === null // nobody suggested a line: this one is Sujith's to write
  const [text, setText] = useState(line.draft ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const edited = text.trim() !== (line.draft ?? '')
  const blank = text.trim() === ''

  async function decide(kind: 'keep' | 'mine' | 'none' | 'again' | 'later') {
    if (kind === 'later') { onSorted(); return }
    setBusy(true); setError(null)
    const result = mine
      ? await writeLine(line.mediaId, kind === 'mine' ? { kind, text } : { kind: 'none' })
      : await decideLine(line.id, kind === 'mine' ? { kind, text } : { kind: kind as 'keep' | 'none' | 'again' })
    setBusy(false)
    if ('error' in result) { setError(result.error); return }
    onSorted()
  }
  const save = () => { if (mine ? !blank : true) void decide(edited ? 'mine' : 'keep') }

  return (
    <div className={styles.lineCard}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`${line.url}?w=960`} alt="The photo this line is for" className={styles.linePhoto} />
      <div className={styles.lineSide}>
        <label className={styles.lineField}>
          <span>The line under it</span>
          <textarea value={text} rows={2} maxLength={200} placeholder={mine ? 'What would you say about this one?' : undefined} onChange={event => setText(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); save() } }} />
        </label>
        {line.was && <p className={styles.lineWas}>Before: {line.was}</p>}
        <div className={styles.actionRow}>
          <button type="button" className={styles.primary} disabled={busy || (mine && blank)} onClick={save}>{mine ? 'Save' : edited ? 'Use mine' : 'Keep this'}</button>
          {mine
            ? <button type="button" className={styles.ghost} disabled={busy} onClick={() => void decide('later')}>Later</button>
            : <button type="button" className={styles.ghost} disabled={busy} onClick={() => void decide('again')}>Another line</button>}
          <button type="button" className={styles.linkish} disabled={busy} onClick={() => void decide('none')}>No line</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
    </div>
  )
}

function Tile({ photo, children }: { photo: DeskPhoto; children: React.ReactNode }) {
  return (
    <li className={styles.dayTile}>
      {photo.url
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={`${photo.url}?w=480`} alt={photo.date ? `From ${dayLabel(photo.date)}` : 'Undated'} loading="lazy" />
        : <div className={styles.dayMissing}>No picture yet</div>}
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
