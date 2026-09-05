'use client'

import { useActionState } from 'react'
import { loginAdmin } from './actions'
import styles from '../admin.module.css'

export default function AdminLoginForm({ callbackFailed }: { callbackFailed: boolean }) {
  const [state, formAction, pending] = useActionState(loginAdmin, { error: '' })
  const error = state.error || (callbackFailed ? 'That sign-in link expired or was already used. Sign in here instead.' : '')

  return (
    <section className={styles.loginCard} aria-labelledby="admin-sign-in-title">
      <p className={styles.eyebrow}>Your writing desk</p>
      <h2 id="admin-sign-in-title" className={styles.loginTitle}>Welcome back.</h2>
      <p className={styles.loginIntro}>Sign in and Pawpaw will take you to the next useful thing.</p>
      <form action={formAction} className={styles.formStack} aria-busy={pending}>
        <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.fieldLabel}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={styles.field} autoFocus />
        </div>
        <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.fieldLabel}>Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={styles.field} />
        </div>
        {error && <p role="alert" className={styles.errorNotice}>{error}</p>}
        <button type="submit" disabled={pending} className={`${styles.action} ${styles.loginSubmit}`}>
          {pending ? 'Opening your desk…' : 'Open the studio'}
        </button>
      </form>
    </section>
  )
}
