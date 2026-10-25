import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import sharp from 'sharp'
import { generateKeyPairSync } from 'node:crypto'
import { deflateRawSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cameraTime, dateOfDay, dayNumber, fileNameTime, indiaDate, monthLabel, monthsTurned, quiltWeeks, reviewReason, weekLabel } from '@/lib/her-days/days'
import { isMedia, matchSidecars, parseSidecar, readEntries, readEntry, type ZipEntry } from '@/lib/her-days/zip'
import { readServiceAccount, toDriveFile, ALBUM_ZIP_FILE_ID } from '@/lib/her-days/google-drive'
import { cleanLine, photoNote, systemPrompt } from '@/lib/her-days/captions'

const videoState = vi.fn()
vi.mock('@/lib/video/cloudflare', () => ({
  createPrivateTusUpload: vi.fn(async () => ({ uploadUrl: 'https://upload.example/x', cloudflareUid: 'cf-1' })),
  createPrivatePlayerUrl: vi.fn(async () => 'https://player.example/cf-1/iframe'),
  deletePrivateVideo: vi.fn(async () => undefined),
  getVideoState: (uid: string) => videoState(uid),
}))

// The desk's server actions, with sign-in and the database swapped for stand-ins.
let deskDb: unknown = null
vi.mock('next/headers', () => ({ headers: async () => new Headers() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/origin', () => ({ checkOrigin: () => undefined }))
vi.mock('@/lib/auth/admin', () => ({ requireActiveAdmin: async () => ({ id: 'admin-1' }) }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({}) }))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => deskDb }))
const afterRuns: (() => Promise<void>)[] = []
vi.mock('next/server', () => ({ after: (run: () => Promise<void>) => { afterRuns.push(run) } }))

const { importBatch, recordFound, retryFailed, preparePhoto, progressFor, finishVideos } = await import('@/lib/her-days/importer')
const { albumItems, folderItem, makeReader, syncHerDays } = await import('@/lib/her-days/sync')
const { draftMissingLines } = await import('@/lib/her-days/captions')
const { decideLine, writeLine } = await import('@/app/admin/her-days/actions')
const { photosNeedingALine } = await import('@/lib/her-days/lines')
const ping = await import('@/app/api/her-days/ping/route')

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

  it('reads the camera clock and phone file names as India time, and Pixel names as UTC', () => {
    expect(cameraTime('2026:06:12 10:30:00')).toBe('2026-06-12T05:00:00.000Z')
    expect(cameraTime('0000:00:00 00:00:00')).toBeNull()
    expect(fileNameTime('IMG_20260612_103000.jpg')).toBe('2026-06-12T05:00:00.000Z')
    expect(fileNameTime('Screenshot_20260612-103000.png')).toBe('2026-06-12T05:00:00.000Z')
    expect(fileNameTime('PXL_20260612_193000123.jpg')).toBe('2026-06-12T19:30:00.000Z')
    expect(indiaDate(fileNameTime('PXL_20260612_193000123.jpg')!)).toBe('2026-06-13')
    expect(fileNameTime('holiday.jpg')).toBeNull()
  })

  it('sends only mechanically uncertain photos for review', () => {
    const now = Date.parse('2026-10-22T10:00:00Z')
    expect(reviewReason({ takenAt: '2026-06-12T05:00:00Z', filename: 'PXL_20260612_053000.jpg' }, now)).toBeNull()
    expect(reviewReason({ takenAt: null, filename: 'x.jpg' }, now)).toMatch(/No date/)
    // No date of its own: a photo put in the folder just now goes on that day. An older file moved in, or any video, waits.
    expect(reviewReason({ takenAt: '2026-10-22T08:00:00Z', filename: 'x.jpg', takenAtSource: 'added' }, now)).toBeNull()
    expect(reviewReason({ takenAt: '2026-10-22T08:00:00Z', filename: 'x.jpg', takenAtSource: 'added', kind: 'photo' }, now)).toBeNull()
    expect(reviewReason({ takenAt: '2026-10-22T08:00:00Z', filename: 'x.mp4', takenAtSource: 'added', kind: 'video' }, now)).toMatch(/no date of its own/)
    expect(reviewReason({ takenAt: '2026-07-01T05:00:00Z', filename: 'x.jpg', takenAtSource: 'added', kind: 'photo' }, now)).toMatch(/no date of its own/)
    expect(reviewReason({ takenAt: '2026-10-21T20:00:00Z', filename: 'x.jpg', takenAtSource: 'added' }, now)).toMatch(/no date of its own/) // 14 hours old
    expect(reviewReason({ takenAt: '2026-10-22T08:00:00Z', filename: 'Screenshot_20261022.png', takenAtSource: 'added' }, now)).toMatch(/screenshot/)
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

  it('knows the days she turned another month older', () => {
    expect(monthsTurned('2026-05-29')).toBeNull()
    expect(monthsTurned('2026-06-28')).toBeNull()
    expect(monthsTurned('2026-06-29')).toBe(1)
    expect(monthsTurned('2026-09-29')).toBe(4)
    expect(monthsTurned('2027-05-29')).toBe(12)
  })
})

// A small zip writer, so the reader is tested against real zip bytes, in both the ordinary
// layout and the ZIP64 layout Google's big exports use.
function makeZip(files: { name: string; data: Buffer; deflate?: boolean }[], zip64 = false): Buffer {
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  for (const file of files) {
    const body = file.deflate ? deflateRawSync(file.data) : file.data
    const name = Buffer.from(file.name)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(45, 4); local.writeUInt16LE(file.deflate ? 8 : 0, 8)
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(file.data.length, 22); local.writeUInt16LE(name.length, 26)
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(45, 4); header.writeUInt16LE(45, 6); header.writeUInt16LE(file.deflate ? 8 : 0, 10)
    header.writeUInt16LE(name.length, 28)
    let extra = Buffer.alloc(0)
    if (zip64) {
      header.writeUInt32LE(0xffffffff, 20); header.writeUInt32LE(0xffffffff, 24); header.writeUInt32LE(0xffffffff, 42)
      extra = Buffer.alloc(28)
      extra.writeUInt16LE(0x0001, 0); extra.writeUInt16LE(24, 2)
      extra.writeBigUInt64LE(BigInt(file.data.length), 4); extra.writeBigUInt64LE(BigInt(body.length), 12); extra.writeBigUInt64LE(BigInt(offset), 20)
    } else {
      header.writeUInt32LE(body.length, 20); header.writeUInt32LE(file.data.length, 24); header.writeUInt32LE(offset, 42)
    }
    header.writeUInt16LE(extra.length, 30)
    parts.push(local, name, body)
    central.push(header, name, extra)
    offset += 30 + name.length + body.length
  }
  const directory = Buffer.concat(central)
  const tail: Buffer[] = []
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  if (zip64) {
    const record = Buffer.alloc(56)
    record.writeUInt32LE(0x06064b50, 0); record.writeBigUInt64LE(BigInt(44), 4)
    record.writeBigUInt64LE(BigInt(files.length), 24); record.writeBigUInt64LE(BigInt(files.length), 32)
    record.writeBigUInt64LE(BigInt(directory.length), 40); record.writeBigUInt64LE(BigInt(offset), 48)
    const locator = Buffer.alloc(20)
    locator.writeUInt32LE(0x07064b50, 0); locator.writeBigUInt64LE(BigInt(offset + directory.length), 8); locator.writeUInt32LE(1, 16)
    tail.push(record, locator)
    end.writeUInt16LE(0xffff, 8); end.writeUInt16LE(0xffff, 10); end.writeUInt32LE(0xffffffff, 12); end.writeUInt32LE(0xffffffff, 16)
  } else {
    end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16)
  }
  return Buffer.concat([...parts, directory, ...tail, end])
}

const reader = (zip: Buffer) => {
  const reads: [number, number][] = []
  return { reads, read: async (start: number, end: number) => { reads.push([start, end]); return zip.subarray(start, end + 1) } }
}

describe('her days: reading the album zip a piece at a time', () => {
  for (const zip64 of [false, true]) {
    it(`finds every file and reads just the one asked for${zip64 ? ' (ZIP64)' : ''}`, async () => {
      const photo = Buffer.from('a photo, pretend'.repeat(50))
      const zip = makeZip([
        { name: 'Takeout/Google Photos/V/', data: Buffer.alloc(0) },
        { name: 'Takeout/Google Photos/V/PXL_1.jpg', data: photo },
        { name: 'Takeout/Google Photos/V/PXL_1.jpg.supplemental-metadata.json', data: Buffer.from('{"photoTakenTime":{"timestamp":"1781242200"}}'), deflate: true },
      ], zip64)
      const { read, reads } = reader(zip)
      const entries = await readEntries(read, zip.length)
      expect(entries.map(entry => entry.name)).toEqual(['Takeout/Google Photos/V/PXL_1.jpg', 'Takeout/Google Photos/V/PXL_1.jpg.supplemental-metadata.json'])
      reads.length = 0
      expect(await readEntry(read, entries[0])).toEqual(photo)
      expect(Math.max(...reads.map(([start, end]) => end - start + 1))).toBeLessThan(photo.length + 64)
      expect(parseSidecar(await readEntry(read, entries[1])).takenAt).toBe('2026-06-12T05:30:00.000Z')
    })
  }

  it('says plainly when a file is not a zip', async () => {
    const { read } = reader(Buffer.from('not a zip at all, just words'.repeat(3)))
    await expect(readEntries(read, 84)).rejects.toThrow(/Not a zip/)
  })

  it('pairs each photo with Google’s note about it, however the note’s name was cut short', () => {
    const entry = (name: string): ZipEntry => ({ name, method: 0, compressedSize: 1, size: 1, localHeaderOffset: 0 })
    const names = [
      'V/IMG_1.jpg', 'V/IMG_1.jpg.supplemental-metadata.json',
      'V/PXL_20260612_053000000.jpg', 'V/PXL_20260612_053000000.jpg.supplemental-me.json',
      'V/IMG_2(1).jpg', 'V/IMG_2.jpg.supplemental-metadata(1).json', 'V/IMG_2.jpg', 'V/IMG_2.jpg.json',
      'V/VID_1.mp4', 'V/metadata.json', 'V/lonely.jpg',
    ]
    const sidecars = matchSidecars(names.map(entry))
    expect(sidecars.get('V/IMG_1.jpg')?.name).toBe('V/IMG_1.jpg.supplemental-metadata.json')
    expect(sidecars.get('V/PXL_20260612_053000000.jpg')?.name).toBe('V/PXL_20260612_053000000.jpg.supplemental-me.json')
    expect(sidecars.get('V/IMG_2(1).jpg')?.name).toBe('V/IMG_2.jpg.supplemental-metadata(1).json')
    expect(sidecars.get('V/IMG_2.jpg')?.name).toBe('V/IMG_2.jpg.json')
    expect(sidecars.has('V/VID_1.mp4')).toBe(false)
    expect(sidecars.has('V/lonely.jpg')).toBe(false)
    expect(isMedia('V/metadata.json')).toBe(false)
  })

  it('reads the date and his own words from a note, and shrugs at a broken one', () => {
    expect(parseSidecar(Buffer.from('{"photoTakenTime":{"timestamp":"1781242200"},"description":"  Butterfly Season ","title":"x.jpg"}')))
      .toEqual({ takenAt: '2026-06-12T05:30:00.000Z', description: 'Butterfly Season', title: 'x.jpg' })
    expect(parseSidecar(Buffer.from('{"photoTakenTime":{"timestamp":"0"},"description":""}'))).toMatchObject({ takenAt: null, description: null })
    expect(parseSidecar(Buffer.from('{oops'))).toEqual({ takenAt: null, description: null, title: null })
  })
})

describe('her days: the folder', () => {
  it('dates a folder photo by its camera, then its name, then the day it was added', () => {
    const file = (extra: Record<string, unknown>) => toDriveFile({ id: 'f', name: 'x.jpg', mimeType: 'image/jpeg', createdTime: '2026-10-20T10:00:00Z', ...extra })!
    expect(folderItem(file({ imageMediaMetadata: { time: '2026:06:12 10:30:00', width: 4000, height: 3000 } }))).toMatchObject({ takenAt: '2026-06-12T05:00:00.000Z', takenAtSource: 'camera', width: 4000, driveFileId: 'f' })
    expect(folderItem(file({ name: 'IMG_20260612_103000.jpg' }))).toMatchObject({ takenAt: '2026-06-12T05:00:00.000Z', takenAtSource: 'file_name' })
    expect(folderItem(file({}))).toMatchObject({ takenAt: '2026-10-20T10:00:00Z', takenAtSource: 'added' })
    expect(folderItem(file({ mimeType: 'video/mp4', name: 'v.mp4' }))).toMatchObject({ kind: 'video' })
    expect(folderItem(file({ mimeType: 'application/pdf', name: 'notes.pdf' }))).toBeNull()
    expect(folderItem(file({ mimeType: 'image/svg+xml' }))).toBeNull()
  })

  it('takes the helper’s key only when it is whole', () => {
    expect(readServiceAccount(undefined)).toBeNull()
    expect(readServiceAccount('{not json')).toBeNull()
    expect(readServiceAccount('{"client_email":"a@b"}')).toBeNull()
    expect(readServiceAccount('{"client_email":"a@b","private_key":"line\\\\nline"}')).toEqual({ client_email: 'a@b', private_key: 'line\nline' })
  })
})

// A small in-memory stand-in for the Supabase client: just the calls Her days makes.
type Row = Record<string, unknown>
const get = (row: Row, key: string): unknown => key.split('.').reduce<unknown>((value, part) => (value as Row | null | undefined)?.[part], row)

function fakeDb() {
  const tables: Record<string, Row[]> = { admin_users: [{ user_id: 'admin-1', active: true, created_at: '2026-01-01' }], import_runs: [], import_items: [], timeline_media: [], media_assets: [], video_assets: [], caption_drafts: [], her_days_state: [], family_lists: [] }
  const files = new Map<string, Buffer>()
  let ids = 0
  const unique: Record<string, string[]> = { timeline_media: ['source', 'source_item_id'], import_items: ['run_id', 'source_item_id'], her_days_state: ['key'] }
  const joinOf = (name: string) => `${name.replace(/s$/, '')}_id`

  function builder(table: string) {
    let op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
    let payload: Row[] = []
    let fields: Row = {}
    let ignore = false
    let joins: string[] = []
    let order: { key: string; ascending: boolean } | null = null
    let limit = Infinity
    let range: [number, number] | null = null
    const filters: ((row: Row) => boolean)[] = []
    const withJoins = (row: Row) => {
      const copy = { ...row }
      for (const name of joins) copy[name] = tables[name]?.find(other => other.id === row[joinOf(name)]) ?? null
      return copy
    }
    const run = (): { data: Row[] | null; error: { code: string; message: string } | null } => {
      const rows = tables[table]
      if (op === 'insert' || op === 'upsert') {
        const keys = unique[table]
        const added: Row[] = []
        for (const row of payload) {
          const clash = keys ? rows.find(other => keys.every(key => other[key] === row[key])) : undefined
          if (table === 'caption_drafts' && rows.some(other => other.media_asset_id === row.media_asset_id && other.status === 'waiting')) return { data: null, error: { code: '23505', message: 'duplicate' } }
          if (clash) {
            if (op === 'upsert' && ignore) continue
            if (op === 'upsert') { Object.assign(clash, row); added.push(clash); continue }
            return { data: null, error: { code: '23505', message: 'duplicate' } }
          }
          const defaults: Row = table === 'import_items' ? { status: 'pending', attempts: 0 } : table === 'caption_drafts' ? { status: 'waiting' } : {}
          const full = { id: `id-${++ids}`, created_at: new Date(Date.now() + ids).toISOString(), ...defaults, ...row }
          rows.push(full)
          added.push(full)
        }
        return { data: added, error: null }
      }
      let matched = rows.map(withJoins).filter(row => filters.every(filter => filter(row)))
      const originals = matched.map(row => rows.find(other => other.id === row.id) ?? row)
      if (op === 'update') { originals.forEach(row => Object.assign(row, fields)); return { data: originals, error: null } }
      if (op === 'delete') { tables[table] = rows.filter(row => !originals.includes(row)); return { data: originals, error: null } }
      if (order) { const { key, ascending } = order; matched = [...matched].sort((a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? '')) * (ascending ? 1 : -1)) }
      if (range) matched = matched.slice(range[0], range[1] + 1)
      return { data: matched.slice(0, limit), error: null }
    }
    const api = {
      select: (columns = '*') => { joins = [...columns.matchAll(/(\w+)(?:!inner)?\(/g)].map(match => match[1]); return api },
      insert: (rows: Row | Row[]) => { op = 'insert'; payload = Array.isArray(rows) ? rows : [rows]; return api },
      upsert: (rows: Row | Row[], options: { ignoreDuplicates?: boolean } = {}) => { op = 'upsert'; payload = Array.isArray(rows) ? rows : [rows]; ignore = !!options.ignoreDuplicates; return api },
      update: (value: Row) => { op = 'update'; fields = value; return api },
      delete: () => { op = 'delete'; return api },
      eq: (key: string, value: unknown) => { filters.push(row => get(row, key) === value); return api },
      neq: (key: string, value: unknown) => { filters.push(row => get(row, key) !== value); return api },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(get(row, key))); return api },
      is: (key: string, value: null) => { filters.push(row => (get(row, key) ?? null) === value); return api },
      not: (key: string) => { filters.push(row => get(row, key) != null); return api },
      lt: (key: string, value: number) => { filters.push(row => (get(row, key) as number) < value); return api },
      gte: (key: string, value: string) => { filters.push(row => String(get(row, key) ?? '') >= value); return api },
      lte: (key: string, value: string) => { filters.push(row => get(row, key) != null && String(get(row, key)) <= value); return api },
      order: (key: string, options: { ascending?: boolean } = {}) => { order ??= { key, ascending: options.ascending !== false }; return api },
      limit: (count: number) => { limit = count; return api },
      range: (from: number, to: number) => { range = [from, to]; return api },
      single: async () => { const result = run(); return { data: result.data?.[0] ?? null, error: result.error } },
      maybeSingle: async () => { const result = run(); return { data: result.data?.[0] ?? null, error: result.error } },
      then: (resolve: (value: unknown) => void, reject?: (reason: unknown) => void) => { try { resolve(run()) } catch (error) { reject?.(error) } },
    }
    return api
  }

  const db = {
    from: (table: string) => builder(table),
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === 'take_her_days_turn') {
        const state = tables.her_days_state.find(row => row.key === args.p_key)
        if ((state?.value as Row | undefined)?.running_since) return { data: false, error: null }
        if (state) state.value = { ...(state.value as Row), running_since: new Date().toISOString() }
        else tables.her_days_state.push({ key: args.p_key, value: { running_since: new Date().toISOString() } })
        return { data: true, error: null }
      }
      const claimed = tables.import_items
        .filter(row => (args.p_run_id == null || row.run_id === args.p_run_id) && row.status === 'pending')
        .sort((a, b) => String(a.source).localeCompare(String(b.source)) || String(a.taken_at ?? '~').localeCompare(String(b.taken_at ?? '~')))
        .slice(0, args.p_limit as number)
      claimed.forEach(row => { row.status = 'working'; row.attempts = (row.attempts as number) + 1 })
      return { data: claimed.map(row => ({ ...row })), error: null }
    },
    storage: {
      from: () => ({
        upload: async (path: string, data: Buffer) => { files.set(path, data); return { error: null } },
        remove: async (paths: string[]) => { paths.forEach(path => files.delete(path)); return { error: null } },
        download: async (path: string) => ({ data: files.has(path) ? new Blob([new Uint8Array(files.get(path)!)]) : null }),
      }),
    },
  }
  return { db, tables, files }
}

type FoundItem = Parameters<typeof recordFound>[3][number]
const found = (id: string, overrides: Partial<FoundItem> = {}): FoundItem => ({
  sourceItemId: id, kind: 'photo', filename: `${id}.jpg`, takenAt: '2026-06-12T05:00:00.000Z', takenAtSource: 'camera',
  description: null, width: 4000, height: 3000, driveFileId: id, ...overrides,
})

describe('her days: bringing photos in', () => {
  let jpeg: Buffer
  afterEach(() => { delete process.env.HER_DAYS_VIDEOS })
  beforeEach(async () => {
    jpeg = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#c8325a' } }).jpeg().toBuffer()
    videoState.mockReset()
  })
  const photos = (bytes: () => Buffer, extra: Record<string, unknown> = {}) => ({
    photo: vi.fn(async () => ({ bytes: bytes(), ...extra })),
    video: vi.fn(async () => ({ body: new Blob([new Uint8Array(4)]).stream(), size: 4 })),
  })

  it('keeps an upright copy no larger than 1600 pixels', async () => {
    const photo = await preparePhoto(jpeg)
    expect(Math.max(photo.width, photo.height)).toBe(1600)
    expect(photo.data.subarray(0, 2).toString('hex')).toBe('ffd8')
  })

  it('writes each new file down once, however often the folder is looked in', async () => {
    const { db, tables } = fakeDb()
    expect(await recordFound(db as never, 'run-1', 'google_drive', [found('a'), found('b'), found('a')])).toBe(2)
    expect(await recordFound(db as never, 'run-2', 'google_drive', [found('a'), found('b'), found('c')])).toBe(1)
    tables.timeline_media.push({ id: 't', source: 'google_drive', source_item_id: 'd' })
    expect(await recordFound(db as never, 'run-3', 'google_drive', [found('d')])).toBe(0)
    expect(tables.import_items.map(row => row.source_item_id)).toEqual(['a', 'b', 'c'])
  })

  it('brings photos in and places them; a WhatsApp photo waits for a look', async () => {
    const { db, tables, files } = fakeDb()
    await recordFound(db as never, 'run-1', 'google_drive', [found('a'), found('b', { filename: 'IMG-20260612-WA0001.jpg' })])
    const { progress } = await importBatch(db as never, photos(() => jpeg), 'admin-1', null, 3)
    expect(progress).toMatchObject({ total: 2, added: 2, pending: 0, failed: 0 })
    expect(tables.timeline_media.map(row => [row.source_item_id, row.visibility]).sort()).toEqual([['a', 'shown'], ['b', 'review']])
    expect(tables.timeline_media.find(row => row.source_item_id === 'a')).toMatchObject({ taken_at: '2026-06-12T05:00:00.000Z', taken_at_source: 'camera', source: 'google_drive', width: 1600, height: 1067 })
    expect(files.size).toBe(2)
  })

  it('puts a photo with no date of its own straight on the day it was put in the folder', async () => {
    const { db, tables } = fakeDb()
    const justNow = new Date(Date.now() - 60_000).toISOString()
    await recordFound(db as never, 'run-1', 'google_drive', [
      found('shot', { filename: '1792868969913.png', takenAt: justNow, takenAtSource: 'added' }),
      found('moved', { filename: 'old-photo.png', takenAt: '2026-03-01T08:00:00.000Z', takenAtSource: 'added' }),
    ])
    await importBatch(db as never, photos(() => jpeg), 'admin-1', null, 3)
    expect(tables.timeline_media.find(row => row.source_item_id === 'shot')).toMatchObject({ visibility: 'shown', review_reason: null, taken_at: justNow, taken_at_source: 'added' })
    // A file that was made in Drive long ago and only moved in waits for a look instead of landing on the wrong day.
    expect(tables.timeline_media.find(row => row.source_item_id === 'moved')).toMatchObject({ visibility: 'review' })
  })

  it('puts his own words from Google Photos under the photo, and the album’s date beats the file name', async () => {
    const { db, tables } = fakeDb()
    await recordFound(db as never, 'run-1', 'takeout', [found('V/IMG_20260601_100000.jpg', { filename: 'IMG_20260601_100000.jpg', takenAt: fileNameTime('IMG_20260601_100000.jpg'), takenAtSource: 'file_name' })])
    await importBatch(db as never, photos(() => jpeg, { takenAt: '2026-06-12T05:30:00.000Z', description: 'Butterfly Season' }), 'admin-1', null, 3)
    expect(tables.timeline_media[0]).toMatchObject({ taken_at: '2026-06-12T05:30:00.000Z', taken_at_source: 'google_photos' })
    expect(tables.media_assets[0]).toMatchObject({ caption: 'Butterfly Season', alt_text: 'A photo of Varada from 12 June 2026' })
  })

  it('adds the same photo once, even when it is in the album and the folder', async () => {
    const { db, tables, files } = fakeDb()
    await recordFound(db as never, 'run-1', 'takeout', [found('V/PXL_1.jpg', { filename: 'PXL_1.jpg', takenAt: '2026-06-12T05:30:00.000Z', takenAtSource: 'google_photos' })])
    await recordFound(db as never, 'run-2', 'google_drive', [found('drive-1', { filename: 'PXL_1.jpg', takenAt: '2026-06-12T05:30:40.000Z' })])
    const { progress } = await importBatch(db as never, photos(() => jpeg), 'admin-1', null, 3)
    expect(progress).toMatchObject({ added: 1, duplicate: 1 })
    expect(tables.timeline_media).toHaveLength(1)
    expect(tables.media_assets).toHaveLength(1)
    expect(files.size).toBe(1)
  })

  it('records a failure in plain words, cleans up, and tries again on a later check, three times at most', async () => {
    const { db, tables, files } = fakeDb()
    let broken = true
    const flaky = { photo: vi.fn(async () => { if (broken) throw new Error('Google Drive download answered 500 for https://googleapis.example/secret'); return { bytes: jpeg } }), video: vi.fn() }
    await recordFound(db as never, 'run-1', 'google_drive', [found('a')])
    const { progress: first } = await importBatch(db as never, flaky as never, 'admin-1', null, 3)
    expect(first).toMatchObject({ failed: 1, added: 0 })
    expect(tables.import_items[0].error).toBe('This one didn’t come through. Try again.')
    expect(files.size).toBe(0)
    expect(tables.media_assets).toHaveLength(0)

    expect(await retryFailed(db as never)).toBe(1)
    await importBatch(db as never, flaky as never, 'admin-1', null, 3)
    expect(await retryFailed(db as never)).toBe(1)
    broken = false
    const { progress: third } = await importBatch(db as never, flaky as never, 'admin-1', null, 3)
    expect(third).toMatchObject({ failed: 0, added: 1 })

    tables.import_items[0].status = 'failed' // pretend it failed a third time
    expect(await retryFailed(db as never)).toBe(0)
  })

  it('treats another check adding the same photo first as a duplicate, not a second copy', async () => {
    const { db, tables, files } = fakeDb()
    await recordFound(db as never, 'run-1', 'google_drive', [found('a')])
    tables.timeline_media.push({ id: 'other', source: 'google_drive', source_item_id: 'a' })
    const { progress } = await importBatch(db as never, photos(() => jpeg), 'admin-1', null, 3)
    expect(progress).toMatchObject({ duplicate: 1, added: 0 })
    expect(tables.timeline_media).toHaveLength(1)
    expect(files.size).toBe(0)
  })

  it('leaves videos out while they are switched off: written down as skipped, never fetched', async () => {
    const { db, tables } = fakeDb()
    const video = vi.fn()
    await recordFound(db as never, 'run-1', 'google_drive', [found('v', { kind: 'video', filename: 'VID_20260612_103000.mp4' }), found('p')])
    expect(tables.import_items.map(row => [row.source_item_id, row.status])).toEqual([['v', 'skipped'], ['p', 'pending']])
    tables.import_items[0].status = 'pending' // even one that slipped through is left alone
    await importBatch(db as never, { photo: vi.fn(async () => ({ bytes: jpeg })), video } as never, 'admin-1', null, 3)
    expect(video).not.toHaveBeenCalled()
    expect(tables.import_items.map(row => row.status)).toEqual(['skipped', 'added'])
  })

  it('never uploads a video over 25 MB, says so plainly, and does not try it again', async () => {
    process.env.HER_DAYS_VIDEOS = 'on'
    const { db, tables } = fakeDb()
    const upload = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', upload)
    let cancelled = false
    const big = { photo: vi.fn(), video: vi.fn(async () => ({ body: new ReadableStream<Uint8Array>({ cancel() { cancelled = true } }), size: 25 * 1024 * 1024 + 1 })) }
    await recordFound(db as never, 'run-1', 'google_drive', [found('big', { kind: 'video', filename: 'VID_20260612_103000.mp4' })])
    await importBatch(db as never, big as never, 'admin-1', null, 3)
    vi.unstubAllGlobals()
    expect(tables.import_items[0]).toMatchObject({ status: 'failed', attempts: 3, error: 'This video is too big to add here. You can add it to a story instead.' })
    expect(upload).not.toHaveBeenCalled()
    expect(tables.video_assets).toHaveLength(0)
    expect(cancelled).toBe(true)
    expect(await retryFailed(db as never)).toBe(0)
  })

  it('still sends a video of exactly 25 MB', async () => {
    process.env.HER_DAYS_VIDEOS = 'on'
    const { db, tables } = fakeDb()
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    const size = 25 * 1024 * 1024
    const edge = { photo: vi.fn(), video: vi.fn(async () => ({ body: new Blob([new Uint8Array(size)]).stream(), size })) }
    await recordFound(db as never, 'run-1', 'google_drive', [found('edge', { kind: 'video', filename: 'VID_20260612_103000.mp4' })])
    await importBatch(db as never, edge as never, 'admin-1', null, 3)
    vi.unstubAllGlobals()
    expect(tables.import_items[0].status).toBe('video_waiting')
  })

  it('sends a video off, then puts it on her days with its still once it is ready', async () => {
    process.env.HER_DAYS_VIDEOS = 'on'
    const { db, tables } = fakeDb()
    const upload = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', upload)
    await recordFound(db as never, 'run-1', 'google_drive', [found('v', { kind: 'video', filename: 'VID_20260612_103000.mp4' })])
    await importBatch(db as never, photos(() => jpeg), 'admin-1', null, 3)
    vi.unstubAllGlobals()
    expect(tables.import_items[0]).toMatchObject({ status: 'video_waiting', video_asset_id: tables.video_assets[0].id })

    videoState.mockResolvedValue({ status: 'processing', durationSeconds: null })
    expect(await finishVideos(db as never, 'admin-1', 5, async () => jpeg)).toBe(0)
    videoState.mockResolvedValue({ status: 'ready', durationSeconds: 12 })
    expect(await finishVideos(db as never, 'admin-1', 5, async () => jpeg)).toBe(1)
    expect(tables.timeline_media[0]).toMatchObject({ kind: 'video', video_asset_id: tables.video_assets[0].id, visibility: 'shown' })
    expect(tables.video_assets[0]).toMatchObject({ status: 'ready', duration_seconds: 12 })
    expect(await progressFor(db as never, {})).toMatchObject({ added: 1, waiting: 0 })
  })
})

describe('her days: the whole way, from the folder and the album to her days', () => {
  it('finds new photos in the folder and the album, brings them in, and adds nothing the second time', async () => {
    const { db, tables } = fakeDb()
    const jpeg = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#0e7c74' } }).jpeg().toBuffer()
    const zip = makeZip([
      { name: 'Takeout/Google Photos/V/PXL_20260612_053000000.jpg', data: jpeg },
      { name: 'Takeout/Google Photos/V/PXL_20260612_053000000.jpg.supplemental-metadata.json', data: Buffer.from('{"photoTakenTime":{"timestamp":"1781242200"}}') },
      { name: 'Takeout/Google Photos/V/IMG_20260701_090000.jpg', data: jpeg },
      { name: 'Takeout/Google Photos/V/IMG_20260701_090000.jpg.supplemental-metadata.json', data: Buffer.from('{"photoTakenTime":{"timestamp":"1782876600"},"description":"mamma, me, peace"}') },
    ], true)
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    process.env.GOOGLE_SERVICE_ACCOUNT = JSON.stringify({ client_email: 'helper@pawpaw.example', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) })
    const folder = [
      { id: 'new-1', name: 'IMG_20261020_181500.jpg', mimeType: 'image/jpeg', createdTime: '2026-10-20T13:00:00Z', imageMediaMetadata: { time: '2026:10:20 18:15:00' } },
      { id: 'twin', name: 'PXL_20260612_053000000.jpg', mimeType: 'image/jpeg', createdTime: '2026-10-20T13:00:00Z', imageMediaMetadata: { time: '2026:06:12 11:00:00' } },
      { id: 'pdf', name: 'notes.pdf', mimeType: 'application/pdf' },
    ]
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input))
      if (url.hostname === 'oauth2.googleapis.com') return Response.json({ access_token: 'token', expires_in: 3600 })
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer token')
      const q = url.searchParams.get('q') ?? ''
      if (q.includes("mimeType = 'application/vnd.google-apps.folder'")) return Response.json({ files: [{ id: 'her-days' }] })
      if (q.includes("'her-days' in parents")) return Response.json({ files: folder })
      if (url.pathname.endsWith(`/files/${ALBUM_ZIP_FILE_ID}`) && url.searchParams.get('fields') === 'size') return Response.json({ size: String(zip.length) })
      if (url.pathname.endsWith(`/files/${ALBUM_ZIP_FILE_ID}`)) {
        const [, start, end] = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get('range') ?? '')!
        return new Response(new Uint8Array(zip.subarray(Number(start), Number(end) + 1)), { status: 206 })
      }
      if (url.searchParams.get('alt') === 'media') return new Response(new Uint8Array(jpeg))
      return new Response('not found', { status: 404 })
    }) as unknown as typeof fetch

    try {
    const report = await syncHerDays(db as never, { deadline: Date.now() + 30_000, fetcher, draftLines: false })
    expect(report).toMatchObject({ state: 'ok', found: 4, progress: { added: 3, duplicate: 1, pending: 0, failed: 0 } })
    const placed = tables.timeline_media.map(row => [row.source, indiaDate(row.taken_at as string), row.visibility]).sort()
    expect(placed).toEqual([['google_drive', '2026-06-12', 'shown'], ['google_drive', '2026-10-20', 'shown'], ['takeout', '2026-07-01', 'shown']])
    expect(tables.media_assets.map(row => row.caption).filter(Boolean)).toEqual(['mamma, me, peace'])
    expect(tables.her_days_state.find(row => row.key === 'folder')!.value).toMatchObject({ running_since: null, state: 'ok' })

    const again = await syncHerDays(db as never, { deadline: Date.now() + 30_000, fetcher, draftLines: false })
    expect(again).toMatchObject({ state: 'ok', found: 0 })
    expect(tables.timeline_media).toHaveLength(3)
    } finally {
      delete process.env.GOOGLE_SERVICE_ACCOUNT
    }
  })

  it('streams a squeezed or plain video out of the album whole, without loading it into memory', async () => {
    const { randomBytes } = await import('node:crypto')
    const video = Buffer.concat([randomBytes(300_000), Buffer.alloc(900_000, 7)]) // part random, part squeezable
    const zip = makeZip([
      { name: 'V/VID_1.mp4', data: video, deflate: true },
      { name: 'V/VID_1.mp4.supplemental-metadata.json', data: Buffer.from('{"photoTakenTime":{"timestamp":"1781242200"},"description":"first steps"}') },
      { name: 'V/VID_2.mp4', data: video },
    ])
    const fetcher = vi.fn(async (_input: string | URL, init?: RequestInit) => {
      const [, start, end] = /bytes=(\d+)-(\d+)/.exec(new Headers(init?.headers).get('range') ?? '')!
      return new Response(new Uint8Array(zip.subarray(Number(start), Number(end) + 1)), { status: 206 })
    }) as unknown as typeof fetch
    const entries = await readEntries(async (start, end) => zip.subarray(start, end + 1), zip.length)
    const reader = makeReader(fetcher, 'token')
    const drain = async (stream: ReadableStream<Uint8Array>) => Buffer.concat(await (async () => { const out: Buffer[] = []; const r = stream.getReader(); for (;;) { const { done, value } = await r.read(); if (done) break; out.push(Buffer.from(value)) } return out })())
    const [squeezed, plain] = albumItems(entries).filter(item => item.kind === 'video').map(item => ({ id: item.sourceItemId, source: 'takeout', filename: item.filename, kind: 'video', zip_entry: item.zipEntry }))
    const first = await reader.video(squeezed as never)
    expect(first).toMatchObject({ size: video.length, takenAt: '2026-06-12T05:30:00.000Z', description: 'first steps' })
    expect((await drain(first.body)).equals(video)).toBe(true)
    const second = await reader.video(plain as never)
    expect(second.size).toBe(video.length)
    expect((await drain(second.body)).equals(video)).toBe(true)
  })

  it('does nothing, and says so, before the folder is linked', async () => {
    const { db } = fakeDb()
    expect(await syncHerDays(db as never, { deadline: Date.now() + 1000, fetcher: vi.fn() as never })).toMatchObject({ state: 'not_linked', found: 0 })
  })

  it('lists the album’s photos with the dates their names give', () => {
    const items = albumItems([
      { name: 'V/IMG_20260701_090000.jpg', method: 0, compressedSize: 1, size: 1, localHeaderOffset: 0 },
      { name: 'V/IMG_20260701_090000.jpg.json', method: 0, compressedSize: 1, size: 1, localHeaderOffset: 10 },
      { name: 'V/clip.mp4', method: 0, compressedSize: 1, size: 1, localHeaderOffset: 20 },
    ])
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ kind: 'photo', filename: 'IMG_20260701_090000.jpg', takenAtSource: 'file_name' })
    expect((items[0].zipEntry as { sidecar: ZipEntry }).sidecar.name).toBe('V/IMG_20260701_090000.jpg.json')
    expect(items[1]).toMatchObject({ kind: 'video', takenAt: null })
  })
})

describe('her days: lines under photos', () => {
  it('asks for his voice, not a caption bot’s', () => {
    const prompt = systemPrompt(['Ammuchi', 'Pupu'], ['acchan', 'amma'])
    expect(prompt).toContain('Hello? Yes, sleeping 😴')
    expect(prompt).toContain('Ammuchi, Pupu')
    expect(prompt).toMatch(/at most 10 words/)
    expect(prompt).toMatch(/Never say what is in the photo/)
    expect(prompt).toMatch(/Do not invent facts/)
  })

  it('keeps the facts of an older line but not its words', () => {
    expect(photoNote({ age: '2 weeks', date: '12 June', names: [], people: [] })).toBe('This photo is from 12 June, when she was 2 weeks.')
    expect(photoNote({ age: null, date: null, names: [], people: [], oldLine: 'Noolukettu day — named Varada.' })).toMatch(/never its words: Noolukettu day/)
  })

  it('tidies what comes back to one line', () => {
    expect(cleanLine('“Hello? Yes, sleeping”\n\nHere is why…')).toBe('Hello? Yes, sleeping')
    expect(cleanLine('   ')).toBeNull()
    expect(cleanLine('x'.repeat(121))).toBeNull()
  })

  it('drafts lines that wait for him, and redrafts the ones he asked for', async () => {
    const { db, tables, files } = fakeDb()
    const jpeg = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#ffc93c' } }).jpeg().toBuffer()
    files.set('a.jpg', jpeg); files.set('b.jpg', jpeg); files.set('story.jpg', jpeg)
    tables.media_assets.push({ id: 'm-a', storage_path: 'a.jpg', caption: null }, { id: 'm-b', storage_path: 'b.jpg', caption: 'Mine already' }, { id: 'm-story', storage_path: 'story.jpg', caption: 'A small person in a basket of wonder.' })
    tables.timeline_media.push({ id: 't-a', media_asset_id: 'm-a', taken_at: '2026-06-12T05:00:00Z', visibility: 'shown' }, { id: 't-b', media_asset_id: 'm-b', taken_at: '2026-06-13T05:00:00Z', visibility: 'shown' })
    tables.her_days_state.push({ key: 'redraft', value: { media_ids: ['m-story'] } })
    const notes: string[] = []
    const api = { beta: { messages: { create: vi.fn(async (request: { messages: { content: { type: string; text?: string }[] }[] }) => {
      notes.push(request.messages[0].content.find(part => part.type === 'text')!.text!)
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Hello? Yes, sleeping' }] }
    }) } } }
    expect(await draftMissingLines(db as never, { deadline: Date.now() + 10_000, api: api as never })).toBe(2)
    expect(tables.caption_drafts.map(row => [row.media_asset_id, row.status])).toEqual([['m-story', 'waiting'], ['m-a', 'waiting']])
    expect(notes[0]).toMatch(/basket of wonder/)
    expect(notes[1]).toMatch(/12 June/)
    expect((tables.her_days_state[0].value as { media_ids: string[] }).media_ids).toEqual([])
    // Nothing reaches the family until he decides.
    expect(tables.media_assets.find(row => row.id === 'm-a')!.caption).toBeNull()
    expect(await draftMissingLines(db as never, { deadline: Date.now() + 10_000, api: api as never })).toBe(0)
  })

  it('keeps a photo queued, and its old suggestion waiting, when a new one does not save; a redraft keeps its date', async () => {
    const { db, tables, files } = fakeDb()
    const jpeg = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#ffc93c' } }).jpeg().toBuffer()
    files.set('a.jpg', jpeg)
    tables.media_assets.push({ id: 'm-a', storage_path: 'a.jpg', caption: 'Old line' })
    tables.timeline_media.push({ id: 't-a', media_asset_id: 'm-a', taken_at: '2026-06-12T05:00:00Z', visibility: 'shown' })
    tables.caption_drafts.push({ id: 'd-old', media_asset_id: 'm-a', draft: 'first try', status: 'waiting' })
    tables.her_days_state.push({ key: 'redraft', value: { media_ids: ['m-a'] } })
    const notes: string[] = []
    const api = { beta: { messages: { create: vi.fn(async (request: { messages: { content: { type: string; text?: string }[] }[] }) => {
      notes.push(request.messages[0].content.find(part => part.type === 'text')!.text!)
      return { stop_reason: 'end_turn', content: [{ type: 'text', text: 'second try' }] }
    }) } } }
    const realFrom = db.from
    let failInsert = true
    db.from = (table: string) => {
      const query = realFrom(table)
      if (table === 'caption_drafts' && failInsert) {
        const insert = query.insert
        query.insert = ((rows: Row) => { insert(rows); return { ...query, then: (resolve: (value: unknown) => void) => resolve({ data: null, error: { code: '500', message: 'down' } }) } }) as typeof query.insert
      }
      return query
    }
    expect(await draftMissingLines(db as never, { deadline: Date.now() + 10_000, api: api as never })).toBe(0)
    expect(tables.caption_drafts.map(row => [row.id, row.status])).toEqual([['d-old', 'waiting']])
    expect((tables.her_days_state[0].value as { media_ids: string[] }).media_ids).toEqual(['m-a'])
    expect(notes[0]).toMatch(/12 June/)
    expect(notes[0]).toMatch(/Old line/)

    failInsert = false
    expect(await draftMissingLines(db as never, { deadline: Date.now() + 10_000, api: api as never })).toBe(1)
    expect(tables.caption_drafts.map(row => [row.draft, row.status])).toEqual([['first try', 'redrafted'], ['second try', 'waiting']])
    expect((tables.her_days_state[0].value as { media_ids: string[] }).media_ids).toEqual([])
  })

  it('puts a line up only when he keeps it or writes his own', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    tables.media_assets.push({ id: 'm-a', caption: null }, { id: 'm-b', caption: 'old' }, { id: 'm-c', caption: null })
    tables.caption_drafts.push(
      { id: 'd-a', media_asset_id: 'm-a', draft: 'Hello? Yes, sleeping', status: 'waiting' },
      { id: 'd-b', media_asset_id: 'm-b', draft: 'nope', status: 'waiting' },
      { id: 'd-c', media_asset_id: 'm-c', draft: 'nope', status: 'waiting' },
    )
    expect(await decideLine('d-a', { kind: 'keep' })).toEqual({ ok: true })
    expect(await decideLine('d-b', { kind: 'mine', text: '  Princess   Diaries, Day 2 ' })).toEqual({ ok: true })
    expect(await decideLine('d-c', { kind: 'mine', text: '   ' })).toMatchObject({ error: expect.stringMatching(/Write the line first/) })
    expect(await decideLine('d-c', { kind: 'again' })).toEqual({ ok: true })
    expect(await decideLine('d-c', { kind: 'keep' })).toMatchObject({ error: expect.stringMatching(/already been sorted/) })
    expect(tables.media_assets.map(row => row.caption)).toEqual(['Hello? Yes, sleeping', 'Princess Diaries, Day 2', null])
    expect(tables.caption_drafts.map(row => row.status)).toEqual(['kept', 'rewritten', 'redrafted'])
    expect(tables.her_days_state.find(row => row.key === 'redraft')!.value).toEqual({ media_ids: ['m-c'] })
  })
})

describe('her days: lines he writes himself', () => {
  it('puts his own line on a photo that had none, and never asks about it again', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    tables.media_assets.push({ id: 'm-a', caption: null }, { id: 'm-b', caption: 'A small person in a basket of wonder.' }, { id: 'm-c', caption: null })
    tables.her_days_state.push({ key: 'redraft', value: { media_ids: ['m-b', 'm-c'] } })
    expect(await writeLine('m-a', { kind: 'mine', text: '  Hello?   Yes, sleeping 😴 ' })).toEqual({ ok: true })
    expect(await writeLine('m-b', { kind: 'mine', text: 'Ammuchi has opinions' })).toEqual({ ok: true })
    expect(await writeLine('m-c', { kind: 'none' })).toEqual({ ok: true })
    expect(tables.media_assets.map(row => row.caption)).toEqual(['Hello? Yes, sleeping 😴', 'Ammuchi has opinions', null])
    expect(tables.caption_drafts.map(row => [row.media_asset_id, row.status])).toEqual([['m-a', 'rewritten'], ['m-b', 'rewritten'], ['m-c', 'no_line']])
    expect(tables.her_days_state.find(row => row.key === 'redraft')!.value).toEqual({ media_ids: [] })
  })

  it('says plainly when the line is empty, too long, or the photo is gone', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    tables.media_assets.push({ id: 'm-a', caption: null })
    expect(await writeLine('m-a', { kind: 'mine', text: '   ' })).toMatchObject({ error: expect.stringMatching(/Write the line first/) })
    expect(await writeLine('m-a', { kind: 'mine', text: 'x'.repeat(201) })).toMatchObject({ error: expect.stringMatching(/a bit long/) })
    expect(await writeLine('missing', { kind: 'mine', text: 'hi' })).toMatchObject({ error: expect.stringMatching(/didn’t save/) })
    expect(tables.caption_drafts).toHaveLength(0)
    expect(tables.media_assets[0].caption).toBeNull()
  })
})

describe('her days: which photos need a line', () => {
  it('reaches older photos even when the newest ones have all been dealt with', async () => {
    const { db, tables } = fakeDb()
    // 450 photos, newest first by day; the newest 420 were already marked "No line".
    for (let n = 0; n < 450; n++) {
      tables.media_assets.push({ id: `m${n}`, storage_path: `p${n}.jpg`, caption: null })
      tables.timeline_media.push({ id: `t${n}`, media_asset_id: `m${n}`, visibility: 'shown', taken_at: new Date(Date.UTC(2026, 9, 1) - n * 3600_000).toISOString() })
      if (n < 420) tables.caption_drafts.push({ id: `d${n}`, media_asset_id: `m${n}`, draft: '', status: 'no_line' })
    }
    const list = await photosNeedingALine(db as never, 40)
    expect(list).toHaveLength(30)
    expect(list[0].mediaId).toBe('m420')
    expect(list.at(-1)!.mediaId).toBe('m449')
  })

  it('puts the older lines he wants redone first, and leaves out a photo that is already written', async () => {
    const { db, tables } = fakeDb()
    tables.media_assets.push({ id: 'm-old', storage_path: 'a.jpg', caption: 'A small person in a basket of wonder.' }, { id: 'm-new', storage_path: 'b.jpg', caption: null }, { id: 'm-done', storage_path: 'c.jpg', caption: 'Mine' })
    tables.timeline_media.push({ id: 't1', media_asset_id: 'm-new', visibility: 'shown', taken_at: '2026-10-01T00:00:00Z' }, { id: 't2', media_asset_id: 'm-done', visibility: 'shown', taken_at: '2026-10-02T00:00:00Z' })
    tables.her_days_state.push({ key: 'redraft', value: { media_ids: ['m-old'] } })
    const list = await photosNeedingALine(db as never, 40)
    expect(list.map(item => [item.mediaId, item.caption])).toEqual([['m-old', 'A small person in a basket of wonder.'], ['m-new', null]])
  })

  it('says so when his note about a photo does not save, so nothing looks done that is not', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    tables.media_assets.push({ id: 'm-a', caption: null })
    const realFrom = db.from
    db.from = (table: string) => {
      const query = realFrom(table)
      if (table === 'caption_drafts') query.insert = (() => ({ ...query, then: (resolve: (value: unknown) => void) => resolve({ data: null, error: { code: '500', message: 'down' } }) })) as typeof query.insert
      return query
    }
    expect(await writeLine('m-a', { kind: 'none' })).toMatchObject({ error: expect.stringMatching(/didn’t save/) })
    db.from = realFrom
    expect(await writeLine('m-a', { kind: 'none' })).toEqual({ ok: true })
  })
})

describe('her days: picking things up by itself', () => {
  const knock = (key?: string) => ping.GET(new Request('https://www.heyvarada.in/api/her-days/ping', { headers: key ? { authorization: `Bearer ${key}` } : {} }))

  it('turns away a knock with no key or the wrong one, and does nothing', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    afterRuns.length = 0
    tables.her_days_state.push({ key: 'ping', value: { key: 'right-key' } })
    expect((await knock()).status).toBe(401)
    expect((await knock('wrong-key')).status).toBe(401)
    expect((await knock('right-key-but-longer')).status).toBe(401)
    expect(afterRuns).toHaveLength(0)
    deskDb = fakeDb().db // no key set up at all
    expect((await knock('anything')).status).toBe(401)
  })

  it('answers at once to the right key and looks in the folder afterwards', async () => {
    const { db, tables } = fakeDb()
    deskDb = db
    afterRuns.length = 0
    tables.her_days_state.push({ key: 'ping', value: { key: 'right-key' } })
    const answer = await knock('right-key')
    expect(answer.status).toBe(200)
    expect(await answer.text()).toBe('ok')
    expect(afterRuns).toHaveLength(1)
    await afterRuns[0]() // not linked in the test, so it finishes without touching anything
  })

  it('is set up by the database itself every two minutes, with a key nobody sees', () => {
    const timer = read('supabase/migrations/20261025090000_her_days_keeps_itself_going.sql')
    expect(timer).toContain("'*/2 * * * *'")
    expect(timer).toContain('https://www.heyvarada.in/api/her-days/ping')
    expect(timer).toContain('gen_random_uuid()')
    expect(timer).not.toMatch(/alter table public\.(media_assets|video_assets|content_items|content_revisions|content_media)/)
    expect(read('src/app/api/her-days/ping/route.ts')).toContain('timingSafeEqual')
  })
})

describe('her days: words on screen', () => {
  const files = ['src/app/(archive)/days/page.tsx', 'src/components/family/her-days.tsx', 'src/components/family/day-strip.tsx', 'src/app/admin/her-days/page.tsx', 'src/app/admin/her-days/her-days-desk.tsx', 'src/app/admin/her-days/actions.ts', 'src/lib/her-days/importer.ts', 'src/lib/her-days/days.ts']
  // Only the quoted sentences people read (they have spaces), not import paths or code around them.
  const source = files.map(read).join('\n').split('\n').filter(line => !/^\s*(import|\/\/|\*|\{\/\*)/.test(line) && !/new Error\(|\.select\(/.test(line)).join('\n')
  const visible = (source.match(/(['`"])(?:(?!\1).)*\1|>[^<>{}]+</g) ?? []).filter(text => /\s/.test(text.trim().slice(1, -1))).join(' ')

  it('speaks like a person, not like software', () => {
    for (const word of [/\bimport(ed|ing)?\b/i, /\bsession\b/i, /\bqueue\b/i, /\bsync/i, /\bprocessing\b/i, /carries on by itself/i, /Each row is/i, /Bring in from/i, /week \d/, /video service/i, /\bcaption\b/i, /\bdraft/i, /\bstorage\b/i]) {
      expect(visible).not.toMatch(word)
    }
  })
})

describe('her days: privacy and safety', () => {
  const first = read('supabase/migrations/20261022120000_her_days.sql')
  const second = read('supabase/migrations/20261023090000_her_days_folder_and_lines.sql')

  it('keeps every Her days table away from browsers', () => {
    for (const table of ['import_runs', 'timeline_media', 'import_items']) {
      expect(first).toContain(`alter table public.${table} enable row level security`)
    }
    expect(first).toContain('revoke all on public.import_runs, public.timeline_media, public.import_items from anon, authenticated')
    for (const table of ['caption_drafts', 'her_days_state']) expect(second).toContain(`alter table public.${table} enable row level security`)
    expect(second).toContain('revoke all on public.caption_drafts, public.her_days_state from anon, authenticated')
    for (const fn of ['claim_import_items(uuid, integer)', 'take_her_days_turn(text, integer)']) {
      expect(second).toContain(`revoke execute on function public.${fn} from public, anon, authenticated`)
    }
  })

  it('only adds: no table outside Her days is altered, and nothing is dropped but its own checks', () => {
    for (const migration of [first, second]) {
      expect(migration).not.toMatch(/alter table public\.(media_assets|video_assets|content_items|content_revisions|content_media)/)
      expect(migration).not.toMatch(/drop (table|column|function)/i)
    }
    expect([...second.matchAll(/drop constraint if exists (\w+)/g)].map(match => match[1]))
      .toEqual(['import_runs_source_check', 'timeline_media_source_check', 'timeline_media_taken_at_source_check', 'import_items_status_check'])
  })

  it('shows family readers only what is shown, and never a line he hasn’t kept', () => {
    const load = read('src/lib/her-days/load.ts')
    expect(load).toContain(".eq('visibility', 'shown')")
    expect(load).toContain('loadAuthorizedFamilyData')
    expect(load).not.toContain('caption_drafts')
    expect(read('src/components/family/day-strip.tsx')).not.toContain('draft')
  })

  it('keeps the Google helper’s key on the server, and the daily look behind a secret', () => {
    expect(read('src/lib/her-days/google-drive.ts')).toContain('process.env.GOOGLE_SERVICE_ACCOUNT')
    for (const file of ['src/app/admin/her-days/her-days-desk.tsx', 'src/components/family/her-days.tsx', 'src/components/family/day-strip.tsx']) {
      expect(read(file)).not.toMatch(/GOOGLE_SERVICE_ACCOUNT|ANTHROPIC_API_KEY|google-drive/)
    }
    expect(second).not.toMatch(/private_key|access_token|refresh_token/)
    expect(read('src/app/api/her-days/check/route.ts')).toContain('timingSafeEqual')
  })

  it('keeps her days pages out of shared caches', () => {
    const config = read('next.config.ts')
    expect(config).toContain("'/days'")
    expect(config).toContain("'/admin/her-days'")
  })
})
