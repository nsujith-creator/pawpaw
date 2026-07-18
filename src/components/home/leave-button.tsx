'use client'

import { useState, type FormEvent } from 'react'
import styles from './leave-button.module.css'

// Viewer logout control. Plain form POST — works without JavaScript.
// Rendered on every viewer-facing state (published and empty alike) so the
// family can always end the session on a shared device.
export default function LeaveButton() {
  const [leaving, setLeaving] = useState(false)

  async function leave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (leaving) return

    const form = event.currentTarget
    setLeaving(true)
    document.documentElement.setAttribute('data-pawpaw-private-hidden', '')

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'follow',
        headers: { Accept: 'text/html' },
      })
      const destination = new URL(response.url)
      if (!response.ok || destination.origin !== window.location.origin || destination.pathname !== '/family-login') {
        throw new Error('Unexpected viewer logout destination')
      }

      window.location.replace('/family-login')
    } catch {
      // Preserve the no-JavaScript/native POST fallback if fetch is unavailable.
      // Keep the private page hidden while the browser retries the real form submission.
      form.submit()
    }
  }

  return (
    <form action="/logout/viewer" method="post" className={styles.form} onSubmit={leave}>
      <button type="submit" className={styles.button} disabled={leaving}>
        {leaving ? 'Leavingâ€¦' : 'Leave'}
      </button>
    </form>
  )
}
