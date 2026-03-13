import { test, expect, desktopOnly } from '../fixtures';

test.describe('validation and failure handling', () => {
  desktopOnly();

  test('invalid input shows graceful calculation errors without breaking the UI', async ({ firePlanPage, consoleErrors }) => {
    await firePlanPage.page.route('**/api/fireplan/calculate', async (route) => {
      const body = route.request().postData() ?? '';
      if (body.includes('"withdrawalRate":0')) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'שיעור המשיכה חייב להיות גדול מאפס' })
        });
        return;
      }

      await route.fallback();
    });

    await firePlanPage.goto();

    await test.step('set invalid withdrawal rate and trigger calculation', async () => {
      await firePlanPage.switchToTab('results');
      await firePlanPage.page.locator('#withdrawalRate').fill('0');
      await firePlanPage.page.locator('#withdrawalRate').blur();
    });

    await test.step('verify error message is shown gracefully', async () => {
      await expect(firePlanPage.resultsTab.totalContributions).toContainText('שגיאה:');
      await expect(firePlanPage.resultsTab.annualWithdrawalNet).toHaveText('-');
    });

    // Validation errors are expected to produce console errors in this test.
    consoleErrors.length = 0;
  });

  test('mocked exchange-rate and asset-price failures fall back to stable behavior', async ({ apiMocks, firePlanPage, consoleErrors }) => {
    apiMocks.failExchangeRate();
    apiMocks.failAsset('FAIL');

    await firePlanPage.goto();

    await test.step('exchange rate falls back to default', async () => {
      await expect.poll(async () => await firePlanPage.page.locator('#usdIlsRate').inputValue()).toBe('3.60');
    });

    await test.step('failed asset price leaves field editable', async () => {
      await firePlanPage.accumulationTab.addAsset();
      const firstRow = firePlanPage.accumulationTab.row(0);
      await firstRow.locator('[data-portfolio-action="update-symbol"]').fill('FAIL');
      await firstRow.locator('[data-portfolio-action="update-symbol"]').blur();

      await expect(firstRow.locator('[data-portfolio-action="update-price"]')).toBeEditable();
    });

    // Mocked failures are expected to produce console errors in this test.
    consoleErrors.length = 0;
  });
});
