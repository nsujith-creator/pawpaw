'use client'

interface Props {
  initialPalette: string[] | null
  children:       React.ReactNode
}

// Applies the first colour from the active photograph's palette as a subtle
// ambient background tint behind the carousel. Falls back to a neutral colour.
export default function AmbientFrame({ initialPalette, children }: Props) {
  const accent = initialPalette?.[0] ?? '#1a1a2e'

  return (
    <div
      style={{
        background: `linear-gradient(to bottom, ${accent}22 0%, transparent 100%)`,
        transition: 'background 0.6s ease',
      }}
    >
      {children}
    </div>
  )
}
