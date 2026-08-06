import { describe, expect, it } from 'vitest'
import {
  changeBlockType,
  createBlock,
  isEditableBlock,
  moveBlock,
  parseAdvancedBlocks,
  removeBlock,
} from '@/lib/content/block-editor'
import type { ContentBlock } from '@/lib/content/schema'

describe('structured copy transforms', () => {
  const blocks: ContentBlock[] = [
    { type: 'heading', level: 2, text: 'Beginning' },
    { type: 'paragraph', text: 'Words' },
    { type: 'media', mediaId: '00000000-0000-4000-8000-000000000001', caption: 'Protected' },
  ]

  it('creates only the three normal editor block types', () => {
    expect(createBlock('heading')).toEqual({ type: 'heading', level: 2, text: '' })
    expect(createBlock('paragraph')).toEqual({ type: 'paragraph', text: '' })
    expect(createBlock('quote')).toEqual({ type: 'quote', text: '', attribution: '' })
  })

  it('changes editable block type while retaining its main text', () => {
    expect(changeBlockType(blocks[1], 'quote')).toEqual({ type: 'quote', text: 'Words', attribution: '' })
  })

  it('does not expose media or level-one headings to the simple editor', () => {
    expect(isEditableBlock(blocks[2])).toBe(false)
    expect(isEditableBlock({ type: 'heading', level: 1, text: 'Legacy' })).toBe(false)
    expect(changeBlockType(blocks[2], 'paragraph')).toBeNull()
  })

  it('moves blocks without changing their data', () => {
    const moved = moveBlock(blocks, 2, 'earlier')
    expect(moved[1]).toEqual(blocks[2])
    expect(moved[2]).toEqual(blocks[1])
  })

  it('refuses to remove protected blocks', () => {
    expect(removeBlock(blocks, 2)).toBe(blocks)
  })

  it('advanced JSON preserves every valid block losslessly', () => {
    const value = JSON.stringify(blocks)
    expect(parseAdvancedBlocks(value)).toEqual({ ok: true, blocks })
  })

  it('rejects malformed, HTML-bearing, or unknown advanced blocks', () => {
    expect(parseAdvancedBlocks('{')).toHaveProperty('error')
    expect(parseAdvancedBlocks('[{"type":"paragraph","text":"<b>x</b>"}]')).toHaveProperty('error')
    expect(parseAdvancedBlocks('[{"type":"embed","url":"x"}]')).toHaveProperty('error')
  })
})
