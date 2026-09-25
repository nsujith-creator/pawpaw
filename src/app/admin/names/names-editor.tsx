'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { HerName, HerPerson } from '@/lib/family/her-names'
import { saveFamilyList } from './actions'
import styles from '../admin.module.css'
import editor from '../content/editor.module.css'

interface Props {
  names: HerName[]
  people: HerPerson[]
  savedAt: { names: string | null; people: string | null }
  stories: { href: string; title: string }[]
}

function move<T>(list: T[], index: number, by: -1 | 1): T[] {
  const target = index + by
  if (target < 0 || target >= list.length) return list
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function SaveRow({ changed, state, onSave }: { changed: boolean; state: string; onSave: () => void }) {
  return (
    <div className={styles.actionRow}>
      <button type="button" className={styles.primary} disabled={!changed || state === 'saving'} onClick={onSave}>
        {state === 'saving' ? 'Saving…' : 'Save'}
      </button>
      <p className={styles.quietNote} role="status">{state && state !== 'saving' ? state : changed ? 'Not saved yet.' : 'This is what Home shows.'}</p>
    </div>
  )
}

export default function NamesEditor({ names: savedNames, people: savedPeople, savedAt, stories }: Props) {
  const router = useRouter()
  const [names, setNames] = useState(savedNames)
  const [people, setPeople] = useState(savedPeople)
  const [namesState, setNamesState] = useState('')
  const [peopleState, setPeopleState] = useState('')
  const [namesBase, setNamesBase] = useState(JSON.stringify(savedNames))
  const [peopleBase, setPeopleBase] = useState(JSON.stringify(savedPeople))
  const [namesAt, setNamesAt] = useState(savedAt.names)
  const [peopleAt, setPeopleAt] = useState(savedAt.people)

  async function save(key: 'her-names' | 'her-people') {
    const isNames = key === 'her-names'
    const setState = isNames ? setNamesState : setPeopleState
    setState('saving')
    const result = await saveFamilyList(key, isNames ? names : people, isNames ? namesAt : peopleAt)
      .catch(() => ({ error: "Couldn't reach the server. Try again." }))
    if ('error' in result) { setState(result.error); return }
    // Show exactly what was saved: empty rows are dropped.
    if (isNames) {
      setNames(result.items as HerName[]); setNamesBase(JSON.stringify(result.items)); setNamesAt(result.savedAt)
    } else {
      setPeople(result.items as HerPerson[]); setPeopleBase(JSON.stringify(result.items)); setPeopleAt(result.savedAt)
    }
    setState('Saved. Home shows it now.')
    router.refresh()
  }

  return (
    <>
      <section className={styles.block} aria-labelledby="names-title">
        <h2 id="names-title" className={styles.groupTitle}>Her names</h2>
        <p className={styles.quietNote}>The first one is her name; the rest also cycle under it on Home. Write in Malayalam or English.</p>
        <ol className={styles.listRows}>
          {names.map((name, index) => (
            <li key={index} className={styles.listRow}>
              <label className={styles.listField}>
                <span>Name</span>
                <input value={name.text} onChange={event => setNames(names.map((item, i) => i === index ? { ...item, text: event.target.value } : item))} lang={/[ഀ-ൿ]/.test(name.text) ? 'ml' : undefined} maxLength={200} />
              </label>
              <label className={styles.listField}>
                <span>Note under it</span>
                <input value={name.note ?? ''} onChange={event => setNames(names.map((item, i) => i === index ? { ...item, note: event.target.value } : item))} maxLength={200} placeholder="optional" />
              </label>
              <label className={styles.listField}>
                <span>Links to</span>
                <select value={name.href ?? ''} onChange={event => setNames(names.map((item, i) => i === index ? { ...item, href: event.target.value || undefined } : item))}>
                  <option value="">No story</option>
                  {stories.map(story => <option key={story.href} value={story.href}>{story.title}</option>)}
                </select>
              </label>
              <div className={editor.trayTools}>
                <button type="button" disabled={index === 0} aria-label="Move up" onClick={() => setNames(move(names, index, -1))}>↑</button>
                <button type="button" disabled={index === names.length - 1} aria-label="Move down" onClick={() => setNames(move(names, index, 1))}>↓</button>
                <button type="button" className={editor.toolQuiet} onClick={() => setNames(names.filter((_, i) => i !== index))}>Remove</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.ghost} onClick={() => setNames([...names, { text: '' }])}>+ Add a name</button>
        <SaveRow changed={JSON.stringify(names) !== namesBase} state={namesState} onSave={() => void save('her-names')} />
      </section>

      <section className={styles.block} aria-labelledby="people-title">
        <h2 id="people-title" className={styles.groupTitle}>Her people</h2>
        <p className={styles.quietNote}>On Home they appear one at a time, starting with a different person every visit, so the order here doesn&apos;t matter.</p>
        <ol className={styles.listRows} data-kind="people">
          {people.map((person, index) => (
            <li key={index} className={styles.listRow}>
              <label className={styles.listField}>
                <span>In Malayalam</span>
                <input value={person.malayalam} lang="ml" onChange={event => setPeople(people.map((item, i) => i === index ? { ...item, malayalam: event.target.value } : item))} maxLength={200} />
              </label>
              <label className={styles.listField}>
                <span>What she calls them</span>
                <input value={person.said} onChange={event => setPeople(people.map((item, i) => i === index ? { ...item, said: event.target.value } : item))} maxLength={200} placeholder="e.g. raghumaman · nunnumaman" />
              </label>
              <div className={editor.trayTools}>
                <button type="button" className={editor.toolQuiet} onClick={() => setPeople(people.filter((_, i) => i !== index))}>Remove</button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" className={styles.ghost} onClick={() => setPeople([...people, { malayalam: '', said: '' }])}>+ Add someone</button>
        <SaveRow changed={JSON.stringify(people) !== peopleBase} state={peopleState} onSave={() => void save('her-people')} />
      </section>
    </>
  )
}
