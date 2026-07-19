'use client'

import { useActionState } from 'react'
import { loginViewer } from './actions'
import styles from './family-login.module.css'

export default function FamilyLoginPage() {
  const [state, formAction, pending] = useActionState(loginViewer, { error: '' })

  return (
    <main className={styles.page}>
      <section className={styles.gateway} aria-labelledby="family-login-title">
        <div className={styles.brand} aria-label="Pawpaw">
          pawpaw <span aria-hidden="true">♥</span>
        </div>

        <div className={styles.card}>
          <p className={styles.eyebrow}>Private family archive</p>
          <h1 id="family-login-title" className={styles.title}>Varada&apos;s World</h1>
          <p id="family-login-help" className={styles.intro}>
            Enter the family passphrase to continue.
          </p>

          <form action={formAction} className={styles.form} aria-busy={pending}>
            <label htmlFor="passphrase" className={styles.label}>Passphrase</label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              required
              autoComplete="current-password"
              aria-describedby="family-login-help"
              aria-invalid={state.error ? true : undefined}
              className={styles.input}
            />
            {state.error && (
              <p role="alert" className={styles.error}>
                {state.error}
              </p>
            )}
            <button type="submit" disabled={pending} className={styles.submit}>
              {pending ? 'Checking…' : 'Enter'}
            </button>
          </form>
        </div>

        <p className={styles.privacyNote}>Private by design. For family, with care.</p>
      </section>
    </main>
  )
}
