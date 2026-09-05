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

  it('fetches the shared media library for the verified active admin', () => {
    expect(mediaLibraryPage).toContain('media_assets')
    expect(mediaLibraryPage).not.toContain(".eq('created_by', admin.id)")
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

  it('passes only a safe filename and signed URL to the client without exposing storage paths', () => {
    expect(mediaLibraryPage).toContain('safeStorageBasename')
    expect(mediaLibraryPage).toContain('generateSignedUrl')
    expect(mediaLibraryClient).not.toContain('storagePath')
  })
})

describe('media library client component', () => {
  it('offers a real target selector for Home and owned chapters', () => {
    expect(mediaLibraryClient).toContain('attachMediaToContent')
    expect(mediaLibraryClient).toContain('Add this photograph to')
    expect(mediaLibraryClient).toContain('Add to memory')
    expect(mediaLibraryClient).toContain('targets.map')
    expect(mediaLibraryClient).toContain('Choose a memory…')
    expect(mediaLibraryClient).not.toContain("targets[0]?.id")
  })

  it('offers a permanent delete with a confirmation step', () => {
    expect(mediaLibraryClient).toContain('confirmDelete')
    expect(mediaLibraryClient).toContain('Remove this photograph forever')
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
    expect(mediaLibraryClient).toContain('Not used yet')
  })

  it('renders creation date and exact usage titles', () => {
    expect(mediaLibraryClient).toContain('formatAdminDateTime(selected.createdAt)')
    expect(mediaLibraryClient).toContain('selected.usageTitles.join')
    expect(mediaLibraryClient).toContain('Appears in')
  })
})

describe('attachMediaToHome server action', () => {
  it('is exported from the media actions module', () => {
    expect(mediaActions).toContain('export async function attachMediaToHome')
  })

  it('uses the shared active-admin attachment rule instead of a creator silo', () => {
    const pos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn  = mediaActions.slice(pos)
    expect(fn).not.toContain(".eq('created_by', admin.id)")
    expect(fn).toContain('attachMediaCore(db, admin.id')
  })

  it('delegates duplicate prevention to the transactional attach function', () => {
    expect(manageMedia).toContain("rpc('attach_owned_media'")
  })

  it('returns an error when no Home content item exists yet', () => {
    expect(mediaActions).toContain('The shared Home page is not available')
  })

  it('revalidates the exact selected Home target and shared media surfaces on success', () => {
    const fnPos = mediaActions.indexOf('export async function attachMediaToHome')
    const fn    = mediaActions.slice(fnPos)
    expect(fn).toContain('revalidateTarget(homes[0].id)')

    const helperPos = mediaActions.indexOf('async function revalidateTarget')
    const helperEnd = mediaActions.indexOf('\n}\n', helperPos)
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

describe('media library client — calm photo shelf', () => {
  it('shows a selectable thumbnail shelf with one focused inspector', () => {
    expect(mediaLibraryClient).toContain('role="listbox"')
    expect(mediaLibraryClient).toContain('role="option"')
    expect(mediaLibraryClient).toContain('selectedId')
    expect(mediaLibraryClient).toContain('aria-label="Selected photograph"')
  })

  it('keeps detail editing and destructive work on the selected photograph only', () => {
    expect(mediaLibraryClient).toContain('selected.mediaId')
    expect(mediaLibraryClient).toContain('<details')
    expect(mediaLibraryClient).toContain('Save words')
  })
})

describe('detachMediaCore — preserves media_assets and Storage', () => {
  it('delegates association-only deletion to the atomic database function', () => {
    const pos = manageMedia.indexOf('export async function detachMediaCore')
    const end = manageMedia.indexOf('\nexport', pos + 1)
    const fn  = manageMedia.slice(pos, end)
    expect(fn).toContain("rpc('detach_owned_media'")
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
    expect(fn).toContain('attachMediaCore(db, admin.id, homes[0].id, mediaId)')
    // Guard fires only when existing IS truthy (row found = duplicate).
    expect(manageMedia).toContain("rpc('attach_owned_media'")
    // Guard must NOT fire on the absence of a row (that would block reattach).
    expect(fn).not.toContain("from('content_media').insert")
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
