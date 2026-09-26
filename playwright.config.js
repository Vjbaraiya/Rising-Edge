// @ts-check
const { defineConfig, devices } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';

module.exports = defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: false, // keep sequential to avoid port conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  timeout: 30_000,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    // Shared localStorage state
    storageState: undefined,
  },

  projects: [
    // ── Desktop ──────────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile ───────────────────────────────────────────────────────────
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // Start the server before running E2E tests in CI
  webServer: process.env.CI
    ? {
        command: 'node server.js',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 30_000,
        env: {
          NODE_ENV: 'test',
          PORT: '8080',
          DATABASE_URL: process.env.TEST_DATABASE_URL || '',
          JWT_SECRET: 'e2e-test-jwt-secret-32-chars-long!',
          CASHFREE_ENV: 'sandbox',
        },
      }
    : undefined,
});
