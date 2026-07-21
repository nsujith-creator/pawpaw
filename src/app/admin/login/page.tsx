'use client'

import { useActionState } from 'react'
import { loginAdmin } from './actions'
import styles from '../admin.module.css'

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, { error: '' })

  return (
    <div className={styles.loginPage}>
      <section className={styles.loginCard} aria-labelledby="admin-sign-in-title">
        <p className={styles.eyebrow}>Private workspace</p>
        <h1 id="admin-sign-in-title" className={styles.loginTitle}>Admin sign in</h1>
        <p className={styles.loginIntro}>Enter the studio to write, organise photographs, and publish Pawpaw.</p>
        <form action={formAction} className={styles.formStack}>
          <div className={styles.fieldGroup}>
          <label htmlFor="email" className={styles.fieldLabel}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={styles.field}
          />
          </div>
          <div className={styles.fieldGroup}>
          <label htmlFor="password" className={styles.fieldLabel}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={styles.field}
          />
          </div>
          {state.error && (
            <p role="alert" className={styles.errorNotice}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className={`${styles.action} ${styles.loginSubmit}`}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
