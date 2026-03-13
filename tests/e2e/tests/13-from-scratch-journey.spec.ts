import { test, expect, desktopOnly } from '../fixtures';

test.describe('from-scratch journey', () => {
  desktopOnly();

  test('drives the UI from blank state through all tabs without loadPlanFromData', async ({ firePlanPage }) => {
    await firePlanPage.goto();

    await test.step('fill personal plan form', async () => {
      await firePlanPage.page.locator('#birthDate').fill('1990-06-15');
      await expect(firePlanPage.page.locator('#birthYear')).toHaveValue('1990');

      await firePlanPage.page.locator('#earlyRetirementAge').fill('50');
      await firePlanPage.page.locator('#fullRetirementAge').fill('67');

      await firePlanPage.page.locator('#monthlyContribution').fill('15000');
      await firePlanPage.page.locator('#monthlyContribution').blur();

      await firePlanPage.page.locator('#targetMonthlyExpense').fill('20000');
      await firePlanPage.page.locator('#targetMonthlyExpense').blur();

      await firePlanPage.page.locator('#pensionNetMonthlyAmount').fill('10000');
      await firePlanPage.page.locator('#pensionNetMonthlyAmount').blur();
    });

    await test.step('add two accumulation assets', async () => {
      await firePlanPage.switchToTab('accumulation');

      await firePlanPage.accumulationTab.addAsset();
      await firePlanPage.accumulationTab.fillAsset(0, {
        symbol: 'SPY',
        quantity: '100',
        averageCost: '400'
      });

      await firePlanPage.accumulationTab.addAsset();
      await firePlanPage.accumulationTab.fillAsset(1, {
        symbol: 'BND',
        quantity: '50',
        averageCost: '70'
      });

      await expect(firePlanPage.accumulationTab.rows).toHaveCount(2);
      await expect(firePlanPage.page.locator('#accumulation-count')).toHaveText('2');
    });

    await test.step('add an expense', async () => {
      await firePlanPage.switchToTab('expenses');

      await firePlanPage.expensesTab.addExpense();
      const row = firePlanPage.expensesTab.row(0);
      await row.locator('[data-expense-field="type"]').fill('חופשה שנתית');
      await row.locator('[data-expense-action="update-amount"]').fill('5000');
      await row.locator('[data-expense-field="year"]').fill('2042');
      await row.locator('[data-expense-field="frequencyYears"]').fill('1');
      await row.locator('[data-expense-field="repetitionCount"]').fill('20');

      await expect(firePlanPage.expensesTab.rows).toHaveCount(1);
    });

    await test.step('navigate to results and verify non-zero calculated output', async () => {
      await firePlanPage.switchToTab('results');

      // Wait for calculation to complete and produce a non-zero result
      await expect.poll(async () => {
        const text = (await firePlanPage.resultsTab.totalContributions.textContent())?.trim() ?? '';
        return text !== '' && text !== '₪0' && text !== '$0' && !text.includes('שגיאה');
      }, { timeout: 15_000 }).toBe(true);

      // Verify key summary cards show meaningful data
      await expect(firePlanPage.resultsTab.totalContributions).toBeVisible();
      await expect(firePlanPage.resultsTab.annualWithdrawalNet).not.toHaveText('-');
    });

    await test.step('navigate to money-flow and verify chart renders', async () => {
      await firePlanPage.switchToTab('money-flow');
      await expect(firePlanPage.moneyFlowTab.chart).toBeVisible();
      await expect.poll(
        async () => await firePlanPage.page.locator('#sankey-chart path').count()
      ).toBeGreaterThan(0);
    });

    await test.step('switch back to accumulation and verify assets persist', async () => {
      await firePlanPage.switchToTab('accumulation');
      await expect(firePlanPage.accumulationTab.rows).toHaveCount(2);
      await expect(firePlanPage.page.locator('#accumulation-count')).toHaveText('2');
    });

    await test.step('remove one asset and verify count updates', async () => {
      await firePlanPage.accumulationTab.removeAsset(1);
      await expect(firePlanPage.accumulationTab.rows).toHaveCount(1);
      await expect(firePlanPage.page.locator('#accumulation-count')).toHaveText('1');
    });
  });
});
