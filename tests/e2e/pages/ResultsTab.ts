import { type Locator, type Page } from '@playwright/test';

export class ResultsTab {
  readonly root: Locator;
  readonly totalContributions: Locator;
  readonly annualWithdrawalNet: Locator;
  readonly monthlyExpenseNet: Locator;
  readonly mainChart: Locator;
  readonly startAccumulationChart: Locator;
  readonly startRetirementChart: Locator;
  readonly endRetirementChart: Locator;
  readonly zoomInButton: Locator;
  readonly panLeftButton: Locator;
  readonly copyChartButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-results');
    this.totalContributions = page.locator('#totalContributions');
    this.annualWithdrawalNet = page.locator('#annualWithdrawalNet');
    this.monthlyExpenseNet = page.locator('#monthlyExpenseNet');
    this.mainChart = page.locator('#mainChart');
    this.startAccumulationChart = page.locator('#startAccumulationChart');
    this.startRetirementChart = page.locator('#startRetirementChart');
    this.endRetirementChart = page.locator('#endRetirementChart');
    this.zoomInButton = page.locator('#zoomInBtn');
    this.panLeftButton = page.locator('#panLeftBtn');
    this.copyChartButton = page.locator('#copyMainChartBtn');
  }
}
