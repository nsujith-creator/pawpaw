'use client'

import { useActionState } from 'react'
import { loginAdmin } from './actions'
import styles from '../admin.module.css'

export default function AdminLoginForm({ callbackFailed }: { callbackFailed: boolean }) {
  const [state, formAction, pending] = useActionState(loginAdmin, { error: '' })
  const error = state.error || (callbackFailed ? 'That sign-in link expired or was already used. Sign in here instead.' : '')

  return (
    <form action={formAction} className={styles.loginForm} aria-busy={pending}>
      <label className={styles.field}>
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" autoFocus />
      </label>
      <label className={styles.field}>
        <span>Password</span>
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button type="submit" disabled={pending} className={styles.primary}>{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  )
}
