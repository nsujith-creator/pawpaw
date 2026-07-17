// Conversion between owner-friendly plain text and body_blocks.
// Plain text is split into paragraph blocks on blank lines; nothing else is
// generated, so the output always satisfies bodyBlocksSchema's paragraph shape
// (the caller still validates server-side before persisting).

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

// Split plain text into paragraph blocks: paragraphs are separated by one or
// more blank lines; surrounding whitespace is trimmed; empty paragraphs are
// dropped. Text content is preserved verbatim otherwise.
export function plainTextToBlocks(text: string): ParagraphBlock[] {
  return text
    .split(/\r?\n(?:\s*\r?\n)+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .map(p => ({ type: 'paragraph' as const, text: p }))
}

// Extract the paragraph text from existing blocks for display in the plain-text
// editor. Non-paragraph blocks (heading, quote, media) are not representable as
// plain text and are intentionally excluded — callers must warn before saving
// over them (see countNonParagraphBlocks).
export function blocksToPlainText(blocks: unknown[]): string {
  return blocks
    .filter(
      (b): b is ParagraphBlock =>
        typeof b === 'object' && b !== null &&
        (b as { type?: unknown }).type === 'paragraph' &&
        typeof (b as { text?: unknown }).text === 'string',
    )
    .map(b => b.text)
    .join('\n\n')
}

// How many blocks would be lost if the content were re-saved from plain text.
export function countNonParagraphBlocks(blocks: unknown[]): number {
  return blocks.filter(
    b => !(typeof b === 'object' && b !== null && (b as { type?: unknown }).type === 'paragraph'),
  ).length
}
