import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  outputDir: 'test-results/playwright',
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  }
})
