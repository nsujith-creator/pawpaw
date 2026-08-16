import type { StaticImageData } from 'next/image'
import artist from '@/assets/varada/varada-artist-alpha.png'
import baseWave from '@/assets/varada/varada-base-wave-alpha.png'
import explorer from '@/assets/varada/varada-explorer-alpha.png'
import festiveChild from '@/assets/varada/varada-festive-child-alpha.png'
import gardener from '@/assets/varada/varada-gardener-alpha.png'
import reader from '@/assets/varada/varada-reader-alpha.png'

export const VARADA_SCENE_IDS = [
  'artist',
  'base-wave',
  'explorer',
  'festive-child',
  'gardener',
  'reader',
] as const

export type VaradaSceneId = typeof VARADA_SCENE_IDS[number]

export type VaradaScene = {
  image: StaticImageData
  label: string
}

export const VARADA_SCENE_OPTIONS: ReadonlyArray<{ id: VaradaSceneId; label: string; description: string }> = [
  { id: 'artist', label: 'Artist', description: 'Varada paints a golden star.' },
  { id: 'base-wave', label: 'Wave', description: 'Varada waves hello.' },
  { id: 'explorer', label: 'Explorer', description: 'Varada studies a map with a small backpack.' },
  { id: 'festive-child', label: 'Festive child', description: 'Varada holds marigold flowers.' },
  { id: 'gardener', label: 'Gardener', description: 'Varada waters a small plant.' },
  { id: 'reader', label: 'Reader', description: 'Varada looks at a storybook.' },
]

const scenes: Record<VaradaSceneId, VaradaScene> = {
  artist: { image: artist, label: 'Artist' },
  'base-wave': { image: baseWave, label: 'Wave' },
  explorer: { image: explorer, label: 'Explorer' },
  'festive-child': { image: festiveChild, label: 'Festive child' },
  gardener: { image: gardener, label: 'Gardener' },
  reader: { image: reader, label: 'Reader' },
}

// Family surfaces without a person-selected scene keep no illustration.
const pageSceneSelections = {
  'family-home': 'base-wave',
  'chapters-index': 'reader',
} as const satisfies Record<string, VaradaSceneId>

export type VaradaScenePageKey = keyof typeof pageSceneSelections

export function isVaradaSceneId(value: string | null | undefined): value is VaradaSceneId {
  return Boolean(value && VARADA_SCENE_IDS.includes(value as VaradaSceneId))
}

export function getVaradaSceneById(sceneId: string | null | undefined): VaradaScene | null {
  return isVaradaSceneId(sceneId) ? scenes[sceneId] : null
}

export function getVaradaScene(pageKey: VaradaScenePageKey): VaradaScene {
  return scenes[pageSceneSelections[pageKey]]
}
