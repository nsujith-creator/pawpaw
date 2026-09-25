'use client'

// Her people, one at a time, each given the whole stage. The order starts somewhere
// different on every visit, so nobody is always first or always last.
// Tap a name for the next person; Pause holds whoever is showing. Screen readers get the
// full list at once.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { HerPerson } from '@/lib/family/her-names'
import styles from './family.module.css'

export default function HerPeople({ people }: { people: HerPerson[] }) {
  const [order, setOrder] = useState<HerPerson[]>(people)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const fade = useRef<number | null>(null)

  const next = useCallback(() => {
    setVisible(false)
    if (fade.current) window.clearTimeout(fade.current)
    fade.current = window.setTimeout(() => { setIndex(current => (current + 1) % Math.max(people.length, 1)); setVisible(true) }, 450)
  }, [people.length])

  // Pausing holds whoever is on screen, even if a change had already started.
  function togglePause() {
    if (!paused && fade.current) {
      window.clearTimeout(fade.current)
      fade.current = null
      setVisible(true)
    }
    setPaused(value => !value)
  }

  // Shuffle once in the browser (never on the server, so every visit starts with someone new).
  useEffect(() => {
    const shuffled = [...people]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const start = window.setTimeout(() => { setOrder(shuffled); setIndex(0); setVisible(true) }, 0)
    return () => window.clearTimeout(start)
  }, [people])

  useEffect(() => {
    if (paused || people.length < 2) return
    const timer = window.setInterval(next, 2800)
    return () => window.clearInterval(timer)
  }, [paused, people.length, next])

  useEffect(() => () => { if (fade.current) window.clearTimeout(fade.current) }, [])

  if (people.length === 0) return null
  const person = order[index % order.length]
  return (
    <>
      <ul className="visually-hidden">
        {people.map(item => <li key={`${item.malayalam}-${item.said}`}><span lang="ml">{item.malayalam}</span> {item.said}</li>)}
      </ul>
      <button type="button" className={styles.person} onClick={next} aria-hidden="true" tabIndex={-1} style={{ opacity: visible ? 1 : 0 }}>
        <span className={styles.personMl} lang="ml">{person.malayalam}</span>
        <span className={styles.personSaid}>{person.said}</span>
      </button>
      {people.length > 1 && (
        <button type="button" className={styles.personPause} aria-pressed={paused} onClick={togglePause}>
          {paused ? 'Play' : 'Pause'}
        </button>
      )}
    </>
  )
}
