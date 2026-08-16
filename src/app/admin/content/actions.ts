'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  canDeleteContent, isValidId, planContentWrite, validateContentInput,
  type ExistingContent, type FieldErrors,
} from '@/lib/content/manage-content'

export interface ContentActionResult {
  ok?: true
  id?: string
  message?: string
  error?: string
  fieldErrors?: FieldErrors
}

async function requireAdminWithOrigin() {
  checkOrigin(await headers())
  const supabase = await createClient()
  return requireActiveAdmin(supabase)
}

function parseBlocks(formData: FormData): unknown {
  try { return JSON.parse((formData.get('body_blocks') as string | null) ?? '[]') }
  catch { return Symbol('invalid-json') }
}

function text(formData: FormData, key: string): string | null {
  return ((formData.get(key) as string | null) ?? '').trim() || null
}

function revalidateContent(item: { id: string; slug: string }) {
  revalidatePath('/admin')
  revalidatePath('/admin/content')
  revalidatePath(`/admin/content/${item.id}`)
  revalidatePath(`/admin/content/${item.id}/preview`)
  revalidatePath('/chapters')
  if (item.slug === 'first-days') revalidatePath('/first-days')
  else revalidatePath(`/chapters/${item.slug}`)
}

export async function saveChapter(formData: FormData): Promise<ContentActionResult> {
  const admin = await requireAdminWithOrigin()
  const db = createAdminClient()
  const id = text(formData, 'id') ?? ''
  const intent = formData.get('intent') === 'publish' ? 'publish' as const : 'save' as const
  if (id && !isValidId(id)) return { error: 'That chapter could not be found.' }

  let existing: ExistingContent | null = null
  if (id) {
    const item = await db.from('content_items').select('id, type, slug').eq('id', id).neq('type', 'home').maybeSingle()
    if (item.error) return { error: 'Could not load this chapter. Please try again.' }
    if (!item.data) return { error: 'That chapter could not be found.' }
    const history = await db.from('content_revisions').select('id', { count: 'exact', head: true }).eq('content_item_id', id)
    if (history.error || history.count === null) return { error: 'Could not verify publication history. Please try again.' }
    existing = { ...item.data, hasRevisionHistory: history.count > 0 }
  }

  const blocks = parseBlocks(formData)
  if (typeof blocks === 'symbol') {
    return { error: 'Please correct the marked fields.', fieldErrors: { bodyBlocks: 'The structured copy could not be read. Refresh and try again.' } }
  }
  const validated = validateContentInput({
    type: text(formData, 'type') ?? '', title: text(formData, 'title') ?? '',
    slug: text(formData, 'slug') ?? '', summary: text(formData, 'summary'), bodyBlocks: blocks,
    eventDate: text(formData, 'event_date'), eventDatePrecision: text(formData, 'event_date_precision'),
    eventDateIsApproximate: formData.get('event_date_is_approximate') === 'true',
    authoredDate: text(formData, 'authored_date'), authoredDatePrecision: text(formData, 'authored_date_precision'),
    authoredDateIsApproximate: formData.get('authored_date_is_approximate') === 'true',
    authorDisplayName: text(formData, 'author_display_name'),
    recipientDisplayName: text(formData, 'recipient_display_name'),
    placeText: text(formData, 'place_text'), relationshipContext: text(formData, 'relationship_context'),
    visualScene: text(formData, 'visual_scene'),
  }, existing)
  if ('error' in validated) return validated

  const collisionQuery = db.from('content_items').select('id').eq('slug', validated.data.slug)
  if (id) collisionQuery.neq('id', id)
  const collision = await collisionQuery.limit(1)
  if (collision.error) return { error: 'Could not check the chapter address. Please try again.' }
  if ((collision.data ?? []).length > 0) return { error: 'Please correct the marked fields.', fieldErrors: { slug: 'That slug is already used by another chapter.' } }

  let attachmentCount = 0
  if (id) {
    const attachments = await db.from('content_media').select('media_id', { count: 'exact', head: true }).eq('content_id', id)
    if (attachments.error || attachments.count === null) return { error: 'Could not verify the attached photographs. Please try again.' }
    attachmentCount = attachments.count
  }
  const plan = planContentWrite({ input: validated.data, existing, intent, attachmentCount })
  if ('error' in plan) return plan

  let saved: { id: string; slug: string } | null = null
  if (!id) {
    const inserted = await db.from('content_items').insert({
      ...plan.payload, type: validated.data.type, status: 'draft', published_at: null,
      created_by: admin.id, updated_by: admin.id,
    }).select('id, slug').single()
    if (inserted.error || !inserted.data) return { error: 'The draft could not be saved. Please try again.' }
    saved = inserted.data
  } else {
    const updated = await db.from('content_items').update({ ...plan.payload, updated_by: admin.id })
      .eq('id', id).neq('type', 'home').select('id, slug').maybeSingle()
    if (updated.error || !updated.data) return { error: 'The draft could not be saved. Please try again.' }
    saved = updated.data
  }

  if (intent === 'publish') {
    const published = await db.rpc('publish_content_revision', { p_admin_id: admin.id, p_content_id: saved.id })
    if (published.error) {
      console.error('publish_content_revision failed:', published.error)
      revalidateContent(saved)
      return { id: saved.id, error: 'The private draft was saved, but publication failed. The family version was not changed.' }
    }
    revalidateContent(saved)
    const revisionNumber = Number((published.data as { revision_number?: unknown } | null)?.revision_number)
    return { ok: true, id: saved.id, message: Number.isInteger(revisionNumber) ? `Revision ${revisionNumber} published for the family.` : 'A new immutable revision was published for the family.' }
  }

  revalidateContent(saved)
  return { ok: true, id: saved.id, message: 'Private draft saved. Any published family version is unchanged.' }
}

export async function unpublishChapter(formData: FormData): Promise<ContentActionResult> {
  const admin = await requireAdminWithOrigin()
  const id = text(formData, 'id') ?? ''
  if (!isValidId(id)) return { error: 'That chapter could not be found.' }
  const db = createAdminClient()
  const existing = await db.from('content_items').select('id, slug, type').eq('id', id).neq('type', 'home').maybeSingle()
  if (existing.error || !existing.data) return { error: 'That chapter could not be found.' }
  const unpublished = await db.rpc('unpublish_content_revision', { p_admin_id: admin.id, p_content_id: id })
  if (unpublished.error) {
    console.error('unpublish_content_revision failed:', unpublished.error)
    return { error: 'The chapter could not be unpublished. The family version was not changed.' }
  }
  revalidateContent(existing.data)
  return { ok: true, id, message: 'Chapter unpublished. Revision history and the private draft were preserved.' }
}

export async function deleteChapter(formData: FormData): Promise<ContentActionResult> {
  await requireAdminWithOrigin()
  const id = text(formData, 'id') ?? ''
  const confirmedTitle = (formData.get('confirmed_title') as string | null) ?? ''
  if (!isValidId(id)) return { error: 'That chapter could not be found.' }
  const db = createAdminClient()
  const item = await db.from('content_items').select('id, type, slug, title').eq('id', id).maybeSingle()
  if (item.error || !item.data) return { error: 'That chapter could not be found.' }
  const history = await db.from('content_revisions').select('id', { count: 'exact', head: true }).eq('content_item_id', id)
  if (history.error || history.count === null) return { error: 'Publication history could not be verified. Nothing was deleted.' }
  if (!canDeleteContent({ type: item.data.type, slug: item.data.slug, hasRevisionHistory: history.count > 0 })) {
    return { error: history.count > 0 ? 'Published history cannot be deleted. Unpublish this chapter instead.' : 'Home and First Days cannot be deleted.' }
  }
  if (confirmedTitle !== item.data.title) return { error: 'Type the exact chapter title to confirm deletion.' }
  const deleted = await db.from('content_items').delete().eq('id', item.data.id).neq('type', 'home').neq('slug', 'first-days').select('id').maybeSingle()
  if (deleted.error || !deleted.data) return { error: 'The chapter could not be deleted. Nothing else was changed.' }
  revalidatePath('/admin'); revalidatePath('/admin/content'); revalidatePath('/admin/media'); revalidatePath('/chapters'); revalidatePath(`/chapters/${item.data.slug}`)
  return { ok: true, id: item.data.id, message: 'Draft chapter deleted. Its photographs remain in Media Library.' }
}
