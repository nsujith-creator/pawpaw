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

export async function getFamilyLists(): Promise<{ names: HerName[]; people: HerPerson[] }> {
  try {
    const { data, error } = await createAdminClient().from('family_lists').select('key, items')
    if (error || !data) return { names: HER_NAMES, people: HER_PEOPLE }
    const byKey = new Map(data.map(row => [row.key as string, row.items as unknown]))
    return {
      names: byKey.has('her-names') ? cleanNames(byKey.get('her-names')) : HER_NAMES,
      people: byKey.has('her-people') ? cleanPeople(byKey.get('her-people')) : HER_PEOPLE,
    }
  } catch {
    return { names: HER_NAMES, people: HER_PEOPLE }
  }
}
