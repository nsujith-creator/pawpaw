'use client'

// The line under her name on Home: "also pawpaw", then each of her names in turn.
// It keeps changing on every device. With reduced motion the names swap without the fade.

import { useEffect, useState } from 'react'
import { MALAYALAM } from '@/lib/family/her-names'
import styles from './family.module.css'

export default function AlsoCalled({ names }: { names: string[] }) {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (names.length < 2) return
    const timer = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => { setIndex(current => (current + 1) % names.length); setVisible(true) }, 350)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [names.length])

  if (names.length === 0) return null
  const name = names[index % names.length]
  return (
    <p className={styles.also} aria-label={`also ${names.join(', ')}`}>
      also{' '}
      <span className={styles.alsoWord} lang={MALAYALAM.test(name) ? 'ml' : undefined} style={{ opacity: visible ? 1 : 0 }} aria-hidden="true">
        {name}
      </span>
    </p>
  )
}
