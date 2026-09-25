'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { checkOrigin } from '@/lib/auth/origin'
import { requireActiveAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { contentFingerprint, FINGERPRINT_SELECT, type FingerprintFields } from '@/lib/content/fingerprint'
import {
  canDeleteContent, isValidId, planContentWrite, validateContentInput,
  type ExistingContent, type FieldErrors,
} from '@/lib/content/manage-content'

export interface ContentActionResult {
  ok?: true
  id?: string
  slug?: string
  fingerprint?: string
  published?: boolean
  message?: string
  error?: string
  fieldErrors?: FieldErrors
  // The editor keeps every word on screen for these; it never navigates away.
  signedOut?: true
  conflict?: true
}

const SIGNED_OUT: ContentActionResult = { error: "You've been signed out. Your words are still here; sign in again in another tab, then press Retry.", signedOut: true }

type SavedRow = FingerprintFields & { id: string; slug: string }

async function requireAdminWithOrigin() {
  checkOrigin(await headers())
  const supabase = await createClient()
  return requireActiveAdmin(supabase)
}

async function adminOrNull() {
  try { return await requireAdminWithOrigin() } catch { return null }
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
  const admin = await adminOrNull()
  if (!admin) return SIGNED_OUT
  const db = createAdminClient()
  const id = text(formData, 'id') ?? ''
  const intent = formData.get('intent') === 'publish' ? 'publish' as const : 'save' as const
  const expectedFingerprint = text(formData, 'expected_fingerprint')
  if (id && !isValidId(id)) return { error: "This story isn't there any more." }

  let existing: ExistingContent | null = null
  let readAt: string | null = null
  if (id) {
    const item = await db.from('content_items').select(`id, type, slug, updated_at, ${FINGERPRINT_SELECT}`).eq('id', id).neq('type', 'home').maybeSingle()
    if (item.error) return { error: "Couldn't reach the story just now. Retry in a moment." }
    if (!item.data) return { error: "This story isn't there any more." }
    // Another tab or device saved this story since this page loaded. Don't overwrite it blind.
    if (expectedFingerprint && contentFingerprint(item.data as unknown as FingerprintFields) !== expectedFingerprint) {
      return { conflict: true, error: 'This story was changed somewhere else, maybe another tab. Reload to see that version; copy anything you want to keep first.' }
    }
    const history = await db.from('content_revisions').select('id', { count: 'exact', head: true }).eq('content_item_id', id)
    if (history.error || history.count === null) return { error: "Couldn't reach the story just now. Retry in a moment." }
    existing = { id: item.data.id as string, type: item.data.type as string, slug: item.data.slug as string, hasRevisionHistory: history.count > 0 }
    readAt = item.data.updated_at as string
  }

  const blocks = parseBlocks(formData)
  if (typeof blocks === 'symbol') {
    return { error: "The words couldn't be read. Retry, and if it keeps happening, copy them somewhere safe and reload.", fieldErrors: { bodyBlocks: "The words couldn't be read." } }
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
  if (collision.error) return { error: "Couldn't reach the story just now. Retry in a moment." }
  if ((collision.data ?? []).length > 0) return { error: 'Another story already has this title. Change a word or two.', fieldErrors: { slug: 'Another story already has this title.' } }

  let attachmentCount = 0
  if (id) {
    const attachments = await db.from('content_media').select('media_id', { count: 'exact', head: true }).eq('content_id', id)
    if (attachments.error || attachments.count === null) return { error: "Couldn't reach the story just now. Retry in a moment." }
    attachmentCount = attachments.count
  }
  const plan = planContentWrite({ input: validated.data, existing, intent, attachmentCount })
  if ('error' in plan) return plan

  let saved: SavedRow | null = null
  if (!id) {
    const inserted = await db.from('content_items').insert({
      ...plan.payload, type: validated.data.type, status: 'draft', published_at: null,
      created_by: admin.id, updated_by: admin.id,
    }).select(`id, slug, ${FINGERPRINT_SELECT}`).single()
    if (inserted.error || !inserted.data) return { error: "Not saved. Couldn't reach the server; retry in a moment." }
    saved = inserted.data as unknown as SavedRow
  } else {
    // Write only if the story is still exactly as read above, so two saves arriving together
    // can't both pass the check: the second one finds the row changed and stops.
    const updated = await db.from('content_items').update({ ...plan.payload, updated_by: admin.id })
      .eq('id', id).eq('updated_at', readAt!).neq('type', 'home').select(`id, slug, ${FINGERPRINT_SELECT}`).maybeSingle()
    if (updated.error) return { error: "Not saved. Couldn't reach the server; retry in a moment." }
    if (!updated.data) return { conflict: true, error: 'This story was changed somewhere else at the same moment. Reload to see that version; copy anything you want to keep first.' }
    saved = updated.data as unknown as SavedRow
  }

  if (intent === 'publish') {
    const published = await db.rpc('publish_content_revision', { p_admin_id: admin.id, p_content_id: saved.id })
    if (published.error) {
      console.error('publish_content_revision failed:', published.error)
      revalidateContent(saved)
      return { id: saved.id, slug: saved.slug, fingerprint: contentFingerprint(saved), error: "Saved, but it didn't reach her page. The family still sees the earlier version. Try again." }
    }
    revalidateContent(saved)
    return { ok: true, id: saved.id, slug: saved.slug, fingerprint: contentFingerprint(saved), published: true, message: 'On her page now.' }
  }

  revalidateContent(saved)
  return { ok: true, id: saved.id, slug: saved.slug, fingerprint: contentFingerprint(saved), message: 'Saved' }
}

export async function unpublishChapter(formData: FormData): Promise<ContentActionResult> {
  const admin = await adminOrNull()
  if (!admin) return SIGNED_OUT
  const id = text(formData, 'id') ?? ''
  if (!isValidId(id)) return { error: 'That chapter could not be found.' }
  const db = createAdminClient()
  const existing = await db.from('content_items').select('id, slug, type').eq('id', id).neq('type', 'home').maybeSingle()
  if (existing.error || !existing.data) return { error: 'That chapter could not be found.' }
  const unpublished = await db.rpc('unpublish_content_revision', { p_admin_id: admin.id, p_content_id: id })
  if (unpublished.error) {
    console.error('unpublish_content_revision failed:', unpublished.error)
    return { error: "Couldn't take it down just now. It's still on her page. Try again." }
  }
  revalidateContent(existing.data)
  return { ok: true, id, message: "Taken off her page. It's kept here as a draft." }
}

export async function deleteChapter(formData: FormData): Promise<ContentActionResult> {
  if (!await adminOrNull()) return SIGNED_OUT
  const id = text(formData, 'id') ?? ''
  const confirmedTitle = (formData.get('confirmed_title') as string | null) ?? ''
  if (!isValidId(id)) return { error: 'That chapter could not be found.' }
  const db = createAdminClient()
  const item = await db.from('content_items').select('id, type, slug, title').eq('id', id).maybeSingle()
  if (item.error || !item.data) return { error: 'That chapter could not be found.' }
  const history = await db.from('content_revisions').select('id', { count: 'exact', head: true }).eq('content_item_id', id)
  if (history.error || history.count === null) return { error: 'Publication history could not be verified. Nothing was deleted.' }
  if (!canDeleteContent({ type: item.data.type, slug: item.data.slug, hasRevisionHistory: history.count > 0 })) {
    return { error: history.count > 0 ? "A story that's been on her page can't be deleted, only taken down." : "First Days can't be deleted." }
  }
  if (confirmedTitle !== item.data.title) return { error: 'Type the title exactly to delete it.' }
  const deleted = await db.from('content_items').delete().eq('id', item.data.id).neq('type', 'home').neq('slug', 'first-days').select('id').maybeSingle()
  if (deleted.error || !deleted.data) return { error: "Couldn't delete it just now. Nothing was changed." }
  revalidatePath('/admin'); revalidatePath('/admin/content'); revalidatePath('/admin/media'); revalidatePath('/chapters'); revalidatePath(`/chapters/${item.data.slug}`)
  return { ok: true, id: item.data.id, message: 'Deleted. Its photos are still in Photos.' }
}
