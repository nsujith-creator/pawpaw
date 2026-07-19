'use client'

import type { AmbientTheme } from '@/lib/media/ambient-color'
import styles from './home-carousel.module.css'

interface Props {
  theme:    AmbientTheme
  children: React.ReactNode
}

type AmbientStyle = React.CSSProperties & {
  '--ambient-surface': string
  '--ambient-accent': string
}

// The active photo drives only this bounded decorative surface. Readable text,
// controls, semantic states, and the page background keep approved fixed tokens.
export default function AmbientFrame({ theme, children }: Props) {
  const ambientStyle: AmbientStyle = {
    '--ambient-surface': theme.surface.css,
    '--ambient-accent': theme.accent.css,
  }

  return (
    <div
      className={styles.ambient}
      style={ambientStyle}
      data-ambient-fallback={theme.isFallback ? 'true' : 'false'}
    >
      {children}
    </div>
  )
}
