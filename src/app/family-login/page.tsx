'use client'

import { useActionState } from 'react'
import { Duck, Star } from '@/components/family/motifs'
import { loginViewer } from './actions'
import styles from './family-login.module.css'

export default function FamilyLoginPage() {
  const [state, formAction, pending] = useActionState(loginViewer, { error: '' })

  return (
    <main className={styles.page}>
      <div className={styles.cover}>
        <p className={styles.word}>pawpaw</p>
        <h1 className={styles.name}><span lang="ml">വരദ</span><span className={styles.nameSub}>Varada&apos;s family pages</span></h1>
        <Duck style={{ right: '6%', bottom: '5%', width: '38%', maxWidth: 220 }} />
        <Star style={{ right: '10%', top: '12%', width: '9%', maxWidth: 48 }} />
      </div>
      <div className={styles.door}>
        <form action={formAction} className={styles.form} aria-busy={pending}>
          <label htmlFor="passphrase" className={styles.label}>Family passphrase</label>
          <input
            id="passphrase"
            name="passphrase"
            type="password"
            required
            autoComplete="current-password"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? 'passphrase-error' : undefined}
            className={styles.input}
            autoFocus
          />
          {state.error && <p id="passphrase-error" role="alert" className={styles.error}>{state.error}</p>}
          <button type="submit" disabled={pending} className={styles.submit}>{pending ? 'Opening…' : 'Come in'}</button>
        </form>
        <p className={styles.note}>For family. If you don&apos;t have the passphrase, ask acchan or amma.</p>
      </div>
    </main>
  )
}
