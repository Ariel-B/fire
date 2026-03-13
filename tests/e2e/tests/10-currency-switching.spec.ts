import { cloneDemoPlan } from '../fixtures/test-data';
import { parseMoney } from '../fixtures/parse-money';
import { test, expect } from '../fixtures';

test.describe('currency switching', () => {

  test('display currency switching updates labels and values across accumulation and results tabs', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());

    await test.step('switch to ILS and verify accumulation values', async () => {
      await firePlanPage.selectDisplayCurrency('₪');
      await expect(firePlanPage.page.locator('#accumulation-market-value')).toContainText('₪');
    });

    const ilsValue = parseMoney(await firePlanPage.page.locator('#accumulation-market-value').textContent());

    await test.step('results tab reflects ILS currency', async () => {
      await firePlanPage.switchToTab('results');
      await expect(firePlanPage.resultsTab.totalContributions).toContainText('₪');
    });

    await test.step('switch back to USD and verify both tabs', async () => {
      await firePlanPage.selectDisplayCurrency('$');
      await expect(firePlanPage.page.getByTestId('display-currency-label')).toHaveText('$');
      await expect(firePlanPage.resultsTab.totalContributions).toContainText('$');

      await firePlanPage.switchToTab('accumulation');
      await expect(firePlanPage.page.locator('#accumulation-market-value')).toContainText('$');
    });

    await test.step('USD market value is proportionally smaller than ILS value', async () => {
      const usdValue = parseMoney(await firePlanPage.page.locator('#accumulation-market-value').textContent());
      // Both values must be finite positive numbers for the ratio to be meaningful
      expect(ilsValue).toBeGreaterThan(0);
      expect(Number.isFinite(ilsValue)).toBe(true);
      expect(usdValue).toBeGreaterThan(0);
      expect(Number.isFinite(usdValue)).toBe(true);
      // ILS value should be roughly 3-4× the USD value (exchange rate ~3.62)
      const ratio = ilsValue / usdValue;
      expect(ratio).toBeGreaterThan(2);
      expect(ratio).toBeLessThan(5);
    });
  });
});
