'use client'

interface Props {
  total:   number
  current: number
  onPrev:  () => void
  onNext:  () => void
  onGoto:  (i: number) => void
}

const btnStyle: React.CSSProperties = {
  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
  background: 'rgba(0,0,0,0.45)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '50%', width: '2.5rem', height: '2.5rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '1.125rem', cursor: 'pointer', userSelect: 'none',
}

export default function CarouselControls({ total, current, onPrev, onNext, onGoto }: Props) {
  if (total <= 1) return null

  return (
    <>
      <button
        aria-label="Previous photo"
        onClick={onPrev}
        style={{ ...btnStyle, left: '0.75rem' }}
      >
        ‹
      </button>

      <button
        aria-label="Next photo"
        onClick={onNext}
        style={{ ...btnStyle, right: '0.75rem' }}
      >
        ›
      </button>

      {/* Position indicator */}
      <div
        role="tablist"
        aria-label="Photo position"
        style={{
          position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '0.375rem',
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Photo ${i + 1}`}
            onClick={() => onGoto(i)}
            style={{
              width: i === current ? '1.25rem' : '0.5rem',
              height: '0.5rem',
              borderRadius: '9999px',
              background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
              border: 'none',
              cursor: 'pointer',
              transition: 'width 0.2s, background 0.2s',
              padding: 0,
            }}
          />
        ))}
      </div>
    </>
  )
}
