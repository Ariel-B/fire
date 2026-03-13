/**
 * Expense Table Component Unit Tests
 * Tests for expense calculations and table generation
 */

import {
  createExpense,
  calculateInflatedAmount,
  calculateTotalExpenseWithRepetitions,
  generateExpenseRowHtml,
  calculateExpenseTotals,
  removeExpenseFromList,
  updateExpenseField,
  updateExpenseAmount,
  updateExpenseCurrency
} from '../../../js/components/expense-table.js';
import { Money } from '../../../js/types/money.js';

describe('Expense Table Component', () => {
  const defaultExchangeRates = { usdToIls: 3.7, ilsToUsd: 1 / 3.7 };

  // ============================================================================
  // createExpense
  // ============================================================================

  describe('createExpense', () => {
    test('creates expense with default values', () => {
      const expense = createExpense();

      expect(expense).toHaveProperty('id');
      expect(expense.type).toBe('');
      expect(expense.netAmount.amount).toBe(0);
      expect(expense.netAmount.currency).toBe('USD');
      expect(expense.frequencyYears).toBe(1);
      expect(expense.repetitionCount).toBe(1);
    });

    test('creates expense with provided id', () => {
      const expense = createExpense(123);

      expect(expense.id).toBe(123);
    });

    test('creates expense with provided base year', () => {
      const expense = createExpense(undefined, 2030);

      expect(expense.year).toBe(2030);
    });

    test('uses current year when baseYear not provided', () => {
      const expense = createExpense();
      const currentYear = new Date().getFullYear();

      expect(expense.year).toBe(currentYear);
    });
  });

  // ============================================================================
  // calculateInflatedAmount
  // ============================================================================

  describe('calculateInflatedAmount', () => {
    describe('basic inflation calculations', () => {
      test('returns same amount when target year equals base year', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2024,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBe(10000);
        expect(result.currency).toBe('$');
      });

      test('applies inflation for 1 year', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2025,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBeCloseTo(10300, 2); // 10000 * 1.03
        expect(result.currency).toBe('$');
      });

      test('applies compound inflation for 5 years', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2029,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // 10000 * (1.03)^5 ≈ 11592.74
        expect(result.amount).toBeCloseTo(11592.74, 0);
      });

      test('applies compound inflation for 10 years', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2034,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // 10000 * (1.03)^10 ≈ 13439.16
        expect(result.amount).toBeCloseTo(13439.16, 0);
      });
    });

    describe('currency conversion', () => {
      test('converts USD to ILS when display currency is ILS', () => {
        const result = calculateInflatedAmount(
          1000,
          '$',
          2024,
          2024,
          0,
          defaultExchangeRates,
          '₪'
        );

        expect(result.amount).toBeCloseTo(3700, 2); // 1000 * 3.7
        expect(result.currency).toBe('₪');
      });

      test('converts ILS to USD when display currency is USD', () => {
        const result = calculateInflatedAmount(
          3700,
          '₪',
          2024,
          2024,
          0,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBeCloseTo(1000, 2); // 3700 / 3.7
        expect(result.currency).toBe('$');
      });

      test('no conversion when currencies match', () => {
        const result = calculateInflatedAmount(
          1000,
          '$',
          2024,
          2024,
          0,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBe(1000);
        expect(result.currency).toBe('$');
      });

      test('applies inflation before currency conversion', () => {
        const result = calculateInflatedAmount(
          1000,
          '$',
          2025,
          2024,
          3,
          defaultExchangeRates,
          '₪'
        );

        // 1000 * 1.03 = 1030, then * 3.7 = 3811
        expect(result.amount).toBeCloseTo(3811, 0);
        expect(result.currency).toBe('₪');
      });
    });

    describe('edge cases', () => {
      test('handles 0% inflation', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2034,
          2024,
          0,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBe(10000);
      });

      test('handles negative year difference (past year)', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2020,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // yearsToInflate should be 0 (max(0, -4))
        expect(result.amount).toBe(10000);
      });

      test('handles 0 amount', () => {
        const result = calculateInflatedAmount(
          0,
          '$',
          2030,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBe(0);
      });

      test('handles high inflation rate', () => {
        const result = calculateInflatedAmount(
          10000,
          '$',
          2025,
          2024,
          10,
          defaultExchangeRates,
          '$'
        );

        expect(result.amount).toBeCloseTo(11000, 2); // 10000 * 1.10
      });
    });
  });

  // ============================================================================
  // calculateTotalExpenseWithRepetitions
  // ============================================================================

  describe('calculateTotalExpenseWithRepetitions', () => {
    describe('single occurrence', () => {
      test('calculates total for one-time expense', () => {
        const expense = {
          id: 1,
          type: 'Car',
          netAmount: Money.usd(30000),
          year: 2025,
          frequencyYears: 1,
          repetitionCount: 1
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // 30000 * 1.03 = 30900
        expect(result).toBeCloseTo(30900, 0);
      });
    });

    describe('multiple occurrences', () => {
      test('calculates total for annual expense over 3 years', () => {
        const expense = {
          id: 1,
          type: 'Vacation',
          netAmount: Money.usd(5000),
          year: 2025,
          frequencyYears: 1,
          repetitionCount: 3
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // Year 2025: 5000 * 1.03 = 5150
        // Year 2026: 5000 * 1.03^2 = 5304.50
        // Year 2027: 5000 * 1.03^3 = 5463.64
        // Total ≈ 15918.14
        expect(result).toBeCloseTo(15918, 0);
      });

      test('calculates total for bi-annual expense', () => {
        const expense = {
          id: 1,
          type: 'Car replacement',
          netAmount: Money.usd(30000),
          year: 2025,
          frequencyYears: 5,
          repetitionCount: 3
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // Year 2025: 30000 * 1.03^1 = 30900.00
        // Year 2030: 30000 * 1.03^6 = 35821.58
        // Year 2035: 30000 * 1.03^11 = 41526.94
        // Total ≈ 108248.52
        expect(result).toBeCloseTo(108249, 0);
      });
    });

    describe('with currency conversion', () => {
      test('converts to display currency when useDisplayCurrency is true', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(1000),
          year: 2024,
          frequencyYears: 1,
          repetitionCount: 1
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          0,
          defaultExchangeRates,
          '₪',
          true
        );

        expect(result).toBeCloseTo(3700, 0); // 1000 * 3.7
      });

      test('keeps original currency when useDisplayCurrency is false', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(1000),
          year: 2024,
          frequencyYears: 1,
          repetitionCount: 1
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          0,
          defaultExchangeRates,
          '₪',
          false
        );

        expect(result).toBe(1000);
      });
    });

    describe('edge cases', () => {
      test('handles missing frequencyYears (defaults to 1)', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(1000),
          year: 2024,
          repetitionCount: 2
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        // Year 2024: 1000 * 1 = 1000
        // Year 2025: 1000 * 1.03 = 1030
        // Total = 2030
        expect(result).toBeCloseTo(2030, 0);
      });

      test('handles missing repetitionCount (defaults to 1)', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(1000),
          year: 2024,
          frequencyYears: 1
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          0,
          defaultExchangeRates,
          '$'
        );

        expect(result).toBe(1000);
      });

      test('handles 0 netAmount', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(0),
          year: 2024,
          frequencyYears: 1,
          repetitionCount: 5
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        expect(result).toBe(0);
      });

      test('handles missing netAmount (defaults to 0)', () => {
        const expense = {
          id: 1,
          type: 'Test',
          netAmount: Money.usd(0),
          year: 2024,
          frequencyYears: 1,
          repetitionCount: 1
        };

        const result = calculateTotalExpenseWithRepetitions(
          expense,
          2024,
          3,
          defaultExchangeRates,
          '$'
        );

        expect(result).toBe(0);
      });
    });
  });

  describe('generateExpenseRowHtml', () => {
    test('escapes expense type before inserting HTML', () => {
      const expense = {
        id: 1,
        type: 'Trip" onfocus="alert(1)',
        netAmount: Money.usd(1500),
        year: 2026,
        frequencyYears: 1,
        repetitionCount: 1
      };

      const html = generateExpenseRowHtml(
        expense,
        2026,
        3,
        defaultExchangeRates,
        '$'
      );

      expect(html).toContain('Trip&quot; onfocus=&quot;alert(1)');
      expect(html).not.toContain('value="Trip" onfocus="alert(1)"');
    });
  });

  // ============================================================================
  // generateExpenseRowHtml
  // ============================================================================

  describe('generateExpenseRowHtml', () => {
    test('returns an HTML string', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Car';
      expense.netAmount = Money.usd(30000);
      expense.year = 2026;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 3, defaultExchangeRates, '$');

      expect(typeof html).toBe('string');
      expect(html.length).toBeGreaterThan(0);
    });

    test('includes expense id in event handler attributes', () => {
      const expense = createExpense(42, 2025);
      expense.type = 'Vacation';
      expense.netAmount = Money.usd(5000);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 0, defaultExchangeRates, '$');

      expect(html).toContain('42');
    });

    test('includes expense type value in input', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Holiday trip';
      expense.netAmount = Money.usd(5000);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 0, defaultExchangeRates, '$');

      expect(html).toContain('Holiday trip');
    });

    test('includes expense amount in input', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Test';
      expense.netAmount = Money.usd(12345);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 0, defaultExchangeRates, '$');

      expect(html).toContain('12345');
    });

    test('shows repetition count for repeated expense', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Rent';
      expense.netAmount = Money.usd(2000);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 5;

      const html = generateExpenseRowHtml(expense, 2024, 3, defaultExchangeRates, '$');

      expect(html).toContain('5');
    });

    test('shows dash for last inflated amount when repetition is 1', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'One-time';
      expense.netAmount = Money.usd(10000);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2024, 3, defaultExchangeRates, '$');

      // Single-occurrence: uses text-gray-400 class and shows "-" (not repeated)
      expect(html).toContain('text-gray-400');
      expect(html).toMatch(/text-gray-400[^>]*>[\s\S]*?-[\s\S]*?<\/div>/);
    });

    test('marks USD currency option as selected', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Test';
      expense.netAmount = Money.usd(1000);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 0, defaultExchangeRates, '$');

      expect(html).toContain('<option value="$" selected>$</option>');
    });

    test('marks ILS currency option as selected for ILS expense', () => {
      const expense = createExpense(1, 2025);
      expense.type = 'Test';
      expense.netAmount = Money.ils(3700);
      expense.year = 2025;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;

      const html = generateExpenseRowHtml(expense, 2025, 0, defaultExchangeRates, '$');

      expect(html).toContain('<option value="₪" selected>₪</option>');
    });
  });

  // ============================================================================
  // calculateExpenseTotals
  // ============================================================================

  describe('calculateExpenseTotals', () => {
    test('returns zeros for empty expenses array', () => {
      const result = calculateExpenseTotals([], 2025, 3, defaultExchangeRates, '$');

      expect(result.totalNetAmount).toBe(0);
      expect(result.totalFirstInflation).toBe(0);
      expect(result.totalLastInflation).toBe(0);
      expect(result.grandTotal).toBe(0);
      expect(result.totalOccurrences).toBe(0);
    });

    test('returns correct totals for single one-time expense', () => {
      const expense = {
        id: 1,
        type: 'Car',
        netAmount: Money.usd(10000),
        year: 2025,
        frequencyYears: 1,
        repetitionCount: 1
      };

      const result = calculateExpenseTotals([expense], 2024, 0, defaultExchangeRates, '$');

      expect(result.totalNetAmount).toBe(10000);
      expect(result.totalOccurrences).toBe(1);
      expect(result.grandTotal).toBeCloseTo(10000, 2);
    });

    test('sums totals for multiple expenses', () => {
      const expenses = [
        {
          id: 1,
          type: 'Car',
          netAmount: Money.usd(10000),
          year: 2025,
          frequencyYears: 1,
          repetitionCount: 1
        },
        {
          id: 2,
          type: 'Vacation',
          netAmount: Money.usd(5000),
          year: 2025,
          frequencyYears: 1,
          repetitionCount: 1
        }
      ];

      const result = calculateExpenseTotals(expenses, 2024, 0, defaultExchangeRates, '$');

      expect(result.totalNetAmount).toBe(15000);
      expect(result.totalOccurrences).toBe(2);
    });

    test('counts total occurrences across repeated expenses', () => {
      const expenses = [
        {
          id: 1,
          type: 'Annual',
          netAmount: Money.usd(5000),
          year: 2025,
          frequencyYears: 1,
          repetitionCount: 3
        },
        {
          id: 2,
          type: 'BiAnnual',
          netAmount: Money.usd(2000),
          year: 2025,
          frequencyYears: 2,
          repetitionCount: 4
        }
      ];

      const result = calculateExpenseTotals(expenses, 2024, 0, defaultExchangeRates, '$');

      expect(result.totalOccurrences).toBe(7); // 3 + 4
    });

    test('converts ILS expense to USD when display currency is USD', () => {
      const expense = {
        id: 1,
        type: 'Local',
        netAmount: Money.ils(3700),
        year: 2025,
        frequencyYears: 1,
        repetitionCount: 1
      };

      const result = calculateExpenseTotals([expense], 2025, 0, defaultExchangeRates, '$');

      expect(result.totalNetAmount).toBeCloseTo(1000, 2); // 3700 / 3.7
    });

    test('converts USD expense to ILS when display currency is ILS', () => {
      const expense = {
        id: 1,
        type: 'Foreign',
        netAmount: Money.usd(1000),
        year: 2025,
        frequencyYears: 1,
        repetitionCount: 1
      };

      const result = calculateExpenseTotals([expense], 2025, 0, defaultExchangeRates, '₪');

      expect(result.totalNetAmount).toBeCloseTo(3700, 2); // 1000 * 3.7
    });

    test('lastInflation equals firstInflation for single occurrence', () => {
      const expense = {
        id: 1,
        type: 'One-shot',
        netAmount: Money.usd(5000),
        year: 2026,
        frequencyYears: 1,
        repetitionCount: 1
      };

      const result = calculateExpenseTotals([expense], 2024, 3, defaultExchangeRates, '$');

      expect(result.totalLastInflation).toBeCloseTo(result.totalFirstInflation, 2);
    });

    test('lastInflation differs from firstInflation for repeated expense with inflation', () => {
      const expense = {
        id: 1,
        type: 'Annual',
        netAmount: Money.usd(5000),
        year: 2025,
        frequencyYears: 1,
        repetitionCount: 5
      };

      const result = calculateExpenseTotals([expense], 2024, 3, defaultExchangeRates, '$');

      expect(result.totalLastInflation).toBeGreaterThan(result.totalFirstInflation);
    });
  });

  // ============================================================================
  // removeExpenseFromList
  // ============================================================================

  describe('removeExpenseFromList', () => {
    test('removes expense with matching id', () => {
      const expenses = [
        { id: 1, type: 'A', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 },
        { id: 2, type: 'B', netAmount: Money.usd(200), year: 2025, frequencyYears: 1, repetitionCount: 1 },
        { id: 3, type: 'C', netAmount: Money.usd(300), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      const result = removeExpenseFromList(expenses, 2);

      expect(result).toHaveLength(2);
      expect(result.find(e => e.id === 2)).toBeUndefined();
      expect(result.map(e => e.id)).toEqual([1, 3]);
    });

    test('returns same array when id not found', () => {
      const expenses = [
        { id: 1, type: 'A', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      const result = removeExpenseFromList(expenses, 999);

      expect(result).toHaveLength(1);
    });

    test('returns empty array when single element removed', () => {
      const expenses = [
        { id: 1, type: 'A', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      const result = removeExpenseFromList(expenses, 1);

      expect(result).toHaveLength(0);
    });

    test('returns empty array for empty input', () => {
      const result = removeExpenseFromList([], 1);

      expect(result).toHaveLength(0);
    });

    test('does not mutate the original array', () => {
      const expenses = [
        { id: 1, type: 'A', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 },
        { id: 2, type: 'B', netAmount: Money.usd(200), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];
      const original = [...expenses];

      removeExpenseFromList(expenses, 1);

      expect(expenses).toHaveLength(original.length);
    });
  });

  // ============================================================================
  // updateExpenseField
  // ============================================================================

  describe('updateExpenseField', () => {
    test('updates a string field', () => {
      const expenses = [
        { id: 1, type: 'Old name', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseField(expenses, 1, 'type', 'New name');

      expect(expenses[0].type).toBe('New name');
    });

    test('updates a numeric field', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseField(expenses, 1, 'year', 2030);

      expect(expenses[0].year).toBe(2030);
    });

    test('updates repetitionCount', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseField(expenses, 1, 'repetitionCount', 5);

      expect(expenses[0].repetitionCount).toBe(5);
    });

    test('does nothing when id not found', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseField(expenses, 999, 'type', 'Changed');

      expect(expenses[0].type).toBe('Test');
    });

    test('does nothing on empty array', () => {
      expect(() => updateExpenseField([], 1, 'type', 'Changed')).not.toThrow();
    });
  });

  // ============================================================================
  // updateExpenseAmount
  // ============================================================================

  describe('updateExpenseAmount', () => {
    test('updates amount while preserving USD currency', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseAmount(expenses, 1, 5000);

      expect(expenses[0].netAmount.amount).toBe(5000);
      expect(expenses[0].netAmount.currency).toBe('USD');
    });

    test('updates amount while preserving ILS currency', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.ils(3700), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseAmount(expenses, 1, 7400);

      expect(expenses[0].netAmount.amount).toBe(7400);
      expect(expenses[0].netAmount.currency).toBe('ILS');
    });

    test('does nothing when id not found', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(100), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseAmount(expenses, 999, 5000);

      expect(expenses[0].netAmount.amount).toBe(100);
    });

    test('handles zero amount', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(1000), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseAmount(expenses, 1, 0);

      expect(expenses[0].netAmount.amount).toBe(0);
    });
  });

  // ============================================================================
  // updateExpenseCurrency
  // ============================================================================

  describe('updateExpenseCurrency', () => {
    test('switches from USD to ILS', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(1000), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseCurrency(expenses, 1, '₪');

      expect(expenses[0].netAmount.currency).toBe('ILS');
      expect(expenses[0].netAmount.amount).toBe(1000);
    });

    test('switches from ILS to USD', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.ils(3700), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseCurrency(expenses, 1, '$');

      expect(expenses[0].netAmount.currency).toBe('USD');
      expect(expenses[0].netAmount.amount).toBe(3700);
    });

    test('preserves amount when switching currency', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(2500), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseCurrency(expenses, 1, '₪');

      expect(expenses[0].netAmount.amount).toBe(2500);
    });

    test('does nothing when id not found', () => {
      const expenses = [
        { id: 1, type: 'Test', netAmount: Money.usd(1000), year: 2025, frequencyYears: 1, repetitionCount: 1 }
      ];

      updateExpenseCurrency(expenses, 999, '₪');

      expect(expenses[0].netAmount.currency).toBe('USD');
    });
  });
});
