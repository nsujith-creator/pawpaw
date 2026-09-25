'use client'

// The line under her name on Home: "also pawpaw", then each of her names in turn.
// Still (a plain list) for anyone who prefers reduced motion.

import { useEffect, useState } from 'react'
import { ALSO_CALLED } from '@/lib/family/her-names'
import styles from './family.module.css'

export default function AlsoCalled() {
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(true)
  const [still, setStill] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (query.matches) {
      const stillTimer = window.setTimeout(() => setStill(true), 0)
      return () => window.clearTimeout(stillTimer)
    }
    const timer = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => { setIndex(current => (current + 1) % ALSO_CALLED.length); setVisible(true) }, 350)
    }, 2400)
    return () => window.clearInterval(timer)
  }, [])

  if (still) {
    return <p className={styles.also}>also <b>pawpaw, pupu, vava, chakku, manikutty…</b></p>
  }
  const name = ALSO_CALLED[index]
  return (
    <p className={styles.also} aria-label="also pawpaw, pupu, vava, chakku, manikutty and more">
      also{' '}
      <span className={styles.alsoWord} lang={name.malayalam ? 'ml' : undefined} style={{ opacity: visible ? 1 : 0 }} aria-hidden="true">
        {name.text}
      </span>
    </p>
  )
}
