'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import BlockEditor from '@/components/content/block-editor'
import type { ChapterContent } from '@/lib/content/chapters'
import type { ContentBlock } from '@/lib/content/schema'
import {
  canPublishContentType,
  CREATABLE_CONTENT_TYPES,
  normalizeSlug,
  type FieldErrors,
  type ManagedContentType,
} from '@/lib/content/manage-content'
import { VARADA_SCENE_OPTIONS } from '@/lib/varada-scenes'
import { deleteChapter, saveChapter, unpublishChapter, type ContentActionResult } from './actions'
import AttachmentList, { type AttachmentItem, type ReplacementCandidate } from '../media/attachment-list'
import UploadForm from '../media/upload-form'
import VideoUploadForm from './video-upload-form'
import styles from '../admin.module.css'

interface Props {
  existing: ChapterContent | null
  replacementCandidates?: ReplacementCandidate[]
}

const TYPE_LABELS: Record<ManagedContentType, string> = {
  story: 'Story',
  gallery: 'Gallery',
  letter: 'Letter',
  moment: 'Moment',
}

const TYPE_GUIDANCE: Record<ManagedContentType, string> = {
  story: 'Use a Story for a written memory. Add photographs after you save the first draft.',
  gallery: 'Use a Gallery for a photo-led memory. Add a short introduction now, then add photographs after you save the first draft.',
  letter: 'Use a Letter for words to a specific person. An author, recipient, and authored date are required before publication.',
  moment: 'Use a Moment for a dated milestone. An event date is required before it can be published.',
}

export default function ChapterEditor({ existing, replacementCandidates = [] }: Props) {
  const router = useRouter()
  const [type, setType] = useState<ManagedContentType>(existing?.type ?? 'story')
  const [title, setTitle] = useState(existing?.title ?? '')
  const [slug, setSlug] = useState(existing?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(existing))
  const [summary, setSummary] = useState(existing?.summary ?? '')
  const [eventDate, setEventDate] = useState(existing?.eventDate ?? '')
  const [eventDatePrecision, setEventDatePrecision] = useState(existing?.eventDatePrecision ?? 'day')
  const [eventDateIsApproximate, setEventDateIsApproximate] = useState(existing?.eventDateIsApproximate ?? false)
  const [authoredDate, setAuthoredDate] = useState(existing?.authoredDate ?? '')
  const [authoredDatePrecision, setAuthoredDatePrecision] = useState(existing?.authoredDatePrecision ?? 'day')
  const [authoredDateIsApproximate, setAuthoredDateIsApproximate] = useState(existing?.authoredDateIsApproximate ?? false)
  const [authorDisplayName, setAuthorDisplayName] = useState(existing?.authorDisplayName ?? '')
  const [recipientDisplayName, setRecipientDisplayName] = useState(existing?.recipientDisplayName ?? '')
  const [placeText, setPlaceText] = useState(existing?.placeText ?? '')
  const [relationshipContext, setRelationshipContext] = useState(existing?.relationshipContext ?? '')
  const [visualScene, setVisualScene] = useState(existing?.visualScene ?? '')
  const [blocks, setBlocks] = useState<ContentBlock[]>(existing?.bodyBlocks ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTitle, setDeleteTitle] = useState('')

  const firstDays = existing?.slug === 'first-days'
  const slugLocked = existing?.revisionNumber !== null && existing?.revisionNumber !== undefined || firstDays
  const canPublish = Boolean(existing && canPublishContentType(existing.type))
  const attachments: AttachmentItem[] = useMemo(() => (existing?.media ?? []).map(item => ({
    mediaId: item.id,
    signedUrl: item.signedUrl,
    altText: item.altText,
    caption: item.caption,
    mimeType: item.mimeType,
    byteSize: item.byteSize,
    sortOrder: item.sortOrder,
    isCover: existing?.coverMediaId === item.id,
  })), [existing])

  function clearMessages() {
    setError('')
    setSuccess('')
    setFieldErrors({})
  }

  function applyResult(result: ContentActionResult) {
    if (result.error) {
      setError(result.error)
      setFieldErrors(result.fieldErrors ?? {})
      return false
    }
    if (result.message) setSuccess(result.message)
    return true
  }

  async function submit(intent: 'save' | 'publish') {
    clearMessages()
    setBusy(true)
    try {
      const data = new FormData()
      if (existing?.id) data.set('id', existing.id)
      data.set('intent', intent)
      data.set('type', type)
      data.set('title', title)
      data.set('slug', slug)
      data.set('summary', summary)
      data.set('body_blocks', JSON.stringify(blocks))
      data.set('event_date', eventDate)
      data.set('event_date_precision', eventDate ? eventDatePrecision : '')
      data.set('event_date_is_approximate', eventDateIsApproximate ? 'true' : 'false')
      data.set('authored_date', authoredDate)
      data.set('authored_date_precision', authoredDate ? authoredDatePrecision : '')
      data.set('authored_date_is_approximate', authoredDateIsApproximate ? 'true' : 'false')
      data.set('author_display_name', authorDisplayName)
      data.set('recipient_display_name', recipientDisplayName)
      data.set('place_text', placeText)
      data.set('relationship_context', relationshipContext)
      data.set('visual_scene', visualScene)
      const result = await saveChapter(data)
      if (!applyResult(result)) return
      if (!existing && result.id) {
        router.push(`/admin/content/${result.id}`)
        return
      }
      router.refresh()
    } catch {
      setError('Something went wrong while saving. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function unpublish() {
    if (!existing) return
    clearMessages()
    setBusy(true)
    try {
      const data = new FormData()
      data.set('id', existing.id)
      const result = await unpublishChapter(data)
      if (applyResult(result)) router.refresh()
    } catch {
      setError('Something went wrong while unpublishing. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function removeChapter() {
    if (!existing) return
    clearMessages()
    setBusy(true)
    try {
      const data = new FormData()
      data.set('id', existing.id)
      data.set('confirmed_title', deleteTitle)
      const result = await deleteChapter(data)
      if (applyResult(result)) router.push('/admin/content')
    } catch {
      setError('Something went wrong while deleting. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.editorStack}>
      <nav className={styles.studioSteps} aria-label="Memory authoring steps">
        <a href="#memory-details">1 Details</a>
        <a href="#memory-story">2 Story</a>
        <a href="#memory-scene">3 Scene</a>
        <a href="#memory-media">4 Media</a>
        <a href="#memory-review">5 Review</a>
      </nav>
      {existing && (
        <div className={styles.editorStatusRow}>
          <p className={`${styles.statusLine} ${existing.activeRevisionId ? styles.statusPublished : styles.statusDraft}`}>
            Status: {existing.publicationState === 'published-draft' ? 'published with newer private draft' : existing.publicationState}
          </p>
          {existing.publishedAt && (
            <p className={styles.meta}>Selected revision {existing.revisionNumber} published {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(existing.publishedAt))}.</p>
          )}
        </div>
      )}

      <div id="memory-details" className={styles.fieldGroup}>
        <label htmlFor="chapter-type" className={styles.fieldLabel}>Chapter type</label>
        {existing ? (
          <p className={styles.readOnlyField}>{TYPE_LABELS[existing.type]}</p>
        ) : (
          <select id="chapter-type" value={type} onChange={event => setType(event.target.value as ManagedContentType)} className={styles.select} aria-invalid={Boolean(fieldErrors.type)}>
            {CREATABLE_CONTENT_TYPES.map(value => <option key={value} value={value}>{TYPE_LABELS[value]}</option>)}
          </select>
        )}
        <p className={styles.help}>{TYPE_GUIDANCE[type]}</p>
        {fieldErrors.type && <p role="alert" className={styles.fieldError}>{fieldErrors.type}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="chapter-title" className={styles.fieldLabel}>Title</label>
        <input
          id="chapter-title"
          value={title}
          onChange={event => {
            const nextTitle = event.target.value
            setTitle(nextTitle)
            if (!slugTouched && !existing) setSlug(normalizeSlug(nextTitle))
          }}
          className={styles.field}
          aria-invalid={Boolean(fieldErrors.title)}
        />
        {fieldErrors.title && <p role="alert" className={styles.fieldError}>{fieldErrors.title}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="chapter-slug" className={styles.fieldLabel}>Chapter address</label>
        <div className={styles.slugField}>
          <span aria-hidden="true">/chapters/</span>
          <input
            id="chapter-slug"
            value={slug}
            onChange={event => { setSlugTouched(true); setSlug(event.target.value) }}
            onBlur={() => setSlug(normalizeSlug(slug))}
            disabled={slugLocked}
            className={styles.field}
            aria-invalid={Boolean(fieldErrors.slug)}
          />
        </div>
        <p className={styles.help}>
          {firstDays
            ? 'First Days keeps its canonical /first-days family route.'
            : slugLocked
              ? 'This address is permanently locked because the chapter has been published before.'
              : 'Lowercase letters, numbers, and hyphens; 3–80 characters. It locks after first publication.'}
        </p>
        {fieldErrors.slug && <p role="alert" className={styles.fieldError}>{fieldErrors.slug}</p>}
      </div>

      <div className={styles.fieldGroup}>
        <label htmlFor="chapter-summary" className={styles.fieldLabel}>Introduction (optional)</label>
        <textarea id="chapter-summary" value={summary} onChange={event => setSummary(event.target.value)} rows={5} className={styles.textarea} aria-invalid={Boolean(fieldErrors.summary)} />
        {fieldErrors.summary && <p role="alert" className={styles.fieldError}>{fieldErrors.summary}</p>}
      </div>

      <section className={styles.fieldGroup} aria-labelledby="chapter-context-heading">
        <h2 id="chapter-context-heading" className={styles.fieldLabel}>Family chronology and context</h2>
        <label htmlFor="chapter-event-date" className={styles.fieldLabel}>Event date {type === 'moment' ? '(required to publish a Moment)' : '(optional)'}</label>
        <input id="chapter-event-date" type="date" value={eventDate} onChange={event => setEventDate(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.eventDate)} />
        {eventDate && <>
          <label htmlFor="chapter-event-precision" className={styles.fieldLabel}>Event date precision</label>
          <select id="chapter-event-precision" value={eventDatePrecision} onChange={event => setEventDatePrecision(event.target.value as 'day' | 'month' | 'year')} className={styles.select}>
            <option value="day">Exact day</option><option value="month">Month only</option><option value="year">Year only</option>
          </select>
          <label className={styles.help}><input type="checkbox" checked={eventDateIsApproximate} onChange={event => setEventDateIsApproximate(event.target.checked)} /> Approximate event date</label>
        </>}
        {fieldErrors.eventDate && <p role="alert" className={styles.fieldError}>{fieldErrors.eventDate}</p>}

        <label htmlFor="chapter-authored-date" className={styles.fieldLabel}>Authored date {type === 'letter' ? '(required to publish a Letter)' : '(optional)'}</label>
        <input id="chapter-authored-date" type="date" value={authoredDate} onChange={event => setAuthoredDate(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.authoredDate)} />
        {authoredDate && <>
          <label htmlFor="chapter-authored-precision" className={styles.fieldLabel}>Authored date precision</label>
          <select id="chapter-authored-precision" value={authoredDatePrecision} onChange={event => setAuthoredDatePrecision(event.target.value as 'day' | 'month' | 'year')} className={styles.select}>
            <option value="day">Exact day</option><option value="month">Month only</option><option value="year">Year only</option>
          </select>
          <label className={styles.help}><input type="checkbox" checked={authoredDateIsApproximate} onChange={event => setAuthoredDateIsApproximate(event.target.checked)} /> Approximate authored date</label>
        </>}
        {fieldErrors.authoredDate && <p role="alert" className={styles.fieldError}>{fieldErrors.authoredDate}</p>}

        <label htmlFor="chapter-author" className={styles.fieldLabel}>Family-facing author {type === 'letter' ? '(required to publish a Letter)' : '(optional)'}</label>
        <input id="chapter-author" value={authorDisplayName} onChange={event => setAuthorDisplayName(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.authorDisplayName)} />
        <label htmlFor="chapter-recipient" className={styles.fieldLabel}>Recipient {type === 'letter' ? '(required to publish a Letter)' : '(optional)'}</label>
        <input id="chapter-recipient" value={recipientDisplayName} onChange={event => setRecipientDisplayName(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.recipientDisplayName)} />
        <label htmlFor="chapter-place" className={styles.fieldLabel}>Place (optional)</label>
        <input id="chapter-place" value={placeText} onChange={event => setPlaceText(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.placeText)} />
        <label htmlFor="chapter-relationship" className={styles.fieldLabel}>Relationship context (optional)</label>
        <input id="chapter-relationship" value={relationshipContext} onChange={event => setRelationshipContext(event.target.value)} className={styles.field} aria-invalid={Boolean(fieldErrors.relationshipContext)} />
        <p className={styles.help}>These are family facts. Leave them blank when unknown; administrator identity is never used as the family author.</p>
      </section>

      <section id="memory-story" className={styles.fieldGroup} aria-labelledby="write-memory-heading">
        <h2 id="write-memory-heading" className={styles.subsectionTitle}>Write the memory</h2>
        <p className={styles.help}>Add a paragraph for the story, a heading to begin a new part, or a quote for someone’s exact words. You can keep it simple and add more later.</p>
        <BlockEditor blocks={blocks} onChange={setBlocks} error={fieldErrors.bodyBlocks} />
      </section>

      <section id="memory-scene" className={styles.fieldGroup} aria-labelledby="memory-scene-heading">
        <h2 id="memory-scene-heading" className={styles.subsectionTitle}>Choose a decorative scene</h2>
        <label htmlFor="visual-scene" className={styles.fieldLabel}>Illustration for this memory</label>
        <select id="visual-scene" value={visualScene} onChange={event => setVisualScene(event.target.value)} className={styles.select} aria-invalid={Boolean(fieldErrors.visualScene)}>
          <option value="">No illustration</option>
          {VARADA_SCENE_OPTIONS.map(scene => <option key={scene.id} value={scene.id}>{scene.label}</option>)}
        </select>
        <p className={styles.help}>Choose only when it fits the memory. The illustration stays separate from family photographs, captions, and controls. It is saved with this private draft and becomes part of the published revision only when you publish.</p>
        {fieldErrors.visualScene && <p role="alert" className={styles.fieldError}>{fieldErrors.visualScene}</p>}
      </section>

      <div id="memory-review" className={styles.editorActionBar}>
        <button type="button" disabled={busy} onClick={() => submit('save')} className={styles.secondaryAction}>
          Save private draft
        </button>
        {existing && (
          <>
            {canPublish && (
              <button type="button" disabled={busy} onClick={() => submit('publish')} className={styles.action}>
                {existing.activeRevisionId ? 'Publish new revision' : 'Publish'}
              </button>
            )}
            {existing.activeRevisionId && <button type="button" disabled={busy} onClick={unpublish} className={styles.secondaryAction}>Unpublish</button>}
            <a href={`/admin/content/${existing.id}/preview`} className={styles.secondaryAction}>Preview</a>
          </>
        )}
      </div>
      <p className={styles.help}>
        {existing?.type === 'letter'
          ? 'Saving changes only the private draft. A Letter needs its author, recipient, and authored date before publishing creates an immutable family revision.'
          : existing
            ? 'Saving changes only the private draft. Add photographs below whenever you are ready; publishing creates a new immutable family revision.'
            : 'Save this first private draft to unlock photograph upload, preview, and publication.'}
      </p>

      {busy && <p role="status" className={styles.informationNotice}>Saving your changes…</p>}
      {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
      {success && <p role="status" className={styles.successNotice}>{success}</p>}

      {existing ? (
        <>
          <hr className={styles.sectionDivider} />
          <section id="memory-media" aria-labelledby="chapter-photos-title">
            <h2 id="chapter-photos-title" className={styles.sectionTitle}>Chapter photographs</h2>
            <p className={styles.lede}>Photographs remain private. Set a cover explicitly for the Chapters index; no cover is chosen automatically.</p>
            <AttachmentList
              contentId={existing.id}
              contentLabel={existing.title}
              contentSlug={existing.slug}
              items={attachments}
              replacementCandidates={replacementCandidates}
              allowCover
            />
          </section>
          <section className={styles.editorSection} aria-labelledby="upload-photo-title">
            <h2 id="upload-photo-title" className={styles.sectionTitle}>Upload a photograph</h2>
            <UploadForm contentItemId={existing.id} targetLabel={existing.title} />
          </section>
          <section className={styles.editorSection} aria-labelledby="upload-video-title">
            <h2 id="upload-video-title" className={styles.sectionTitle}>Upload a video</h2>
            <VideoUploadForm contentId={existing.id} />
          </section>

          {!firstDays && existing.revisionNumber === null && (
            <section className={styles.dangerZone} aria-labelledby="delete-chapter-title">
              <h2 id="delete-chapter-title" className={styles.sectionTitle}>Delete chapter</h2>
              <p>Deleting removes this chapter and its photo associations. The photo files remain in Media Library.</p>
              {!deleteOpen ? (
                <button type="button" className={styles.dangerAction} onClick={() => { clearMessages(); setDeleteOpen(true) }}>Delete chapter…</button>
              ) : (
                <div className={styles.confirmation}>
                  <p className={styles.confirmationText}>Confirm deletion of “{existing.title}”. Type the exact title as the second confirmation.</p>
                  <label htmlFor="confirm-delete-title" className={styles.fieldLabel}>Exact chapter title</label>
                  <input id="confirm-delete-title" value={deleteTitle} onChange={event => setDeleteTitle(event.target.value)} className={styles.field} />
                  <div className={styles.confirmationActions}>
                    <button type="button" disabled={busy || deleteTitle !== existing.title} onClick={removeChapter} className={styles.dangerAction}>Delete this chapter</button>
                    <button type="button" disabled={busy} onClick={() => { setDeleteOpen(false); setDeleteTitle('') }} className={styles.secondaryAction}>Cancel</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      ) : (
        <p className={styles.informationNotice}>Save the draft first. Photograph upload, attachment, preview, and publication become available after the chapter has a saved record.</p>
      )}
    </div>
  )
}
