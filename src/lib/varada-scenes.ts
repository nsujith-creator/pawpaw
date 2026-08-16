import type { StaticImageData } from 'next/image'
import artist from '@/assets/varada/varada-artist-alpha.png'
import baseWave from '@/assets/varada/varada-base-wave-alpha.png'
import explorer from '@/assets/varada/varada-explorer-alpha.png'
import festiveChild from '@/assets/varada/varada-festive-child-alpha.png'
import gardener from '@/assets/varada/varada-gardener-alpha.png'
import reader from '@/assets/varada/varada-reader-alpha.png'

export type VaradaSceneId =
  | 'artist'
  | 'base-wave'
  | 'explorer'
  | 'festive-child'
  | 'gardener'
  | 'reader'

export type VaradaScene = {
  image: StaticImageData
  alt: string
}

// This is deliberately local and explicit until an approved authoring control
// exists. New pages receive no illustration unless a person adds a page key.
const scenes: Record<VaradaSceneId, VaradaScene> = {
  artist: {
    image: artist,
    alt: 'Illustration of baby Varada painting a golden star.',
  },
  'base-wave': {
    image: baseWave,
    alt: 'Illustration of baby Varada waving in a lavender romper.',
  },
  explorer: {
    image: explorer,
    alt: 'Illustration of baby Varada exploring with a map and small backpack.',
  },
  'festive-child': {
    image: festiveChild,
    alt: 'Illustration of baby Varada holding marigold flowers in a festive outfit.',
  },
  gardener: {
    image: gardener,
    alt: 'Illustration of baby Varada watering a small potted plant.',
  },
  reader: {
    image: reader,
    alt: 'Illustration of baby Varada looking at a storybook.',
  },
}

const pageSceneSelections = {
  'family-home': 'base-wave',
  'chapters-index': 'reader',
} as const satisfies Record<string, VaradaSceneId>

export type VaradaScenePageKey = keyof typeof pageSceneSelections

export function getVaradaScene(pageKey: VaradaScenePageKey): VaradaScene {
  return scenes[pageSceneSelections[pageKey]]
}
