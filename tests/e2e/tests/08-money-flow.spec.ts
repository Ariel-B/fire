import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect, desktopOnly } from '../fixtures';

test.describe('money-flow tab', () => {
  desktopOnly();

  test('renders the sankey chart, updates navigation state, and exports PNG and CSV', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('money-flow');

    await test.step('sankey chart renders with SVG paths', async () => {
      await expect(firePlanPage.moneyFlowTab.chart).toBeVisible();
      await expect.poll(async () => await firePlanPage.page.locator('#sankey-chart path').count()).toBeGreaterThan(0);
    });

    await test.step('sankey SVG has non-zero rendered dimensions', async () => {
      const box = await firePlanPage.moneyFlowTab.chart.boundingBox();
      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThan(100);
      expect(box!.height).toBeGreaterThan(50);
    });

    await test.step('changing window size updates year display', async () => {
      const yearRangeBefore = await firePlanPage.moneyFlowTab.yearDisplay.textContent();
      await firePlanPage.moneyFlowTab.windowSize.fill('3');
      await firePlanPage.moneyFlowTab.windowSize.blur();
      const yearRangeAfter = await firePlanPage.moneyFlowTab.yearDisplay.textContent();
      expect(yearRangeAfter).not.toBe(yearRangeBefore);
      // Year range label should contain a numeric year
      expect(yearRangeAfter).toMatch(/\d{4}/);
    });

    await test.step('next-year button advances the start year numerically', async () => {
      const startYearBefore = Number(await firePlanPage.moneyFlowTab.startYear.inputValue());
      await firePlanPage.page.locator('#sankey-next-year').click();
      await expect.poll(async () =>
        Number(await firePlanPage.moneyFlowTab.startYear.inputValue())
      ).toBe(startYearBefore + 1);
    });

    await test.step('displayed values use the active currency symbol', async () => {
      // Demo plan uses ₪ as display currency — totals should reflect it
      const totals = firePlanPage.page.locator('#sankey-total-inflows');
      await expect(totals).toContainText(/[₪$]/);
    });

    await test.step('CSV export triggers a download', async () => {
      const csvDownload = firePlanPage.page.waitForEvent('download');
      await firePlanPage.moneyFlowTab.exportCsvButton.click();
      await expect(await csvDownload).toBeTruthy();
    });

    await test.step('PNG export triggers a download', async () => {
      const pngDownload = firePlanPage.page.waitForEvent('download');
      await firePlanPage.moneyFlowTab.exportPngButton.click();
      await expect(await pngDownload).toBeTruthy();
    });
  });
});
