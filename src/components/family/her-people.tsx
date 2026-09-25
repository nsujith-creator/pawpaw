'use client'

// Her people, one at a time, each given the whole stage. The order starts somewhere
// different on every visit, so nobody is always first or always last.
// Screen readers get the full list at once.

import { useEffect, useState } from 'react'
import type { HerPerson } from '@/lib/family/her-names'
import styles from './family.module.css'

export default function HerPeople({ people }: { people: HerPerson[] }) {
  const [order, setOrder] = useState<HerPerson[]>(people)
  const [index, setIndex] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Shuffle once in the browser (never on the server, so the page stays the same for everyone at first paint).
    const shuffled = [...people]
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const start = window.setTimeout(() => { setOrder(shuffled); setIndex(0); setVisible(true) }, 0)
    if (people.length < 2) return () => window.clearTimeout(start)
    const timer = window.setInterval(() => {
      setVisible(false)
      window.setTimeout(() => { setIndex(current => (current + 1) % people.length); setVisible(true) }, 450)
    }, 2800)
    return () => { window.clearTimeout(start); window.clearInterval(timer) }
  }, [people])

  if (people.length === 0) return null
  const person = order[index % order.length]
  return (
    <>
      <ul className="visually-hidden">
        {people.map(item => <li key={`${item.malayalam}-${item.said}`}><span lang="ml">{item.malayalam}</span> {item.said}</li>)}
      </ul>
      <div className={styles.person} aria-hidden="true" style={{ opacity: visible ? 1 : 0 }}>
        <span className={styles.personMl} lang="ml">{person.malayalam}</span>
        <span className={styles.personSaid}>{person.said}</span>
      </div>
    </>
  )
}
