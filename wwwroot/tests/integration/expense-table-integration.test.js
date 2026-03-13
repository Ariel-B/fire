/**
 * Expense Table Integration Tests
 * Tests expense calculations with inflation, currency conversion, and repetitions
 */

import {
  createExpense,
  calculateInflatedAmount,
  calculateTotalExpenseWithRepetitions
} from '../../js/components/expense-table.js';
import { Money } from '../../js/types/money.js';

describe('Expense Table Integration', () => {
  const exchangeRates = { usdToIls: 3.6, ilsToUsd: 1 / 3.6 };
  const baseYear = 2024;
  const inflationRate = 3.0; // 3% annual inflation

  describe('Expense Creation', () => {
    test('should create expense with default values', () => {
      const expense = createExpense();
      
      expect(expense).toBeDefined();
      expect(expense.id).toBeGreaterThan(0);
      expect(expense.type).toBe('');
      expect(expense.netAmount.amount).toBe(0);
      expect(expense.netAmount.currency).toBe('USD');
      expect(expense.year).toBeGreaterThan(2020);
      expect(expense.frequencyYears).toBe(1);
      expect(expense.repetitionCount).toBe(1);
    });

    test('should create expense with custom ID and base year', () => {
      const customId = 999;
      const customYear = 2025;
      const expense = createExpense(customId, customYear);
      
      expect(expense.id).toBe(customId);
      expect(expense.year).toBe(customYear);
    });

    test('should create multiple expenses with unique IDs', async () => {
      const expense1 = createExpense();
      await new Promise(resolve => setTimeout(resolve, 2));
      const expense2 = createExpense();
      
      expect(expense1.id).not.toBe(expense2.id);
    });
  });

  describe('Inflation Calculations', () => {
    test('should calculate inflated amount with no inflation', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear, baseYear, 0, exchangeRates, '$'
      );
      
      expect(result.amount).toBe(10000);
      expect(result.currency).toBe('$');
    });

    test('should calculate inflated amount for future year', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 10, baseYear, inflationRate, exchangeRates, '$'
      );
      
      // 10000 * (1.03)^10 ≈ 13439.16
      expect(result.amount).toBeCloseTo(13439.16, 1);
      expect(result.currency).toBe('$');
    });

    test('should handle inflation for past years (no inflation)', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear - 5, baseYear, inflationRate, exchangeRates, '$'
      );
      
      expect(result.amount).toBe(10000); // No inflation for past years
    });

    test('should inflate and convert USD to ILS', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 5, baseYear, inflationRate, exchangeRates, '₪'
      );
      
      // 10000 * (1.03)^5 * 3.6 ≈ 41733.87
      expect(result.amount).toBeCloseTo(41733.87, 1);
      expect(result.currency).toBe('₪');
    });

    test('should inflate and convert ILS to USD', () => {
      const result = calculateInflatedAmount(
        36000, '₪', baseYear + 5, baseYear, inflationRate, exchangeRates, '$'
      );
      
      // 36000 * (1.03)^5 / 3.6 ≈ 11592.74
      expect(result.amount).toBeCloseTo(11592.74, 1);
      expect(result.currency).toBe('$');
    });

    test('should handle same currency (no conversion)', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 3, baseYear, inflationRate, exchangeRates, '$'
      );
      
      // 10000 * (1.03)^3 ≈ 10927.27
      expect(result.amount).toBeCloseTo(10927.27, 1);
      expect(result.currency).toBe('$');
    });

    test('should handle zero inflation rate', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 10, baseYear, 0, exchangeRates, '$'
      );
      
      expect(result.amount).toBe(10000);
    });

    test('should handle high inflation rate', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 5, baseYear, 10, exchangeRates, '$'
      );
      
      // 10000 * (1.10)^5 ≈ 16105.10
      expect(result.amount).toBeCloseTo(16105.10, 1);
    });
  });

  describe('Expense Repetitions', () => {
    test('should calculate single expense without repetitions', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      expect(total).toBeCloseTo(10000, 1);
    });

    test('should calculate annual expense with multiple repetitions', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear;
      expense.frequencyYears = 1; // Annual
      expense.repetitionCount = 3; // 3 years
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Year 0: 10000
      // Year 1: 10000 * 1.03 = 10300
      // Year 2: 10000 * 1.03^2 = 10609
      // Total: 30909
      expect(total).toBeCloseTo(30909, 0);
    });

    test('should calculate biennial expense with repetitions', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear;
      expense.frequencyYears = 2; // Every 2 years
      expense.repetitionCount = 3; // 3 occurrences
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Year 0: 10000
      // Year 2: 10000 * 1.03^2 = 10609
      // Year 4: 10000 * 1.03^4 = 11255.09
      // Total: 31864.09
      expect(total).toBeCloseTo(31864, 0);
    });

    test('should calculate expense with currency conversion', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 2;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '₪', true
      );
      
      // Year 0: 10000 * 3.6 = 36000
      // Year 1: 10000 * 1.03 * 3.6 = 37080
      // Total: 73080
      expect(total).toBeCloseTo(73080, 0);
    });

    test('should handle expense starting in future year', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear + 5; // Starts 5 years from now
      expense.frequencyYears = 1;
      expense.repetitionCount = 2;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Year 5: 10000 * 1.03^5 = 11592.74
      // Year 6: 10000 * 1.03^6 = 11940.52
      // Total: 23533.26
      expect(total).toBeCloseTo(23533, 0);
    });

    test('should handle zero repetition count', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 0; // Edge case
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Implementation treats 0 as 1 (defensive programming)
      expect(total).toBeCloseTo(10000, 1);
    });
  });

  describe('Complex Scenarios', () => {
    test('should calculate multiple expenses total', () => {
      const expense1 = createExpense(1);
      expense1.netAmount = Money.usd(5000);
      expense1.year = baseYear;
      expense1.frequencyYears = 1;
      expense1.repetitionCount = 1;
      
      const expense2 = createExpense(2);
      expense2.netAmount = Money.usd(10000);
      expense2.year = baseYear;
      expense2.frequencyYears = 1;
      expense2.repetitionCount = 1;
      
      const total1 = calculateTotalExpenseWithRepetitions(
        expense1, baseYear, inflationRate, exchangeRates, '$', false
      );
      const total2 = calculateTotalExpenseWithRepetitions(
        expense2, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      expect(total1 + total2).toBeCloseTo(15000, 1);
    });

    test('should handle mixed currency expenses', () => {
      const expenseUSD = createExpense(1);
      expenseUSD.netAmount = Money.usd(10000);
      expenseUSD.year = baseYear;
      expenseUSD.frequencyYears = 1;
      expenseUSD.repetitionCount = 1;
      
      const expenseILS = createExpense(2);
      expenseILS.netAmount = Money.ils(36000);
      expenseILS.year = baseYear;
      expenseILS.frequencyYears = 1;
      expenseILS.repetitionCount = 1;
      
      const totalUSD1 = calculateTotalExpenseWithRepetitions(
        expenseUSD, baseYear, inflationRate, exchangeRates, '$', false
      );
      const totalUSD2 = calculateTotalExpenseWithRepetitions(
        expenseILS, baseYear, inflationRate, exchangeRates, '$', true
      );
      
      // Both should be 10000 USD
      expect(totalUSD1).toBeCloseTo(10000, 1);
      expect(totalUSD2).toBeCloseTo(10000, 1);
      expect(totalUSD1 + totalUSD2).toBeCloseTo(20000, 1);
    });

    test('should handle large number of repetitions', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(1000);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 30; // 30 years
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Sum of geometric series: 1000 * (1 - 1.03^30) / (1 - 1.03)
      // ≈ 1000 * 47.575 ≈ 47575
      expect(total).toBeCloseTo(47575, 0);
    });

    test('should handle infrequent expenses', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(50000);
      expense.year = baseYear;
      expense.frequencyYears = 5; // Every 5 years
      expense.repetitionCount = 4; // 4 occurrences over 15 years
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      // Year 0: 50000
      // Year 5: 50000 * 1.03^5 = 57963.71
      // Year 10: 50000 * 1.03^10 = 67195.82
      // Year 15: 50000 * 1.03^15 = 77898.34
      // Total: 253057.87
      expect(total).toBeCloseTo(253058, 0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero amount expense', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(0);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 5;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      expect(total).toBe(0);
    });

    test('should handle very high inflation rate', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear + 10, baseYear, 50, exchangeRates, '$'
      );
      
      // 10000 * (1.50)^10 ≈ 576,650.39
      expect(result.amount).toBeCloseTo(576650.39, 1);
    });

    test('should handle negative year difference gracefully', () => {
      const result = calculateInflatedAmount(
        10000, '$', baseYear - 10, baseYear, inflationRate, exchangeRates, '$'
      );
      
      // Should not deflate, just return base amount
      expect(result.amount).toBe(10000);
    });

    test('should handle very small amounts', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(0.01);
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 3;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      expect(total).toBeCloseTo(0.03, 2);
    });

    test('should handle very large amounts', () => {
      const expense = createExpense();
      expense.netAmount = Money.usd(10000000); // 10 million
      expense.year = baseYear;
      expense.frequencyYears = 1;
      expense.repetitionCount = 1;
      
      const total = calculateTotalExpenseWithRepetitions(
        expense, baseYear, inflationRate, exchangeRates, '$', false
      );
      
      expect(total).toBe(10000000);
    });
  });
});
