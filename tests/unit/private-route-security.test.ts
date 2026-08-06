import { runInNewContext } from 'node:vm'
import { NextRequest } from 'next/server'
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server'
import { describe, expect, it, vi } from 'vitest'
import proxy, { config, hasAdminSessionCandidate, isArchiveRoute } from '../../src/proxy'
import {
  loadAuthorizedFamilyData,
  verifyFamilyAccess,
  type FamilyAccessChecks,
} from '@/lib/auth/family-access'
import { signViewerCookie } from '@/lib/auth/viewer-cookie'
import { HISTORY_GUARD } from '@/components/auth/private-history-guard'

const SECRET = 'test-viewer-cookie-secret-32-chars!!'
const VERSION = 1

function accessChecks(overrides: Partial<FamilyAccessChecks> = {}): FamilyAccessChecks {
  return {
    viewerCookie: undefined,
    viewerConfig: { valid: true, secret: SECRET, sessionVersion: VERSION },
    verifyViewer: vi.fn(async () => ({ valid: false })),
    verifyAdmin: vi.fn(async () => null),
    ...overrides,
  }
}

function runHistoryGuard(pathname: string, navigationType: 'navigate' | 'back_forward') {
  const replace = vi.fn()
  const attributes = new Set<string>()
  const window = {
    location: { pathname, href: `https://pawpaw.test${pathname}`, replace },
    addEventListener: vi.fn(),
  }
  const document = {
    documentElement: {
      setAttribute: (name: string) => attributes.add(name),
      removeAttribute: (name: string) => attributes.delete(name),
    },
    addEventListener: vi.fn(),
  }

  runInNewContext(HISTORY_GUARD, {
    URL,
    decodeURIComponent,
    document,
    window,
    performance: { getEntriesByType: () => [{ type: navigationType }] },
    HTMLFormElement: class {},
  })

  return { attributes, replace }
}

describe('Next proxy route coverage', () => {
  it.each([
    '/chapters',
    '/chapters/',
    '/chapters/a-story',
    '/chapters%2Fa-story',
    '/first-days',
  ])('matches protected family path %s', url => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true)
    expect(isArchiveRoute(url)).toBe(true)
  })

  it.each([
    '/_next/static/chunks/app.js',
    '/_next/image?url=%2Fprivate.jpg&w=640&q=75',
    '/favicon.ico',
    '/illustrations/varada.png',
  ])('excludes static asset %s from Proxy matching', url => {
    expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false)
  })

  it.each(['/family-login', '/admin/login', '/manifest.webmanifest', '/robots.txt'])(
    'keeps public path %s outside the archive gate',
    path => expect(isArchiveRoute(path)).toBe(false),
  )

  it('redirects an unauthenticated Chapters request without private response data', async () => {
    const response = await proxy(new NextRequest('https://pawpaw.test/chapters'))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('https://pawpaw.test/family-login')
    expect(response.headers.get('cache-control')).toBe('private, no-store, no-cache, max-age=0, must-revalidate')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive')
  })

  it('accepts a valid viewer and applies private response headers', async () => {
    const cookie = await signViewerCookie(SECRET, VERSION)
    const response = await proxy(new NextRequest('https://pawpaw.test/chapters/a-story', {
      headers: { cookie: `pawpaw_viewer=${cookie}` },
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, no-store, no-cache, max-age=0, must-revalidate')
    expect(response.headers.get('vary')).toContain('Cookie')
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow, noarchive')
  })

  it('lets an admin-session candidate reach the independent server authorization gate', async () => {
    const response = await proxy(new NextRequest('https://pawpaw.test/chapters', {
      headers: { cookie: 'sb-test-auth-token=candidate' },
    }))
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('recognizes whole and chunked Supabase admin session cookies only', () => {
    expect(hasAdminSessionCandidate(new NextRequest('https://pawpaw.test/chapters', {
      headers: { cookie: 'sb-test-auth-token=candidate' },
    }))).toBe(true)
    expect(hasAdminSessionCandidate(new NextRequest('https://pawpaw.test/chapters', {
      headers: { cookie: 'sb-test-auth-token.0=first; sb-test-auth-token.1=second' },
    }))).toBe(true)
    expect(hasAdminSessionCandidate(new NextRequest('https://pawpaw.test/chapters', {
      headers: { cookie: 'sb-test-auth-token-attacker=candidate' },
    }))).toBe(false)
  })
})

describe('independent family server authorization', () => {
  it('accepts a valid viewer without consulting admin authentication', async () => {
    const verifyAdmin = vi.fn(async () => null)
    const result = await verifyFamilyAccess(accessChecks({
      viewerCookie: 'valid',
      verifyViewer: vi.fn(async () => ({ valid: true })),
      verifyAdmin,
    }))
    expect(result).toEqual({ kind: 'viewer' })
    expect(verifyAdmin).not.toHaveBeenCalled()
  })

  it('accepts an independently verified active admin when the viewer cookie is invalid', async () => {
    const result = await verifyFamilyAccess(accessChecks({
      viewerCookie: 'forged',
      verifyAdmin: vi.fn(async () => ({ id: 'active-admin' })),
    }))
    expect(result).toEqual({ kind: 'admin', adminId: 'active-admin' })
  })

  it('rejects missing or invalid viewer state when no active admin exists', async () => {
    expect(await verifyFamilyAccess(accessChecks())).toBeNull()
    expect(await verifyFamilyAccess(accessChecks({ viewerCookie: 'forged' }))).toBeNull()
  })

  it('never invokes the private data callback when authorization fails', async () => {
    const load = vi.fn(async () => 'private data')
    await expect(loadAuthorizedFamilyData(
      load,
      vi.fn(async () => { throw new Error('unauthorized') }),
    )).rejects.toThrow('unauthorized')
    expect(load).not.toHaveBeenCalled()
  })
})

describe('shared private-history guard', () => {
  it.each(['/', '/first-days', '/chapters', '/chapters/a-story', '/chapters%2Fa-story'])(
    'hides and reloads a history-restored private path %s',
    path => {
      const result = runHistoryGuard(path, 'back_forward')
      expect(result.attributes.has('data-pawpaw-private-hidden')).toBe(true)
      expect(result.replace).toHaveBeenCalledOnce()
    },
  )

  it('does not reload the public family login page', () => {
    const result = runHistoryGuard('/family-login', 'back_forward')
    expect(result.attributes.has('data-pawpaw-private-hidden')).toBe(false)
    expect(result.replace).not.toHaveBeenCalled()
  })
})
