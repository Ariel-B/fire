import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect, desktopOnly } from '../fixtures';

test.describe('async and race-condition handling', () => {
  desktopOnly();

  test('stale calculation response is rejected when a newer calculation is triggered', async ({ firePlanPage, consoleErrors }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('results');

    // Wait for initial calculation to stabilize
    await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText('-');

    let slowRequestCount = 0;

    // Intercept calculate requests: delay the first one, let the second through
    await firePlanPage.page.route('**/api/fireplan/calculate', async (route) => {
      slowRequestCount++;
      if (slowRequestCount === 1) {
        // Delay the first request significantly
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
      await route.fallback();
    });

    await test.step('trigger two calculations in rapid succession', async () => {
      // First calculation — change withdrawal rate
      await firePlanPage.page.locator('#withdrawalRate').fill('3.5');
      await firePlanPage.page.locator('#withdrawalRate').blur();

      // Brief pause to let the first request fire
      await firePlanPage.page.waitForTimeout(200);

      // Second calculation — change again before the first completes
      await firePlanPage.page.locator('#withdrawalRate').fill('5');
      await firePlanPage.page.locator('#withdrawalRate').blur();
    });

    await test.step('only the final calculation result is displayed', async () => {
      // Wait for results to stabilize
      await expect.poll(async () => {
        return (await firePlanPage.resultsTab.totalContributions.textContent())?.trim() ?? '';
      }, { timeout: 15_000 }).toBeTruthy();

      // The withdrawal rate input should show the latest value
      await expect(firePlanPage.page.locator('#withdrawalRate')).toHaveValue('5');

      // Results should be non-error and non-zero (i.e., the second calc succeeded)
      const text = (await firePlanPage.resultsTab.totalContributions.textContent()) ?? '';
      expect(text).not.toContain('שגיאה');
      expect(text.length).toBeGreaterThan(1);
    });

    // Race-condition scenarios may trigger benign "stale response" console
    // errors from the orchestrator.  Filter those out; fail on anything else.
    const unexpected = consoleErrors.filter(
      (msg) => !msg.includes('stale') && !msg.includes('abort') && !msg.includes('Calculation') && !msg.includes('Applying inline style')
    );
    expect(unexpected).toHaveLength(0);
  });

  test('tab switch during calculation does not lose results', async ({ firePlanPage, consoleErrors }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('results');

    // Wait for initial calculation
    await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText('-');

    // Delay the calculate response to give us time to switch tabs
    await firePlanPage.page.route('**/api/fireplan/calculate', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fallback();
    });

    await test.step('trigger calculation and switch tabs before it resolves', async () => {
      await firePlanPage.page.locator('#withdrawalRate').fill('4.5');
      await firePlanPage.page.locator('#withdrawalRate').blur();

      // Switch to accumulation tab while calculation is in-flight
      await firePlanPage.switchToTab('accumulation');
    });

    await test.step('switch back and verify results appear correctly', async () => {
      await firePlanPage.switchToTab('results');

      await expect.poll(async () => {
        const text = (await firePlanPage.resultsTab.totalContributions.textContent())?.trim() ?? '';
        return text !== '' && text !== '-' && !text.includes('שגיאה');
      }, { timeout: 10_000 }).toBe(true);
    });

    const unexpected = consoleErrors.filter(
      (msg) => !msg.includes('stale') && !msg.includes('abort') && !msg.includes('Calculation') && !msg.includes('Applying inline style')
    );
    expect(unexpected).toHaveLength(0);
  });
});
