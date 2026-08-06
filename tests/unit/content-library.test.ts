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

  it('offers the authorised shared chapter creator without changing the Home route', () => {
    expect(contentLibrary).toContain('Create chapter')
    expect(contentLibrary).toContain('href="/admin/content/new"')
    expect(contentLibrary).toContain('Home remains a protected singleton')
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

  it('links every non-Home item to the shared ID-based editor', () => {
    expect(contentLibrary).toContain('href={`/admin/content/${item.id}`}')
    expect(contentLibrary).not.toContain('/admin/content/editor')
  })

  it('states the exact four non-Home types handled by the shared editor', () => {
    expect(contentLibrary).toContain('Story, Gallery, Letter, and Moment')
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
