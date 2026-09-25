// Turning typed or pasted text into story blocks.
// A blank line starts a new passage. A passage that starts with "## " is a heading,
// and one that starts with "> " is something someone said. Everything else is words.

import type { ContentBlock } from '@/lib/content/schema'

export function splitPassages(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split(/\n[ \t]*\n/).map(part => part.trim()).filter(Boolean)
}

export function passageToBlock(text: string): ContentBlock {
  if (text.startsWith('### ')) return { type: 'heading', level: 3, text: text.slice(4).trim() }
  if (text.startsWith('## ')) return { type: 'heading', level: 2, text: text.slice(3).trim() }
  if (text.startsWith('> ')) {
    const lines = text.split('\n').map(line => line.replace(/^>\s?/, ''))
    const last = lines[lines.length - 1]
    // A last line such as "— acchan" names who said it.
    if (lines.length > 1 && /^(—|--)\s*\S/.test(last)) {
      return { type: 'quote', text: lines.slice(0, -1).join('\n').trim(), attribution: last.replace(/^(—|--)\s*/, '').trim() }
    }
    return { type: 'quote', text: lines.join('\n').trim() }
  }
  return { type: 'paragraph', text }
}

// Empty words are dropped before saving; a story never keeps blank passages.
export function cleanBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.flatMap((block): ContentBlock[] => {
    if (block.type === 'media') return [block.caption?.trim() ? { ...block, caption: block.caption.trim() } : { type: 'media' as const, mediaId: block.mediaId }]
    const text = block.text.trim()
    if (!text) return []
    if (block.type === 'quote') return [block.attribution?.trim() ? { ...block, text, attribution: block.attribution.trim() } : { type: 'quote' as const, text }]
    return [{ ...block, text }]
  })
}

// A story's address comes from its title until it first reaches her page, then it stays put.
// Titles that make no usable address (very short, or Malayalam only) get a steady fallback.
export function addressFor(title: string, fallback: string): string {
  const slug = title.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '')
  return slug.length >= 3 ? slug : fallback
}
