import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const repositoryRoot = resolve(__dirname, '../..')
const suppliedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!suppliedUrl) throw new Error('Local re-verification requires NEXT_PUBLIC_SUPABASE_URL')
const host = new URL(suppliedUrl).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Local re-verification rejected non-local Supabase host: ${host}`)
}

export default defineConfig({
  root: repositoryRoot,
  test: {
    pool: 'forks',
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/integration/pr004b-integrated-reverification.test.ts'],
  },
  resolve: { alias: { '@': resolve(repositoryRoot, 'src') } },
})
