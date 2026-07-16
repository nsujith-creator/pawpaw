import { describe, it, expect } from 'vitest'
import { signViewerCookie, verifyViewerCookie } from '@/lib/auth/viewer-cookie'

const SECRET  = 'unit-test-cookie-secret-32chars!!'
const VERSION = 1

describe('viewer cookie', () => {
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

  it('rejects a malformed cookie that has no dot separator', async () => {
    const result = await verifyViewerCookie('nodotinthisvalue', SECRET, VERSION)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('malformed')
  })

  it('rejects a cookie signed with a different secret', async () => {
    const other  = 'different-secret-32-characters!!!'
    const cookie = await signViewerCookie(other, VERSION)
    const result = await verifyViewerCookie(cookie, SECRET, VERSION)
    expect(result.valid).toBe(false)
  })

  it('produces a cookie string with exactly two dot-separated parts', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    expect(cookie.split('.').length).toBe(2)
  })
})
