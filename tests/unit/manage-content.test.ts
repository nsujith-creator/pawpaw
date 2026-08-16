import { describe, expect, it } from 'vitest'
import {
  canPublishContentType, canDeleteContent, CREATABLE_CONTENT_TYPES,
  isReservedSlug, normalizeSlug, planContentWrite, validateContentInput,
  type ExistingContent, type ValidContentInput,
} from '@/lib/content/manage-content'

const valid: ValidContentInput = {
  type: 'story', title: 'A first story', slug: 'a-first-story',
  summary: 'A truthful introduction.', bodyBlocks: [{ type: 'paragraph', text: 'A paragraph.' }],
  eventDate: null, eventDatePrecision: null, eventDateIsApproximate: false,
  authoredDate: null, authoredDatePrecision: null, authoredDateIsApproximate: false,
  authorDisplayName: null, recipientDisplayName: null, placeText: null, relationshipContext: null, visualScene: null,
}
const existing: ExistingContent = {
  id: '00000000-0000-4000-8000-000000000001', type: 'story', slug: 'a-first-story', hasRevisionHistory: false,
}
const input = (overrides: Partial<ValidContentInput> = {}) => ({ ...valid, ...overrides })

describe('chapter slug contract', () => {
  it('normalizes lowercase ASCII and reserves application paths', () => {
    expect(normalizeSlug('  A Cafe\u0301 -- First  Day! ')).toBe('a-cafe-first-day')
    for (const slug of ['home', 'admin', 'family-login', 'auth', 'logout', 'api', 'chapters', '_next-image']) {
      expect(isReservedSlug(slug)).toBe(true)
    }
  })

  it('locks the slug after any immutable revision, including while unpublished', () => {
    expect(validateContentInput({ ...input(), slug: 'changed-address' }, { ...existing, hasRevisionHistory: true }))
      .toHaveProperty('fieldErrors.slug')
  })
})

describe('draft and publication validation', () => {
  it('allows Letter drafts and requires their family-facing fields at publication', () => {
    expect(CREATABLE_CONTENT_TYPES).toEqual(['story', 'gallery', 'letter', 'moment'])
    expect(validateContentInput({ ...input(), type: 'letter' }, null)).toHaveProperty('ok', true)
    const letter = { ...existing, type: 'letter' }
    expect(canPublishContentType('letter')).toBe(true)
    expect(planContentWrite({ input: { ...input(), type: 'letter' }, existing: letter, intent: 'publish', attachmentCount: 1 }))
      .toHaveProperty('fieldErrors.recipientDisplayName')
    expect(planContentWrite({
      input: input({ type: 'letter', authorDisplayName: 'Paru', recipientDisplayName: 'Varada', authoredDate: '2026-08-15', authoredDatePrecision: 'day' }),
      existing: letter, intent: 'publish', attachmentCount: 1,
    })).toHaveProperty('ok', true)
  })

  it('keeps optional unknown chronology and authorship null on draft save', () => {
    const result = planContentWrite({ input: input({ summary: null, bodyBlocks: [] }), existing, intent: 'save', attachmentCount: 0 })
    expect(result).toMatchObject({ payload: {
      event_date: null, authored_date: null, author_display_name: null,
      recipient_display_name: null, place_text: null, relationship_context: null,
    } })
    expect(result).not.toHaveProperty('payload.status')
    expect(result).not.toHaveProperty('payload.published_at')
  })

  it('requires date and precision as a pair and bounds family fields', () => {
    expect(validateContentInput({ ...input(), eventDate: '2026-08-01', eventDatePrecision: null }, existing))
      .toHaveProperty('fieldErrors.eventDate')
    expect(validateContentInput({ ...input(), authorDisplayName: 'a'.repeat(201) }, existing))
      .toHaveProperty('fieldErrors.authorDisplayName')
  })

  it('stores month and year precision at deterministic boundary dates', () => {
    expect(validateContentInput({ ...input(), eventDate: '2026-08-23', eventDatePrecision: 'month' }, existing))
      .toHaveProperty('data.eventDate', '2026-08-01')
    expect(validateContentInput({ ...input(), authoredDate: '2026-08-23', authoredDatePrecision: 'year' }, existing))
      .toHaveProperty('data.authoredDate', '2026-01-01')
  })

  it('requires event chronology to publish a Moment at the application boundary', () => {
    expect(planContentWrite({ input: input({ type: 'moment' }), existing: { ...existing, type: 'moment' }, intent: 'publish', attachmentCount: 1 }))
      .toHaveProperty('fieldErrors.eventDate')
    expect(planContentWrite({
      input: input({ type: 'moment', eventDate: '2026-08-01', eventDatePrecision: 'day' }),
      existing: { ...existing, type: 'moment' }, intent: 'publish', attachmentCount: 1,
    })).toHaveProperty('ok', true)
  })

  it('allows only explicit approved visual scenes and carries the choice into a write plan', () => {
    expect(validateContentInput({ ...input(), visualScene: 'reader' }, existing)).toHaveProperty('data.visualScene', 'reader')
    expect(validateContentInput({ ...input(), visualScene: 'astronaut' }, existing)).toHaveProperty('fieldErrors.visualScene')
    expect(planContentWrite({ input: input({ visualScene: 'gardener' }), existing, intent: 'save', attachmentCount: 0 }))
      .toHaveProperty('payload.visual_scene', 'gardener')
  })

  it('allows empty drafts but requires one meaningful publication source', () => {
    expect(planContentWrite({ input: input({ summary: null, bodyBlocks: [] }), existing, intent: 'save', attachmentCount: 0 })).toHaveProperty('ok', true)
    expect(planContentWrite({ input: input({ summary: null, bodyBlocks: [] }), existing, intent: 'publish', attachmentCount: 0 })).toHaveProperty('fieldErrors.form')
    expect(planContentWrite({ input: input({ summary: null, bodyBlocks: [] }), existing, intent: 'publish', attachmentCount: 1 })).toHaveProperty('ok', true)
  })

  it('protects permanent and revision-bearing items from deletion', () => {
    expect(canDeleteContent({ type: 'home', slug: 'home', hasRevisionHistory: false })).toBe(false)
    expect(canDeleteContent({ type: 'story', slug: 'first-days', hasRevisionHistory: false })).toBe(false)
    expect(canDeleteContent({ type: 'story', slug: 'another-story', hasRevisionHistory: true })).toBe(false)
    expect(canDeleteContent({ type: 'story', slug: 'another-story', hasRevisionHistory: false })).toBe(true)
  })
})
