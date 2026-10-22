import { describe, expect, it, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dateOfDay, dayNumber, indiaDate, monthLabel, quiltWeeks, reviewReason, weekLabel } from '@/lib/her-days/days'
import { createSession, listPicked, toPickedItem, type PickedItem } from '@/lib/her-days/google-picker'

vi.mock('@/lib/video/cloudflare', () => ({
  createPrivateTusUpload: vi.fn(async () => ({ uploadUrl: 'https://upload.example/x', cloudflareUid: 'cf-1' })),
  deletePrivateVideo: vi.fn(async () => undefined),
  getVideoState: vi.fn(),
}))

const { importBatch, planListing, recordPicked, refreshFailed, runProgress, preparePhoto } = await import('@/lib/her-days/importer')

const root = join(__dirname, '../..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')

describe('her days: dates are India dates, counted from her birthday', () => {
  it('puts a photo on the Indian calendar day it was taken', () => {
    expect(indiaDate('2026-06-12T18:29:59Z')).toBe('2026-06-12')
    expect(indiaDate('2026-06-12T18:30:00Z')).toBe('2026-06-13')
    expect(indiaDate('2026-05-28T19:00:00Z')).toBe('2026-05-29')
  })

  it('counts day 0 as the day she was born', () => {
    expect(dayNumber('2026-05-29')).toBe(0)
    expect(dayNumber('2026-06-12')).toBe(14)
    expect(dateOfDay(146)).toBe('2026-10-22')
  })

  it('sends only mechanically uncertain photos for review', () => {
    const now = Date.parse('2026-10-22T10:00:00Z')
    expect(reviewReason({ takenAt: '2026-06-12T05:00:00Z', filename: 'PXL_20260612_053000.jpg' }, now)).toBeNull()
    expect(reviewReason({ takenAt: null, filename: 'x.jpg' }, now)).toMatch(/No date/)
    expect(reviewReason({ takenAt: '2026-05-20T05:00:00Z', filename: 'x.jpg' }, now)).toMatch(/before she was born/)
    expect(reviewReason({ takenAt: '2026-12-01T05:00:00Z', filename: 'x.jpg' }, now)).toMatch(/hasn’t come yet/)
    expect(reviewReason({ takenAt: '2026-07-01T05:00:00Z', filename: 'IMG-20260701-WA0003.jpg' }, now)).toMatch(/WhatsApp/)
    expect(reviewReason({ takenAt: '2026-07-01T05:00:00Z', filename: 'Screenshot_20260701.png' }, now)).toMatch(/screenshot/)
  })
})

describe('her days: the quilt', () => {
  it('has a row per week, newest first, with month birthdays marked', () => {
    const weeks = quiltWeeks([{ day: 0 }, { day: 14 }, { day: 14 }, { day: 146 }, { day: 400 }, { day: -3 }], '2026-10-22')
    expect(weeks).toHaveLength(21)
    expect(weeks[0].week).toBe(20)
    expect(weeks.at(-1)!.week).toBe(0)
    expect(weeks.at(-1)!.days[0].items).toHaveLength(1)
    expect(weeks.find(week => week.week === 2)!.days[0].items).toHaveLength(2)
    expect(weeks.find(week => week.week === 4)!.month).toBe(1) // 29 June is day 31
    expect(weeks.find(week => week.week === 8)!.month).toBe(2) // 29 July is day 61
    expect(weeks.flatMap(week => week.days).flatMap(day => day.items)).toHaveLength(4) // nothing after today, nothing before birth
  })

  it('names months and years the family way', () => {
    expect(monthLabel(1)).toBe('1 month')
    expect(monthLabel(5)).toBe('5 months')
    expect(monthLabel(12)).toBe('1 year')
    expect(monthLabel(24)).toBe('2 years')
    expect(weekLabel(0)).toBe('born')
    expect(weekLabel(1)).toBe('1 week')
    expect(weekLabel(16)).toBe('16 weeks')
  })
})

describe('her days: Google Photos picker', () => {
  it('reads picked photos and videos', () => {
    const photo = toPickedItem({ id: 'a', createTime: '2026-06-12T05:00:00.123Z', type: 'PHOTO', mediaFile: { baseUrl: 'https://lh3.example/a', mimeType: 'image/jpeg', filename: 'PXL.jpg', mediaFileMetadata: { width: 4000, height: 3000 } } })
    expect(photo).toMatchObject({ id: 'a', kind: 'photo', createTime: '2026-06-12T05:00:00.123Z', width: 4000, height: 3000, videoReady: true })
    const video = toPickedItem({ id: 'b', type: 'VIDEO', mediaFile: { baseUrl: 'https://lh3.example/b', mimeType: 'video/mp4', mediaFileMetadata: { videoMetadata: { processingStatus: 'PROCESSING' } } } })
    expect(video).toMatchObject({ kind: 'video', createTime: null, videoReady: false })
    expect(toPickedItem({ id: 'c' })).toBeNull()
  })

  it('follows every page of picked items', async () => {
    const pages = [
      { mediaItems: [{ id: '1', mediaFile: { baseUrl: 'u1' } }], nextPageToken: 'next' },
      { mediaItems: [{ id: '2', mediaFile: { baseUrl: 'u2' } }] },
    ]
    const urls: string[] = []
    const fetcher = vi.fn(async (url: string) => { urls.push(url); return new Response(JSON.stringify(pages.shift())) }) as unknown as typeof fetch
    const items = await listPicked(fetcher, 'token', 'session-1')
    expect(items.map(item => item.id)).toEqual(['1', '2'])
    expect(urls[1]).toContain('pageToken=next')
  })

  it('starts a session and keeps polling to a sensible pace', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ id: 's', pickerUri: 'https://photos.google.com/picker/s', pollingConfig: { pollInterval: '0.5s' } }))) as unknown as typeof fetch
    const session = await createSession(fetcher, 'token')
    expect(session).toMatchObject({ id: 's', mediaItemsSet: false, pollIntervalMs: 2000 })
  })
})

// A small in-memory stand-in for the Supabase client: just the calls the importer makes.
type Row = Record<string, unknown>
function fakeDb() {
  const tables: Record<string, Row[]> = { import_runs: [], import_items: [], timeline_media: [], media_assets: [], video_assets: [] }
  const storage = new Map<string, Buffer>()
  let ids = 0
  const unique: Record<string, string[]> = { timeline_media: ['source', 'source_item_id'], import_items: ['run_id', 'source_item_id'] }
  function builder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
    let payload: Row[] = []
    let fields: Row = {}
    let ignore = false
    const filters: ((row: Row) => boolean)[] = []
    const run = () => {
      const rows = tables[table]
      if (op === 'insert' || op === 'upsert') {
        const keys = unique[table]
        const added: Row[] = []
        for (const row of payload) {
          if (keys && rows.some(other => keys.every(key => other[key] === row[key]))) {
            if (op === 'upsert' && ignore) continue
            return { data: null, error: { code: '23505', message: 'duplicate' } }
          }
          const full = { id: `id-${++ids}`, status: table === 'import_items' ? 'pending' : undefined, attempts: 0, visibility: 'shown', ...row }
          rows.push(full)
          added.push(full)
        }
        return { data: added, error: null }
      }
      const matched = rows.filter(row => filters.every(filter => filter(row)))
      if (op === 'update') { matched.forEach(row => Object.assign(row, fields)); return { data: matched, error: null } }
      if (op === 'delete') { tables[table] = rows.filter(row => !matched.includes(row)); return { data: matched, error: null } }
      return { data: matched, error: null }
    }
    const api = {
      select: () => api,
      insert: (rows: Row | Row[]) => { op = 'insert'; payload = Array.isArray(rows) ? rows : [rows]; return api },
      upsert: (rows: Row[], options: { ignoreDuplicates?: boolean }) => { op = 'upsert'; payload = rows; ignore = !!options.ignoreDuplicates; return api },
      update: (value: Row) => { op = 'update'; fields = value; return api },
      delete: () => { op = 'delete'; return api },
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return api },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return api },
      not: (key: string) => { filters.push(row => row[key] != null); return api },
      single: async () => { const result = run(); return { data: result.data?.[0] ?? null, error: result.error } },
      maybeSingle: async () => { const result = run(); return { data: result.data?.[0] ?? null, error: result.error } },
      then: (resolve: (value: unknown) => void) => resolve(run()),
    }
    return api
  }
  const db = {
    tables, storage,
    from: (table: string) => builder(table),
    rpc: async (_name: string, { p_run_id, p_limit }: { p_run_id: string; p_limit: number }) => {
      const claimed = tables.import_items.filter(row => row.run_id === p_run_id && row.status === 'pending').slice(0, p_limit)
      claimed.forEach(row => { row.status = 'working'; row.attempts = (row.attempts as number) + 1 })
      return { data: claimed.map(row => ({ ...row })), error: null }
    },
    storage_api: null,
  }
  ;(db as unknown as { storage: unknown }).storage = {
    from: () => ({
      upload: async (path: string, data: Buffer) => { storage.set(path, data); return { error: null } },
      remove: async (paths: string[]) => { paths.forEach(path => storage.delete(path)); return { error: null } },
    }),
  }
  return { db, tables, storage }
}

function picked(id: string, overrides: Partial<PickedItem> = {}): PickedItem {
  return { id, kind: 'photo', createTime: '2026-06-12T05:00:00.000Z', mimeType: 'image/jpeg', filename: `${id}.jpg`, width: 4000, height: 3000, baseUrl: `https://lh3.example/${id}`, videoReady: true, ...overrides }
}

describe('her days: bringing photos in', () => {
  let jpeg: Buffer
  beforeEach(async () => {
    jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#c8325a' } }).jpeg().toBuffer()
  })

  it('keeps an upright copy no larger than 1600 pixels', async () => {
    const photo = await preparePhoto(jpeg)
    expect(Math.max(photo.width, photo.height)).toBe(1600)
    expect(photo.data.subarray(0, 2).toString('hex')).toBe('ffd8')
  })

  it('skips photos already on her days, and the same photo picked twice', () => {
    const plan = planListing([picked('a'), picked('b'), picked('a')], new Set(['b']))
    expect(plan.map(entry => [entry.item.id, entry.status])).toEqual([['a', 'pending'], ['b', 'duplicate']])
  })

  it('brings photos in, places them, and picking them again adds nothing', async () => {
    const { db, tables, storage } = fakeDb()
    const google = vi.fn(async () => new Response(new Uint8Array(jpeg), { headers: { 'content-length': String(jpeg.length) } })) as unknown as typeof fetch
    tables.import_runs.push({ id: 'run-1', status: 'picking' })
    await recordPicked(db as never, 'run-1', [picked('a'), picked('b', { filename: 'IMG-20260612-WA0001.jpg' })])
    const { progress } = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(progress).toMatchObject({ total: 2, added: 2, pending: 0, failed: 0 })
    expect(tables.timeline_media.map(row => [row.source_item_id, row.visibility]).sort()).toEqual([['a', 'shown'], ['b', 'review']])
    expect(tables.timeline_media.find(row => row.source_item_id === 'a')).toMatchObject({ taken_at: '2026-06-12T05:00:00.000Z', taken_at_source: 'camera', source: 'google_photos', width: 1600, height: 1067 })
    expect(storage.size).toBe(2)
    expect(tables.import_items.every(row => row.google_base_url === null)).toBe(true)
    expect(tables.import_runs[0].status).toBe('done')

    // The next week, the same two are picked again with one new one.
    tables.import_runs.push({ id: 'run-2', status: 'picking' })
    await recordPicked(db as never, 'run-2', [picked('a'), picked('b'), picked('c')])
    const { progress: again } = await importBatch(db as never, google, 'token', 'admin-1', 'run-2', 3)
    expect(again).toMatchObject({ total: 3, added: 1, duplicate: 2 })
    expect(tables.timeline_media).toHaveLength(3)
    expect(storage.size).toBe(3)
  })

  it('records a failure in plain words, cleans up, and can try again', async () => {
    const { db, tables, storage } = fakeDb()
    let broken = true
    const google = vi.fn(async () => broken
      ? new Response('nope', { status: 500 })
      : new Response(new Uint8Array(jpeg))) as unknown as typeof fetch
    tables.import_runs.push({ id: 'run-1', status: 'picking' })
    await recordPicked(db as never, 'run-1', [picked('a')])
    const { progress: first } = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(first).toMatchObject({ failed: 1, added: 0 })
    expect(tables.import_items[0].error).toBe('This one didn’t come through. Try again.')
    expect(String(tables.import_items[0].error)).not.toContain('lh3.example')
    expect(storage.size).toBe(0)
    expect(tables.media_assets).toHaveLength(0)

    // Try again: put it back in the queue, as the desk's "Try those again" does.
    broken = false
    tables.import_items[0].status = 'pending'
    tables.import_runs[0].status = 'importing'
    const { progress: second } = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(second).toMatchObject({ failed: 0, added: 1 })
    expect(await runProgress(db as never, 'run-1')).toMatchObject({ total: 1, added: 1 })
  })

  it('removes the still when a video cannot come in yet', async () => {
    const { db, tables, storage } = fakeDb()
    const google = vi.fn(async () => new Response(new Uint8Array(jpeg))) as unknown as typeof fetch
    tables.import_runs.push({ id: 'run-1', status: 'picking' })
    await recordPicked(db as never, 'run-1', [picked('v', { kind: 'video', videoReady: false, mimeType: 'video/mp4' })])
    const { progress } = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(progress.failed).toBe(1)
    expect(tables.import_items[0].error).toMatch(/still getting this video ready/)
    expect(storage.size).toBe(0)
    expect(tables.media_assets).toHaveLength(0)
  })

  it('treats another tab adding the same photo first as a duplicate, not a second copy', async () => {
    const { db, tables, storage } = fakeDb()
    const google = vi.fn(async () => new Response(new Uint8Array(jpeg))) as unknown as typeof fetch
    tables.import_runs.push({ id: 'run-1', status: 'picking' })
    await recordPicked(db as never, 'run-1', [picked('a')])
    tables.timeline_media.push({ id: 'other', source: 'google_photos', source_item_id: 'a' })
    const { progress } = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(progress).toMatchObject({ duplicate: 1, added: 0 })
    expect(tables.timeline_media).toHaveLength(1)
    expect(storage.size).toBe(0)
  })
})

describe('her days: getting unstuck', () => {
  it('says when nothing could be taken because an earlier try still holds the rest', async () => {
    const { db, tables } = fakeDb()
    tables.import_runs.push({ id: 'run-1', status: 'importing' })
    tables.import_items.push({ id: 'i1', run_id: 'run-1', source_item_id: 'a', status: 'working', attempts: 1 })
    const google = vi.fn() as unknown as typeof fetch
    const result = await importBatch(db as never, google, 'token', 'admin-1', 'run-1', 3)
    expect(result).toMatchObject({ claimed: 0, progress: { pending: 1 } })
    expect(google).not.toHaveBeenCalled()
  })

  it('tries a failed video again with fresh word from Google that it is ready', async () => {
    const { db, tables } = fakeDb()
    tables.import_runs.push({ id: 'run-1', status: 'done' })
    tables.import_items.push({ id: 'i1', run_id: 'run-1', source_item_id: 'v', status: 'failed', video_ready: false, google_base_url: 'old' })
    tables.import_items.push({ id: 'i2', run_id: 'run-1', source_item_id: 'gone', status: 'failed', google_base_url: null })
    const count = await refreshFailed(db as never, 'run-1', [picked('v', { kind: 'video', videoReady: true, baseUrl: 'new' })])
    expect(count).toBe(1)
    expect(tables.import_items[0]).toMatchObject({ status: 'pending', video_ready: true, google_base_url: 'new' })
    expect(tables.import_items[1].status).toBe('failed')
    expect(tables.import_runs[0].status).toBe('importing')
  })
})

describe('her days: words on screen', () => {
  const files = ['src/app/(archive)/days/page.tsx', 'src/components/family/her-days.tsx', 'src/components/family/day-strip.tsx', 'src/app/admin/her-days/page.tsx', 'src/app/admin/her-days/her-days-desk.tsx', 'src/app/admin/her-days/actions.ts', 'src/lib/her-days/importer.ts', 'src/lib/her-days/days.ts']
  // Only the quoted sentences people read (they have spaces), not import paths or code around them.
  const source = files.map(read).join('\n').split('\n').filter(line => !/^\s*(import|\/\/|\*)/.test(line) && !/new Error\(|\.select\(/.test(line)).join('\n')
  const visible = (source.match(/(['`"])(?:(?!\1).)*\1|>[^<>{}]+</g) ?? []).filter(text => /\s/.test(text.trim().slice(1, -1))).join(' ')

  it('speaks like a person, not like software', () => {
    for (const word of [/\bimport(ed|ing)?\b/i, /\bsession\b/i, /\bqueue\b/i, /\bsync/i, /\bprocessing\b/i, /carries on by itself/i, /Each row is/i, /Bring in from/i, /week \d/]) {
      expect(visible).not.toMatch(word)
    }
  })
})

describe('her days: privacy and safety', () => {
  const migration = read('supabase/migrations/20261022120000_her_days.sql')

  it('keeps the new tables away from browsers', () => {
    for (const table of ['import_runs', 'timeline_media', 'import_items']) {
      expect(migration).toContain(`alter table public.${table} enable row level security`)
    }
    expect(migration).toContain('revoke all on public.import_runs, public.timeline_media, public.import_items from anon, authenticated')
    expect(migration).toContain('revoke execute on function public.claim_import_items(uuid, integer) from public, anon, authenticated')
  })

  it('only adds: no existing table is altered or dropped', () => {
    expect(migration).not.toMatch(/alter table public\.(media_assets|video_assets|content_items|content_revisions)/)
    expect(migration).not.toMatch(/\bdrop\b/i)
  })

  it('shows family readers only what is shown', () => {
    const load = read('src/lib/her-days/load.ts')
    expect(load).toContain(".eq('visibility', 'shown')")
    expect(load).toContain('loadAuthorizedFamilyData')
  })

  it('never stores the Google token', () => {
    const actions = read('src/app/admin/her-days/actions.ts')
    expect(actions).not.toMatch(/insert\([^)]*token/)
    expect(read('supabase/migrations/20261022120000_her_days.sql')).not.toMatch(/access_token|refresh_token/)
  })

  it('keeps her days pages out of shared caches', () => {
    const config = read('next.config.ts')
    expect(config).toContain("'/days'")
    expect(config).toContain("'/admin/her-days'")
  })
})
