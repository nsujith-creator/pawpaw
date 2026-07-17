import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC  = join(__dirname, '../../src')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

const contentLibrary = read('app/admin/content/page.tsx')

describe('content library page', () => {
  it('redirects to login when not authenticated', () => {
    expect(contentLibrary).toContain("redirect('/admin/login')")
  })

  it('fetches content items ordered by updated_at', () => {
    expect(contentLibrary).toContain('content_items')
    expect(contentLibrary).toContain('updated_at')
  })

  it('supports filtering by status via query params', () => {
    expect(contentLibrary).toContain("name=\"status\"")
    expect(contentLibrary).toContain('filterAndSortContent')
  })

  it('supports filtering by type via query params', () => {
    expect(contentLibrary).toContain("name=\"type\"")
    expect(contentLibrary).toContain('parseContentFilters')
  })

  it('supports case-insensitive title search with clear and no-results states', () => {
    expect(contentLibrary).toContain('name="q"')
    expect(contentLibrary).toContain('Search by title')
    expect(contentLibrary).toContain('No content matches these filters')
    expect(contentLibrary).toContain('href="/admin/content"')
  })

  it('uses a disabled Release 2 Create New decision that cannot touch Home', () => {
    expect(contentLibrary).toContain('Create New — Release 2')
    expect(contentLibrary).toContain('disabled')
    expect(contentLibrary).toContain('never opens')
    const createBlock = contentLibrary.slice(
      contentLibrary.indexOf('Create New — Release 2') - 300,
      contentLibrary.indexOf('Create New — Release 2') + 300,
    )
    expect(createBlock).not.toContain('/admin/home')
  })

  it('keeps query errors distinct from a genuine empty library', () => {
    expect(contentLibrary).toContain('if (error)')
    expect(contentLibrary).toContain('role="alert"')
    expect(contentLibrary).toContain('could not be loaded')
  })

  it('links Home-type items to the Home editor at /admin/home', () => {
    expect(contentLibrary).toContain('/admin/home')
    expect(contentLibrary).toContain("item.type === 'home'")
  })

  it('does not link to a fake non-home editor URL', () => {
    // Non-home editors are not built yet — no URL like /admin/content/[id].
    expect(contentLibrary).not.toMatch(/\/admin\/content\/\[/)
    expect(contentLibrary).not.toMatch(/\/admin\/content\/editor/)
  })

  it('shows a release 2 note for non-home content types', () => {
    expect(contentLibrary).toMatch(/Release 2/i)
  })

  it('does not have a redundant Home editor link in the page header', () => {
    // The per-row "Open editor →" is the single entry point to the Home editor.
    // The header-level "+ Edit Home page" link was removed to eliminate duplicate navigation.
    const beforeList = contentLibrary.slice(0, contentLibrary.indexOf('items.map'))
    expect(beforeList).not.toContain('/admin/home')
  })

  it('has exactly one Home editor action — the per-row Open editor link', () => {
    // Per-row link exists
    expect(contentLibrary).toContain('Open editor')
    expect(contentLibrary).toContain("item.type === 'home'")
    // No second link: "+ Edit Home page" must be absent
    expect(contentLibrary).not.toContain('Edit Home page')
  })

  it('reads searchParams as a Promise (Next.js 15+ async params)', () => {
    expect(contentLibrary).toContain('searchParams: Promise<')
    expect(contentLibrary).toContain('await searchParams')
  })
})
