import { test, expect } from '../fixtures';

test.describe('personal-plan and market-assumption form', () => {

  test('inputs stay in sync across linked controls', async ({ firePlanPage }) => {
    await firePlanPage.goto();

    await test.step('birth date fills birth year', async () => {
      await firePlanPage.page.locator('#birthDate').fill('1988-05-14');
      await expect(firePlanPage.page.locator('#birthYear')).toHaveValue('1988');
    });

    await test.step('range sliders sync with numeric inputs', async () => {
      await firePlanPage.page.locator('#earlyRetirementAgeRange').fill('52');
      await expect(firePlanPage.page.locator('#earlyRetirementAge')).toHaveValue('52');

      await firePlanPage.page.locator('#fullRetirementAge').fill('68');
      await expect(firePlanPage.page.locator('#fullRetirementAgeRange')).toHaveValue('68');
    });

    if (test.info().project.name !== 'mobile-chromium') {
      await test.step('increment button updates monthly contribution', async () => {
        await firePlanPage.page.locator('#monthlyContribution').hover();
        await firePlanPage.page.locator('#monthlyContribution-inc').click();
        await expect.poll(async () => Number((await firePlanPage.page.locator('#monthlyContribution').inputValue()).replace(/,/g, ''))).toBe(10100);
      });
    }

    await test.step('currency selectors update correctly', async () => {
      await firePlanPage.page.locator('#monthlyContributionCurrency').selectOption('$');
      await expect(firePlanPage.page.locator('#monthlyContributionCurrency')).toHaveValue('$');

      await firePlanPage.page.locator('#targetMonthlyExpenseCurrency').selectOption('$');
      await expect(firePlanPage.page.locator('#targetMonthlyExpenseCurrency')).toHaveValue('$');
    });

    await test.step('inflation adjustment checkbox toggles', async () => {
      // Click the label (proper touch target) rather than the tiny checkbox
      // input directly. On mobile Chromium, range-slider thumb touch targets
      // extend beyond their visual bounds and can intercept taps on nearby
      // small inputs. The <label for="..."> is the intended user touch target.
      await firePlanPage.page.locator('label[for="adjustContributionsForInflation"]').click();
      await expect(firePlanPage.page.locator('#adjustContributionsForInflation')).toBeChecked();
    });
  });
});
