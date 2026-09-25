// Loads her names and her people for the family pages, falling back to the starting lists
// if the saved ones can't be read, so Home never shows an empty section.

import { createAdminClient } from '@/lib/supabase/admin'
import { HER_NAMES, HER_PEOPLE, type HerName, type HerPerson } from './her-names'

const text = (value: unknown, max = 200) => typeof value === 'string' ? value.trim().slice(0, max) : ''

export function cleanNames(items: unknown): HerName[] {
  if (!Array.isArray(items)) return []
  return items.flatMap(item => {
    const name = text((item as HerName)?.text)
    if (!name) return []
    const note = text((item as HerName)?.note)
    const href = text((item as HerName)?.href)
    return [{ text: name, ...(note ? { note } : {}), ...(href.startsWith('/') ? { href } : {}) }]
  }).slice(0, 40)
}

export function cleanPeople(items: unknown): HerPerson[] {
  if (!Array.isArray(items)) return []
  return items.flatMap(item => {
    const malayalam = text((item as HerPerson)?.malayalam)
    const said = text((item as HerPerson)?.said)
    return malayalam || said ? [{ malayalam, said }] : []
  }).slice(0, 40)
}

export interface FamilyLists {
  names: HerName[]
  people: HerPerson[]
  // When they're the starting lists because the saved ones couldn't be read. The desk refuses
  // to edit these, so a stale copy can never overwrite the real lists.
  fallback: boolean
  // When each list was last saved, so two editors can't silently overwrite each other.
  savedAt: { names: string | null; people: string | null }
}

export async function getFamilyLists(): Promise<FamilyLists> {
  const fallback: FamilyLists = { names: HER_NAMES, people: HER_PEOPLE, fallback: true, savedAt: { names: null, people: null } }
  try {
    const { data, error } = await createAdminClient().from('family_lists').select('key, items, updated_at')
    if (error || !data) return fallback
    const byKey = new Map(data.map(row => [row.key as string, row as { items: unknown; updated_at: string }]))
    const names = byKey.get('her-names')
    const people = byKey.get('her-people')
    return {
      names: names ? cleanNames(names.items) : HER_NAMES,
      people: people ? cleanPeople(people.items) : HER_PEOPLE,
      fallback: false,
      savedAt: { names: names?.updated_at ?? null, people: people?.updated_at ?? null },
    }
  } catch {
    return fallback
  }
}
