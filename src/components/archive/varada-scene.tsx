import Image from 'next/image'
import { getVaradaScene, type VaradaScenePageKey } from '@/lib/varada-scenes'
import styles from './varada-scene.module.css'

type Props = {
  pageKey: VaradaScenePageKey
  className?: string
  sizes: string
}

export default function VaradaScene({ pageKey, className, sizes }: Props) {
  const scene = getVaradaScene(pageKey)

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
