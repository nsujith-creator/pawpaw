import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Static checks on component source, following this repo's convention of
// statically enforcing acceptance-critical postures (see
// migration-security.test.ts). No component-test library is installed, so
// these guard the exact regressions found in Phase 1 manual acceptance:
// green-styled errors, stuck busy states, and missing viewer logout.

const SRC = join(__dirname, '../../src')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

const rootLayout  = read('app/layout.tsx')
const globals     = read('app/globals.css')
const familyLogin = read('app/family-login/page.tsx')
const editor      = read('app/admin/home/home-editor.tsx')
const uploadForm  = read('app/admin/media/upload-form.tsx')
const viewerPage  = read('app/(archive)/page.tsx')
const archiveLayout = read('app/(archive)/layout.tsx')
const familyHeader = read('components/archive/family-header.tsx')
const contentDateline = read('components/archive/content-dateline.tsx')
const leaveBtn    = read('components/home/leave-button.tsx')
const attachments = read('app/admin/media/attachment-list.tsx')
const adminPage   = read('app/admin/home/page.tsx')
const adminCss    = read('app/admin/admin.module.css')
const carousel    = read('components/home/home-carousel.tsx')
const carouselCss = read('components/home/home-carousel.module.css')
const ambient     = read('components/home/ambient-frame.tsx')
const chaptersIndex = read('app/(archive)/chapters/page.tsx')
const firstDaysPage = read('app/(archive)/first-days/page.tsx')
const chapterPreview = read('app/admin/content/[id]/preview/page.tsx')
const chapterRenderer = read('components/content/chapter-renderer.tsx')
const chapterEditor = read('app/admin/content/chapter-editor.tsx')

describe('Release 2 visual foundation', () => {
  it('loads the three approved font families through the installed Next font support', () => {
    expect(rootLayout).toContain("import { Fraunces, Manrope, Noto_Sans_Malayalam } from 'next/font/google'")
    expect(rootLayout).toContain("weight: '500'")
    expect(rootLayout).toContain("weight: ['400', '600', '700']")
    expect(rootLayout).toContain("subsets: ['malayalam']")
    expect(rootLayout).toContain('preload: false')
    expect(rootLayout).toContain('fraunces.variable')
    expect(rootLayout).toContain('manrope.variable')
    expect(rootLayout).toContain('notoSansMalayalam.variable')
  })

  it('declares each approved Batch 1 global token exactly once', () => {
    const expected = {
      '--color-canvas': '#fff8ee',
      '--color-surface': '#fffdf7',
      '--color-paper': '#fffef8',
      '--color-ink': '#2a1f14',
      '--color-ink-secondary': '#5c4e3d',
      '--color-home-primary': '#e8526a',
      '--color-home-soft': '#fceaed',
      '--color-home-on-soft': '#8b1a2f',
      '--motion-fast': '120ms',
      '--motion-standard': '240ms',
      '--motion-ease-out': 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    }

    for (const [token, value] of Object.entries(expected)) {
      const declarations = globals.match(new RegExp(`${token.replaceAll('-', '\\-')}\\s*:\\s*${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')) ?? []
      expect(declarations, token).toHaveLength(1)
    }
  })

  it('applies Malayalam only through the language selector', () => {
    expect(globals).toContain('[lang="ml"]')
    expect(globals).toContain('var(--font-malayalam)')
    expect(familyLogin).not.toContain('lang="ml"')
  })

  it('reduces every nonessential transition to an immediate static result', () => {
    expect(globals).toContain('@media (prefers-reduced-motion: reduce)')
    expect(globals).toContain('transition-duration: 0ms !important')
    expect(globals).toContain('animation-duration: 0ms !important')
    expect(carouselCss).toContain('transition: none')
  })
})

describe('editor and upload message states', () => {
  it('editor tracks error and success separately', () => {
    expect(editor).toMatch(/setError\(/)
    expect(editor).toMatch(/setSuccess\(/)
  })

  it('editor renders errors as role=alert with the semantic error class', () => {
    const alertBlock = editor.slice(editor.indexOf('role="alert"'))
    expect(editor).toContain('role="alert"')
    expect(alertBlock.slice(0, 200)).toContain('styles.errorNotice')
  })

  it('editor renders successes as role=status with the semantic success class', () => {
    const statusBlock = editor.slice(editor.lastIndexOf('role="status"'))
    expect(editor).toContain('role="status"')
    expect(statusBlock.slice(0, 200)).toContain('styles.successNotice')
  })

  it('semantic error and success notices use distinct approved tokens', () => {
    expect(adminCss).toContain('var(--color-error-soft)')
    expect(adminCss).toContain('var(--color-success-soft)')
    expect(adminCss).toContain('var(--color-error-on-soft)')
    expect(adminCss).toContain('var(--color-success-on-soft)')
  })

  it('editor clears stale messages when a submission starts', () => {
    // clearMessages() resets both states and is invoked at the top of submit.
    expect(editor).toMatch(/function clearMessages\(\)\s*{\s*setError\(''\)\s*setSuccess\(''\)/)
    expect(editor).toMatch(/async function submit[^}]*clearMessages\(\)/)
  })

  it('editor resets busy state in finally, surviving thrown Server Action errors', () => {
    expect(editor).toMatch(/finally\s*{\s*setBusy\(false\)/)
    expect(editor).toMatch(/catch\s*{/)
  })

  it('upload form resets busy state in finally, surviving thrown Server Action errors', () => {
    expect(uploadForm).toMatch(/finally\s*{\s*setBusy\(false\)/)
    expect(uploadForm).toMatch(/catch\s*{/)
  })

  it('upload form renders errors as role=alert and successes as role=status', () => {
    expect(uploadForm).toContain('role="alert"')
    expect(uploadForm).toContain('role="status"')
    expect(uploadForm).toContain('styles.errorNotice')
    expect(uploadForm).toContain('styles.successNotice')
  })

  it('upload form pre-validates the file with the shared application limit', () => {
    expect(uploadForm).toMatch(/validateUploadFile/)
  })
})

describe('direct-to-Storage upload flow', () => {
  it('image bytes go straight to Storage via a signed upload token, not a Server Action', () => {
    expect(uploadForm).toContain('uploadToSignedUrl')
    expect(uploadForm).toContain('authorizeUpload')
    expect(uploadForm).toContain('finalizeUpload')
  })

  it('busy state resets in finally across authorize, upload, and finalize failures', () => {
    // All three steps live inside one try block whose finally resets busy,
    // so an exception at any step can never leave the button stuck.
    const tryPos     = uploadForm.indexOf('try {')
    const authPos    = uploadForm.indexOf('authorizeUpload(authFd)')
    const uploadPos  = uploadForm.indexOf('uploadToSignedUrl(')
    const finalPos   = uploadForm.indexOf('finalizeUpload(finalFd)')
    const finallyPos = uploadForm.indexOf('} finally {')
    expect(tryPos).toBeGreaterThan(-1)
    expect(authPos).toBeGreaterThan(tryPos)
    expect(uploadPos).toBeGreaterThan(authPos)
    expect(finalPos).toBeGreaterThan(uploadPos)
    expect(finallyPos).toBeGreaterThan(finalPos)
    expect(uploadForm.slice(finallyPos, finallyPos + 80)).toContain('setBusy(false)')
  })
})

describe('plain-text editor posture', () => {
  it('editor submits plain text (body_text) in the default mode', () => {
    expect(editor).toContain("fd.set('body_text', text)")
  })

  it('editor protects advanced blocks behind an explicit confirmation', () => {
    expect(editor).toMatch(/countNonParagraphBlocks/)
    expect(editor).toMatch(/pendingSwitch/)
  })
})

describe('attached-photo management', () => {
  it('the admin page renders the attachment list with private signed thumbnails', () => {
    expect(adminPage).toContain('AttachmentList')
    expect(adminPage).toContain('generateSignedUrl')
  })

  it('the admin page notes that an open family page needs refreshing', () => {
    expect(adminPage).toMatch(/refresh/i)
  })

  it('shows alt text, MIME type, size, and position for each attachment', () => {
    expect(attachments).toContain('Alt text for photo')
    expect(attachments).toContain('item.mimeType')
    expect(attachments).toContain('formatSize(item.byteSize)')
    expect(attachments).toMatch(/Position \{index \+ 1\} of \{items\.length\}/)
  })

  it('edits alt text and caption as separate labelled fields', () => {
    expect(attachments).toContain('Alt text for screen readers (required, not shown on the page)')
    expect(attachments).toContain('Caption shown with the photo (optional)')
    expect(attachments).toContain('Caption for photo')
  })

  it('loads both stored values, falling back to fresh server data over drafts', () => {
    expect(attachments).toContain('altDrafts[item.mediaId] ?? item.altText')
    expect(attachments).toContain("captionDrafts[item.mediaId] ?? item.caption ?? ''")
  })

  it('refreshes the server-rendered list after every successful mutation', () => {
    // run() is the single mutation wrapper used by save/reorder/detach/delete;
    // it must refresh before announcing success, and never on error.
    expect(attachments).toContain('useRouter')
    const successBranch = attachments.slice(
      attachments.indexOf('} else {'),
      attachments.indexOf('} catch {'),
    )
    expect(successBranch).toContain('router.refresh()')
    const refreshPos = successBranch.indexOf('router.refresh()')
    const successPos = successBranch.indexOf('setSuccess(successMessage)')
    expect(refreshPos).toBeGreaterThan(-1)
    expect(successPos).toBeGreaterThan(refreshPos)
  })

  it('offers edit, reorder, detach, and permanent-delete controls', () => {
    expect(attachments).toContain('Save details')
    expect(attachments).toContain('Move earlier')
    expect(attachments).toContain('Move later')
    expect(attachments).toContain('>Detach<')
    expect(attachments).toContain('Replace photograph')
    expect(attachments).toContain('Set as cover')
    expect(attachments).toContain('Delete permanently')
  })

  it('permanent delete requires an explicit confirmation step', () => {
    expect(attachments).toContain('confirmDeleteId')
    expect(attachments).toContain('Yes, delete forever')
    expect(attachments).toContain('Cancel')
    // The destructive action fires only from the confirmation branch.
    const confirmBranch = attachments.indexOf('confirmDeleteId === item.mediaId')
    const deleteCall    = attachments.indexOf('deleteForever(item.mediaId)')
    expect(confirmBranch).toBeGreaterThan(-1)
    expect(deleteCall).toBeGreaterThan(confirmBranch)
  })

  it('clearly distinguishes detach (keeps the file) from permanent delete', () => {
    expect(attachments).toContain('The file remains in Media Library')
    expect(attachments).toContain('This cannot be undone')
  })

  it('successful attachment changes refresh the server-rendered editor immediately', () => {
    expect(attachments).toContain('router.refresh()')
  })

  it('busy state resets in finally and messages use distinct alert/status roles', () => {
    expect(attachments).toMatch(/finally\s*{\s*setBusy\(false\)/)
    expect(attachments).toContain('role="alert"')
    expect(attachments).toContain('role="status"')
    expect(attachments).toContain('styles.errorNotice')
    expect(attachments).toContain('styles.successNotice')
  })
})

describe('alt text vs caption in the upload form', () => {
  it('has separately labelled required alt and optional caption fields', () => {
    expect(uploadForm).toContain('Alt text for screen readers (required)')
    expect(uploadForm).toContain('Caption shown with the photo (optional)')
  })

  it('explains that alt text is for accessibility and not shown on hover', () => {
    expect(uploadForm).toMatch(/read aloud by screen readers/)
    expect(uploadForm).toMatch(/not\s+normally displayed on the page or when hovering/)
  })

  it('upload success message distinguishes saved/attached from published/family-visible', () => {
    // After upload the user must understand: photo is in Admin immediately,
    // but the family only sees it after Home is published.
    expect(uploadForm).toContain('saved and attached')
    expect(uploadForm).toContain('publish')
    expect(uploadForm).not.toContain('Refresh the family page to see the change')
  })

  it('sends both fields to finalization', () => {
    expect(uploadForm).toContain("finalFd.set('alt_text'")
    expect(uploadForm).toContain("finalFd.set('caption'")
  })

  it('refreshes and clears the form only after successful finalization', () => {
    const refreshPos = uploadForm.indexOf('router.refresh()')
    const successPos = uploadForm.indexOf('setSuccess(`Photo saved')
    const resetPos   = uploadForm.indexOf('form.reset()')
    expect(refreshPos).toBeGreaterThan(-1)
    expect(successPos).toBeGreaterThan(refreshPos)
    expect(resetPos).toBeGreaterThan(successPos)
    // Exactly one reset, in the success path — failures preserve every value.
    expect(uploadForm.match(/form\.reset\(\)/g)).toHaveLength(1)
    const errorReturn = uploadForm.indexOf('setError(result.error)')
    expect(errorReturn).toBeGreaterThan(-1)
    expect(errorReturn).toBeLessThan(resetPos)
  })
})

describe('family photo presentation', () => {
  it('the image alt attribute uses alt_text', () => {
    expect(carousel).toContain('alt={item.altText')
  })

  it('the visible caption uses caption, never alt_text, and never the title attribute', () => {
    expect(carousel).toMatch(/\{item\.caption && \(\s*<p className=\{styles\.caption\}>\{item\.caption\}<\/p>/)
    expect(carousel).not.toMatch(/caption\}>\{item\.altText/)
    expect(carousel).not.toMatch(/\btitle=/)
  })

  it('empty captions render nothing — the caption element is conditional', () => {
    expect(carousel).toContain('{item.caption && (')
  })

  it('shows exactly one main photo at a time without a duplicate blurred image', () => {
    expect(carousel.match(/<img/g)).toHaveLength(1)
    expect(carousel).not.toContain('styles.blurredBg')
    expect(carousel).not.toContain('styles.overlay')
    expect(carousel).toContain('const item = items[index]')
  })

  it('the media frame is height-bounded and never crops or overflows', () => {
    expect(carouselCss).toContain('object-fit: contain')
    expect(carouselCss).toContain('object-position: center')
    expect(carouselCss).toContain('aspect-ratio: 16 / 10')
    expect(carouselCss).toContain('aspect-ratio: var(--media-aspect)')
    expect(carouselCss).toContain('max-height: min(68vh, 48rem)')
    // max-width/max-height with auto dimensions: any aspect ratio (portrait,
    // landscape, square) fits inside the frame without overflow or upscaling.
    expect(carouselCss).toContain('max-width: 100%')
    expect(carouselCss).toContain('max-height: 100%')
    expect(carouselCss).toContain('width: auto')
    expect(carouselCss).toContain('height: auto')
    const imageBlock = carouselCss.slice(carouselCss.indexOf('.image {'))
    expect(imageBlock).not.toContain('object-fit: cover')
  })

  it('carousel controls and caption sit below rather than over the primary photograph', () => {
    const framePos   = carousel.indexOf('styles.frame')
    const frameClose = carousel.indexOf('</div>', framePos)
    const controlsPos = carousel.indexOf('<CarouselControls')
    const captionPos = carousel.indexOf('styles.caption')
    expect(frameClose).toBeGreaterThan(framePos)
    expect(controlsPos).toBeGreaterThan(frameClose)
    expect(captionPos).toBeGreaterThan(controlsPos)
  })
})

describe('bounded carousel ambient surface', () => {
  it('keeps sampled colour in one subtle frame without the oversized blurred chamber', () => {
    expect(carouselCss).toContain('var(--ambient-surface)')
    expect(carouselCss).toContain('var(--ambient-accent)')
    expect(carouselCss).not.toContain('.blurredBg')
    expect(carouselCss).not.toContain('.overlay')
    expect(carouselCss).not.toContain('filter: blur(')
  })
})

describe('Release 2 bounded Home treatment', () => {
  it('renders one semantic Home dateline from publishedAt without rewriting database prose', () => {
    expect(viewerPage).toContain('date={content.publishedAt}')
    expect(viewerPage).toContain('context="V was 7 weeks and 2 days old"')
    expect(contentDateline.match(/<time\b/g)).toHaveLength(1)
    expect(contentDateline).toContain('dateTime={date}')
    expect(viewerPage).not.toContain('7 weeks and 2 days to the day today.')
    expect(viewerPage).not.toMatch(/\.replace\(/)
  })

  it('uses only the approved Wonder character as a decorative Home asset', () => {
    expect(viewerPage).toContain('/illustrations/varada/varada-wonder.png')
    expect(viewerPage).not.toContain('varada-delight.png')
    expect(viewerPage).not.toContain('varada-sleepy.png')
    expect(viewerPage).toMatch(/src="\/illustrations\/varada\/varada-wonder\.png"[\s\S]*?alt=""/)
    expect(familyLogin).not.toContain('/illustrations/varada/')
  })

  it('derives ambient colour from the active item and confines it to AmbientFrame', () => {
    expect(carousel).toContain('createAmbientTheme(item.extractedPalette)')
    expect(carousel).toContain('<AmbientFrame theme={ambientTheme}>')
    expect(ambient).toContain("'--ambient-surface': theme.surface.css")
    expect(ambient).toContain("'--ambient-accent': theme.accent.css")
    expect(ambient).toContain('data-ambient-fallback')
  })

  it('keeps ambient transitions bounded and uses the approved motion values', () => {
    expect(carouselCss).toContain('background-color var(--motion-standard) var(--motion-ease-out)')
    expect(carouselCss).toContain('var(--ambient-surface)')
    expect(carouselCss).toContain('var(--ambient-accent)')
    expect(carouselCss).not.toMatch(/body[\s\S]*--ambient-/)
  })

  it('keeps controls outside the photograph and gives arrows and dots 44px targets', () => {
    expect(carouselCss).toContain('width: 3rem')
    expect(carouselCss).toContain('height: 3rem')
    expect(carouselCss).toContain('width: 2.75rem')
    expect(carouselCss).toContain('height: 2.75rem')
  })
})

describe('viewer logout control', () => {
  it('LeaveButton posts to /logout/viewer', () => {
    expect(leaveBtn).toContain('action="/logout/viewer"')
    expect(leaveBtn).toContain('method="post"')
  })

  it('renders Home, First Days, Chapters, and Leave in the shared archive header', () => {
    expect(archiveLayout).toContain('<FamilyHeader />')
    expect(familyHeader).toContain("{ href: '/', label: 'Home' }")
    expect(familyHeader).toContain("{ href: '/first-days', label: 'First Days' }")
    expect(familyHeader).toContain("{ href: '/chapters', label: 'Chapters' }")
    expect(familyHeader).toContain('<LeaveButton />')
    expect(familyHeader).toContain("aria-current={current ? 'page' : undefined}")
  })
})

describe('PR-004B family and preview truthfulness', () => {
  it('keeps Letter out of creation choices and gates its publish control', () => {
    expect(chapterEditor).toContain('CREATABLE_CONTENT_TYPES.map')
    expect(chapterEditor).toContain('canPublishContentType(existing.type)')
    expect(chapterEditor).toContain('{canPublish && (')
    expect(chapterEditor).toContain('Letter publication remains disabled')
  })

  it('keeps a truthful Chapters empty state in the real index branch', () => {
    expect(chaptersIndex).toContain('result.items.length === 0')
    expect(chaptersIndex).toContain('No chapters are published yet.')
  })

  it('renders optional First Days copy only inside its approved reading surface', () => {
    expect(firstDaysPage).toContain('styles.readingSurface')
    expect(firstDaysPage).toContain('result.content.summary')
    expect(firstDaysPage).toContain('result.content.bodyBlocks.map')
  })

  it('keeps private preview dynamic, no-store, noindex, and on the shared renderer', () => {
    expect(chapterPreview).toContain("export const dynamic = 'force-dynamic'")
    expect(chapterPreview).toContain('noStore()')
    expect(chapterPreview).toContain('robots: { index: false, follow: false }')
    expect(chapterPreview).toContain('Private preview — not visible to family')
    expect(chapterPreview).toContain('<ChapterRenderer')
  })

  it('does not emit raw media identifiers from the generic family renderer', () => {
    expect(chapterRenderer).not.toContain('data-media-id')
  })
})
