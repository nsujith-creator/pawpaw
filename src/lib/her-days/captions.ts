// Drafts the line under a photo, in Sujith's voice, for him to keep, rewrite or skip on the desk.
// Nothing drafted here is ever shown to the family until he says so: drafts live in caption_drafts,
// and only a kept or rewritten line is copied to media_assets.caption.

import Anthropic from '@anthropic-ai/sdk'
import sharp from 'sharp'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ageAt } from '@/lib/family/age'
import { cleanNames, cleanPeople } from '@/lib/family/lists'
import { indiaDate } from './days'

const MODEL = 'claude-opus-5-5'

// His own lines, as he wrote them. They set the voice; they are never reused word for word.
const HIS_LINES = [
  'Hello? Yes, sleeping 😴',
  'My Ammuchi ❤️',
  'mamma, me, peace 😇',
  'Princess Diaries, Day 2',
  'Butterfly Season',
]

export function systemPrompt(names: string[], people: string[]) {
  return [
    'You write the one line that sits under a photo on heyvarada.in, a private family site about Varada, a baby girl born on 29 May 2026 in Kerala.',
    'Her father, Sujith (she calls him acchan), approves or rewrites every line before anyone sees it, so write it the way he would.',
    '',
    'His own lines, for the voice:',
    ...HIS_LINES.map(line => `- ${line}`),
    '',
    'What she is called at home: ' + names.join(', ') + '.',
    'Her people (what she calls them): ' + people.join(', ') + '.',
    '',
    'How the line should sound:',
    '- One line, at most 10 words. Lower case is fine. At most one emoji, and only when it helps.',
    '- A person talking: a dad teasing his daughter, a friend bantering, a running joke. Not a description.',
    '- Never say what is in the photo the way a caption bot would ("a baby lying on a blanket", "wrapped in pink").',
    '- Never use: tiny, precious, little one, bundle, magic, wonder, journey, impossibly, adorable, sweet dreams, heart, world.',
    '- Do not invent facts: no places, events, outings, names of who is holding her, or what happened before or after, unless it is unmistakable in the photo or given to you.',
    '- She is a baby, so anything she "says" is plainly his joke (like "Hello? Yes, sleeping"), never a claim about what she thinks.',
    '- Use one of her names now and then, not every time.',
    '',
    'Reply with the line only. No quotes, no explanation.',
  ].join('\n')
}

export function cleanLine(text: string): string | null {
  const line = text.split('\n').map(part => part.trim()).find(Boolean)?.replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim()
  if (!line || line.length > 120) return null
  return line
}

let client: Anthropic | null = null
function claude() {
  if (!process.env.ANTHROPIC_API_KEY) return null
  client ??= new Anthropic()
  return client
}

export function canDraft() { return Boolean(process.env.ANTHROPIC_API_KEY) }

// One drafted line for one photo, or null if nothing usable came back.
export interface LineContext { age: string | null; date: string | null; names: string[]; people: string[]; oldLine?: string | null }

// What Claude is told about one photo, besides the photo itself.
export function photoNote(context: LineContext) {
  const parts = [context.age && context.date ? `This photo is from ${context.date}, when she was ${context.age}.` : 'Write the line for this photo.']
  if (context.oldLine) parts.push(`An older line for it, which Sujith wants replaced. Keep any facts it gives (a day, a name, what happened), never its words: ${context.oldLine}`)
  return parts.join('\n')
}

export async function draftLine(photo: Buffer, context: LineContext, api = claude()): Promise<string | null> {
  if (!api) return null
  const small = await sharp(photo).rotate().resize({ width: 768, height: 768, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer()
  const response = await api.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: [{ type: 'text', text: systemPrompt(context.names, context.people), cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: small.toString('base64') } },
        { type: 'text', text: photoNote(context) },
      ],
    }],
  })
  if (response.stop_reason === 'refusal') return null
  const text = response.content.filter(block => block.type === 'text').map(block => block.text).join('\n')
  return cleanLine(text)
}

interface Candidate { mediaId: string; storagePath: string; takenAt: string | null; oldLine: string | null }

// Photos that need a line: on her days with none yet, plus older lines Sujith asked to have redrafted.
async function candidates(db: SupabaseClient, limit: number): Promise<Candidate[]> {
  const picked: Candidate[] = []
  const { data: redraft } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
  const redraftIds = ((redraft?.value as { media_ids?: string[] } | undefined)?.media_ids ?? []).slice(0, limit)
  if (redraftIds.length) {
    const { data } = await db.from('media_assets').select('id, storage_path, caption').in('id', redraftIds)
    // A photo on her days keeps its date and age for the new line; a story photo has none here.
    const { data: dated } = await db.from('timeline_media').select('media_asset_id, taken_at').in('media_asset_id', redraftIds)
    const takenAt = new Map((dated ?? []).map(row => [row.media_asset_id as string, (row.taken_at as string | null) ?? null]))
    for (const row of data ?? []) picked.push({ mediaId: row.id as string, storagePath: row.storage_path as string, takenAt: takenAt.get(row.id as string) ?? null, oldLine: (row.caption as string | null) ?? null })
  }
  if (picked.length < limit) {
    const { data } = await db.from('timeline_media').select('media_asset_id, taken_at, media_assets!inner(storage_path, caption)')
      .is('media_assets.caption', null).in('visibility', ['shown', 'review']).order('taken_at', { ascending: false }).limit(200)
    const ids = (data ?? []).map(row => row.media_asset_id as string)
    const { data: drafted } = ids.length ? await db.from('caption_drafts').select('media_asset_id').in('media_asset_id', ids) : { data: [] }
    const seen = new Set((drafted ?? []).map(row => row.media_asset_id as string))
    for (const row of (data ?? []) as unknown as { media_asset_id: string; taken_at: string | null; media_assets: { storage_path: string } }[]) {
      if (picked.length >= limit) break
      if (seen.has(row.media_asset_id)) continue
      picked.push({ mediaId: row.media_asset_id, storagePath: row.media_assets.storage_path, takenAt: row.taken_at, oldLine: null })
    }
  }
  return picked
}

export async function draftMissingLines(db: SupabaseClient, options: { deadline: number; limit?: number; api?: Anthropic | null }): Promise<number> {
  const api = options.api === undefined ? claude() : options.api
  if (!api) return 0
  const lists = await db.from('family_lists').select('key, items')
  const names = cleanNames(lists.data?.find(row => row.key === 'her-names')?.items).map(name => name.text)
  const people = cleanPeople(lists.data?.find(row => row.key === 'her-people')?.items).map(person => person.said)
  const { data: redraft } = await db.from('her_days_state').select('value').eq('key', 'redraft').maybeSingle()
  let redraftIds = (redraft?.value as { media_ids?: string[] } | undefined)?.media_ids ?? []

  let drafted = 0
  for (const candidate of await candidates(db, options.limit ?? 12)) {
    if (Date.now() >= options.deadline) break
    try {
      const file = await db.storage.from('media').download(candidate.storagePath)
      if (!file.data) continue
      const date = candidate.takenAt ? indiaDate(candidate.takenAt) : null
      const line = await draftLine(Buffer.from(await file.data.arrayBuffer()), {
        age: date ? ageAt(date) : null,
        date: date ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : null,
        names, people, oldLine: candidate.oldLine,
      }, api)
      if (!line) continue
      // A newer draft replaces any still waiting for the same photo. If the new one doesn't save,
      // the old one goes back to waiting and the photo stays on the redraft list.
      const { data: retired } = await db.from('caption_drafts').update({ status: 'redrafted', decided_at: new Date().toISOString() })
        .eq('media_asset_id', candidate.mediaId).eq('status', 'waiting').select('id')
      const { error } = await db.from('caption_drafts').insert({ media_asset_id: candidate.mediaId, draft: line })
      if (error) {
        const ids = (retired ?? []).map(row => row.id as string)
        if (ids.length) await db.from('caption_drafts').update({ status: 'waiting', decided_at: null }).in('id', ids)
        continue
      }
      drafted++
      if (redraftIds.includes(candidate.mediaId)) {
        redraftIds = redraftIds.filter(id => id !== candidate.mediaId)
        await db.from('her_days_state').upsert({ key: 'redraft', value: { media_ids: redraftIds }, updated_at: new Date().toISOString() })
      }
    } catch (error) {
      console.error('A line could not be drafted.', { message: error instanceof Error ? error.message.slice(0, 160) : 'unknown' })
    }
  }
  return drafted
}
