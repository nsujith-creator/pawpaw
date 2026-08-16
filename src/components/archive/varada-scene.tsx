import Image from 'next/image'
import {
  getVaradaScene,
  getVaradaSceneById,
  type VaradaSceneId,
  type VaradaScenePageKey,
} from '@/lib/varada-scenes'
import styles from './varada-scene.module.css'

type Props =
  | { pageKey: VaradaScenePageKey; sceneId?: never; className?: string; sizes: string }
  | { sceneId: VaradaSceneId | null | undefined; pageKey?: never; className?: string; sizes: string }

export default function VaradaScene({ pageKey, sceneId, className, sizes }: Props) {
  const scene = pageKey ? getVaradaScene(pageKey) : getVaradaSceneById(sceneId)
  if (!scene) return null

  return (
    <figure className={`${styles.scene}${className ? ` ${className}` : ''}`}>
      <Image
        src={scene.image}
        alt=""
        aria-hidden="true"
        sizes={sizes}
        className={styles.image}
      />
    </figure>
  )
}
