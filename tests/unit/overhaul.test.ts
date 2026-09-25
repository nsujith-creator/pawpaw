import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { addressFor, cleanBlocks, passageToBlock, splitPassages } from '@/lib/admin/manuscript'
import { chartOrder, nextOnChart } from '@/lib/family/chart-order'
import { contentFingerprint } from '@/lib/content/fingerprint'
import { storyColour } from '@/lib/family/story-colour'
import { ageAt, knownDate } from '@/lib/family/age'
import { decodeMediaToken, encodeMediaToken, nearestPhotoWidth } from '@/lib/media/media-token'

const root = join(__dirname, '../..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')

describe('writing: typed and pasted text becomes story blocks', () => {
  it('splits on blank lines and drops empty passages', () => {
    expect(splitPassages('One.\n\nTwo.\r\n\r\n\n  Three.  \n\n')).toEqual(['One.', 'Two.', 'Three.'])
  })

  it('reads headings and said lines, with an optional speaker', () => {
    expect(passageToBlock('## Six weeks')).toEqual({ type: 'heading', level: 2, text: 'Six weeks' })
    expect(passageToBlock('> ഉവ്വ')).toEqual({ type: 'quote', text: 'ഉവ്വ' })
    expect(passageToBlock('> Look at her.\n— amma')).toEqual({ type: 'quote', text: 'Look at her.', attribution: 'amma' })
    expect(passageToBlock('Plain words — with a dash.')).toEqual({ type: 'paragraph', text: 'Plain words — with a dash.' })
  })

  it('never saves blank passages or empty captions', () => {
    const id = '5f0c7d1e-2a4b-4c6d-8e9f-0a1b2c3d4e5f'
    expect(cleanBlocks([
      { type: 'paragraph', text: '  ' },
      { type: 'paragraph', text: ' kept ' },
      { type: 'quote', text: 'said', attribution: ' ' },
      { type: 'media', mediaId: id, caption: '' },
    ])).toEqual([
      { type: 'paragraph', text: 'kept' },
      { type: 'quote', text: 'said' },
      { type: 'media', mediaId: id },
    ])
  })

  it('makes an address from the title, with a steady fallback for Malayalam or very short titles', () => {
    expect(addressFor('She Arrives', 'x-fallback')).toBe('she-arrives')
    expect(addressFor('My Pawpaw', 'x-fallback')).toBe('my-pawpaw')
    expect(addressFor('വരദ', 'story-abc')).toBe('story-abc')
    expect(addressFor('V', 'story-abc')).toBe('story-abc')
  })
})

describe('her chart', () => {
  const items = [
    { slug: 'first-days', eventDate: '2026-05-29', publishedAt: '2026-08-01T00:00:00Z' },
    { slug: 'she-arrives', eventDate: '2026-07-15', publishedAt: '2026-09-25T00:00:00Z' },
    { slug: 'baby-in-the-glass', eventDate: '2026-09-18', publishedAt: '2026-09-25T00:00:00Z' },
    { slug: 'undated', eventDate: null, publishedAt: '2026-06-10T00:00:00Z' },
  ]

  it('hangs the newest at the top and undated stories by when they were added', () => {
    expect(chartOrder(items).map(item => item.slug)).toEqual(['baby-in-the-glass', 'she-arrives', 'undated', 'first-days'])
  })

  it('points each story to the one below it, and the oldest to none', () => {
    expect(nextOnChart(items, 'baby-in-the-glass')?.slug).toBe('she-arrives')
    expect(nextOnChart(items, 'first-days')).toBeNull()
  })

  it('says her age the way the family does', () => {
    expect(ageAt('2026-05-29', 'day')).toBe('day 0')
    expect(ageAt('2026-05-31', 'day')).toBe('2 days')
    expect(ageAt('2026-06-26', 'day')).toBe('28 days')
    expect(ageAt('2026-06-27', 'day')).toBe('1 month')
    expect(ageAt('2026-07-03', 'day')).toBe('5 weeks')
    expect(ageAt('2026-07-15', 'day')).toBe('6 weeks')
    expect(ageAt('2026-09-18', 'day')).toBe('16 weeks')
  })

  it('never invents a week or day for a date known only to the month', () => {
    expect(ageAt('2026-09-01', 'month')).toBe('about 4 months')
    expect(ageAt('2026-05-01', 'month')).toBe('her first month')
    expect(ageAt('2026-09-01', 'year')).toBeNull()
  })

  it('writes a date as precisely as it is known', () => {
    expect(knownDate('2026-09-25', 'day')).toBe('25 September 2026')
    expect(knownDate('2026-09-01', 'month')).toBe('September 2026')
    expect(knownDate('2026-01-01', 'year')).toBe('2026')
    expect(knownDate(null, 'day')).toBeNull()
  })

  it('keeps a chosen colour and otherwise picks the same one every time', () => {
    expect(storyColour('rose', 'anything')).toBe('rose')
    expect(storyColour(null, 'my-pawpaw')).toBe(storyColour('reader', 'my-pawpaw'))
  })
})

describe('saving never overwrites words changed elsewhere', () => {
  const base = {
    title: 'She Arrives', summary: null, body_blocks: [{ type: 'paragraph', text: 'One.' }],
    event_date: '2026-07-15', event_date_precision: 'day', authored_date: null,
    author_display_name: 'acchan', recipient_display_name: null, visual_scene: 'duck',
  }

  it('ignores key order, so the stored row and the loaded page agree', () => {
    expect(contentFingerprint({ ...base, body_blocks: [{ text: 'One.', type: 'paragraph' }] })).toBe(contentFingerprint(base))
  })

  it('changes when the words change', () => {
    expect(contentFingerprint({ ...base, body_blocks: [{ type: 'paragraph', text: 'One!' }] })).not.toBe(contentFingerprint(base))
  })

  it('checks the fingerprint before writing and answers a signed-out editor without throwing', () => {
    const actions = read('src/app/admin/content/actions.ts')
    expect(actions).toContain("text(formData, 'expected_fingerprint')")
    expect(actions.indexOf('conflict: true')).toBeLessThan(actions.indexOf(".update({ ...plan.payload"))
    expect(actions).toContain('if (!admin) return SIGNED_OUT')
    // The write itself only lands if the row is unchanged since it was checked.
    expect(actions).toContain(".eq('updated_at', readAt!)")
  })

  it('never deletes a version the author has not seen, and never saves over lists changed elsewhere', () => {
    const actions = read('src/app/admin/content/actions.ts')
    expect(actions.indexOf("text(formData, 'expected_fingerprint')", actions.indexOf('export async function deleteChapter')))
      .toBeLessThan(actions.indexOf("rpc('delete_story_everywhere'"))
    expect(read('src/app/admin/content/story-editor.tsx')).toContain('if (!(await save())) return')
    const names = read('src/app/admin/names/actions.ts')
    expect(names).toContain(".eq('updated_at', loadedAt)")
    expect(read('src/app/admin/names/page.tsx')).toContain('if (lists.fallback)')
  })

  it('keeps unsaved words in the browser and warns before leaving', () => {
    const editor = read('src/app/admin/content/story-editor.tsx')
    expect(editor).toContain('window.localStorage.setItem(storageKey')
    expect(editor).toContain("addEventListener('beforeunload'")
    expect(editor).toContain("document.addEventListener('visibilitychange'")
    expect(editor).toContain('Bring them back')
  })

  it('keeps revision numbers, addresses and JSON out of the editor', () => {
    const editor = read('src/app/admin/content/story-editor.tsx')
    expect(editor).not.toMatch(/Revision \$\{|\/chapters\/<|JSON editor|slug<\/|>Slug/i)
  })
})

describe('private photos', () => {
  const secret = 'test-secret-that-is-long-enough-000000000'

  it('seals the storage path and refuses tampering or traversal', () => {
    const token = encodeMediaToken('admin/123-abc.jpg', secret)
    expect(token).not.toContain('admin')
    expect(decodeMediaToken(token, secret)).toBe('admin/123-abc.jpg')
    expect(decodeMediaToken(token, `${secret}x`)).toBeNull()
    expect(decodeMediaToken(encodeMediaToken('../etc/passwd', secret), secret)).toBeNull()
    expect(decodeMediaToken(encodeMediaToken('/root.jpg', secret), secret)).toBeNull()
  })

  it('serves only three sizes', () => {
    expect(nearestPhotoWidth('300')).toBe(480)
    expect(nearestPhotoWidth('961')).toBe(1600)
    expect(nearestPhotoWidth('9999')).toBe(1600)
    expect(nearestPhotoWidth(null)).toBe(1600)
  })

  it('gives each photo one steady address, different for different photos', () => {
    expect(encodeMediaToken('admin/a.jpg', secret)).toBe(encodeMediaToken('admin/a.jpg', secret))
    expect(encodeMediaToken('admin/a.jpg', secret)).not.toBe(encodeMediaToken('admin/b.jpg', secret))
  })

  it('checks family or admin access and lets only the viewer’s own browser keep the photo', () => {
    const route = read('src/app/p/[token]/route.ts')
    expect(route).toContain('verifyViewerCookie')
    expect(route).toContain('requireActiveAdmin')
    expect(route).toContain("'private, max-age=2592000, immutable'")
    expect(route).not.toMatch(/public, max-age|s-maxage/)
    // Refusals are never cached.
    expect(route).toContain("status: 401, headers: PRIVATE")
  })

  it('never hands a storage path to the Photos page in the browser', () => {
    const library = read('src/app/admin/media/photo-library.tsx')
    expect(library).not.toContain('storage_path')
    expect(library).not.toContain('storagePath')
  })

  it('shrinks photos in the browser before they go up', () => {
    const prepare = read('src/lib/media/prepare-photo.ts')
    expect(prepare).toContain("imageOrientation: 'from-image'")
    expect(prepare).toContain('const LONG_EDGE = 2400')
  })
})

describe('one renderer for the family and the preview', () => {
  it('draws stories, First Days and the preview with the same story page', () => {
    for (const file of ['src/app/(archive)/chapters/[slug]/page.tsx', 'src/app/(archive)/first-days/page.tsx', 'src/app/admin/content/[id]/preview/page.tsx']) {
      expect(read(file)).toContain("import StoryPage from '@/components/family/story-page'")
    }
  })

  it('keeps the preview private and uncached', () => {
    const preview = read('src/app/admin/content/[id]/preview/page.tsx')
    expect(preview).toContain("export const dynamic = 'force-dynamic'")
    expect(preview).toContain('robots: { index: false, follow: false }')
    expect(preview).toContain('await requireAdminPage()')
  })

  it('never repeats the cover photo after the words', () => {
    expect(read('src/components/family/story-page.tsx')).toContain('if (cover) placed.add(cover.id)')
  })
})

describe('picture-book design', () => {
  const globals = read('src/app/globals.css')
  const layout = read('src/app/layout.tsx')

  it('loads Bricolage Grotesque, Literata and the rounded Malayalam face', () => {
    expect(layout).toContain('Bricolage_Grotesque')
    expect(layout).toContain('Literata')
    expect(layout).toContain('Baloo_Chettan_2')
    expect(layout).toMatch(/subsets: \[[^\]]*'malayalam'/)
  })

  it('reads on white paper, not beige', () => {
    expect(globals).toMatch(/--paper:\s*#fff(fff)?;/i)
    expect(globals.toLowerCase()).not.toMatch(/#fff8ee|#f7f1e3|cream/)
  })

  it('stills motion for anyone who asks', () => {
    expect(globals).toContain('@media (prefers-reduced-motion: reduce)')
    // Her names and her people keep changing on every device; reduced motion only drops the fade.
    expect(read('src/components/family/also-called.tsx')).not.toContain('prefers-reduced-motion')
    expect(read('src/components/family/her-people.tsx')).toContain('Math.random()')
    // Anyone can hold a person on screen.
    expect(read('src/components/family/her-people.tsx')).toContain("aria-pressed={paused}")
  })

  it('has no painted characters left anywhere', () => {
    for (const file of ['src/app/family-login/page.tsx', 'src/app/(archive)/page.tsx', 'src/components/family/story-page.tsx']) {
      expect(read(file)).not.toMatch(/VaradaScene|illustrations\/varada/)
    }
  })

  it('says Leaving… with a real ellipsis', () => {
    expect(read('src/components/family/leave-button.tsx')).toContain('Leaving…')
  })
})
