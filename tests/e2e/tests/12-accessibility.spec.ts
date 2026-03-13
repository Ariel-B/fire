import AxeBuilder from '@axe-core/playwright';

import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect } from '../fixtures';

test('rtl layout, keyboard navigation, critical axe checks, and mobile overflow stay healthy', async ({ firePlanPage }) => {
  await firePlanPage.goto();
  await firePlanPage.loadPlan(cloneDemoPlan());

  await test.step('document has RTL direction', async () => {
    await expect(firePlanPage.page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  if (test.info().project.name !== 'mobile-chromium') {
    await test.step('keyboard Tab moves focus through header controls in order', async () => {
      await firePlanPage.page.keyboard.press('Tab');
      await expect(firePlanPage.page.locator('#savePlanAs')).toBeFocused();
      await firePlanPage.page.keyboard.press('Tab');
      await expect(firePlanPage.page.locator('#savePlan')).toBeFocused();
      await firePlanPage.page.keyboard.press('Tab');
      const activeTagAfterThirdTab = await firePlanPage.page.evaluate(() => document.activeElement?.tagName?.toLowerCase());
      expect(['button', 'input', 'a', 'select']).toContain(activeTagAfterThirdTab);
    });
  }

  await test.step('axe-core reports no critical violations', async () => {
    const accessibilityResults = await new AxeBuilder({ page: firePlanPage.page }).analyze();
    const criticalViolations = accessibilityResults.violations.filter((violation) => violation.impact === 'critical');
    expect(criticalViolations).toEqual([]);
  });

  await test.step('no horizontal overflow', async () => {
    const hasHorizontalOverflow = await firePlanPage.page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasHorizontalOverflow).toBe(false);
  });
});
