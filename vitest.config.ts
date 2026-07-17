import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { resolve } from 'path'
import { randomUUID } from 'node:crypto'

export default defineConfig(({ mode }) => {
  const liveEnv = mode === 'live' ? loadEnv(mode, __dirname, '') : {}
  const runId = mode === 'live'
    ? `pawpaw-test-${Date.now()}-${randomUUID().slice(0, 8)}`
    : ''
  if (mode === 'live') {
    Object.assign(process.env, liveEnv)
    process.env.PAWPAW_TEST_RUN_ID = runId
  }

  return ({
  test: {
    // Vitest 3 defaults to 'forks' (child processes) which is stable on
    // Windows + Node 24. Explicit here so the project doesn't drift if the
    // upstream default ever changes, and to prevent worker_threads teardown
    // crashes seen intermittently with tinypool on this platform.
    pool: 'forks',
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Only `npm run test:integration:live` (vitest --mode live) loads .env
    // files (.env, .env.local) into process.env, enabling the live Supabase
    // integration tests. Plain `npm test` runs in the default `test` mode,
    // loads nothing, and stays on the deterministic stubs from tests/setup.ts.
    env: mode === 'live' ? { ...liveEnv, PAWPAW_TEST_RUN_ID: runId } : {},
    globalSetup: mode === 'live' ? ['./tests/integration/global-fixtures.ts'] : undefined,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  })
})
