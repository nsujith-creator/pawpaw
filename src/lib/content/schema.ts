// Validated block schema for body_blocks.
// Only plain-text block types are permitted — no HTML, no script injection.
// Release 1 block types: heading, paragraph, quote, media.

import { z } from 'zod'

const safeText = (max: number) =>
  z.string()
    .max(max)
    .refine(
      v => !/<[^>]+>/.test(v),
      { message: 'HTML is not permitted in content blocks' },
    )

const headingBlock = z.object({
  type:  z.literal('heading'),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  text:  safeText(500),
})

const paragraphBlock = z.object({
  type: z.literal('paragraph'),
  text: safeText(5000),
})

const quoteBlock = z.object({
  type:        z.literal('quote'),
  text:        safeText(2000),
  attribution: safeText(200).optional(),
})

const mediaBlock = z.object({
  type:    z.literal('media'),
  mediaId: z.string().uuid(),
  caption: safeText(500).optional(),
})

export const contentBlockSchema = z.discriminatedUnion('type', [
  headingBlock,
  paragraphBlock,
  quoteBlock,
  mediaBlock,
])

export const bodyBlocksSchema = z.array(contentBlockSchema).max(100)

export type ContentBlock = z.infer<typeof contentBlockSchema>
export type BodyBlocks   = z.infer<typeof bodyBlocksSchema>
