import { expect, type Locator, type Page } from '@playwright/test';

export class AccumulationTab {
  readonly root: Locator;
  readonly addRowButton: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-accumulation');
    this.addRowButton = page.locator('#addAccumulationRow');
    this.rows = page.locator('[data-testid="accumulation-asset-row"]');
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  async addAsset(): Promise<void> {
    const previousCount = await this.rows.count();
    await this.addRowButton.click();
    await expect(this.rows).toHaveCount(previousCount + 1);
  }

  async fillAsset(
    index: number,
    values: {
      symbol: string;
      quantity: string;
      averageCost: string;
      method?: string;
      value1?: string;
      value2?: string;
    }
  ): Promise<void> {
    const row = this.row(index);
    await row.locator('[data-portfolio-action="update-symbol"]').fill(values.symbol);
    await row.locator('[data-portfolio-action="update-symbol"]').blur();

    await row.locator('[data-portfolio-action="update-field"][data-portfolio-field="quantity"]').fill(values.quantity);
    await row.locator('[data-portfolio-action="update-cost"]').fill(values.averageCost);

    if (values.method) {
      await row.locator('[data-portfolio-action="method-change"]').selectOption({ label: values.method });
    }

    if (values.value1 !== undefined) {
      await row.locator('[data-portfolio-field="value1"], [data-portfolio-action="update-cagr-manual"]').first().fill(values.value1);
    }

    if (values.value2 !== undefined) {
      await row.locator('[data-portfolio-field="value2"]').fill(values.value2);
    }
  }

  async removeAsset(index: number): Promise<void> {
    await this.row(index).getByTestId('portfolio-remove-asset').click();
  }
}
