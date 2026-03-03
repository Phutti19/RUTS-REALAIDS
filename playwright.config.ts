import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config for RUTS-REALAIDS.
 * Runs both backend (port 4000) and frontend (port 3000) before tests.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests sequentially to avoid DB conflicts */
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  /* Seed test data before all tests */
  globalSetup: './e2e/setup/global-setup.ts',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    /* Thai locale */
    locale: 'th-TH',
    /* Allow test to override per-spec */
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'cd backend && npm run start:dev',
      port: 4000,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'cd frontend && npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
