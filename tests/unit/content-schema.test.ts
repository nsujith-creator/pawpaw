import { describe, it, expect } from 'vitest'
import { contentBlockSchema, bodyBlocksSchema } from '@/lib/content/schema'

describe('content block schema', () => {
  it('accepts a valid heading block', () => {
    const result = contentBlockSchema.safeParse({ type: 'heading', level: 2, text: 'Hello' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid paragraph block', () => {
    const result = contentBlockSchema.safeParse({ type: 'paragraph', text: 'Some text.' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid quote block with optional attribution', () => {
    const result = contentBlockSchema.safeParse({ type: 'quote', text: 'A quote.', attribution: 'Someone' })
    expect(result.success).toBe(true)
  })

  it('accepts a valid media block', () => {
    const result = contentBlockSchema.safeParse({ type: 'media', mediaId: '00000000-0000-0000-0000-000000000001' })
    expect(result.success).toBe(true)
  })

  it('rejects a block containing an HTML tag', () => {
    const result = contentBlockSchema.safeParse({ type: 'paragraph', text: '<script>alert(1)</script>' })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown block type', () => {
    const result = contentBlockSchema.safeParse({ type: 'unknown', text: 'x' })
    expect(result.success).toBe(false)
  })

  it('rejects a heading with an invalid level', () => {
    const result = contentBlockSchema.safeParse({ type: 'heading', level: 5, text: 'Bad' })
    expect(result.success).toBe(false)
  })

  it('rejects a media block with a non-UUID mediaId', () => {
    const result = contentBlockSchema.safeParse({ type: 'media', mediaId: 'not-a-uuid' })
    expect(result.success).toBe(false)
  })

  it('accepts an empty body_blocks array', () => {
    const result = bodyBlocksSchema.safeParse([])
    expect(result.success).toBe(true)
  })

  it('rejects body_blocks containing an invalid block', () => {
    const result = bodyBlocksSchema.safeParse([{ type: 'paragraph', text: '<b>bold</b>' }])
    expect(result.success).toBe(false)
  })
})
