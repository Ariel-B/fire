/**
 * Expense Table Component
 * Manages planned expenses table rendering and interactions
 */

import type { PlannedExpense, Currency } from '../types/index.js';
import { getMoneySymbol } from '../types/index.js';
import { Money } from '../types/money.js';
import { formatCurrency } from '../utils/formatter.js';
import { escapeHtml } from '../utils/dom.js';

// Re-export types for convenience
export type { PlannedExpense };

/**
 * Create a new empty expense
 */
export function createExpense(id?: number, baseYear?: number): PlannedExpense {
  return {
    id: id ?? Date.now(),
    type: '',
    netAmount: Money.usd(0),
    year: baseYear ?? new Date().getFullYear(),
    frequencyYears: 1,
    repetitionCount: 1
  };
}

/**
 * Get currency symbol from expense Money type
 */
function getExpenseCurrencySymbol(expense: PlannedExpense): Currency {
  return getMoneySymbol(expense.netAmount);
}

/**
 * Calculate inflated amount for an expense based on inflation
 */
export function calculateInflatedAmount(
  amount: number,
  currency: Currency,
  targetYear: number,
  baseYear: number,
  inflationRate: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): { amount: number; currency: Currency } {
  const yearsToInflate = Math.max(0, targetYear - baseYear);
  const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsToInflate);
  const inflatedAmount = amount * inflationMultiplier;

  // Return in display currency if requested
  let finalAmount = inflatedAmount;
  let finalCurrency = currency;

  if (currency !== displayCurrency) {
    if (currency === '$' && displayCurrency === '₪') {
      finalAmount = inflatedAmount * exchangeRates.usdToIls;
    } else if (currency === '₪' && displayCurrency === '$') {
      finalAmount = inflatedAmount * exchangeRates.ilsToUsd;
    }
    finalCurrency = displayCurrency;
  }

  return { amount: finalAmount, currency: finalCurrency };
}

/**
 * Calculate total expense with all repetitions
 */
export function calculateTotalExpenseWithRepetitions(
  expense: PlannedExpense,
  baseYear: number,
  inflationRate: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency,
  useDisplayCurrency: boolean = false
): number {
  const frequencyYears = expense.frequencyYears || 1;
  const repetitionCount = expense.repetitionCount || 1;
  const expenseCurrency = getExpenseCurrencySymbol(expense);
  let total = 0;

  // Calculate inflated amount for each occurrence
  for (let i = 0; i < repetitionCount; i++) {
    const occurrenceYear = expense.year + (i * frequencyYears);
    const inflatedData = calculateInflatedAmount(
      expense.netAmount.amount,
      expenseCurrency,
      occurrenceYear,
      baseYear,
      inflationRate,
      exchangeRates,
      useDisplayCurrency ? displayCurrency : expenseCurrency
    );

    total += inflatedData.amount;
  }

  return total;
}

/**
 * Generate a single expense table row HTML
 */
export function generateExpenseRowHtml(
  expense: PlannedExpense,
  baseYear: number,
  inflationRate: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): string {
  const frequencyYears = expense.frequencyYears || 1;
  const repetitionCount = expense.repetitionCount || 1;
  const expenseCurrency = getExpenseCurrencySymbol(expense);

  // Calculate first occurrence inflation
  const firstInflatedData = calculateInflatedAmount(
    expense.netAmount.amount,
    expenseCurrency,
    expense.year || new Date().getFullYear(),
    baseYear,
    inflationRate,
    exchangeRates,
    displayCurrency
  );
  const firstInflatedAmount = firstInflatedData.amount;

  // Calculate last occurrence inflation (only if repeated)
  let lastInflatedAmount = firstInflatedAmount;
  let lastYear = expense.year;
  if (repetitionCount > 1) {
    lastYear = expense.year + (frequencyYears * (repetitionCount - 1));
    const lastInflatedData = calculateInflatedAmount(
      expense.netAmount.amount,
      expenseCurrency,
      lastYear,
      baseYear,
      inflationRate,
      exchangeRates,
      displayCurrency
    );
    lastInflatedAmount = lastInflatedData.amount;
  }

  const inflatedCurrency = firstInflatedData.currency;
  const isRepeated = repetitionCount > 1;
  const safeExpenseType = escapeHtml(expense.type);

  // Calculate total for this expense including all repetitions
  const expenseTotal = calculateTotalExpenseWithRepetitions(
    expense,
    baseYear,
    inflationRate,
    exchangeRates,
    displayCurrency,
    false
  );

  return `
    <td class="px-4 py-4">
          <input type="text" value="${safeExpenseType}" data-expense-action="update-field" data-expense-id="${expense.id}" data-expense-field="type"
             class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="תיאור ההוצאה"
            >
    </td>
    <td class="px-4 py-4">
          <input type="number" value="${expense.netAmount.amount}" data-expense-action="update-amount" data-expense-id="${expense.id}"
             class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="סכום"
             min="0"
            >
    </td>
    <td class="px-3 py-4">
      <select class="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        data-expense-action="update-currency" data-expense-id="${expense.id}">
        <option value="$" ${expenseCurrency === '$' ? 'selected' : ''}>$</option>
        <option value="₪" ${expenseCurrency === '₪' ? 'selected' : ''}>₪</option>
      </select>
    </td>
    <td class="px-4 py-4">
          <input type="number" value="${expense.year}" data-expense-action="update-field" data-expense-id="${expense.id}" data-expense-field="year"
             class="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             min="${new Date().getFullYear()}"
            >
    </td>
    <td class="px-3 py-4">
          <input type="number" value="${frequencyYears}" data-expense-action="update-field" data-expense-id="${expense.id}" data-expense-field="frequencyYears"
             class="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             min="1"
             max="10"
             title="כל כמה שנים חוזרת ההוצאה"
            >
    </td>
    <td class="px-3 py-4">
          <input type="number" value="${repetitionCount}" data-expense-action="update-field" data-expense-id="${expense.id}" data-expense-field="repetitionCount"
             class="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             min="1"
             max="20"
             title="כמה פעמים תחזור ההוצאה"
            >
    </td>
    <td class="px-4 py-4">
      <div class="text-xs font-medium text-gray-900 ${firstInflatedAmount !== expense.netAmount.amount ? 'text-orange-600' : ''}" title="סכום ההוצאה הראשונה כולל אינפלציה">
        ${formatCurrency(firstInflatedAmount, inflatedCurrency)}
      </div>
    </td>
    <td class="px-4 py-4">
      <div class="text-xs font-medium text-gray-900 ${isRepeated ? (lastInflatedAmount !== firstInflatedAmount ? 'text-red-600' : 'text-orange-600') : 'text-gray-400'}"
           title="${isRepeated ? 'סכום ההוצאה האחרונה כולל אינפלציה (שנה ' + lastYear + ')' : 'לא רלוונטי - הוצאה חד פעמית'}">
        ${isRepeated ? formatCurrency(lastInflatedAmount, inflatedCurrency) : '-'}
      </div>
    </td>
    <td class="px-4 py-4 bg-blue-50">
      <div class="text-sm font-bold text-blue-900" title="סה״כ כל החזרות כולל אינפלציה">
        ${formatCurrency(expenseTotal, expenseCurrency)}
        ${isRepeated ? `<br><span class="text-xs text-blue-600">(${repetitionCount} פעמים)</span>` : ''}
      </div>
    </td>
    <td class="px-4 py-4 text-center">
      <button type="button" data-expense-action="remove" data-expense-id="${expense.id}"
              data-testid="expense-remove"
              class="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-2 transition-colors">
        🗑️
      </button>
    </td>
  `;
}

/**
 * Render the expense table
 */
export function renderExpenseTable(
  tableId: string,
  expenses: PlannedExpense[],
  baseYear: number,
  inflationRate: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): void {
  const table = document.getElementById(tableId) as HTMLTableElement | null;
  if (!table) return;

  table.innerHTML = '';

  expenses.forEach(expense => {
    const row = table.insertRow();
    row.setAttribute('data-testid', 'expense-row');
    row.dataset.expenseId = String(expense.id);
    row.innerHTML = generateExpenseRowHtml(
      expense,
      baseYear,
      inflationRate,
      exchangeRates,
      displayCurrency
    );
  });
}

/**
 * Calculate expense totals for the summary row
 */
export interface ExpenseTotals {
  totalNetAmount: number;
  totalFirstInflation: number;
  totalLastInflation: number;
  grandTotal: number;
  totalOccurrences: number;
}

export function calculateExpenseTotals(
  expenses: PlannedExpense[],
  baseYear: number,
  inflationRate: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): ExpenseTotals {
  let totalNetAmount = 0;
  let totalFirstInflation = 0;
  let totalLastInflation = 0;
  let grandTotal = 0;
  let totalOccurrences = 0;

  expenses.forEach(expense => {
    const frequencyYears = expense.frequencyYears || 1;
    const repetitionCount = expense.repetitionCount || 1;
    const expenseCurrency = getExpenseCurrencySymbol(expense);

    // Net amount in display currency
    let netInDisplayCurrency = expense.netAmount.amount;
    if (expenseCurrency !== displayCurrency) {
      if (expenseCurrency === '$' && displayCurrency === '₪') {
        netInDisplayCurrency *= exchangeRates.usdToIls;
      } else if (expenseCurrency === '₪' && displayCurrency === '$') {
        netInDisplayCurrency *= exchangeRates.ilsToUsd;
      }
    }
    totalNetAmount += netInDisplayCurrency;

    // First inflated amount
    const firstInflatedData = calculateInflatedAmount(
      expense.netAmount.amount,
      expenseCurrency,
      expense.year,
      baseYear,
      inflationRate,
      exchangeRates,
      displayCurrency
    );
    totalFirstInflation += firstInflatedData.amount;

    // Last inflated amount
    if (repetitionCount > 1) {
      const lastYear = expense.year + (frequencyYears * (repetitionCount - 1));
      const lastInflatedData = calculateInflatedAmount(
        expense.netAmount.amount,
        expenseCurrency,
        lastYear,
        baseYear,
        inflationRate,
        exchangeRates,
        displayCurrency
      );
      totalLastInflation += lastInflatedData.amount;
    } else {
      totalLastInflation += firstInflatedData.amount;
    }

    // Grand total with all repetitions
    grandTotal += calculateTotalExpenseWithRepetitions(
      expense,
      baseYear,
      inflationRate,
      exchangeRates,
      displayCurrency,
      true
    );

    totalOccurrences += repetitionCount;
  });

  return {
    totalNetAmount,
    totalFirstInflation,
    totalLastInflation,
    grandTotal,
    totalOccurrences
  };
}

/**
 * Remove an expense from the list
 */
export function removeExpenseFromList(
  expenses: PlannedExpense[],
  id: number
): PlannedExpense[] {
  return expenses.filter(e => e.id !== id);
}

/**
 * Update a single field on an expense (for non-Money fields)
 */
export function updateExpenseField(
  expenses: PlannedExpense[],
  id: number,
  field: keyof PlannedExpense,
  value: unknown
): void {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (expense as any)[field] = value;
}

/**
 * Update expense amount (creates new Money object)
 */
export function updateExpenseAmount(
  expenses: PlannedExpense[],
  id: number,
  amount: number
): void {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  // Preserve the currency, update the amount
  const currency = expense.netAmount.currency;
  expense.netAmount = currency === 'USD' ? Money.usd(amount) : Money.ils(amount);
}

/**
 * Update expense currency (creates new Money object)
 */
export function updateExpenseCurrency(
  expenses: PlannedExpense[],
  id: number,
  symbol: '$' | '₪'
): void {
  const expense = expenses.find(e => e.id === id);
  if (!expense) return;

  // Create new Money object with the same amount but new currency
  const amount = expense.netAmount.amount;
  expense.netAmount = symbol === '$' ? Money.usd(amount) : Money.ils(amount);
}
