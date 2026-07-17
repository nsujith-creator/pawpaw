'use client'

import { useActionState } from 'react'
import { loginViewer } from './actions'

export default function FamilyLoginPage() {
  const [state, formAction, pending] = useActionState(loginViewer, { error: '' })

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.5rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Varada&apos;s World
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.875rem', textAlign: 'center', marginBottom: '2rem' }}>
          Enter the family passphrase to continue.
        </p>
        <form action={formAction}>
          <label htmlFor="passphrase" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
            Passphrase
          </label>
          <input
            id="passphrase"
            name="passphrase"
            type="password"
            required
            autoComplete="current-password"
            style={{
              width: '100%', padding: '0.75rem', border: '1px solid #d1d5db',
              borderRadius: '0.375rem', fontSize: '1rem', marginBottom: '1rem',
            }}
          />
          {state.error && (
            <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', marginBottom: '1rem' }}>
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            style={{
              width: '100%', padding: '0.75rem', background: '#1a1a2e',
              color: '#fff', borderRadius: '0.375rem', fontSize: '1rem', fontWeight: '600',
              opacity: pending ? 0.6 : 1, cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </main>
  )
}
