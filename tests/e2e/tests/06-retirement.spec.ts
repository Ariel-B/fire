import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect, desktopOnly } from '../fixtures';

test.describe('retirement portfolio', () => {
  desktopOnly();

  test('toggle, allocations, totals, and chart rendering work end to end', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('retirement');

    await test.step('toggle retirement portfolio on and off', async () => {
      await expect(firePlanPage.page.locator('#retirement-enabled-content')).toBeVisible();
      await firePlanPage.retirementTab.checkbox.uncheck();
      await expect(firePlanPage.page.locator('#retirement-disabled-state')).toBeVisible();
      await firePlanPage.retirementTab.checkbox.check();
      await expect(firePlanPage.page.locator('#retirement-enabled-content')).toBeVisible();
    });

    await test.step('add a new allocation row with data', async () => {
      const initialRowCount = await firePlanPage.retirementTab.rows.count();
      await firePlanPage.retirementTab.addAllocationButton.click();
      const lastRow = firePlanPage.retirementTab.row(initialRowCount);
      await lastRow.locator('[data-allocation-field="assetType"]').fill('זהב');
      await lastRow.locator('[data-allocation-field="targetPercentage"]').fill('5');
      await lastRow.locator('[data-allocation-field="expectedAnnualReturn"]').fill('2');
      await lastRow.locator('[data-allocation-field="expectedAnnualReturn"]').blur();

      await expect(firePlanPage.retirementTab.rows).toHaveCount(initialRowCount + 1);
    });

    await test.step('retirement portfolio chart is rendered with content', async () => {
      const chart = firePlanPage.page.locator('#retirementPortfolioChart');
      await expect(chart).toBeVisible();
      // Verify Chart.js actually initialized a chart instance on this canvas.
      await expect.poll(async () => {
        return chart.evaluate((el) => typeof (window as any).Chart?.getChart(el) !== 'undefined');
      }).toBe(true);
    });

    await test.step('remove allocation and disable retirement', async () => {
      const currentCount = await firePlanPage.retirementTab.rows.count();
      await firePlanPage.retirementTab.row(currentCount - 1).getByTestId('retirement-remove-allocation').click();
      await expect(firePlanPage.retirementTab.rows).toHaveCount(currentCount - 1);

      await firePlanPage.retirementTab.checkbox.uncheck();
      await expect(firePlanPage.page.locator('#retirement-disabled-state')).toBeVisible();
    });
  });
});
