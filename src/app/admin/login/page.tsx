'use client'

import { useActionState } from 'react'
import { loginAdmin } from './actions'

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAdmin, { error: '' })

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '24rem' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '1.25rem', marginBottom: '2rem', textAlign: 'center' }}>
          Admin Sign In
        </h1>
        <form action={formAction}>
          <label htmlFor="email" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '1rem', marginBottom: '1rem' }}
          />
          <label htmlFor="password" style={{ display: 'block', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.375rem', fontSize: '1rem', marginBottom: '1.5rem' }}
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
              width: '100%', padding: '0.75rem', background: '#1a1a2e', color: '#fff',
              borderRadius: '0.375rem', fontSize: '1rem', fontWeight: '600',
              opacity: pending ? 0.6 : 1, cursor: pending ? 'not-allowed' : 'pointer',
            }}
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
