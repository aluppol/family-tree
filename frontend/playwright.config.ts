import { defineConfig, devices } from '@playwright/test';

const isContinuousIntegration = process.env.CI !== undefined;
const accessToken = process.env.E2E_ACCESS_TOKEN;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 1 : 0,
  reporter: isContinuousIntegration ? [['list'], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    extraHTTPHeaders: accessToken === undefined ? {} : { 'X-Forwarded-Access-Token': accessToken },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
