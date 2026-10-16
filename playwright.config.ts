import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:8135',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'Google Chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 7'],
        channel: 'chrome',
        viewport: { width: 375, height: 812 },
      },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8135',
    port: 8135,
    reuseExistingServer: !process.env.CI,
  },
});
