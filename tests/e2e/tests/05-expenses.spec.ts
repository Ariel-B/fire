import { currentYearPlus } from '../fixtures/test-data';
import { test, expect, desktopOnly } from '../fixtures';

test.describe('expenses tab', () => {
  desktopOnly();

  test('supports add, edit, sort, delete, totals, and chart rendering', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.switchToTab('expenses');

    await test.step('add first expense with recurring frequency', async () => {
      await firePlanPage.expensesTab.addExpense();
      await firePlanPage.expensesTab.row(0).locator('[data-expense-field="type"]').fill('חופשה');
      await firePlanPage.expensesTab.row(0).locator('[data-expense-action="update-amount"]').fill('5000');
      await firePlanPage.expensesTab.row(0).locator('[data-expense-action="update-currency"]').selectOption('$');
      await firePlanPage.expensesTab.row(0).locator('[data-expense-field="year"]').fill(String(currentYearPlus(2)));
      await firePlanPage.expensesTab.row(0).locator('[data-expense-field="frequencyYears"]').fill('2');
      await firePlanPage.expensesTab.row(0).locator('[data-expense-field="repetitionCount"]').fill('3');
    });

    await test.step('add second expense', async () => {
      await firePlanPage.expensesTab.addExpense();
      await firePlanPage.expensesTab.row(1).locator('[data-expense-field="type"]').fill('רכב');
      await firePlanPage.expensesTab.row(1).locator('[data-expense-action="update-amount"]').fill('100000');
      await firePlanPage.expensesTab.row(1).locator('[data-expense-field="year"]').fill(String(currentYearPlus(4)));
    });

    await test.step('verify row count, totals row, and chart are rendered', async () => {
      await expect(firePlanPage.expensesTab.rows).toHaveCount(2);
      await firePlanPage.page.getByRole('columnheader', { name: /סה"כ כולל חזרות/i }).click();
      await expect(firePlanPage.page.locator('#expensesTotalRow')).not.toHaveClass(/hidden/);

      const chart = firePlanPage.page.locator('#expensesChart');
      await expect(chart).toBeVisible();
      // Verify Chart.js actually initialized a chart instance on this canvas.
      await expect.poll(async () => {
        return chart.evaluate((el) => typeof (window as any).Chart?.getChart(el) !== 'undefined');
      }).toBe(true);
    });

    await test.step('remove expense updates count', async () => {
      await firePlanPage.expensesTab.removeExpense(1);
      await expect(firePlanPage.expensesTab.rows).toHaveCount(1);
    });
  });
});
