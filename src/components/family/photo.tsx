'use client'

// One private family photograph at a sensible size for the screen.
// The browser picks from three sizes; the photo route makes and keeps each size once.

import { useState } from 'react'
import { photoSrcSet } from '@/lib/media/photo-srcset'
import styles from './family.module.css'

interface Props {
  url: string | null
  alt: string
  width?: number | null
  height?: number | null
  sizes?: string
  className?: string
  eager?: boolean
}

export default function Photo({ url, alt, width, height, sizes = '(min-width: 900px) 40rem, 100vw', className, eager = false }: Props) {
  // If the photo fails to arrive (signed out, missing, network), say so instead of a broken image.
  const [failed, setFailed] = useState(false)
  if (!url || failed) {
    return <div className={styles.missing} role="img" aria-label={alt}>This photo didn&apos;t load. Reload the page to try again.</div>
  }
  return (
    // Private photos come from our own route, not the Next image optimiser.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${url}?w=960`}
      srcSet={photoSrcSet(url)}
      sizes={sizes}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      className={className}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      onError={() => setFailed(true)}
    />
  )
}
