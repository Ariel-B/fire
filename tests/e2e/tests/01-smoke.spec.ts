import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect } from '../fixtures';

test('application loads, all six tabs are reachable, and a rich plan renders results', async ({ firePlanPage }) => {
  await firePlanPage.goto();

  for (const tab of ['accumulation', 'rsu', 'expenses', 'retirement', 'results', 'money-flow'] as const) {
    await expect(firePlanPage.tabButton(tab)).toBeVisible();
  }

  await firePlanPage.loadPlan(cloneDemoPlan());

  await firePlanPage.switchToTab('results');
  await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText(/^[₪$]0(?:\.00)?$/);
  await expect(firePlanPage.resultsTab.mainChart).toBeVisible();
});
