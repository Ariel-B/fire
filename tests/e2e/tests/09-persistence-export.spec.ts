import { readFileSync } from 'node:fs';
import path from 'node:path';

import { cloneDemoPlan } from '../fixtures/test-data';
import { test, expect, desktopOnly } from '../fixtures';

test.describe('persistence and export', () => {
  desktopOnly();

  test('save, save as, load, and Excel export flows work in the browser', async ({ firePlanPage }, testInfo) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());

    let savedPlanPath = '';

    await test.step('save-as downloads a JSON plan file', async () => {
      const saveAsDownloadPromise = firePlanPage.page.waitForEvent('download');
      await firePlanPage.page.locator('#savePlanAs').click();
      const saveAsDownload = await saveAsDownloadPromise;
      savedPlanPath = path.join(testInfo.outputDir, path.basename(saveAsDownload.suggestedFilename()));
      await saveAsDownload.saveAs(savedPlanPath);
    });

    await test.step('modify a field, then load restores original value', async () => {
      await firePlanPage.page.locator('#monthlyContribution').fill('12345');
      await firePlanPage.page.locator('#monthlyContribution').blur();
      await expect.poll(async () => (await firePlanPage.page.locator('#monthlyContribution').inputValue()).replace(/,/g, '')).toBe('12345');

      const fileChooserPromise = firePlanPage.page.waitForEvent('filechooser');
      await firePlanPage.page.locator('#loadPlan').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(savedPlanPath);
      await expect.poll(async () => (await firePlanPage.page.locator('#monthlyContribution').inputValue()).replace(/,/g, '')).toBe('10000');
    });

    await test.step('save (overwrite) triggers a download', async () => {
      const saveDownloadPromise = firePlanPage.page.waitForEvent('download');
      await firePlanPage.page.locator('#savePlan').click();
      await expect(await saveDownloadPromise).toBeTruthy();
    });

    await test.step('Excel export produces an .xlsx file with non-zero size', async () => {
      const excelDownloadPromise = firePlanPage.page.waitForEvent('download');
      await firePlanPage.page.locator('#exportToExcel').click();
      await firePlanPage.page.locator('#exportScenarioName').fill('Playwright Scenario');
      await firePlanPage.page.locator('#exportModalConfirm').click();
      const excelDownload = await excelDownloadPromise;
      expect(excelDownload.suggestedFilename()).toMatch(/\.xlsx$/i);

      const excelPath = path.join(testInfo.outputDir, path.basename(excelDownload.suggestedFilename()));
      await excelDownload.saveAs(excelPath);
      const fileBuffer = readFileSync(excelPath);
      expect(fileBuffer.length).toBeGreaterThan(0);
    });
  });

  test('save → load round-trip preserves key plan fields', async ({ firePlanPage }, testInfo) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());

    // Capture baseline field values before saving
    const originalContribution = (await firePlanPage.page.locator('#monthlyContribution').inputValue()).replace(/,/g, '');
    const originalBirthDate = await firePlanPage.page.locator('#birthDate').inputValue();

    await firePlanPage.switchToTab('accumulation');
    const originalAssetCount = await firePlanPage.accumulationTab.rows.count();

    await firePlanPage.switchToTab('expenses');
    const originalExpenseCount = await firePlanPage.expensesTab.rows.count();

    // Save the plan
    let savedPlanPath = '';
    await test.step('save plan', async () => {
      const saveAsDownloadPromise = firePlanPage.page.waitForEvent('download');
      await firePlanPage.page.locator('#savePlanAs').click();
      const saveAsDownload = await saveAsDownloadPromise;
      savedPlanPath = path.join(testInfo.outputDir, path.basename(saveAsDownload.suggestedFilename()));
      await saveAsDownload.saveAs(savedPlanPath);
    });

    // Mutate fields to confirm load actually restores them
    await test.step('mutate fields', async () => {
      await firePlanPage.switchToTab('accumulation');
      await firePlanPage.page.locator('#monthlyContribution').fill('99999');
      await firePlanPage.page.locator('#monthlyContribution').blur();
      await firePlanPage.page.locator('#birthDate').fill('2000-12-31');
    });

    // Load the saved plan back
    await test.step('load saved plan', async () => {
      const fileChooserPromise = firePlanPage.page.waitForEvent('filechooser');
      await firePlanPage.page.locator('#loadPlan').click();
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(savedPlanPath);

      // Wait for the plan load to fully settle — contribution field restores
      // and the results tab shows a non-zero value (calculation complete).
      await expect.poll(async () =>
        (await firePlanPage.page.locator('#monthlyContribution').inputValue()).replace(/,/g, '')
      ).toBe(originalContribution);
      await expect.poll(async () => {
        const text = (await firePlanPage.page.locator('#totalContributions').textContent())?.trim() ?? '';
        return text !== '' && text !== '₪0' && text !== '$0' && text !== '-';
      }).toBe(true);
    });

    await test.step('verify restored fields match original', async () => {
      await expect(firePlanPage.page.locator('#birthDate')).toHaveValue(originalBirthDate);

      await firePlanPage.switchToTab('accumulation');
      await expect(firePlanPage.accumulationTab.rows).toHaveCount(originalAssetCount);

      await firePlanPage.switchToTab('expenses');
      await expect(firePlanPage.expensesTab.rows).toHaveCount(originalExpenseCount);
    });

    await test.step('verify currency setting preserved', async () => {
      await expect(firePlanPage.page.getByTestId('display-currency-label')).toHaveText(/[₪$]/);
    });
  });
});
