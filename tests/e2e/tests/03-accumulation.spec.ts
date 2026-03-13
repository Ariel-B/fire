import { test, expect, desktopOnly } from '../fixtures';

test.describe('accumulation portfolio', () => {
  desktopOnly();

  test('supports add, edit, sort, and delete across CAGR, fixed-return, and target-price modes', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.switchToTab('accumulation');

    await test.step('add three assets with different return methods', async () => {
      await firePlanPage.accumulationTab.addAsset();
      await firePlanPage.accumulationTab.fillAsset(0, {
        symbol: 'VTI',
        quantity: '10',
        averageCost: '190',
        method: 'CAGR 10Y: 12.20%'
      });

      await firePlanPage.accumulationTab.addAsset();
      await firePlanPage.accumulationTab.fillAsset(1, {
        symbol: 'BND',
        quantity: '20',
        averageCost: '65',
        method: 'צמיחה כוללת',
        value1: '4'
      });

      await firePlanPage.accumulationTab.addAsset();
      await firePlanPage.accumulationTab.fillAsset(2, {
        symbol: 'MSFT',
        quantity: '5',
        averageCost: '280',
        method: 'מחיר יעד',
        value2: '600'
      });

      await expect(firePlanPage.accumulationTab.rows).toHaveCount(3);
      await expect(firePlanPage.page.locator('#accumulation-count')).toHaveText('3');
    });

    await test.step('sort by market value reorders rows', async () => {
      const firstBeforeSort = await firePlanPage.accumulationTab.row(0).locator('[data-portfolio-action="update-symbol"]').inputValue();
      await firePlanPage.page.locator('th[data-sort-target="portfolio"][data-sort-column="marketValue"]').click();
      const firstAfterSort = await firePlanPage.accumulationTab.row(0).locator('[data-portfolio-action="update-symbol"]').inputValue();
      expect(firstAfterSort).not.toBe(firstBeforeSort);
    });

    await test.step('remove asset updates count', async () => {
      await firePlanPage.accumulationTab.removeAsset(2);
      await expect(firePlanPage.accumulationTab.rows).toHaveCount(2);
      await expect(firePlanPage.page.locator('#accumulation-count')).toHaveText('2');
    });
  });
});
