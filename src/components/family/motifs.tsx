// Cut-paper shapes of things in her photographs: the rubber duck, a balloon, a star.
// Hand-authored, flat, obviously paper, never a drawing of her.

import styles from './family.module.css'

export function Duck({ style }: { style?: React.CSSProperties }) {
  return (
    <svg className={styles.motif} style={style} viewBox="0 0 120 100" aria-hidden="true">
      <ellipse cx="62" cy="68" rx="46" ry="26" fill="#fff4c8" />
      <circle cx="36" cy="38" r="22" fill="#fff4c8" />
      <path d="M13 38 L0 44 L14 48 Z" fill="#f28c28" />
      <circle cx="32" cy="33" r="3.4" fill="#22163a" />
      <path d="M60 64 q16 -14 36 -2" stroke="#e7b62d" strokeWidth="5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

export function Balloon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg className={styles.motif} style={style} viewBox="0 0 40 60" aria-hidden="true">
      <ellipse cx="20" cy="20" rx="17" ry="19" fill="#c8325a" />
      <path d="M20 39 q-4 10 2 20" stroke="#22163a" strokeWidth="1.5" fill="none" />
    </svg>
  )
}

export function Star({ style }: { style?: React.CSSProperties }) {
  return (
    <svg className={styles.motif} style={style} viewBox="0 0 50 50" aria-hidden="true">
      <path d="M25 2 L31 18 L48 19 L35 30 L39 47 L25 38 L11 47 L15 30 L2 19 L19 18 Z" fill="#fff" />
    </svg>
  )
}
