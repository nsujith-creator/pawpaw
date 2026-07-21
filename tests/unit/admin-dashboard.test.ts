import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC  = join(__dirname, '../../src')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

const adminDashboard = read('app/admin/page.tsx')
const adminLayout    = read('app/admin/layout.tsx')
const adminNav       = read('components/admin/admin-nav.tsx')
const adminNavCss    = read('components/admin/admin-nav.module.css')
const adminCss       = read('app/admin/admin.module.css')

describe('admin dashboard', () => {
  it('redirects to login when not authenticated', () => {
    expect(adminDashboard).toContain("redirect('/admin/login')")
  })

  it('shows draft and published content counts', () => {
    expect(adminDashboard).toContain('draft')
    expect(adminDashboard).toContain('published')
    expect(adminDashboard).toContain('Drafts')
    expect(adminDashboard).toContain('Published')
  })

  it('shows a media file count', () => {
    expect(adminDashboard).toContain('Media files')
    expect(adminDashboard).toContain('media_assets')
  })

  it('scopes the media count to the active admin, not all media in the system', () => {
    // The media count query must filter by created_by = admin.id so the
    // dashboard number matches what the admin sees in the Media Library.
    expect(adminDashboard).toContain('created_by')
    expect(adminDashboard).toContain('admin.id')
  })

  it('dashboard stat cards link to filtered content and media destinations', () => {
    expect(adminDashboard).toContain('/admin/content?status=draft')
    expect(adminDashboard).toContain('/admin/content?status=published')
    // Media files card must be an <a> href, not a bare string.
    expect(adminDashboard).toContain('href="/admin/media"')
  })

  it('links to Home page, Content library, and Media library', () => {
    expect(adminDashboard).toContain('/admin/home')
    expect(adminDashboard).toContain('/admin/content')
    expect(adminDashboard).toContain('/admin/media')
  })

  it('shows a recently-updated section ordered by updated_at', () => {
    expect(adminDashboard).toContain('updated_at')
    expect(adminDashboard).toContain('Recently updated')
  })

  it('shows updated and published timestamps without inventing one for drafts', () => {
    expect(adminDashboard).toContain('formatAdminDateTime(item.updatedAt)')
    expect(adminDashboard).toContain('publishedTimestamp(item)')
    expect(adminDashboard).toContain('published_at')
  })

  it('counts actual attachments and signs only the first private thumbnail', () => {
    expect(adminDashboard).toContain('content_media')
    expect(adminDashboard).toContain('summarizeAttachments')
    expect(adminDashboard).toContain('attachedMediaCount')
    expect(adminDashboard).toContain('generateSignedUrl(item.firstMedia.storagePath)')
  })

  it('supports combined title, status, and content-type filters with clear behavior', () => {
    expect(adminDashboard).toContain('name="q"')
    expect(adminDashboard).toContain('name="status"')
    expect(adminDashboard).toContain('name="type"')
    expect(adminDashboard).toContain('filterAndSortContent')
    expect(adminDashboard).toContain('href="/admin"')
  })

  it('keeps query errors distinct from an empty dashboard', () => {
    expect(adminDashboard).toContain('contentResult.error || mediaResult.error')
    expect(adminDashboard).toContain('role="alert"')
    expect(adminDashboard).toContain('Dashboard data could not be loaded')
  })

  it('fetches content items and media count in parallel', () => {
    expect(adminDashboard).toContain('Promise.all')
  })

  it('deduplicates missing-alt media and renders only factual attention states', () => {
    expect(adminDashboard).toContain('const missingAltMediaIds = new Set<string>()')
    expect(adminDashboard).toContain('missingAltMediaIds.add(media.id)')
    expect(adminDashboard).toContain('const missingAltCount = missingAltMediaIds.size')
    expect(adminDashboard).toContain('attached photo')
    expect(adminDashboard).toContain('unpublished draft')
    expect(adminDashboard).toContain('Nothing needs attention.')
    expect(adminDashboard).not.toContain('ready to review')
  })
})

describe('admin navigation', () => {
  it('renders Dashboard, Content, Media, and Home page links', () => {
    expect(adminNav).toContain("'/admin'")
    expect(adminNav).toContain("'/admin/content'")
    expect(adminNav).toContain("'/admin/media'")
    expect(adminNav).toContain("'/admin/home'")
    expect(adminNav).toContain('Dashboard')
    expect(adminNav).toContain('Content')
    expect(adminNav).toContain('Media')
    expect(adminNav).toContain('Home page')
  })

  it('uses exact match for Dashboard to avoid false active state on sub-routes', () => {
    expect(adminNav).toContain('exact')
    expect(adminNav).toContain('pathname === href')
  })

  it('uses startsWith for non-root sections', () => {
    expect(adminNav).toContain('pathname.startsWith(href)')
  })

  it('has a sign-out POST form at the admin logout endpoint', () => {
    expect(adminNav).toContain('/logout/admin')
    expect(adminNav).toContain('method="post"')
  })

  it('marks the active link with aria-current="page" for assistive technology', () => {
    expect(adminNav).toContain('aria-current')
    expect(adminNav).toContain("'page'")
  })

  it('is rendered inside the admin layout', () => {
    expect(adminLayout).toContain('AdminNav')
  })

  it('the layout no longer contains a standalone sign-out form in the header', () => {
    // Sign-out moved from the header into AdminNav so it scrolls with the nav.
    const header = adminLayout.slice(adminLayout.indexOf('<header'), adminLayout.indexOf('</header>'))
    expect(header).not.toContain('/logout/admin')
  })

  it('uses a sticky desktop studio sidebar', () => {
    expect(adminNavCss).toContain('position: sticky')
    expect(adminNavCss).toContain('top: 0')
    expect(adminNavCss).toContain('border-right')
    expect(adminLayout).toContain('styles.studioLayout')
  })

  it('recomposes navigation without horizontal scrolling on mobile', () => {
    expect(adminNavCss).toContain('@media (max-width: 52rem)')
    expect(adminNavCss).toContain('grid-template-columns: repeat(4, minmax(0, 1fr))')
    expect(adminNavCss).not.toContain('overflow-x: auto')
  })

  it('uses a non-colour active cue and 44px minimum targets', () => {
    expect(adminNav).toContain('Current')
    expect(adminNavCss).toContain('box-shadow: inset 0.25rem 0')
    expect(adminNavCss).toContain('min-height: 3rem')
    expect(adminCss).toContain('min-height: 2.75rem')
  })

  it('respects prefers-reduced-motion by zeroing navigation transitions', () => {
    expect(adminNavCss).toContain('prefers-reduced-motion')
    expect(adminNavCss).toContain('transition-duration: 0ms')
  })
})
