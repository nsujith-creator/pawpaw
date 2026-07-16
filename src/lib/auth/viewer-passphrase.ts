// Verifies the submitted family passphrase against the stored scrypt hash.
// Runs only in Node.js server actions — never in Edge runtime or client code.
// Hash format: scrypt:<salt-hex>:<hash-hex>

import { serverEnv } from '@/lib/env'

export async function verifyPassphrase(submitted: string): Promise<boolean> {
  const { scrypt, timingSafeEqual } = await import('node:crypto')
  const stored = serverEnv.viewerPassphraseHash

  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false

  const [, saltHex, hashHex] = parts
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')

  return new Promise((resolve) => {
    scrypt(submitted, salt, 64, (err, derived) => {
      if (err) { resolve(false); return }
      try {
        resolve(timingSafeEqual(derived, expected))
      } catch {
        resolve(false)
      }
    })
  })
}
