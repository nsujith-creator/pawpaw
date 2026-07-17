import { describe, it, expect } from 'vitest'
import { buildUploadPath, pathBelongsTo } from '@/lib/media/upload-path'

const ADMIN = '123e4567-e89b-12d3-a456-426614174000'
const OTHER = '999e4567-e89b-12d3-a456-426614174999'

describe('buildUploadPath', () => {
  it('builds a path under the admin folder with the right extension', () => {
    for (const [mime, ext] of [
      ['image/jpeg', 'jpg'],
      ['image/png', 'png'],
      ['image/webp', 'webp'],
    ] as const) {
      const path = buildUploadPath(ADMIN, mime)
      expect(path).not.toBeNull()
      expect(path!.startsWith(`${ADMIN}/`)).toBe(true)
      expect(path!.endsWith(`.${ext}`)).toBe(true)
      expect(pathBelongsTo(path!, ADMIN)).toBe(true)
    }
  })

  it('returns null for unsupported MIME types', () => {
    expect(buildUploadPath(ADMIN, 'image/gif')).toBeNull()
    expect(buildUploadPath(ADMIN, 'application/pdf')).toBeNull()
    expect(buildUploadPath(ADMIN, '')).toBeNull()
  })

  it('produces distinct paths for repeated uploads', () => {
    const a = buildUploadPath(ADMIN, 'image/png')
    const b = buildUploadPath(ADMIN, 'image/png')
    expect(a).not.toBe(b)
  })
})

describe('pathBelongsTo', () => {
  it('accepts only the exact owner folder', () => {
    expect(pathBelongsTo(`${ADMIN}/123-abc.jpg`, ADMIN)).toBe(true)
    expect(pathBelongsTo(`${OTHER}/123-abc.jpg`, ADMIN)).toBe(false)
  })

  it('rejects path substitution and traversal attempts', () => {
    expect(pathBelongsTo(`${ADMIN}/../${OTHER}/x.jpg`, ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/nested/x.jpg`, ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/..%2Fx.jpg`, ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/`, ADMIN)).toBe(false)
    expect(pathBelongsTo(ADMIN, ADMIN)).toBe(false)
    expect(pathBelongsTo('', ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/x.jpg`, '')).toBe(false)
  })

  it('rejects disallowed extensions', () => {
    expect(pathBelongsTo(`${ADMIN}/x.gif`, ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/x.svg`, ADMIN)).toBe(false)
    expect(pathBelongsTo(`${ADMIN}/x.jpg.exe`, ADMIN)).toBe(false)
  })
})
