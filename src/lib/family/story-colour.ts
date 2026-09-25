// Each story has one picture-book colour. The author can choose it; otherwise it is picked
// steadily from the story's address, so the same story always keeps the same colour.
// Stored in the existing visual_scene column (the retired illustration slot).

export const STORY_COLOURS = ['teal', 'rose', 'sky', 'duck', 'night'] as const
export type StoryColour = typeof STORY_COLOURS[number]

export const STORY_COLOUR_NAMES: Record<StoryColour, string> = {
  teal: 'Teal', rose: 'Rose', sky: 'Sky', duck: 'Duck yellow', night: 'Night',
}

export function isStoryColour(value: unknown): value is StoryColour {
  return typeof value === 'string' && (STORY_COLOURS as readonly string[]).includes(value)
}

export function storyColour(chosen: string | null | undefined, slug: string): StoryColour {
  if (isStoryColour(chosen)) return chosen
  let hash = 0
  for (const character of slug) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  return STORY_COLOURS[hash % STORY_COLOURS.length]
}
