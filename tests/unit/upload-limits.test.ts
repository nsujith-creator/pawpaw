import { describe, it, expect } from 'vitest'
import { validateUploadFile, MAX_UPLOAD_BYTES } from '@/lib/media/validate-upload'
import nextConfig from '../../next.config'

const MB = 1024 * 1024

describe('upload application validation', () => {
  it('enforces an 8 MB application limit', () => {
    expect(MAX_UPLOAD_BYTES).toBe(8 * MB)
  })

  it('accepts a file of exactly 8 MB', () => {
    expect(validateUploadFile({ size: 8 * MB, type: 'image/jpeg' })).toBeNull()
  })

  it('rejects a file over 8 MB with a clear message', () => {
    const msg = validateUploadFile({ size: 8 * MB + 1, type: 'image/png' })
    expect(msg).toMatch(/8 MB/)
  })

  it('rejects unsupported types and empty/missing files', () => {
    expect(validateUploadFile({ size: 1024, type: 'image/gif' })).toMatch(/JPEG, PNG, or WebP/)
    expect(validateUploadFile({ size: 0, type: 'image/jpeg' })).toMatch(/No file/)
    expect(validateUploadFile(null)).toMatch(/No file/)
  })
})

describe('Server Action body-size configuration', () => {
  it('does NOT raise the Server Action body limit — image bytes bypass Server Actions', () => {
    // Uploads go browser → Supabase Storage directly (signed upload tokens),
    // so no Server Action carries image bytes. Next's 1 MB default is the
    // correct, deliberately small boundary — and stays within Vercel's
    // platform request-body cap. If this fails, someone reintroduced a large
    // body path through the server; fix the flow, don't raise the limit.
    expect(nextConfig.experimental?.serverActions?.bodySizeLimit).toBeUndefined()
  })

  it('the 8 MB application limit exceeds what any Server Action could carry', () => {
    // Sanity: the advertised limit only makes sense because bytes go direct.
    expect(MAX_UPLOAD_BYTES).toBeGreaterThan(1 * MB)
  })
})
