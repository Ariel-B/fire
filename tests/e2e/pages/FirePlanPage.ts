import { expect, type Locator, type Page } from '@playwright/test';

import { AccumulationTab } from './AccumulationTab';
import { ExpensesTab } from './ExpensesTab';
import { MoneyFlowTab } from './MoneyFlowTab';
import { ResultsTab } from './ResultsTab';
import { RetirementTab } from './RetirementTab';
import { RsuTab } from './RsuTab';

export type TabName = 'accumulation' | 'rsu' | 'expenses' | 'retirement' | 'results' | 'money-flow';

export class FirePlanPage {
  readonly accumulationTab: AccumulationTab;
  readonly rsuTab: RsuTab;
  readonly expensesTab: ExpensesTab;
  readonly retirementTab: RetirementTab;
  readonly resultsTab: ResultsTab;
  readonly moneyFlowTab: MoneyFlowTab;

  constructor(readonly page: Page) {
    this.accumulationTab = new AccumulationTab(page);
    this.rsuTab = new RsuTab(page);
    this.expensesTab = new ExpensesTab(page);
    this.retirementTab = new RetirementTab(page);
    this.resultsTab = new ResultsTab(page);
    this.moneyFlowTab = new MoneyFlowTab(page);
  }

  async goto(): Promise<void> {
    await this.page.goto('/', { waitUntil: 'load', timeout: 30_000 });
    await expect(this.page.locator('#tab-accumulation')).toBeVisible();
    await expect
      .poll(async () => {
        return this.page.evaluate(() => {
          return typeof (window as Window & { fireApp?: { loadPlanFromData?: unknown } }).fireApp?.loadPlanFromData === 'function';
        });
      })
      .toBe(true);
    await expect(this.page.locator('html')).toHaveAttribute('dir', 'rtl');
  }

  tabButton(tab: TabName): Locator {
    return this.page.locator(`#tab-${tab}`);
  }

  async switchToTab(tab: TabName): Promise<void> {
    // The RSU and Retirement tab buttons contain checkbox labels that call
    // `event.stopPropagation()` (see `data-stop-tab-toggle` in index.html).
    // A normal Playwright `.click()` that hits those labels never reaches the
    // tab button handler.  `dispatchEvent` bypasses the hit-test entirely,
    // which trades Playwright's built-in actionability checks for reliable tab
    // switching.  The subsequent `toBeVisible()` assertion still verifies that
    // the tab actually activated.
    await this.tabButton(tab).dispatchEvent('click');
    await expect(this.page.locator(`#content-${tab}`)).toBeVisible();
  }

  async loadPlan(plan: unknown): Promise<void> {
    await this.page.evaluate(async (planData) => {
      await (window as Window & { fireApp: { loadPlanFromData: (data: unknown) => Promise<void> } }).fireApp.loadPlanFromData(planData);
    }, plan);

    await expect
      .poll(async () => (await this.resultsTab.totalContributions.textContent())?.trim())
      .not.toBe('₪0');
  }

  async savePlanAsWithPassword(password: string): Promise<void> {
    await this.page.locator('#savePlanAs').click();
    await expect(this.page.locator('#password-dialog')).toBeVisible();
    await this.page.locator('#password-input').fill(password);
    await this.page.locator('#password-confirm-input').fill(password);
    await this.page.locator('#password-submit').click();
  }

  async savePlanWithPassword(password: string): Promise<void> {
    await this.page.locator('#savePlan').click();
    await expect(this.page.locator('#password-dialog')).toBeVisible();
    await this.page.locator('#password-input').fill(password);
    await this.page.locator('#password-confirm-input').fill(password);
    await this.page.locator('#password-submit').click();
  }

  async loadPlanWithPassword(path: string, password: string): Promise<void> {
    const fileChooserPromise = this.page.waitForEvent('filechooser');
    await this.page.locator('#loadPlan').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(path);
    await expect(this.page.locator('#password-dialog')).toBeVisible();
    await this.page.locator('#password-input').fill(password);
    await this.page.locator('#password-submit').click();
  }

  async selectDisplayCurrency(currency: '$' | '₪'): Promise<void> {
    await this.page.getByTestId('display-currency-menu').click();
    await this.page.locator(currency === '$' ? '#currencyUSD' : '#currencyILS').click();
    await expect(this.page.getByTestId('display-currency-label')).toHaveText(currency);
  }
}
