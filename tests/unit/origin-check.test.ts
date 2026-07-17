import { describe, it, expect } from 'vitest'
import { checkOrigin } from '@/lib/auth/origin'

function makeHeaders(origin: string | null): Headers {
  const h = new Headers()
  if (origin !== null) h.set('origin', origin)
  return h
}

describe('origin check', () => {
  it('passes when origin matches NEXT_PUBLIC_SITE_URL', () => {
    // setup.ts sets NEXT_PUBLIC_SITE_URL = https://test.pawpaw.in
    expect(() => checkOrigin(makeHeaders('https://test.pawpaw.in'))).not.toThrow()
  })

  it('passes when origin is localhost:3000 (dev)', () => {
    expect(() => checkOrigin(makeHeaders('http://localhost:3000'))).not.toThrow()
  })

  it('passes when no Origin header is present (same-origin form submit)', () => {
    expect(() => checkOrigin(makeHeaders(null))).not.toThrow()
  })

  it('throws when origin is an unknown domain', () => {
    expect(() => checkOrigin(makeHeaders('https://evil.example.com'))).toThrow()
  })

  it('throws when origin is a subdomain of the allowed domain', () => {
    expect(() => checkOrigin(makeHeaders('https://sub.test.pawpaw.in'))).toThrow()
  })
})
