'use client'

import { useActionState } from 'react'
import VaradaScene from '@/components/archive/varada-scene'
import { loginViewer } from './actions'
import styles from './family-login.module.css'

export default function FamilyLoginPage() {
  const [state, formAction, pending] = useActionState(loginViewer, { error: '' })

  return (
    <main className={styles.page}>
      <section className={styles.gateway} aria-labelledby="family-login-title">
        <div className={styles.welcome}>
          <div className={styles.brand} aria-label="Pawpaw">
            pawpaw <span aria-hidden="true">♥</span>
          </div>
          <p className={styles.kicker}>A little world, growing one memory at a time.</p>
          <VaradaScene sceneId="base-wave" sizes="(max-width: 720px) 12rem, 24rem" className={styles.character} />
          <p className={styles.whisper}>Psst. The stories are just through here.</p>
        </div>

        <div className={styles.card}>
          <p className={styles.eyebrow}>The family door</p>
          <h1 id="family-login-title" className={styles.title}>Come on in.</h1>
          <p id="family-login-help" className={styles.intro}>
            One familiar phrase, then it&apos;s all photographs, small adventures, and Varada.
          </p>

          <form action={formAction} className={styles.form} aria-busy={pending}>
            <label htmlFor="passphrase" className={styles.label}>Family passphrase</label>
            <input
              id="passphrase"
              name="passphrase"
              type="password"
              required
              autoComplete="current-password"
              aria-describedby="family-login-help"
              aria-invalid={state.error ? true : undefined}
              className={styles.input}
              autoFocus
            />
            {state.error && (
              <p role="alert" className={styles.error}>
                {state.error}
              </p>
            )}
            <button type="submit" disabled={pending} className={styles.submit}>
              {pending ? 'Opening the door…' : 'Open Varada’s world'}
            </button>
          </form>
          <p className={styles.reassurance}>Made for family. No account ceremony.</p>
        </div>
      </section>
    </main>
  )
}
