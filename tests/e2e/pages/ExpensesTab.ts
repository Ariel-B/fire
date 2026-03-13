import { type Locator, type Page } from '@playwright/test';

export class ExpensesTab {
  readonly root: Locator;
  readonly addExpenseButton: Locator;
  readonly rows: Locator;

  constructor(private readonly page: Page) {
    this.root = page.locator('#content-expenses');
    this.addExpenseButton = page.locator('#addExpenseRow');
    this.rows = page.locator('[data-testid="expense-row"]');
  }

  row(index: number): Locator {
    return this.rows.nth(index);
  }

  async addExpense(): Promise<void> {
    await this.addExpenseButton.click();
  }

  async removeExpense(index: number): Promise<void> {
    await this.row(index).getByTestId('expense-remove').click();
  }
}
