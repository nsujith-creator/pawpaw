import { bodyBlocksSchema, type ContentBlock } from './schema'

export type EditableBlockType = 'heading' | 'paragraph' | 'quote'
export type EditableContentBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string; attribution?: string }

export function isEditableBlock(block: ContentBlock): block is EditableContentBlock {
  return block.type === 'paragraph' ||
    block.type === 'quote' ||
    (block.type === 'heading' && (block.level === 2 || block.level === 3))
}

export function isBlockNonEmpty(block: ContentBlock): boolean {
  if (block.type === 'media') return true
  return block.text.trim().length > 0 ||
    (block.type === 'quote' && Boolean(block.attribution?.trim()))
}

export function createBlock(type: EditableBlockType): ContentBlock {
  if (type === 'heading') return { type: 'heading', level: 2, text: '' }
  if (type === 'quote') return { type: 'quote', text: '', attribution: '' }
  return { type: 'paragraph', text: '' }
}

export function changeBlockType(
  block: ContentBlock,
  type: EditableBlockType,
): ContentBlock | null {
  if (!isEditableBlock(block)) return null
  if (type === 'heading') {
    return {
      type: 'heading',
      level: block.type === 'heading' && block.level === 3 ? 3 : 2,
      text: block.text,
    }
  }
  if (type === 'quote') {
    return {
      type: 'quote',
      text: block.text,
      attribution: block.type === 'quote' ? block.attribution : '',
    }
  }
  return { type: 'paragraph', text: block.text }
}

export function moveBlock(
  blocks: ContentBlock[],
  index: number,
  direction: 'earlier' | 'later',
): ContentBlock[] {
  const target = direction === 'earlier' ? index - 1 : index + 1
  if (index < 0 || index >= blocks.length || target < 0 || target >= blocks.length) {
    return blocks
  }
  const next = [...blocks]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function removeBlock(blocks: ContentBlock[], index: number): ContentBlock[] {
  if (index < 0 || index >= blocks.length || !isEditableBlock(blocks[index])) return blocks
  return blocks.filter((_, blockIndex) => blockIndex !== index)
}

export function parseAdvancedBlocks(value: string):
  | { ok: true; blocks: ContentBlock[] }
  | { error: string } {
  let parsed: unknown
  try {
    parsed = JSON.parse(value)
  } catch {
    return { error: 'The advanced JSON is not valid JSON.' }
  }
  const result = bodyBlocksSchema.safeParse(parsed)
  if (!result.success) {
    const issue = result.error.issues[0]
    const block = typeof issue?.path[0] === 'number' ? ` in block ${Number(issue.path[0]) + 1}` : ''
    return { error: `The advanced content is not valid${block}: ${issue?.message ?? 'unknown problem'}.` }
  }
  return { ok: true, blocks: result.data }
}
