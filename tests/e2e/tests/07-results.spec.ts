import type { Locator } from '@playwright/test';

import { cloneDemoPlan } from '../fixtures/test-data';
import { parseMoney } from '../fixtures/parse-money';
import { test, expect } from '../fixtures';

type ChartViewportState = {
  min: number | null;
  max: number | null;
  labelCount: number;
  wheelZoomEnabled: boolean | null;
  pinchZoomEnabled: boolean | null;
};

async function getChartViewportState(chart: Locator): Promise<ChartViewportState> {
  return chart.evaluate((el) => {
    const c = (window as any).Chart?.getChart(el);
    return {
      min: c?.scales?.x?.min ?? null,
      max: c?.scales?.x?.max ?? null,
      labelCount: c?.data?.labels?.length ?? 0,
      wheelZoomEnabled: c?.options?.plugins?.zoom?.zoom?.wheel?.enabled ?? null,
      pinchZoomEnabled: c?.options?.plugins?.zoom?.zoom?.pinch?.enabled ?? null
    };
  });
}

test.describe('results tab', () => {

  test('shows summary cards, donut charts, and focused chart controls after calculation', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('results');

    await test.step('total contributions is a reasonable positive number', async () => {
      await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText(/^[₪$]0(?:\.00)?$/);
      const text = await firePlanPage.resultsTab.totalContributions.textContent();
      const value = parseMoney(text);
      // With ₪10,000/month over ~16 years the total should be in the millions range
      expect(value).toBeGreaterThan(100_000);
      // Sanity upper bound — should not exceed unreasonable amounts
      expect(value).toBeLessThan(100_000_000);
    });

    await test.step('results summary values use a recognized currency symbol', async () => {
      for (const locator of [firePlanPage.resultsTab.totalContributions, firePlanPage.resultsTab.annualWithdrawalNet, firePlanPage.resultsTab.monthlyExpenseNet]) {
        const text = (await locator.textContent())?.trim();
        if (text && text !== '-') {
          await expect(locator).toContainText(/[₪$]/);
        }
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

    await test.step('chart guidance and controls stay visible', async () => {
      await expect(firePlanPage.resultsTab.mainChartGuidance).toContainText('30 השנים הבאות');
      await expect(firePlanPage.resultsTab.mainChartControls).toBeVisible();
      await expect(firePlanPage.resultsTab.zoomOutButton).toBeVisible();
      await expect(firePlanPage.resultsTab.resetZoomButton).toBeVisible();
      await expect(firePlanPage.resultsTab.zoomInButton).toBeVisible();
      await expect(firePlanPage.resultsTab.panLeftButton).toBeVisible();
      await expect(firePlanPage.resultsTab.panRightButton).toBeVisible();
      await expect(firePlanPage.resultsTab.copyChartButton).toBeVisible();
    });

    await test.step('main chart defaults to the current point plus the next 30 years', async () => {
      await expect.poll(async () => {
        const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
        return state.max !== null ? state : null;
      }).toMatchObject({
        min: 0,
        max: 30
      });

      const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
      expect(state.labelCount).toBeGreaterThan(31);
    });

    await test.step('wheel and pinch zoom are disabled for the main chart', async () => {
      const initialState = await getChartViewportState(firePlanPage.resultsTab.mainChart);
      expect(initialState.wheelZoomEnabled).toBe(false);
      expect(initialState.pinchZoomEnabled).toBe(false);

      if (test.info().project.name !== 'mobile-chromium') {
        await firePlanPage.resultsTab.mainChart.hover();
        await firePlanPage.page.mouse.wheel(0, -600);
        await expect.poll(async () => {
          const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
          return { min: state.min, max: state.max };
        }).toEqual({ min: initialState.min, max: initialState.max });
      }
    });

    await test.step('zoom and pan buttons change the viewport and reset restores the focused default', async () => {
      const defaultState = await getChartViewportState(firePlanPage.resultsTab.mainChart);

      await firePlanPage.resultsTab.zoomInButton.click();
      await expect.poll(async () => (await getChartViewportState(firePlanPage.resultsTab.mainChart)).max).toBeLessThan(defaultState.max ?? Number.POSITIVE_INFINITY);

      await firePlanPage.resultsTab.panRightButton.click();
      await expect.poll(async () => (await getChartViewportState(firePlanPage.resultsTab.mainChart)).min).toBeGreaterThan(defaultState.min ?? 0);

      for (let i = 0; i < 6; i++) {
        await firePlanPage.resultsTab.zoomOutButton.click();
      }

      await expect.poll(async () => {
        const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
        return state.max;
      }).toBeGreaterThan(defaultState.max ?? 0);

      await firePlanPage.resultsTab.resetZoomButton.click();
      await expect.poll(async () => {
        const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
        return { min: state.min, max: state.max };
      }).toEqual({ min: defaultState.min, max: defaultState.max });
    });
  });

  test('defaults to the full-range viewport for plans shorter than 30 years', async ({ firePlanPage }) => {
    const shortPlan = cloneDemoPlan<Record<string, unknown>>();
    const shortPlanBirthYear = new Date().getFullYear() - 86;

    shortPlan.birthDate = `${shortPlanBirthYear}-01-01`;
    shortPlan.birthYear = shortPlanBirthYear;
    shortPlan.earlyRetirementYear = new Date().getFullYear();

    await firePlanPage.goto();
    await firePlanPage.loadPlan(shortPlan);
    await firePlanPage.switchToTab('results');

    await expect.poll(async () => {
      const state = await getChartViewportState(firePlanPage.resultsTab.mainChart);
      return state.max !== null ? state : null;
    }).not.toBeNull();

    const shortPlanState = await getChartViewportState(firePlanPage.resultsTab.mainChart);
    expect(shortPlanState.labelCount).toBeLessThanOrEqual(31);
    expect(shortPlanState.min).toBe(0);
    expect(shortPlanState.max).toBe(shortPlanState.labelCount - 1);
  });

  test('shows formula explainability panels for results cards on hover, click, focus, and currency change', async ({ firePlanPage }) => {
    await firePlanPage.goto();
    await firePlanPage.loadPlan(cloneDemoPlan());
    await firePlanPage.switchToTab('results');

    await expect(firePlanPage.resultsTab.totalContributions).not.toHaveText(/^[₪$]0(?:\.00)?$/);

    if (test.info().project.name !== 'mobile-chromium') {
      await firePlanPage.resultsTab.formulaTrigger('totalContributions').hover();
      await expect(firePlanPage.resultsTab.formulaPanel('totalContributions')).toBeVisible();
      await expect(firePlanPage.resultsTab.formulaPanel('totalContributions')).toContainText('נוסחה');
      await expect(firePlanPage.resultsTab.formulaPanel('totalContributions')).toContainText('בסיס עלות נוכחי');
    }

    const isMobileProject = test.info().project.name === 'mobile-chromium';

    await firePlanPage.resultsTab.activateFormulaTrigger('annualWithdrawalNet', isMobileProject);
    await expect(firePlanPage.resultsTab.formulaPanel('annualWithdrawalNet')).toBeVisible();
    await expect(firePlanPage.resultsTab.formulaPanel('annualWithdrawalNet')).toContainText('שיעור משיכה');
    await expect(firePlanPage.resultsTab.formulaPanel('totalContributions')).toBeHidden();

    await firePlanPage.resultsTab.formulaTrigger('monthlyExpenseNet').focus();
    await expect(firePlanPage.resultsTab.formulaPanel('monthlyExpenseNet')).toBeVisible();
    await expect(firePlanPage.resultsTab.formulaPanel('monthlyExpenseNet')).toContainText('הוצאה חודשית');

    const peakPanel = firePlanPage.resultsTab.formulaPanel('peakValue');
    await firePlanPage.resultsTab.activateFormulaTrigger('peakValue', isMobileProject);
    await expect(peakPanel).toBeVisible();
    const peakPanelTextBeforeCurrencyChange = await peakPanel.textContent();

    await firePlanPage.selectDisplayCurrency('$');
    await firePlanPage.switchToTab('results');
    await firePlanPage.resultsTab.activateFormulaTrigger('peakValue', isMobileProject);
    await expect(peakPanel).toBeVisible();
    const peakPanelTextAfterCurrencyChange = await peakPanel.textContent();

    expect(peakPanelTextBeforeCurrencyChange).not.toEqual(peakPanelTextAfterCurrencyChange);
    expect(peakPanelTextBeforeCurrencyChange ?? '').toContain('₪');
    expect(peakPanelTextAfterCurrencyChange ?? '').toContain('$');
  });
});
