import { type Locator, type Page } from '@playwright/test';

export class MoneyFlowTab {
  readonly root: Locator;
  readonly chart: Locator;
  readonly yearDisplay: Locator;
  readonly startYear: Locator;
  readonly windowSize: Locator;
  readonly exportPngButton: Locator;
  readonly exportCsvButton: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-money-flow');
    this.chart = page.locator('#sankey-chart');
    this.yearDisplay = page.locator('#sankey-year-display');
    this.startYear = page.locator('#sankey-start-year');
    this.windowSize = page.locator('#sankey-window-size');
    this.exportPngButton = page.locator('#export-sankey-png');
    this.exportCsvButton = page.locator('#export-sankey-csv');
  }
}
