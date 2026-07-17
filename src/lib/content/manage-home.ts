import type { SupabaseClient } from '@supabase/supabase-js'
import type { ContentBlock } from './schema'

const SAVE_FAILED = 'Could not save right now. Please try again in a moment.'

export interface HomeWritePayload {
  title: string
  body_blocks: ContentBlock[]
  status: 'draft' | 'published'
  published_at: string | null
  updated_by: string
}

export interface HomeMutationStore {
  findCanonical(): Promise<{ rows: { id: string }[] | null; error: unknown | null }>
  updateCanonical(id: string, payload: HomeWritePayload): Promise<{ id: string | null; error: unknown | null }>
  unpublishCanonical(id: string, adminId: string): Promise<{ id: string | null; error: unknown | null }>
  insertCanonical(payload: HomeWritePayload & { created_by: string }): Promise<{ id: string | null; error: unknown | null }>
}

export type HomeMutationResult = { ok: true; id: string } | { error: string }

export async function saveCanonicalHome(
  store: HomeMutationStore,
  adminId: string,
  requestedId: string | null,
  payload: Omit<HomeWritePayload, 'updated_by'>,
): Promise<HomeMutationResult> {
  const found = await store.findCanonical()
  if (found.error || found.rows === null || found.rows.length > 1) return { error: SAVE_FAILED }

  const existing = found.rows[0]
  if (existing) {
    if (requestedId && requestedId !== existing.id) {
      return { error: 'The Home page changed while this form was open. Refresh and try again.' }
    }
    const updated = await store.updateCanonical(existing.id, { ...payload, updated_by: adminId })
    if (updated.error || updated.id !== existing.id) return { error: SAVE_FAILED }
    return { ok: true, id: existing.id }
  }

  if (requestedId) return { error: SAVE_FAILED }
  const inserted = await store.insertCanonical({ ...payload, updated_by: adminId, created_by: adminId })
  if (inserted.error || !inserted.id) return { error: SAVE_FAILED }
  return { ok: true, id: inserted.id }
}

export async function unpublishCanonicalHome(
  store: HomeMutationStore,
  adminId: string,
): Promise<HomeMutationResult> {
  const found = await store.findCanonical()
  if (found.error || found.rows === null || found.rows.length !== 1) return { error: SAVE_FAILED }
  const id = found.rows[0].id
  const updated = await store.unpublishCanonical(id, adminId)
  if (updated.error || updated.id !== id) return { error: SAVE_FAILED }
  return { ok: true, id }
}

export function createHomeMutationStore(db: SupabaseClient): HomeMutationStore {
  return {
    async findCanonical() {
      const { data, error } = await db
        .from('content_items')
        .select('id')
        .eq('type', 'home')
        .eq('slug', 'home')
        .limit(2)
      return { rows: data as { id: string }[] | null, error }
    },
    async updateCanonical(id, payload) {
      const { data, error } = await db
        .from('content_items')
        .update(payload)
        .eq('id', id)
        .eq('type', 'home')
        .eq('slug', 'home')
        .select('id')
        .maybeSingle()
      return { id: data?.id ?? null, error }
    },
    async unpublishCanonical(id, adminId) {
      const { data, error } = await db
        .from('content_items')
        .update({ status: 'draft', published_at: null, updated_by: adminId })
        .eq('id', id)
        .eq('type', 'home')
        .eq('slug', 'home')
        .select('id')
        .maybeSingle()
      return { id: data?.id ?? null, error }
    },
    async insertCanonical(payload) {
      const { data, error } = await db
        .from('content_items')
        .insert({ ...payload, type: 'home', slug: 'home' })
        .select('id')
        .single()
      return { id: data?.id ?? null, error }
    },
  }
}

export type AdminHomeLoadResult<T> =
  | { state: 'error' }
  | { state: 'empty' }
  | { state: 'ready'; item: T }

export async function loadCanonicalAdminHome<T>(
  query: () => Promise<{ rows: T[] | null; error: unknown | null }>,
): Promise<AdminHomeLoadResult<T>> {
  const result = await query()
  if (result.error || result.rows === null || result.rows.length > 1) return { state: 'error' }
  if (result.rows.length === 0) return { state: 'empty' }
  return { state: 'ready', item: result.rows[0] }
}
