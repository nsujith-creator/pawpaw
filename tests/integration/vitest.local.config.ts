import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

const repositoryRoot = resolve(__dirname, '../..')
const suppliedUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

if (!suppliedUrl) {
  throw new Error('Local integration verification requires NEXT_PUBLIC_SUPABASE_URL')
}

const host = new URL(suppliedUrl).hostname
if (host !== '127.0.0.1' && host !== 'localhost') {
  throw new Error(`Local integration verification rejected non-local Supabase host: ${host}`)
}

process.env.PAWPAW_TEST_RUN_ID ??= `pawpaw-test-${Date.now()}-${randomUUID().slice(0, 8)}`

export default defineConfig({
  root: repositoryRoot,
  test: {
    pool: 'forks',
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/integration/**/*.test.ts'],
    globalSetup: ['./tests/integration/global-fixtures.ts'],
  },
  resolve: {
    alias: {
      '@': resolve(repositoryRoot, 'src'),
    },
  },
})
