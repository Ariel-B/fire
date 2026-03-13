import { expect, type Locator, type Page } from '@playwright/test';

export class RsuTab {
  readonly root: Locator;
  readonly includeCheckbox: Locator;
  readonly addGrantButton: Locator;
  readonly grantRows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-rsu');
    this.includeCheckbox = page.locator('#includeRsuInCalculations');
    this.addGrantButton = page.locator('#add-rsu-grant-btn');
    this.grantRows = page.locator('[data-testid="rsu-grant-row"]');
  }

  async addGrant(values: {
    grantDate: string;
    shares: string;
    sharesSold?: string;
    price: string;
    currency?: '$' | '₪';
    vestingYears?: string;
  }): Promise<void> {
    const previousCount = await this.grantRows.count();
    await this.addGrantButton.click();
    await this.page.locator('#grant-date').fill(values.grantDate);
    await this.page.locator('#grant-shares').fill(values.shares);
    await this.page.locator('#grant-shares-sold').fill(values.sharesSold ?? '0');
    await this.page.locator('#grant-price').fill(values.price);
    if (values.currency) {
      await this.page.locator('#grant-currency').selectOption(values.currency);
    }
    if (values.vestingYears) {
      await this.page.locator('#grant-vesting-years').fill(values.vestingYears);
    }
    await this.page.locator('#rsu-grant-form button[type="submit"]').click();
    await expect(this.grantRows).toHaveCount(previousCount + 1);
  }
}
