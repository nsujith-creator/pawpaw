'use client'

// Leave ends the family session on this device. A plain form POST, so it works without
// JavaScript. It also tells every other open pawpaw tab to go back to the front door,
// so no photo stays on screen in a tab someone forgot about.

import { useState, type FormEvent } from 'react'
import styles from './family.module.css'

export const LEAVE_CHANNEL = 'pawpaw-leave'

export default function LeaveButton() {
  const [leaving, setLeaving] = useState(false)

  async function leave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (leaving) return
    const form = event.currentTarget
    setLeaving(true)
    document.documentElement.setAttribute('data-pawpaw-private-hidden', '')
    try { new BroadcastChannel(LEAVE_CHANNEL).postMessage('left') } catch { /* older browsers */ }

    try {
      const response = await fetch(form.action, {
        method: 'POST', credentials: 'same-origin', redirect: 'follow', headers: { Accept: 'text/html' },
      })
      const destination = new URL(response.url)
      if (!response.ok || destination.origin !== window.location.origin || destination.pathname !== '/family-login') {
        throw new Error('Unexpected destination after leaving')
      }
      window.location.replace('/family-login')
    } catch {
      form.submit()
    }
  }

  return (
    <form action="/logout/viewer" method="post" onSubmit={leave}>
      <button type="submit" className={styles.leave} disabled={leaving}>
        {leaving ? 'Leaving…' : 'Leave'}
      </button>
    </form>
  )
}
