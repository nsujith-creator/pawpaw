import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // Only `npm run test:integration:live` (vitest --mode live) loads .env
    // files (.env, .env.local) into process.env, enabling the live Supabase
    // integration tests. Plain `npm test` runs in the default `test` mode,
    // loads nothing, and stays on the deterministic stubs from tests/setup.ts.
    env: mode === 'live' ? loadEnv(mode, __dirname, '') : {},
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
}))
