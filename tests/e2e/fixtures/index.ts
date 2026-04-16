import { test as base, expect } from '@playwright/test';

import { ApiMocks } from './api-mocks';
import { FirePlanPage } from '../pages/FirePlanPage';

/**
 * Substrings that are allowed in console.error output without failing tests.
 * Add entries here when the application legitimately logs errors that are
 * not indicative of a regression (e.g. expected network-error handling).
 */
const CONSOLE_ERROR_ALLOWLIST: string[] = [
  // The app gracefully logs fetch failures for exchange rates / asset prices
  // when the mock deliberately returns an error response.
  'ExchangeRate',
  'Failed to fetch',
  'AbortError',
  // Rate-limit 429 responses may surface during heavy E2E batches.
  '429'
];

type FireFixtures = {
  apiMocks: ApiMocks;
  firePlanPage: FirePlanPage;
  /**
   * Collects `console.error` output during the test. After the test body
   * finishes, the fixture automatically fails if any error is not covered by
   * `CONSOLE_ERROR_ALLOWLIST`.
   *
   * Tests that **intentionally** trigger console errors (e.g. validation or
   * API-failure scenarios) should clear the array at the end of the test to
   * suppress the automatic check:
   *
   * ```ts
   * consoleErrors.length = 0;
   * ```
   */
  consoleErrors: string[];
};

export const test = base.extend<FireFixtures>({
  consoleErrors: async ({ page }, use, testInfo) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    await use(errors);
    // Only fail on unexpected console errors when the test itself passed;
    // otherwise the console-error throw would mask the original failure.
    if (testInfo.status !== testInfo.expectedStatus) return;
    const unexpected = errors.filter(
      (err) => !CONSOLE_ERROR_ALLOWLIST.some((allowed) => err.includes(allowed))
    );
    if (unexpected.length > 0) {
      throw new Error(
        `Unexpected console.error(s) during test:\n${unexpected.map((e) => `  • ${e}`).join('\n')}`
      );
    }
  },

  apiMocks: async ({ page }, use) => {
    await page.addInitScript(() => {
      const fileWindow = window as Window & {
        showSaveFilePicker?: unknown;
        showOpenFilePicker?: unknown;
      };
      fileWindow.showSaveFilePicker = undefined;
      fileWindow.showOpenFilePicker = undefined;
    });

    const apiMocks = new ApiMocks(page);
    await apiMocks.install();
    await use(apiMocks);
  },
  firePlanPage: async ({ page, apiMocks, consoleErrors }, use) => {
    void apiMocks;
    void consoleErrors;
    await use(new FirePlanPage(page));
  }
});

/**
 * Helper that skips the entire describe block when running on mobile.
 * Use instead of repeating `test.skip(...)` in every test.
 */
export function desktopOnly(): void {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name === 'mobile-chromium', 'Desktop workflow coverage only.');
  });
}

export { expect };
