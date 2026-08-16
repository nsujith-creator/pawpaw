import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '../..')
const read = (file: string) => readFileSync(join(root, file), 'utf8')
const editor = read('src/components/content/block-editor.tsx')
const renderer = read('src/components/content/chapter-renderer.tsx')
const rendererStyles = read('src/components/content/chapter-renderer.module.css')
const preview = read('src/app/admin/content/[id]/preview/page.tsx')
const schema = read('src/lib/content/schema.ts')

describe('editorial chapter media placement', () => {
  it('lets an editor place attached photos and videos without deleting the underlying asset', () => {
    expect(editor).toContain('Place an attached photo or video')
    expect(editor).toContain("{ type: 'media', mediaId: selected.id }")
    expect(editor).toContain('The photo or video stays safely attached to the chapter.')
    expect(editor).toContain('already placed')
  })

  it('uses the same media blocks for photos and videos in the shared renderer', () => {
    expect(renderer).toContain('const videoById = new Map')
    expect(renderer).toContain('placedMedia.add(photo.id)')
    expect(renderer).toContain('placedVideos.add(video.id)')
    expect(renderer).toContain('item={photo} inline')
    expect(renderer).toContain('item={video} inline')
  })

  it('loads draft videos into private preview and keeps unplaced media as a fallback', () => {
    expect(preview).toContain('getAdminVideos')
    expect(preview).toContain('videos={videoResult.videos}')
    expect(renderer).toContain('!placedMedia.has(item.id)')
    expect(renderer).toContain('!placedVideos.has(video.id)')
  })

  it('creates an editorial inline rhythm without cropping photographs or adding autoplay', () => {
    expect(rendererStyles).toContain('.inlineMedia')
    expect(rendererStyles).toContain('calc(100% + 11rem)')
    expect(rendererStyles).toContain('.portraitFigure.inlineMedia')
    expect(rendererStyles).toContain('object-fit: contain')
    expect(renderer).not.toContain('autoPlay')
    expect(renderer).not.toContain('autoplay;')
  })

  it('uses the existing validated media block contract without a schema migration', () => {
    expect(schema).toContain("type:    z.literal('media')")
    expect(schema).toContain('mediaId: z.string().uuid()')
  })
})
