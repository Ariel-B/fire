import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:5162';
const projectDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './tests/e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }]],
  timeout: 60_000,
  expect: {
    timeout: 15_000
  },
  outputDir: 'artifacts/test-results',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1100 }
      }
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['Pixel 7']
      }
    }
  ],
  webServer: {
    command: `dotnet run --project ${path.join(projectDir, 'FirePlanningTool.csproj')} --urls ${baseURL}`,
    url: baseURL,
    // Default to a fresh app instance so Playwright does not accidentally hit
    // a stale locally running server with out-of-date compiled frontend assets.
    // Opt in explicitly when you intentionally want to test against an already
    // running app process.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === '1',
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ASPNETCORE_URLS: baseURL,
      // Raise the rate limit well above what the full E2E batch needs;
      // the production default (100 req/60s) is too low for 15+ browser tests.
      RateLimiting__PermitLimit: '10000'
    }
  }
});
