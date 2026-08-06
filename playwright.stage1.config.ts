import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['chapters-privacy.spec.ts', 'pr004b-published-detail-reverification.spec.ts'],
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: 'line',
  outputDir: 'C:/tmp/pawpaw-stage1-playwright-results',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npm.cmd run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 60_000,
      },
})
