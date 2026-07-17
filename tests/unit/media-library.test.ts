import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC  = join(__dirname, '../../src')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

const mediaLibraryPage   = read('app/admin/media/page.tsx')
const mediaLibraryClient = read('app/admin/media/media-library-client.tsx')
const mediaActions       = read('app/admin/media/actions.ts')
const manageMedia        = read('lib/media/manage-media.ts')
const homeContent        = read('lib/content/home.ts')

describe('media library server page', () => {
  it('redirects to login when not authenticated', () => {
    expect(mediaLibraryPage).toContain("redirect('/admin/login')")
  })

  it('fetches media assets filtered to the active admin', () => {
    expect(mediaLibraryPage).toContain('media_assets')
    expect(mediaLibraryPage).toContain('created_by')
    expect(mediaLibraryPage).toContain('admin.id')
  })

  it('generates signed URLs for thumbnails', () => {
    expect(mediaLibraryPage).toContain('generateSignedUrl')
  })

  it('counts how many items each media asset is attached to', () => {
    expect(mediaLibraryPage).toContain('content_media')
    expect(mediaLibraryPage).toContain('attachmentCount')
  })

  it('loads creation date and accurate attached content titles', () => {
    expect(mediaLibraryPage).toContain('created_at')
    expect(mediaLibraryPage).toContain('content_items (title)')
    expect(mediaLibraryPage).toContain('usageTitles')
  })

  it('supports search, MIME, attachment, and sort filters together', () => {
    expect(mediaLibraryPage).toContain('name="q"')
    expect(mediaLibraryPage).toContain('name="type"')
    expect(mediaLibraryPage).toContain('name="attachment"')
    expect(mediaLibraryPage).toContain('name="sort"')
    expect(mediaLibraryPage).toContain('filterAndSortMedia')
  })

  it('distinguishes query errors from genuine and filtered empty states', () => {
    expect(mediaLibraryPage).toContain('if (queryError)')
    expect(mediaLibraryPage).toContain('role="alert"')
    expect(mediaLibraryPage).toContain('No photos uploaded yet')
    expect(mediaLibraryPage).toContain('No media matches these filters')
  })

  it('passes only a safe filename and signed URL to the client', () => {
    expect(mediaLibraryPage).toContain('safeStorageBasename')
    expect(mediaLibraryPage).toContain('generateSignedUrl')
    expect(mediaLibraryClient).toContain('item.fileName')
    expect(mediaLibraryClient).not.toContain('storagePath')
  })
})

describe('media library client component', () => {
  it('offers an Attach to Home action for each media item', () => {
    expect(mediaLibraryClient).toContain('attachMediaToHome')
    expect(mediaLibraryClient).toContain('Attach to Home')
  })

  it('offers a permanent delete with a confirmation step', () => {
    expect(mediaLibraryClient).toContain('confirmDeleteId')
    expect(mediaLibraryClient).toContain('Yes, delete forever')
    expect(mediaLibraryClient).toContain('deleteMediaForever')
  })

  it('resets busy state in finally so the button never stays stuck', () => {
    expect(mediaLibraryClient).toMatch(/finally\s*\{\s*setBusy\(false\)/)
  })

  it('uses role=alert for errors and role=status for success messages', () => {
    expect(mediaLibraryClient).toContain('role="alert"')
    expect(mediaLibraryClient).toContain('role="status"')
  })

  it('refreshes the server-rendered list after each successful mutation', () => {
    expect(mediaLibraryClient).toContain('useRouter')
    expect(mediaLibraryClient).toContain('router.refresh()')
  })

  it('shows how many pages each photo is attached to', () => {
    expect(mediaLibraryClient).toContain('attachmentCount')
    expect(mediaLibraryClient).toContain('Not attached')
  })

  it('renders creation date and exact usage titles', () => {
    expect(mediaLibraryClient).toContain('formatAdminDateTime(item.createdAt)')
    expect(mediaLibraryClient).toContain('item.usageTitles.join')
    expect(mediaLibraryClient).toContain('Usage: not attached to any content')
  })
})

describe('attachMediaToHome server action', () => {
  it('is exported from the media actions module', () => {
    expect(mediaActions).toContain('export async function attachMediaToHome')
  })

  it('verifies admin owns the media asset before attaching', () => {
    const pos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn  = mediaActions.slice(pos)
    expect(fn).toContain('created_by')
    expect(fn).toContain('admin.id')
  })

  it('prevents attaching a photo that is already on the Home page', () => {
    expect(mediaActions).toContain('already attached to the Home page')
  })

  it('returns an error when no Home content item exists yet', () => {
    expect(mediaActions).toContain('No Home page has been saved yet')
  })

  it('revalidates the viewer page, admin home, and media library on success', () => {
    // attachMediaToHome delegates to revalidateHome() which covers all three paths.
    const fnPos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn    = mediaActions.slice(fnPos)
    expect(fn).toContain('revalidateHome()')

    // Verify revalidateHome itself covers all three routes.
    const helperPos = mediaActions.indexOf('function revalidateHome')
    const helperEnd = mediaActions.indexOf('\n}', helperPos)
    const helper    = mediaActions.slice(helperPos, helperEnd + 2)
    expect(helper).toContain("revalidatePath('/')")
    expect(helper).toContain("revalidatePath('/admin/home')")
    expect(helper).toContain("revalidatePath('/admin/media')")
  })

  it('uses origin check and admin allowlist before mutating', () => {
    const pos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn  = mediaActions.slice(pos)
    expect(fn).toContain('requireAdminWithOrigin')
  })
})

describe('media library client — Attached and Unattached sections', () => {
  it('renders an "Attached to a page" section heading for photos on at least one page', () => {
    expect(mediaLibraryClient).toContain('Attached to a page')
  })

  it('renders an "Unattached" section for photos saved in the library but on no page', () => {
    expect(mediaLibraryClient).toContain('Unattached')
  })

  it('separates items into attached and unattached arrays based on attachmentCount', () => {
    expect(mediaLibraryClient).toContain('attachmentCount > 0')
    expect(mediaLibraryClient).toContain('attachmentCount === 0')
  })
})

describe('detachMediaCore — preserves media_assets and Storage', () => {
  it('deletes only the content_media association row', () => {
    const pos = manageMedia.indexOf('export async function detachMediaCore')
    const end = manageMedia.indexOf('\nexport', pos + 1)
    const fn  = manageMedia.slice(pos, end)
    expect(fn).toContain("from('content_media')")
    expect(fn).toContain('.delete()')
  })

  it('does not touch the media_assets row', () => {
    const pos = manageMedia.indexOf('export async function detachMediaCore')
    const end = manageMedia.indexOf('\nexport', pos + 1)
    const fn  = manageMedia.slice(pos, end)
    expect(fn).not.toContain("from('media_assets')")
  })

  it('does not remove the Storage object', () => {
    const pos = manageMedia.indexOf('export async function detachMediaCore')
    const end = manageMedia.indexOf('\nexport', pos + 1)
    const fn  = manageMedia.slice(pos, end)
    expect(fn).not.toContain('.remove(')
  })
})

describe('attachMediaToHome — reattachment after detach', () => {
  it('only blocks when a row exists, so reattaching after detach succeeds', () => {
    // After detach the content_media row is gone; maybeSingle returns null so
    // existing is null and the guard does not fire — the insert proceeds.
    const pos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn  = mediaActions.slice(pos)
    expect(fn).toContain('.maybeSingle()')
    // Guard fires only when existing IS truthy (row found = duplicate).
    expect(fn).toContain('if (existing) return { error:')
    // Guard must NOT fire on the absence of a row (that would block reattach).
    expect(fn).not.toMatch(/if \(!existing\)[^}]*return/)
  })
})

describe('getPublishedHomeContent — draft/publish boundary', () => {
  it('queries only published content items', () => {
    expect(homeContent).toContain("eq('status', 'published')")
  })

  it('keeps a query error distinct from the genuine empty state', () => {
    expect(homeContent).toContain("if (rows.length === 0) return { state: 'empty' }")
    expect(homeContent).toContain("if (contentResult.error) return { state: 'error', reason: 'content-query' }")
  })
})
