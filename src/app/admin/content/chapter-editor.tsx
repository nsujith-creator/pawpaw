'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import BlockEditor, { type MediaPlacementOption } from '@/components/content/block-editor'
import VaradaScene from '@/components/archive/varada-scene'
import type { ChapterContent } from '@/lib/content/chapters'
import type { ContentBlock } from '@/lib/content/schema'
import type { AdminVideo } from '@/lib/video/published-videos'
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
  attachedVideos?: AdminVideo[]
  initialStep?: StudioStep
}

const TYPE_LABELS: Record<ManagedContentType, string> = {
  story: 'Story',
  gallery: 'Gallery',
  letter: 'Letter',
  moment: 'Moment',
}

const TYPE_GUIDANCE: Record<ManagedContentType, string> = {
  story: 'Use a Story for a written memory. Words or photographs can lead.',
  gallery: 'Use a Gallery when photographs lead and a few words hold them together.',
  letter: 'Use a Letter for words to a specific person. An author, recipient, and authored date are required before publication.',
  moment: 'Use a Moment for a dated milestone. An event date is required before it can be published.',
}

const STUDIO_STEPS = [
  { id: 'details', label: 'Shape it', note: 'What is this memory?' },
  { id: 'story', label: 'Write it', note: 'Tell it in your voice' },
  { id: 'scene', label: 'Give it mood', note: 'A small visual hello' },
  { id: 'media', label: 'Add moments', note: 'Photographs and video' },
  { id: 'review', label: 'See & share', note: 'Preview, then publish' },
] as const

type StudioStep = typeof STUDIO_STEPS[number]['id']

export default function ChapterEditor({ existing, replacementCandidates = [], attachedVideos = [], initialStep = 'details' }: Props) {
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
  const [activeStep, setActiveStep] = useState<StudioStep>(initialStep)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const firstDays = existing?.slug === 'first-days'
  const slugLocked = existing?.revisionNumber !== null && existing?.revisionNumber !== undefined || firstDays
  const canPublish = Boolean(existing && canPublishContentType(existing.type))
  const activeStepIndex = STUDIO_STEPS.findIndex(step => step.id === activeStep)
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
  const mediaOptions: MediaPlacementOption[] = useMemo(() => [
    ...(existing?.media ?? []).map((item, index) => ({
      id: item.id,
      kind: 'photo' as const,
      label: item.captionOverride?.trim() || item.caption?.trim() || `Photograph ${index + 1}`,
      previewUrl: item.signedUrl,
      status: 'ready',
    })),
    ...attachedVideos.map((item, index) => ({
      id: item.id,
      kind: 'video' as const,
      label: item.caption?.trim() || `Video ${index + 1}`,
      status: item.status,
    })),
  ], [attachedVideos, existing])

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

  async function submit(intent: 'save' | 'publish', afterSaveStep?: StudioStep): Promise<boolean> {
    clearMessages()
    if (!title.trim()) {
      setActiveStep('details')
      setFieldErrors({ title: 'Give this memory a title so Pawpaw can keep it safe.' })
      setError('Start with a title. Everything else can wait.')
      window.requestAnimationFrame(() => titleInputRef.current?.focus())
      return false
    }
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
      if (!applyResult(result)) return false
      if (!existing && result.id) {
        router.push(`/admin/content/${result.id}?step=${afterSaveStep ?? activeStep}`)
        return true
      }
      if (afterSaveStep) setActiveStep(afterSaveStep)
      router.refresh()
      return true
    } catch {
      setError('Something went wrong while saving. Please try again.')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function goToStep(nextStep: StudioStep) {
    if (nextStep === activeStep || busy) return
    const nextIndex = STUDIO_STEPS.findIndex(step => step.id === nextStep)
    if (nextIndex < activeStepIndex) {
      setActiveStep(nextStep)
      return
    }
    await submit('save', nextStep)
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
    <div className={styles.editorStack} data-active-step={activeStep}>
      <nav className={styles.studioSteps} aria-label="Memory authoring steps">
        {STUDIO_STEPS.map((step, index) => (
          <button key={step.id} type="button" disabled={busy} onClick={() => void goToStep(step.id)} aria-current={activeStep === step.id ? 'step' : undefined}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{step.note}</small>
          </button>
        ))}
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

      <section id="memory-details" className={styles.studioPanel} hidden={activeStep !== 'details'} aria-labelledby="memory-details-title">
      <header className={styles.studioPanelHeader}>
        <p className={styles.eyebrow}>Step 1 of 5</p>
        <h2 id="memory-details-title" className={styles.sectionTitle}>Shape the memory</h2>
        <p className={styles.lede}>Give it a name and just enough context. Everything else can wait.</p>
      </header>
      <div className={styles.fieldGroup}>
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
          ref={titleInputRef}
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

      <details className={styles.advancedDetails}>
        <summary>Chapter address <span>set automatically</span></summary>
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
      </details>

      <div className={styles.fieldGroup}>
        <label htmlFor="chapter-summary" className={styles.fieldLabel}>Introduction (optional)</label>
        <textarea id="chapter-summary" value={summary} onChange={event => setSummary(event.target.value)} rows={5} className={styles.textarea} aria-invalid={Boolean(fieldErrors.summary)} />
        {fieldErrors.summary && <p role="alert" className={styles.fieldError}>{fieldErrors.summary}</p>}
      </div>

      <details key={type} className={styles.advancedDetails} open={type === 'letter' || type === 'moment'}>
        <summary>
          {type === 'letter' ? 'Letter details' : type === 'moment' ? 'Moment date and details' : 'Add date, people or place'}
          <span>{type === 'letter' || type === 'moment' ? 'needed before sharing' : 'optional'}</span>
        </summary>
      <section className={`${styles.fieldGroup} ${styles.contextFields}`} aria-labelledby="chapter-context-heading">
        <h2 id="chapter-context-heading" className={styles.srOnly}>Family chronology and context</h2>
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
      </details>
      </section>

      <section id="memory-story" className={styles.studioPanel} hidden={activeStep !== 'story'} aria-labelledby="write-memory-heading">
        <header className={styles.studioPanelHeader}>
          <p className={styles.eyebrow}>Step 2 of 5</p>
          <h2 id="write-memory-heading" className={styles.sectionTitle}>Write it in your voice</h2>
          <p className={styles.lede}>Begin anywhere. A paragraph is enough; Pawpaw will hold the shape while you tell the truth of it.</p>
        </header>
        <BlockEditor
          blocks={blocks}
          onChange={setBlocks}
          mediaOptions={mediaOptions}
          error={fieldErrors.bodyBlocks}
        />
      </section>

      <section id="memory-scene" className={styles.studioPanel} hidden={activeStep !== 'scene'} aria-labelledby="memory-scene-heading">
        <header className={styles.studioPanelHeader}>
          <p className={styles.eyebrow}>Step 3 of 5</p>
          <h2 id="memory-scene-heading" className={styles.sectionTitle}>Give it a little mood</h2>
          <p className={styles.lede}>Optional. Choose the small Varada who feels at home beside this memory.</p>
        </header>
        <div className={styles.sceneChoices} role="group" aria-label="Illustration for this memory">
          <button type="button" className={styles.sceneChoice} aria-pressed={visualScene === ''} onClick={() => setVisualScene('')}>
            <span className={styles.noScene} aria-hidden="true">Just the story</span>
            <strong>No illustration</strong>
            <small>Let the photographs and words lead.</small>
          </button>
          {VARADA_SCENE_OPTIONS.map(scene => (
            <button key={scene.id} type="button" className={styles.sceneChoice} aria-pressed={visualScene === scene.id} onClick={() => setVisualScene(scene.id)}>
              <VaradaScene sceneId={scene.id} sizes="8rem" className={styles.scenePreview} />
              <strong>{scene.label}</strong>
              <small>{scene.description}</small>
            </button>
          ))}
        </div>
        {fieldErrors.visualScene && <p role="alert" className={styles.fieldError}>{fieldErrors.visualScene}</p>}
      </section>

      <section id="memory-media" className={styles.studioPanel} hidden={activeStep !== 'media'} aria-labelledby="chapter-photos-title">
        <header className={styles.studioPanelHeader}>
          <p className={styles.eyebrow}>Step 4 of 5</p>
          <h2 id="chapter-photos-title" className={styles.sectionTitle}>Add the moments you can see</h2>
          <p className={styles.lede}>Photographs and video belong to the story. Add only what earns its place.</p>
        </header>
        {existing ? (
          <>
          <section aria-labelledby="attached-moments-title">
            <h3 id="attached-moments-title" className={styles.subsectionTitle}>In this memory</h3>
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
          </>
        ) : (
          <div className={styles.unlockPanel} aria-live="polite">
            <p className={styles.unlockTitle}>Making room for your photographs…</p>
            <p>Pawpaw is keeping the draft and opening its photo shelf.</p>
          </div>
        )}
      </section>

      <section id="memory-review" className={styles.studioPanel} hidden={activeStep !== 'review'} aria-labelledby="memory-review-title">
        <header className={styles.studioPanelHeader}>
          <p className={styles.eyebrow}>Step 5 of 5</p>
          <h2 id="memory-review-title" className={styles.sectionTitle}>See it. Then share it.</h2>
          <p className={styles.lede}>Preview is the family’s view. Publishing is the only action here that changes what they can see.</p>
        </header>
        <div className={styles.reviewSummary}>
          <p><strong>{title || 'Untitled memory'}</strong><span>{TYPE_LABELS[type]}</span></p>
          <p><strong>{blocks.length}</strong><span>story block{blocks.length === 1 ? '' : 's'}</span></p>
          <p><strong>{attachments.length}</strong><span>photograph{attachments.length === 1 ? '' : 's'}</span></p>
          <p><strong>{visualScene ? 'Yes' : 'No'}</strong><span>illustration</span></p>
        </div>
        <div className={styles.editorActionBar}>
          {existing ? (
            <>
              <a href={`/admin/content/${existing.id}/preview`} className={styles.previewAction}>Open family preview</a>
              {canPublish && (
                <button type="button" disabled={busy} onClick={() => submit('publish')} className={styles.action}>
                  {existing.activeRevisionId ? 'Share this new version' : 'Share with family'}
                </button>
              )}
              {existing.activeRevisionId && <button type="button" disabled={busy} onClick={unpublish} className={styles.secondaryAction}>Take out of family view</button>}
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => submit('save')} className={styles.action}>Save this first draft</button>
          )}
        </div>
        <p className={styles.help}>
          {type === 'letter'
            ? 'A Letter needs its author, recipient, and written date before it can be shared.'
            : 'Saving keeps this private. Preview shows the family view. Sharing publishes a lasting version.'}
        </p>
        {existing && !firstDays && existing.revisionNumber === null && (
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
      </section>

      <div className={styles.studioFooter}>
        {activeStepIndex > 0 && (
          <button type="button" disabled={busy} onClick={() => setActiveStep(STUDIO_STEPS[activeStepIndex - 1].id)} className={styles.quietAction}>Back</button>
        )}
        <button type="button" disabled={busy} onClick={() => void submit('save', activeStep)} className={styles.secondaryAction}>
          {busy ? 'Saving…' : 'Save here'}
        </button>
        {activeStepIndex < STUDIO_STEPS.length - 1 && (
          <button type="button" disabled={busy} onClick={() => void goToStep(STUDIO_STEPS[activeStepIndex + 1].id)} className={styles.action}>
            {busy ? 'Keeping it safe…' : 'Continue'}
          </button>
        )}
      </div>
      <div className={styles.studioFeedback} aria-live="polite">
        {busy && <p role="status" className={styles.informationNotice}>Keeping your changes safe…</p>}
        {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
        {success && <p role="status" className={styles.successNotice}>{success}</p>}
      </div>
    </div>
  )
}
