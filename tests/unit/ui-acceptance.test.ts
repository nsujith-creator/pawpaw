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

const editor      = read('app/admin/home/home-editor.tsx')
const uploadForm  = read('app/admin/media/upload-form.tsx')
const viewerPage  = read('app/(archive)/page.tsx')
const leaveBtn    = read('components/home/leave-button.tsx')
const attachments = read('app/admin/media/attachment-list.tsx')
const adminPage   = read('app/admin/home/page.tsx')
const carousel    = read('components/home/home-carousel.tsx')
const carouselCss = read('components/home/home-carousel.module.css')

const ERROR_COLOR   = '#dc2626'
const SUCCESS_COLOR = '#16a34a'

describe('editor and upload message states', () => {
  it('editor tracks error and success separately', () => {
    expect(editor).toMatch(/setError\(/)
    expect(editor).toMatch(/setSuccess\(/)
  })

  it('editor renders errors as role=alert in the error colour', () => {
    const alertBlock = editor.slice(editor.indexOf('role="alert"'))
    expect(editor).toContain('role="alert"')
    expect(alertBlock.slice(0, 200)).toContain(ERROR_COLOR)
  })

  it('editor renders successes as role=status in the success colour', () => {
    const statusBlock = editor.slice(editor.indexOf('role="status"'))
    expect(editor).toContain('role="status"')
    expect(statusBlock.slice(0, 200)).toContain(SUCCESS_COLOR)
  })

  it('error and success colours are distinct', () => {
    expect(ERROR_COLOR).not.toBe(SUCCESS_COLOR)
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
    expect(uploadForm).toContain(ERROR_COLOR)
    expect(uploadForm).toContain(SUCCESS_COLOR)
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
    expect(attachments).toContain('Move to Media Library')
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
    expect(attachments).toContain('the file is not deleted')
    expect(attachments).toContain('This cannot be undone')
  })

  it('success messages tell the owner the family page changed and needs a refresh', () => {
    expect(attachments).toContain('Refresh the family page to see the change.')
  })

  it('busy state resets in finally and messages use distinct alert/status roles', () => {
    expect(attachments).toMatch(/finally\s*{\s*setBusy\(false\)/)
    expect(attachments).toContain('role="alert"')
    expect(attachments).toContain('role="status"')
    expect(attachments).toContain(ERROR_COLOR)
    expect(attachments).toContain(SUCCESS_COLOR)
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
    const successPos = uploadForm.indexOf("setSuccess('Photo saved")
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

  it('shows exactly one main photo at a time with a blurred background layer', () => {
    // Two <img> elements per slide: the aria-hidden blurred background and
    // the main accessible image. Not a grid of all items simultaneously.
    expect(carousel.match(/<img/g)).toHaveLength(2)
    expect(carousel).toContain('aria-hidden="true"')
    expect(carousel).toContain('const item = items[index]')
  })

  it('the media frame is height-bounded and never crops or overflows', () => {
    expect(carouselCss).toContain('object-fit: contain')
    expect(carouselCss).toContain('object-position: center')
    expect(carouselCss).toContain('height: min(55vh, 520px)')
    expect(carouselCss).toContain('height: min(70vh, 760px)')
    // max-width/max-height with auto dimensions: any aspect ratio (portrait,
    // landscape, square) fits inside the frame without overflow or upscaling.
    expect(carouselCss).toContain('max-width: 100%')
    expect(carouselCss).toContain('max-height: 100%')
    expect(carouselCss).toContain('width: auto')
    expect(carouselCss).toContain('height: auto')
    // The main .image class uses contain. (.blurredBg uses cover intentionally
    // for the background fill; we scope this assertion to the .image block.)
    const imageBlock = carouselCss.slice(carouselCss.indexOf('.image {'))
    expect(imageBlock).not.toContain('object-fit: cover')
  })

  it('carousel controls stay inside the frame and the caption sits below it', () => {
    const framePos   = carousel.indexOf('styles.frame')
    const controlsPos = carousel.indexOf('<CarouselControls')
    const frameClose = carousel.indexOf('</div>', controlsPos)
    const captionPos = carousel.indexOf('styles.caption')
    expect(controlsPos).toBeGreaterThan(framePos)
    expect(captionPos).toBeGreaterThan(frameClose)
  })
})

describe('premium carousel background', () => {
  it('uses a layered background instead of a flat sampled colour', () => {
    // Old approach: style={{ background: frameBackground }} — a single hex string.
    // New approach: blurred background image + translucent overlay on top.
    expect(carousel).not.toContain('background: frameBackground')
    expect(carousel).toContain('styles.blurredBg')
    expect(carousel).toContain('styles.overlay')
  })

  it('blurred background image is hidden from assistive technology', () => {
    expect(carousel).toContain('aria-hidden="true"')
  })

  it('the CSS defines a blurred background layer and a gradient overlay', () => {
    expect(carouselCss).toContain('filter: blur(')
    expect(carouselCss).toContain('.blurredBg')
    expect(carouselCss).toContain('.overlay')
    expect(carouselCss).toContain('rgba(')
  })

  it('blurredBg and overlay are absolutely positioned so they stay behind the main image', () => {
    // blurredBg and overlay are position:absolute; image is position:relative.
    // All share z-index: 0 — DOM order within the stacking context determines
    // paint order, so the main image appears above both background layers.
    expect(carouselCss).toContain('position: absolute')
    expect(carouselCss).toContain('position: relative')
  })
})

describe('viewer logout control', () => {
  it('LeaveButton posts to /logout/viewer', () => {
    expect(leaveBtn).toContain('action="/logout/viewer"')
    expect(leaveBtn).toContain('method="post"')
  })

  it('the empty "being prepared" state renders the Leave control', () => {
    const emptyBranch = viewerPage.slice(
      viewerPage.indexOf("result.state === 'empty'"),
      viewerPage.indexOf('styles.home'),
    )
    expect(emptyBranch).toContain('<LeaveButton />')
  })

  it('the published-content state renders the Leave control', () => {
    const publishedBranch = viewerPage.slice(viewerPage.indexOf('styles.home'))
    expect(publishedBranch).toContain('<LeaveButton />')
  })
})
