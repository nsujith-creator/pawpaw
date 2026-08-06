import { afterEach, describe, it, expect, vi } from 'vitest'
import { signViewerCookie, verifyViewerCookie } from '@/lib/auth/viewer-cookie'
import { readViewerAuthConfig } from '@/lib/env'

const SECRET  = 'unit-test-cookie-secret-32chars!!'
const VERSION = 1

afterEach(() => {
  vi.useRealTimers()
})

describe('viewer cookie', () => {
  it('fails closed when the signing secret is missing', () => {
    expect(readViewerAuthConfig({ VIEWER_SESSION_VERSION: '1' })).toEqual({ valid: false })
  })

  it('fails closed when the signing secret is empty', () => {
    expect(readViewerAuthConfig({
      VIEWER_COOKIE_SECRET: '', VIEWER_SESSION_VERSION: '1',
    })).toEqual({ valid: false })
  })

  it('fails closed for short or low-entropy signing secrets', () => {
    expect(readViewerAuthConfig({
      VIEWER_COOKIE_SECRET: 'too-short', VIEWER_SESSION_VERSION: '1',
    })).toEqual({ valid: false })
    expect(readViewerAuthConfig({
      VIEWER_COOKIE_SECRET: 'a'.repeat(64), VIEWER_SESSION_VERSION: '1',
    })).toEqual({ valid: false })
  })

  it('fails closed when the session version is missing', () => {
    expect(readViewerAuthConfig({ VIEWER_COOKIE_SECRET: SECRET })).toEqual({ valid: false })
  })

  it('accepts valid viewer authentication configuration', () => {
    expect(readViewerAuthConfig({
      VIEWER_COOKIE_SECRET: SECRET, VIEWER_SESSION_VERSION: String(VERSION),
    })).toEqual({ valid: true, secret: SECRET, sessionVersion: VERSION })
  })

  it('signs a cookie and verifies it as valid', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    const result = await verifyViewerCookie(cookie, SECRET, VERSION)
    expect(result.valid).toBe(true)
  })

  it('rejects a cookie with a tampered signature', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    const [payload] = cookie.split('.')
    const result = await verifyViewerCookie(`${payload}.AAAAAAAAAAAAAAAA`, SECRET, VERSION)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('signature')
  })

  it('rejects a cookie with the wrong session version', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    const result = await verifyViewerCookie(cookie, SECRET, VERSION + 1)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('version')
  })

  it('rejects an expired cookie', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    const cookie = await signViewerCookie(SECRET, VERSION)
    vi.setSystemTime(new Date('2026-02-01T00:00:01.000Z'))
    const result = await verifyViewerCookie(cookie, SECRET, VERSION)
    expect(result).toEqual({ valid: false, reason: 'expired' })
  })

  it('rejects a malformed cookie that has no dot separator', async () => {
    const result = await verifyViewerCookie('nodotinthisvalue', SECRET, VERSION)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('malformed')
  })

  it('rejects a cookie signed with a different secret', async () => {
    const other = 'different-secret-32-characters-ABC123!'
    const cookie = await signViewerCookie(other, VERSION)
    const result = await verifyViewerCookie(cookie, SECRET, VERSION)
    expect(result.valid).toBe(false)
  })

  it('produces a cookie string with exactly two dot-separated parts', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    expect(cookie.split('.').length).toBe(2)
  })
})
