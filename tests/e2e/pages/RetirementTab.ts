import { type Locator, type Page } from '@playwright/test';

export class RetirementTab {
  readonly root: Locator;
  readonly checkbox: Locator;
  readonly addAllocationButton: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-retirement');
    this.checkbox = page.locator('#useRetirementPortfolio');
    this.addAllocationButton = page.locator('#addRetirementAllocationRow');
    this.rows = page.locator('[data-testid="retirement-allocation-row"]');
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }
}
