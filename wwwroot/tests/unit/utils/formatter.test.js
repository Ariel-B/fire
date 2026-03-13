/**
 * Formatter Utility Unit Tests
 * Tests for number and currency formatting functions
 */

import {
  formatCurrency,
  safeFormatCurrency,
  formatPercentage,
  formatCompactNumber,
  formatCompactCurrency,
  formatNumber,
  parseFormattedNumber,
  formatMoney,
  safeFormatMoney,
  formatCompactMoney,
  formatMoneyForInput
} from '../../../js/utils/formatter.js';

describe('Formatter Utilities', () => {
  // ============================================================================
  // formatCurrency
  // ============================================================================

  describe('formatCurrency', () => {
    describe('USD formatting', () => {
      test('formats positive amount correctly', () => {
        const result = formatCurrency(1234.56, '$');
        // Default is 0 fraction digits, so 1234.56 rounds to 1235
        expect(result).toMatch(/\$.*1,?235/);
      });

      test('formats large amount with thousand separators', () => {
        const result = formatCurrency(1000000, '$');
        expect(result).toMatch(/\$.*1,?000,?000/);
      });

      test('formats zero amount', () => {
        const result = formatCurrency(0, '$');
        expect(result).toMatch(/\$.*0/);
      });

      test('formats negative amount', () => {
        const result = formatCurrency(-500, '$');
        expect(result).toMatch(/[-−]\$?500|\$.*-?500/);
      });
    });

    describe('ILS formatting', () => {
      test('formats positive amount in ILS', () => {
        const result = formatCurrency(1234.56, '₪');
        expect(result).toMatch(/₪|1,?234/);
      });

      test('formats large ILS amount', () => {
        const result = formatCurrency(1000000, '₪');
        expect(result).toMatch(/₪|1,?000,?000/);
      });
    });

    describe('edge cases', () => {
      test('handles null amount', () => {
        const result = formatCurrency(null, '$');
        expect(result).toBe('$0');
      });

      test('handles undefined amount', () => {
        const result = formatCurrency(undefined, '$');
        expect(result).toBe('$0');
      });

      test('handles NaN amount', () => {
        const result = formatCurrency(NaN, '$');
        expect(result).toBe('$0');
      });

      test('handles NaN for ILS', () => {
        const result = formatCurrency(NaN, '₪');
        expect(result).toBe('₪0');
      });
    });

    describe('fraction digits options', () => {
      test('respects minimumFractionDigits', () => {
        // Must also set maximumFractionDigits >= minimumFractionDigits
        const result = formatCurrency(100, '$', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        expect(result).toMatch(/\$.*100\.00/);
      });

      test('respects maximumFractionDigits', () => {
        const result = formatCurrency(100.999, '$', { maximumFractionDigits: 2 });
        expect(result).toMatch(/\$.*101/);
      });
    });
  });

  // ============================================================================
  // safeFormatCurrency
  // ============================================================================

  describe('safeFormatCurrency', () => {
    test('formats valid USD amount', () => {
      const result = safeFormatCurrency(1000, '$');
      expect(result).toMatch(/\$.*1,?000/);
    });

    test('formats valid ILS amount', () => {
      const result = safeFormatCurrency(1000, '₪');
      expect(result).toMatch(/₪|1,?000/);
    });

    test('returns $0 for null USD', () => {
      const result = safeFormatCurrency(null, '$');
      expect(result).toBe('$0');
    });

    test('returns ₪0 for null ILS', () => {
      const result = safeFormatCurrency(null, '₪');
      expect(result).toBe('₪0');
    });

    test('returns $0 for undefined USD', () => {
      const result = safeFormatCurrency(undefined, '$');
      expect(result).toBe('$0');
    });

    test('returns ₪0 for undefined ILS', () => {
      const result = safeFormatCurrency(undefined, '₪');
      expect(result).toBe('₪0');
    });

    test('handles NaN for USD', () => {
      const result = safeFormatCurrency(NaN, '$');
      expect(result).toBe('$0');
    });

    test('handles NaN for ILS', () => {
      const result = safeFormatCurrency(NaN, '₪');
      expect(result).toBe('₪0');
    });
  });

  // ============================================================================
  // formatPercentage
  // ============================================================================

  describe('formatPercentage', () => {
    test('formats positive percentage', () => {
      const result = formatPercentage(25.5);
      expect(result).toBe('25.50%');
    });

    test('formats zero percentage', () => {
      const result = formatPercentage(0);
      expect(result).toBe('0.00%');
    });

    test('formats negative percentage', () => {
      const result = formatPercentage(-10.5);
      expect(result).toBe('-10.50%');
    });

    test('formats percentage with custom fraction digits', () => {
      const result = formatPercentage(33.333, { maximumFractionDigits: 1 });
      expect(result).toBe('33.3%');
    });

    test('returns 0% for null', () => {
      const result = formatPercentage(null);
      expect(result).toBe('0%');
    });

    test('returns 0% for undefined', () => {
      const result = formatPercentage(undefined);
      expect(result).toBe('0%');
    });

    test('returns 0% for NaN', () => {
      const result = formatPercentage(NaN);
      expect(result).toBe('0%');
    });
  });

  // ============================================================================
  // formatCompactNumber
  // ============================================================================

  describe('formatCompactNumber', () => {
    describe('millions', () => {
      test('formats 1 million', () => {
        const result = formatCompactNumber(1000000);
        expect(result).toBe('1.0M');
      });

      test('formats 1.5 million', () => {
        const result = formatCompactNumber(1500000);
        expect(result).toBe('1.5M');
      });

      test('formats 10 million', () => {
        const result = formatCompactNumber(10000000);
        expect(result).toBe('10.0M');
      });
    });

    describe('thousands', () => {
      test('formats 1 thousand', () => {
        const result = formatCompactNumber(1000);
        expect(result).toBe('1.0K');
      });

      test('formats 250 thousand', () => {
        const result = formatCompactNumber(250000);
        expect(result).toBe('250.0K');
      });

      test('formats 999 thousand', () => {
        const result = formatCompactNumber(999000);
        expect(result).toBe('999.0K');
      });
    });

    describe('small numbers', () => {
      test('formats numbers under 1000', () => {
        const result = formatCompactNumber(500);
        expect(result).toBe('500');
      });

      test('formats zero', () => {
        const result = formatCompactNumber(0);
        expect(result).toBe('0');
      });

      test('formats small decimals', () => {
        const result = formatCompactNumber(123.456);
        expect(result).toBe('123');
      });
    });

    describe('negative numbers', () => {
      test('formats negative million', () => {
        const result = formatCompactNumber(-1500000);
        expect(result).toBe('-1.5M');
      });

      test('formats negative thousand', () => {
        const result = formatCompactNumber(-50000);
        expect(result).toBe('-50.0K');
      });

      test('formats negative small number', () => {
        const result = formatCompactNumber(-500);
        expect(result).toBe('-500');
      });
    });

    describe('edge cases', () => {
      test('returns 0 for null', () => {
        const result = formatCompactNumber(null);
        expect(result).toBe('0');
      });

      test('returns 0 for undefined', () => {
        const result = formatCompactNumber(undefined);
        expect(result).toBe('0');
      });

      test('returns 0 for NaN', () => {
        const result = formatCompactNumber(NaN);
        expect(result).toBe('0');
      });
    });
  });

  // ============================================================================
  // formatNumber
  // ============================================================================

  describe('formatNumber', () => {
    test('formats number with thousand separators', () => {
      const result = formatNumber(1234567);
      expect(result).toBe('1,234,567');
    });

    test('formats zero', () => {
      const result = formatNumber(0);
      expect(result).toBe('0');
    });

    test('formats decimal number', () => {
      const result = formatNumber(1234.56, { minimumFractionDigits: 2 });
      expect(result).toBe('1,234.56');
    });

    test('respects maximumFractionDigits', () => {
      const result = formatNumber(1234.5678, { maximumFractionDigits: 2 });
      expect(result).toBe('1,234.57');
    });

    test('returns 0 for null', () => {
      const result = formatNumber(null);
      expect(result).toBe('0');
    });

    test('returns 0 for undefined', () => {
      const result = formatNumber(undefined);
      expect(result).toBe('0');
    });

    test('returns 0 for NaN', () => {
      const result = formatNumber(NaN);
      expect(result).toBe('0');
    });
  });

  // ============================================================================
  // parseFormattedNumber
  // ============================================================================

  describe('parseFormattedNumber', () => {
    test('parses plain number string', () => {
      const result = parseFormattedNumber('1234');
      expect(result).toBe(1234);
    });

    test('parses number with commas', () => {
      const result = parseFormattedNumber('1,234,567');
      expect(result).toBe(1234567);
    });

    test('parses USD formatted number', () => {
      const result = parseFormattedNumber('$1,234.56');
      expect(result).toBe(1234.56);
    });

    test('parses ILS formatted number', () => {
      const result = parseFormattedNumber('₪1,234.56');
      expect(result).toBe(1234.56);
    });

    test('parses number with spaces', () => {
      const result = parseFormattedNumber('$ 1,234');
      expect(result).toBe(1234);
    });

    test('parses negative number', () => {
      const result = parseFormattedNumber('-1,234');
      expect(result).toBe(-1234);
    });

    test('parses decimal number', () => {
      const result = parseFormattedNumber('1234.56');
      expect(result).toBe(1234.56);
    });

    test('returns 0 for empty string', () => {
      const result = parseFormattedNumber('');
      expect(result).toBe(0);
    });

    test('returns 0 for null', () => {
      const result = parseFormattedNumber(null);
      expect(result).toBe(0);
    });

  });

  // ============================================================================
  // formatCompactCurrency (legacy)
  // ============================================================================

  describe('formatCompactCurrency', () => {
    test('formats millions with M suffix (USD)', () => {
      expect(formatCompactCurrency(1_500_000, '$')).toBe('$1.5M');
    });

    test('formats thousands with K suffix (USD)', () => {
      expect(formatCompactCurrency(250_000, '$')).toBe('$250K');
    });

    test('formats billions with B suffix (ILS)', () => {
      expect(formatCompactCurrency(2_000_000_000, '₪')).toBe('₪2B');
    });

    test('formats negative values', () => {
      expect(formatCompactCurrency(-500_000, '$')).toBe('-$500K');
    });

    test('returns $0 for null', () => {
      expect(formatCompactCurrency(null, '$')).toBe('$0');
    });

    test('returns ₪0 for undefined with ILS', () => {
      expect(formatCompactCurrency(undefined, '₪')).toBe('₪0');
    });

    test('returns ₪0 for NaN with ILS', () => {
      expect(formatCompactCurrency(NaN, '₪')).toBe('₪0');
    });

    test('formats small amounts without suffix', () => {
      const result = formatCompactCurrency(500, '$');
      expect(result).toMatch(/\$.*500/);
    });
  });

  // ============================================================================
  // formatMoney
  // ============================================================================

  describe('formatMoney', () => {
    test('formats USD Money value', () => {
      const result = formatMoney({ amount: 1234, currency: 'USD' });
      expect(result).toMatch(/\$.*1,?234/);
    });

    test('formats ILS Money value', () => {
      const result = formatMoney({ amount: 5000, currency: 'ILS' });
      expect(result).toMatch(/₪|5,?000/);
    });

    test('formats zero USD', () => {
      const result = formatMoney({ amount: 0, currency: 'USD' });
      expect(result).toMatch(/\$.*0/);
    });

    test('respects minimumFractionDigits option', () => {
      const result = formatMoney({ amount: 1000, currency: 'USD' }, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      expect(result).toMatch(/1,?000\.00/);
    });

    test('handles NaN amount gracefully', () => {
      const result = formatMoney({ amount: NaN, currency: 'USD' });
      expect(result).toBe('$0');
    });

    test('handles NaN ILS amount gracefully', () => {
      const result = formatMoney({ amount: NaN, currency: 'ILS' });
      expect(result).toBe('₪0');
    });
  });

  // ============================================================================
  // safeFormatMoney
  // ============================================================================

  describe('safeFormatMoney', () => {
    test('formats valid Money', () => {
      const result = safeFormatMoney({ amount: 500, currency: 'USD' });
      expect(result).toMatch(/\$.*500/);
    });

    test('returns $0 for null', () => {
      expect(safeFormatMoney(null)).toBe('$0');
    });

    test('returns $0 for undefined', () => {
      expect(safeFormatMoney(undefined)).toBe('$0');
    });

    test('returns $0 for Money with NaN amount', () => {
      expect(safeFormatMoney({ amount: NaN, currency: 'USD' })).toBe('$0');
    });
  });

  // ============================================================================
  // formatCompactMoney
  // ============================================================================

  describe('formatCompactMoney', () => {
    test('formats millions for USD', () => {
      expect(formatCompactMoney({ amount: 1_500_000, currency: 'USD' })).toBe('$1.5M');
    });

    test('formats thousands for ILS', () => {
      expect(formatCompactMoney({ amount: 250_000, currency: 'ILS' })).toBe('₪250K');
    });

    test('formats billions', () => {
      expect(formatCompactMoney({ amount: 3_000_000_000, currency: 'USD' })).toBe('$3B');
    });

    test('formats negative millions', () => {
      expect(formatCompactMoney({ amount: -2_000_000, currency: 'USD' })).toBe('-$2M');
    });

    test('returns $0 for null', () => {
      expect(formatCompactMoney(null)).toBe('$0');
    });

    test('returns $0 for undefined', () => {
      expect(formatCompactMoney(undefined)).toBe('$0');
    });

    test('returns $0 for Money with NaN amount', () => {
      expect(formatCompactMoney({ amount: NaN, currency: 'USD' })).toBe('$0');
    });

    test('formats small amounts without suffix', () => {
      const result = formatCompactMoney({ amount: 999, currency: 'USD' });
      expect(result).toMatch(/\$.*999/);
    });
  });

  // ============================================================================
  // formatMoneyForInput
  // ============================================================================

  describe('formatMoneyForInput', () => {
    test('formats USD without currency symbol', () => {
      expect(formatMoneyForInput({ amount: 1234.56, currency: 'USD' })).toBe('1,234.56');
    });

    test('formats ILS without currency symbol', () => {
      expect(formatMoneyForInput({ amount: 5000, currency: 'ILS' })).toBe('5,000.00');
    });

    test('includes two decimal places', () => {
      expect(formatMoneyForInput({ amount: 1000, currency: 'USD' })).toBe('1,000.00');
    });

    test('returns 0 for null', () => {
      expect(formatMoneyForInput(null)).toBe('0');
    });

    test('returns 0 for undefined', () => {
      expect(formatMoneyForInput(undefined)).toBe('0');
    });

    test('returns 0 for NaN amount', () => {
      const result = formatMoneyForInput({ amount: NaN, currency: 'USD' });
      expect(result).toBe('0');
    });
  });

  // ============================================================================
  // Catch block coverage: Intl.NumberFormat failures
  // ============================================================================

  describe('formatCurrency catch block', () => {
    let originalNumberFormat;

    beforeEach(() => {
      originalNumberFormat = Intl.NumberFormat;
    });

    afterEach(() => {
      Intl.NumberFormat = originalNumberFormat;
    });

    test('falls back gracefully when Intl.NumberFormat throws (USD)', () => {
      // Make Intl.NumberFormat throw to exercise the catch fallback
      Intl.NumberFormat = function() { throw new Error('Intl unavailable'); };

      const result = formatCurrency(1234, '$');
      // Fallback uses toLocaleString which still formats with separators
      expect(result).toMatch(/\$.*1.?234/);
    });

    test('falls back gracefully when Intl.NumberFormat throws (ILS)', () => {
      Intl.NumberFormat = function() { throw new Error('Intl unavailable'); };

      const result = formatCurrency(5678, '₪');
      expect(result).toMatch(/₪.*5.?678/);
    });
  });

  describe('formatMoney catch block', () => {
    let originalNumberFormat;

    beforeEach(() => {
      originalNumberFormat = Intl.NumberFormat;
    });

    afterEach(() => {
      Intl.NumberFormat = originalNumberFormat;
    });

    test('falls back to plain number when Intl.NumberFormat throws for Money', () => {
      Intl.NumberFormat = function() { throw new Error('Intl unavailable'); };

      const result = formatMoney({ amount: 999, currency: 'USD' });
      expect(result).toBe('$999');
    });

    test('falls back gracefully for ILS Money when Intl.NumberFormat throws', () => {
      Intl.NumberFormat = function() { throw new Error('Intl unavailable'); };

      const result = formatMoney({ amount: 1500, currency: 'ILS' });
      expect(result).toMatch(/₪.*1.?500/);
    });
  });
});
