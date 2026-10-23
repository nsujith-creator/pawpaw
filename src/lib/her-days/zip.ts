// Reads single files out of a big zip without downloading the whole thing.
// The album export from Google Photos is one 17 GB zip in Drive. A zip keeps a table of contents
// at its very end, so Pawpaw reads that table first, then fetches only the bytes of each photo it
// needs. Works with zips over 4 GB (ZIP64), which Google's exports always are.

import { inflateRawSync } from 'node:zlib'

export type ReadRange = (start: number, end: number) => Promise<Buffer>

export interface ZipEntry {
  name: string
  method: number          // 0 stored, 8 deflated
  compressedSize: number
  size: number
  localHeaderOffset: number
}

const EOCD = 0x06054b50
const ZIP64_LOCATOR = 0x07064b50
const ZIP64_EOCD = 0x06064b50
const CENTRAL = 0x02014b50
const LOCAL = 0x04034b50
const MAX32 = 0xffffffff

function readUInt64(buffer: Buffer, offset: number) {
  return Number(buffer.readBigUInt64LE(offset))
}

// The table of contents: every file's name, size and where its bytes start.
export async function readEntries(read: ReadRange, zipSize: number): Promise<ZipEntry[]> {
  const tailLength = Math.min(zipSize, 65_557 + 20)
  const tail = await read(zipSize - tailLength, zipSize - 1)
  let eocd = -1
  for (let i = tail.length - 22; i >= 0; i--) { if (tail.readUInt32LE(i) === EOCD) { eocd = i; break } }
  if (eocd < 0) throw new Error('Not a zip file')

  let entryCount = tail.readUInt16LE(eocd + 10)
  let directorySize = tail.readUInt32LE(eocd + 12)
  let directoryOffset = tail.readUInt32LE(eocd + 16)

  const locator = eocd - 20
  if (locator >= 0 && tail.readUInt32LE(locator) === ZIP64_LOCATOR) {
    const zip64Offset = readUInt64(tail, locator + 8)
    const record = await read(zip64Offset, zip64Offset + 55)
    if (record.readUInt32LE(0) !== ZIP64_EOCD) throw new Error('Broken ZIP64 record')
    entryCount = readUInt64(record, 32)
    directorySize = readUInt64(record, 40)
    directoryOffset = readUInt64(record, 48)
  }

  const directory = await read(directoryOffset, directoryOffset + directorySize - 1)
  const entries: ZipEntry[] = []
  let at = 0
  for (let n = 0; n < entryCount && at + 46 <= directory.length; n++) {
    if (directory.readUInt32LE(at) !== CENTRAL) throw new Error('Broken zip table of contents')
    const method = directory.readUInt16LE(at + 10)
    let compressedSize = directory.readUInt32LE(at + 20)
    let size = directory.readUInt32LE(at + 24)
    const nameLength = directory.readUInt16LE(at + 28)
    const extraLength = directory.readUInt16LE(at + 30)
    const commentLength = directory.readUInt16LE(at + 32)
    let localHeaderOffset = directory.readUInt32LE(at + 42)
    const name = directory.subarray(at + 46, at + 46 + nameLength).toString('utf8')
    // Sizes or offsets too big for 32 bits live in the ZIP64 extra field, in this order.
    let extra = at + 46 + nameLength
    const extraEnd = extra + extraLength
    while (extra + 4 <= extraEnd) {
      const id = directory.readUInt16LE(extra)
      const length = directory.readUInt16LE(extra + 2)
      if (id === 0x0001) {
        let field = extra + 4
        if (size === MAX32) { size = readUInt64(directory, field); field += 8 }
        if (compressedSize === MAX32) { compressedSize = readUInt64(directory, field); field += 8 }
        if (localHeaderOffset === MAX32) { localHeaderOffset = readUInt64(directory, field) }
      }
      extra += 4 + length
    }
    if (!name.endsWith('/')) entries.push({ name, method, compressedSize, size, localHeaderOffset })
    at = extraEnd + commentLength
  }
  return entries
}

// Where an entry's own bytes begin (its local header has its own name and extra lengths).
export async function dataStart(read: ReadRange, entry: ZipEntry): Promise<number> {
  const header = await read(entry.localHeaderOffset, entry.localHeaderOffset + 29)
  if (header.readUInt32LE(0) !== LOCAL) throw new Error('Broken zip entry')
  return entry.localHeaderOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28)
}

export async function readEntry(read: ReadRange, entry: ZipEntry): Promise<Buffer> {
  const start = await dataStart(read, entry)
  const raw = entry.compressedSize ? await read(start, start + entry.compressedSize - 1) : Buffer.alloc(0)
  if (entry.method === 0) return raw
  if (entry.method === 8) return inflateRawSync(raw)
  throw new Error(`Unsupported zip compression ${entry.method}`)
}

const MEDIA = /\.(jpe?g|png|heic|heif|webp|gif|mp4|mov|m4v|3gp|webm)$/i
const VIDEO = /\.(mp4|mov|m4v|3gp|webm)$/i

export function isMedia(name: string) { return MEDIA.test(name) }
export function isVideo(name: string) { return VIDEO.test(name) }

// Google Photos writes a sidecar beside each photo: "IMG_1.jpg.supplemental-metadata.json", often cut
// short ("IMG_1.jpg.supplemental-me.json"), or the older "IMG_1.jpg.json". A copy named "IMG_1(1).jpg"
// gets "IMG_1.jpg.supplemental-metadata(1).json". This finds the sidecar for each photo.
export function matchSidecars(entries: ZipEntry[]): Map<string, ZipEntry> {
  const byKey = new Map<string, ZipEntry>()
  for (const entry of entries) {
    if (!entry.name.toLowerCase().endsWith('.json')) continue
    const dir = entry.name.slice(0, entry.name.lastIndexOf('/') + 1)
    const file = entry.name.slice(dir.length, -'.json'.length)
    const copy = /\((\d+)\)$/.exec(file)
    const withoutCopy = copy ? file.slice(0, -copy[0].length) : file
    const media = /^(.*?\.(?:jpe?g|png|heic|heif|webp|gif|mp4|mov|m4v|3gp|webm))(?:\..*)?$/i.exec(withoutCopy)
    if (!media) continue
    const name = media[1]
    const key = copy ? `${dir}${name.replace(/(\.[^.]+)$/, `(${copy[1]})$1`)}` : `${dir}${name}`
    byKey.set(key.toLowerCase(), entry)
  }
  const result = new Map<string, ZipEntry>()
  for (const entry of entries) {
    if (!isMedia(entry.name)) continue
    const sidecar = byKey.get(entry.name.toLowerCase())
    if (sidecar) result.set(entry.name, sidecar)
  }
  return result
}

export interface Sidecar { takenAt: string | null; description: string | null; title: string | null }

export function parseSidecar(json: Buffer): Sidecar {
  try {
    const body = JSON.parse(json.toString('utf8')) as { photoTakenTime?: { timestamp?: string }; description?: string; title?: string }
    const seconds = Number(body.photoTakenTime?.timestamp)
    return {
      takenAt: Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1000).toISOString() : null,
      description: body.description?.trim() || null,
      title: body.title ?? null,
    }
  } catch {
    return { takenAt: null, description: null, title: null }
  }
}
