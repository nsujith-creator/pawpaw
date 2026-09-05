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

  it('passes for an HTTPS preview origin that exactly matches the request host', () => {
    const headers = makeHeaders('https://pawpaw-preview.vercel.app')
    headers.set('host', 'pawpaw-preview.vercel.app')

    expect(() => checkOrigin(headers)).not.toThrow()
  })

  it('rejects a preview origin that does not match the request host', () => {
    const headers = makeHeaders('https://attacker.vercel.app')
    headers.set('host', 'pawpaw-preview.vercel.app')

    expect(() => checkOrigin(headers)).toThrow()
  })

  it('rejects non-HTTPS dynamic origins even when the host matches', () => {
    const headers = makeHeaders('http://pawpaw-preview.vercel.app')
    headers.set('host', 'pawpaw-preview.vercel.app')

    expect(() => checkOrigin(headers)).toThrow()
  })

  it('throws when origin is an unknown domain', () => {
    expect(() => checkOrigin(makeHeaders('https://evil.example.com'))).toThrow()
  })

  it('throws when origin is a subdomain of the allowed domain', () => {
    expect(() => checkOrigin(makeHeaders('https://sub.test.pawpaw.in'))).toThrow()
  })
})
