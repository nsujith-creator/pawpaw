import { z } from 'zod'
import { bodyBlocksSchema, type ContentBlock } from './schema'

export const MANAGED_CONTENT_TYPES = ['story', 'gallery', 'letter', 'moment'] as const
export type ManagedContentType = typeof MANAGED_CONTENT_TYPES[number]
export const CREATABLE_CONTENT_TYPES = ['story', 'gallery', 'letter', 'moment'] as const
export const DATE_PRECISIONS = ['day', 'month', 'year'] as const
export type DatePrecision = typeof DATE_PRECISIONS[number]
export type PublicationState = 'unpublished' | 'published' | 'published-draft'
export type ContentIntent = 'save' | 'publish'

const RESERVED_SLUGS = new Set([
  'home', 'admin', 'family-login', 'auth', 'logout', 'api',
  'chapters', 'manifest', 'favicon',
])
const idSchema = z.string().uuid()

export interface ContentInput {
  type: string
  title: string
  slug: string
  summary: string | null
  bodyBlocks: unknown
  eventDate: string | null
  eventDatePrecision: string | null
  eventDateIsApproximate: boolean
  authoredDate: string | null
  authoredDatePrecision: string | null
  authoredDateIsApproximate: boolean
  authorDisplayName: string | null
  recipientDisplayName: string | null
  placeText: string | null
  relationshipContext: string | null
}

export interface ValidContentInput {
  type: ManagedContentType
  title: string
  slug: string
  summary: string | null
  bodyBlocks: ContentBlock[]
  eventDate: string | null
  eventDatePrecision: DatePrecision | null
  eventDateIsApproximate: boolean
  authoredDate: string | null
  authoredDatePrecision: DatePrecision | null
  authoredDateIsApproximate: boolean
  authorDisplayName: string | null
  recipientDisplayName: string | null
  placeText: string | null
  relationshipContext: string | null
}

export interface FieldErrors {
  type?: string
  title?: string
  slug?: string
  summary?: string
  bodyBlocks?: string
  eventDate?: string
  authoredDate?: string
  authorDisplayName?: string
  recipientDisplayName?: string
  placeText?: string
  relationshipContext?: string
  form?: string
}

export type ContentValidationResult =
  | { ok: true; data: ValidContentInput }
  | { error: string; fieldErrors: FieldErrors }

export interface ExistingContent {
  id: string
  type: string
  slug: string
  hasRevisionHistory: boolean
}

export interface ContentWritePlan {
  title: string
  slug: string
  summary: string | null
  body_blocks: ContentBlock[]
  event_date: string | null
  event_date_precision: DatePrecision | null
  event_date_is_approximate: boolean
  authored_date: string | null
  authored_date_precision: DatePrecision | null
  authored_date_is_approximate: boolean
  author_display_name: string | null
  recipient_display_name: string | null
  place_text: string | null
  relationship_context: string | null
}

export function isValidId(value: string): boolean {
  return idSchema.safeParse(value).success
}

export function canPublishContentType(type: string): boolean {
  return CREATABLE_CONTENT_TYPES.includes(type as typeof CREATABLE_CONTENT_TYPES[number])
}

export function normalizeSlug(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

export function isReservedSlug(slug: string, existing?: ExistingContent | null): boolean {
  if (slug.startsWith('_next')) return true
  if (slug === 'first-days') return existing?.type !== 'story' || existing.slug !== 'first-days'
  return RESERVED_SLUGS.has(slug)
}

function cleanText(value: string | null, maximum: number, field: keyof FieldErrors, errors: FieldErrors): string | null {
  const cleaned = value?.trim() ?? ''
  if (cleaned.length > maximum) errors[field] = `Keep this field to ${maximum} characters or fewer.`
  else if (/<[^>]+>/.test(cleaned)) errors[field] = 'HTML is not permitted.'
  return cleaned || null
}

function validDate(value: string | null): boolean {
  if (value === null) return true
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function precision(value: string | null): DatePrecision | null {
  return DATE_PRECISIONS.includes(value as DatePrecision) ? value as DatePrecision : null
}

function normalizeDateForPrecision(value: string | null, datePrecision: DatePrecision | null): string | null {
  if (!value || !datePrecision) return null
  if (datePrecision === 'year') return `${value.slice(0, 4)}-01-01`
  if (datePrecision === 'month') return `${value.slice(0, 7)}-01`
  return value
}

export function validateContentInput(input: ContentInput, existing: ExistingContent | null = null): ContentValidationResult {
  const fieldErrors: FieldErrors = {}
  const type = MANAGED_CONTENT_TYPES.includes(input.type as ManagedContentType) ? input.type as ManagedContentType : null
  if (!type) fieldErrors.type = 'Choose Story, Gallery, Letter, or Moment.'

  const title = input.title.trim()
  if (!title) fieldErrors.title = 'Enter a title.'
  else if (title.length > 200) fieldErrors.title = 'Keep the title to 200 characters or fewer.'

  const slug = normalizeSlug(input.slug)
  if (slug.length < 3 || slug.length > 80) fieldErrors.slug = 'Use a slug between 3 and 80 characters.'
  else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) fieldErrors.slug = 'Use lowercase letters, numbers, and single hyphens only.'
  else if (isReservedSlug(slug, existing)) fieldErrors.slug = 'That slug is reserved. Choose another.'
  else if (existing?.hasRevisionHistory && slug !== existing.slug) fieldErrors.slug = 'The slug is locked because this chapter has publication history.'
  else if (existing?.slug === 'first-days' && slug !== 'first-days') fieldErrors.slug = 'First Days keeps its canonical slug.'

  const summary = cleanText(input.summary, 2000, 'summary', fieldErrors)
  const authorDisplayName = cleanText(input.authorDisplayName, 200, 'authorDisplayName', fieldErrors)
  const recipientDisplayName = cleanText(input.recipientDisplayName, 200, 'recipientDisplayName', fieldErrors)
  const placeText = cleanText(input.placeText, 300, 'placeText', fieldErrors)
  const relationshipContext = cleanText(input.relationshipContext, 500, 'relationshipContext', fieldErrors)

  const eventDate = input.eventDate?.trim() || null
  const eventDatePrecision = precision(input.eventDatePrecision)
  if (!validDate(eventDate) || Boolean(eventDate) !== Boolean(eventDatePrecision)) {
    fieldErrors.eventDate = 'Enter a date and choose whether it is known to the day, month, or year.'
  }
  const authoredDate = input.authoredDate?.trim() || null
  const authoredDatePrecision = precision(input.authoredDatePrecision)
  if (!validDate(authoredDate) || Boolean(authoredDate) !== Boolean(authoredDatePrecision)) {
    fieldErrors.authoredDate = 'Enter an authored date and its known precision together.'
  }

  const parsedBlocks = bodyBlocksSchema.safeParse(input.bodyBlocks)
  if (!parsedBlocks.success) {
    const issue = parsedBlocks.error.issues[0]
    const block = typeof issue?.path[0] === 'number' ? ` Block ${Number(issue.path[0]) + 1}:` : ''
    fieldErrors.bodyBlocks = `${block} ${issue?.message ?? 'The structured copy is not valid.'}`.trim()
  }

  if (Object.keys(fieldErrors).length > 0 || !type || !parsedBlocks.success) {
    return { error: 'Please correct the marked fields.', fieldErrors }
  }
  return { ok: true, data: {
    type, title, slug, summary, bodyBlocks: parsedBlocks.data,
    eventDate: normalizeDateForPrecision(eventDate, eventDatePrecision), eventDatePrecision, eventDateIsApproximate: eventDate ? input.eventDateIsApproximate : false,
    authoredDate: normalizeDateForPrecision(authoredDate, authoredDatePrecision), authoredDatePrecision, authoredDateIsApproximate: authoredDate ? input.authoredDateIsApproximate : false,
    authorDisplayName, recipientDisplayName, placeText, relationshipContext,
  } }
}

export function hasMeaningfulCopy(blocks: ContentBlock[]): boolean {
  return blocks.some(block => block.type !== 'media' && block.text.trim().length > 0)
}

export function planContentWrite({ input, existing, intent, attachmentCount }: {
  input: ValidContentInput
  existing: ExistingContent | null
  intent: ContentIntent
  attachmentCount: number
}): { ok: true; payload: ContentWritePlan } | { error: string; fieldErrors: FieldErrors } {
  if (!existing && intent !== 'save') return { error: 'Save the draft before publishing it.', fieldErrors: { form: 'Save the draft first.' } }
  if (existing?.type === 'home') return { error: 'Home is managed only through the Home editor.', fieldErrors: { form: 'Open the Home editor.' } }
  if (existing && input.type !== existing.type) return { error: 'The chapter type cannot be changed after creation.', fieldErrors: { type: 'The saved chapter type is locked.' } }
  if (intent === 'publish' && !canPublishContentType(input.type)) return { error: 'This chapter type cannot be published.', fieldErrors: { form: 'Choose a supported chapter type.' } }
  if (intent === 'publish' && input.type === 'letter' && (!input.authorDisplayName || !input.recipientDisplayName || !input.authoredDate || !input.authoredDatePrecision)) {
    return {
      error: 'A Letter needs an author, recipient, and authored date before publication.',
      fieldErrors: {
        ...(input.authorDisplayName ? {} : { authorDisplayName: 'Enter the family-facing author of this Letter.' }),
        ...(input.recipientDisplayName ? {} : { recipientDisplayName: 'Enter who this Letter is for.' }),
        ...(!input.authoredDate || !input.authoredDatePrecision ? { authoredDate: 'Enter the authored date and its known precision.' } : {}),
      },
    }
  }
  if (intent === 'publish' && input.type === 'moment' && (!input.eventDate || !input.eventDatePrecision)) {
    return { error: 'A Moment needs its event date before publication.', fieldErrors: { eventDate: 'Enter the Moment date and precision.' } }
  }
  if (intent === 'publish' && !input.summary && !hasMeaningfulCopy(input.bodyBlocks) && attachmentCount < 1) {
    return { error: 'Add an introduction, written copy, or an attached photograph before publishing.', fieldErrors: { form: 'A published chapter needs at least one meaningful source.' } }
  }
  return { ok: true, payload: {
    title: input.title, slug: input.slug, summary: input.summary, body_blocks: input.bodyBlocks,
    event_date: input.eventDate, event_date_precision: input.eventDatePrecision,
    event_date_is_approximate: input.eventDateIsApproximate,
    authored_date: input.authoredDate, authored_date_precision: input.authoredDatePrecision,
    authored_date_is_approximate: input.authoredDateIsApproximate,
    author_display_name: input.authorDisplayName, recipient_display_name: input.recipientDisplayName,
    place_text: input.placeText, relationship_context: input.relationshipContext,
  } }
}

export function canDeleteContent(item: Pick<ExistingContent, 'type' | 'slug' | 'hasRevisionHistory'>): boolean {
  return !item.hasRevisionHistory && item.type !== 'home' && item.slug !== 'first-days' &&
    MANAGED_CONTENT_TYPES.includes(item.type as ManagedContentType)
}
