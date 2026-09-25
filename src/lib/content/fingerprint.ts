// A short fingerprint of a story's words and details (not its photos).
// The editor sends back the fingerprint of the version it last saw. If the stored story's
// fingerprint differs, someone changed the words elsewhere (another tab, another phone),
// and the editor stops instead of overwriting them. Photo changes don't alter it, so adding
// a photo never blocks the next save.

import { createHash } from 'node:crypto'

export interface FingerprintFields {
  title: string
  summary: string | null
  body_blocks: unknown
  event_date: string | null
  event_date_precision: string | null
  authored_date: string | null
  author_display_name: string | null
  recipient_display_name: string | null
  visual_scene: string | null
}

export const FINGERPRINT_SELECT = 'title, summary, body_blocks, event_date, event_date_precision, authored_date, author_display_name, recipient_display_name, visual_scene'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort()
      .filter(key => (value as Record<string, unknown>)[key] !== undefined)
      .map(key => [key, canonical((value as Record<string, unknown>)[key])]))
  }
  return value ?? null
}

export function contentFingerprint(fields: FingerprintFields): string {
  const ordered = [fields.title, fields.summary, fields.body_blocks, fields.event_date, fields.event_date_precision,
    fields.authored_date, fields.author_display_name, fields.recipient_display_name, fields.visual_scene]
  return createHash('sha256').update(JSON.stringify(canonical(ordered))).digest('base64url').slice(0, 22)
}
