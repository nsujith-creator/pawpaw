import { describe, it, expect } from 'vitest'
import { plainTextToBlocks, blocksToPlainText, countNonParagraphBlocks } from '@/lib/content/plain-text'
import { bodyBlocksSchema } from '@/lib/content/schema'

describe('plainTextToBlocks', () => {
  it('converts a single line into one paragraph block that passes the schema', () => {
    const blocks = plainTextToBlocks('[TEST]')
    expect(blocks).toEqual([{ type: 'paragraph', text: '[TEST]' }])
    expect(bodyBlocksSchema.safeParse(blocks).success).toBe(true)
  })

  it('splits paragraphs on blank lines and trims whitespace', () => {
    const blocks = plainTextToBlocks('First paragraph.\n\n  Second paragraph.  \n\n\nThird.')
    expect(blocks).toEqual([
      { type: 'paragraph', text: 'First paragraph.' },
      { type: 'paragraph', text: 'Second paragraph.' },
      { type: 'paragraph', text: 'Third.' },
    ])
  })

  it('handles Windows line endings', () => {
    const blocks = plainTextToBlocks('One.\r\n\r\nTwo.')
    expect(blocks).toEqual([
      { type: 'paragraph', text: 'One.' },
      { type: 'paragraph', text: 'Two.' },
    ])
  })

  it('keeps single newlines inside one paragraph', () => {
    const blocks = plainTextToBlocks('Line one\nline two')
    expect(blocks).toHaveLength(1)
    expect(blocks[0].text).toBe('Line one\nline two')
  })

  it('returns an empty array for empty or whitespace-only text (empty draft allowed)', () => {
    expect(plainTextToBlocks('')).toEqual([])
    expect(plainTextToBlocks('   \n\n  \n')).toEqual([])
    expect(bodyBlocksSchema.safeParse(plainTextToBlocks('')).success).toBe(true)
  })

  it('preserves text verbatim — brackets and punctuation are not treated as structure', () => {
    const blocks = plainTextToBlocks('TEST[]')
    expect(blocks).toEqual([{ type: 'paragraph', text: 'TEST[]' }])
    expect(bodyBlocksSchema.safeParse(blocks).success).toBe(true)
  })

  it('HTML in the text still fails the server-side schema (defense unchanged)', () => {
    const blocks = plainTextToBlocks('<script>alert(1)</script>')
    expect(bodyBlocksSchema.safeParse(blocks).success).toBe(false)
  })
})

describe('blocksToPlainText', () => {
  it('round-trips paragraph blocks through plain text', () => {
    const original = plainTextToBlocks('First.\n\nSecond.')
    expect(plainTextToBlocks(blocksToPlainText(original))).toEqual(original)
  })

  it('extracts only paragraph text, skipping heading, quote, and media blocks', () => {
    const text = blocksToPlainText([
      { type: 'heading', level: 2, text: 'A heading' },
      { type: 'paragraph', text: 'Kept.' },
      { type: 'media', mediaId: '00000000-0000-0000-0000-000000000000' },
      { type: 'paragraph', text: 'Also kept.' },
    ])
    expect(text).toBe('Kept.\n\nAlso kept.')
  })

  it('ignores malformed entries without crashing', () => {
    expect(blocksToPlainText([null, 42, { type: 'paragraph' }, { type: 'paragraph', text: 'ok' }])).toBe('ok')
  })
})

describe('countNonParagraphBlocks', () => {
  it('is zero for pure paragraph content', () => {
    expect(countNonParagraphBlocks(plainTextToBlocks('a\n\nb'))).toBe(0)
  })

  it('counts heading, quote, and media blocks', () => {
    expect(countNonParagraphBlocks([
      { type: 'heading', level: 1, text: 'h' },
      { type: 'paragraph', text: 'p' },
      { type: 'quote', text: 'q' },
      { type: 'media', mediaId: 'x' },
    ])).toBe(3)
  })
})
