import type { Locator } from '@playwright/test';

import { cloneDemoPlan } from '../fixtures/test-data';
import { parseMoney } from '../fixtures/parse-money';
import { test, expect } from '../fixtures';

/** Read the Chart.js x-axis max value from a canvas element. */
async function getChartXMax(chart: Locator): Promise<number | null> {
  return chart.evaluate((el) => {
    const c = (window as any).Chart?.getChart(el);
    return c?.scales?.x?.max ?? null;
  });
}

test.describe('results tab', () => {

  test('shows summary cards, donut charts with rendered content, and visible chart controls after calculation', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('results');

    await test.step('summary cards contain meaningful values', async () => {
      await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText(/^[₪$]0(?:\.00)?$/);
      await expect(firePlanPage.resultsTab.annualWithdrawalNet).not.toHaveText('-');
      await expect(firePlanPage.resultsTab.monthlyExpenseNet).not.toHaveText('-');
    });

    await test.step('total contributions is a reasonable positive number', async () => {
      const text = await firePlanPage.resultsTab.totalContributions.textContent();
      const value = parseMoney(text);
      // With ₪10,000/month over ~16 years the total should be in the millions range
      expect(value).toBeGreaterThan(100_000);
      // Sanity upper bound — should not exceed unreasonable amounts
      expect(value).toBeLessThan(100_000_000);
    });

    await test.step('results summary values use a recognized currency symbol', async () => {
      // The demo plan may display in ₪ or $ depending on saved display-currency
      for (const locator of [
        firePlanPage.resultsTab.totalContributions,
        firePlanPage.resultsTab.annualWithdrawalNet,
        firePlanPage.resultsTab.monthlyExpenseNet
      ]) {
        await expect(locator).toContainText(/[₪$]/);
      }
    });

    await test.step('donut charts are visible and rendered', async () => {
      for (const chart of [
        firePlanPage.resultsTab.startAccumulationChart,
        firePlanPage.resultsTab.startRetirementChart,
        firePlanPage.resultsTab.endRetirementChart
      ]) {
        await expect(chart).toBeVisible();
        // Verify Chart.js actually initialized a chart instance on this canvas.
        await expect.poll(async () => {
          return chart.evaluate((el) => typeof (window as any).Chart?.getChart(el) !== 'undefined');
        }).toBe(true);
      }
    });

    await test.step('main chart has rendered content', async () => {
      await expect(firePlanPage.resultsTab.mainChart).toBeVisible();
      // Verify Chart.js actually initialized a chart instance on this canvas.
      await expect.poll(async () => {
        return firePlanPage.resultsTab.mainChart.evaluate((el) => typeof (window as any).Chart?.getChart(el) !== 'undefined');
      }).toBe(true);
    });

    if (test.info().project.name !== 'mobile-chromium') {
      await test.step('chart controls appear on hover', async () => {
        await firePlanPage.resultsTab.mainChart.hover();
        await expect(firePlanPage.resultsTab.zoomInButton).toBeVisible();
        await expect(firePlanPage.resultsTab.panLeftButton).toBeVisible();
        await expect(firePlanPage.resultsTab.copyChartButton).toBeVisible();
      });

      await test.step('zoom-in changes the chart x-axis scale', async () => {
        const xMaxBefore = await getChartXMax(firePlanPage.resultsTab.mainChart);

        await firePlanPage.resultsTab.zoomInButton.click();
        // After zoom-in, the x-axis max should decrease (narrower view)
        await expect.poll(async () => {
          const xMaxAfter = await getChartXMax(firePlanPage.resultsTab.mainChart);
          return xMaxAfter !== null && xMaxBefore !== null && xMaxAfter < xMaxBefore;
        }).toBe(true);
      });
    }
  });
});
