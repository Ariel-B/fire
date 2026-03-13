import { test, expect, desktopOnly } from '../fixtures';

test.describe('RSU tab', () => {
  desktopOnly();

  test('supports enabling calculations, configuring grants, and switching liquidation strategy', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.switchToTab('rsu');

    await test.step('enable RSU and configure stock symbol', async () => {
      await firePlanPage.rsuTab.includeCheckbox.check();
      await firePlanPage.page.locator('#rsuStockSymbol').fill('GOOGL');
      await firePlanPage.page.locator('#rsuStockSymbol').blur();
      await expect.poll(async () => await firePlanPage.page.locator('#rsuCurrentPrice').inputValue()).toBe('172.34');
    });

    await test.step('add a grant and verify charts', async () => {
      await firePlanPage.page.locator('#rsuExpectedReturn').fill('11');
      await firePlanPage.page.locator('#rsuLiquidationStrategy').selectOption('SellAfter2Years');
      await firePlanPage.rsuTab.addGrant({
        grantDate: '2022-01-01',
        shares: '120',
        sharesSold: '10',
        price: '90'
      });

      await expect(firePlanPage.page.locator('#rsuActiveGrants')).toHaveText('1');
      await expect(firePlanPage.page.locator('#rsuTimelineChart')).toBeVisible();
      await expect(firePlanPage.page.locator('#rsuSharesChart')).toBeVisible();
    });

    await test.step('switching liquidation strategy recalculates projected net', async () => {
      const projectedBefore = await firePlanPage.page.locator('#rsuProjectedNet').textContent();
      await firePlanPage.page.locator('#rsuLiquidationStrategy').selectOption('SellAtRetirement');
      await expect.poll(async () => await firePlanPage.page.locator('#rsuProjectedNet').textContent()).not.toBe(projectedBefore);
    });

    await test.step('disabling RSU unchecks the toggle', async () => {
      await firePlanPage.rsuTab.includeCheckbox.uncheck();
      await expect(firePlanPage.rsuTab.includeCheckbox).not.toBeChecked();
    });
  });
});
