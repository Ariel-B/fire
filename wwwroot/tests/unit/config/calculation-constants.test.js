/**
 * Calculation Constants Unit Tests
 * Tests for CALCULATION_CONFIG constants, functional helpers:
 * getBaseYear, calculateYearsFromBase, applyInflation, calculateSafeProfitRatio
 */

import {
  CALCULATION_CONFIG,
  TWO_MONTHS_IN_SECONDS,
  getBaseYear,
  calculateYearsFromBase,
  applyInflation,
  calculateSafeProfitRatio
} from '../../../js/config/calculation-constants.js';

// ============================================================================
// CALCULATION_CONFIG shape & defaults
// ============================================================================

describe('CALCULATION_CONFIG', () => {
  test('is a non-null object', () => {
    expect(CALCULATION_CONFIG).toBeDefined();
    expect(typeof CALCULATION_CONFIG).toBe('object');
    expect(CALCULATION_CONFIG).not.toBeNull();
  });

  describe('exchange rate', () => {
    test('DEFAULT_USD_ILS_RATE is 3.6', () => {
      expect(CALCULATION_CONFIG.DEFAULT_USD_ILS_RATE).toBe(3.6);
    });
  });

  describe('tax defaults', () => {
    test('DEFAULT_CAPITAL_GAINS_TAX is 25', () => {
      expect(CALCULATION_CONFIG.DEFAULT_CAPITAL_GAINS_TAX).toBe(25);
    });

    test('DEFAULT_STOCK_RETURN is a number', () => {
      expect(typeof CALCULATION_CONFIG.DEFAULT_STOCK_RETURN).toBe('number');
      expect(CALCULATION_CONFIG.DEFAULT_STOCK_RETURN).toBeGreaterThan(0);
    });
  });

  describe('withdrawal default', () => {
    test('DEFAULT_WITHDRAWAL_RATE is 4', () => {
      expect(CALCULATION_CONFIG.DEFAULT_WITHDRAWAL_RATE).toBe(4);
    });
  });

  describe('supported currencies', () => {
    test('SUPPORTED_CURRENCIES contains $', () => {
      expect(CALCULATION_CONFIG.SUPPORTED_CURRENCIES).toContain('$');
    });

    test('SUPPORTED_CURRENCIES contains ₪', () => {
      expect(CALCULATION_CONFIG.SUPPORTED_CURRENCIES).toContain('₪');
    });
  });

  describe('validation range constants', () => {
    test('MIN_BIRTH_YEAR is a valid year', () => {
      expect(CALCULATION_CONFIG.MIN_BIRTH_YEAR).toBe(1900);
    });

    test('MAX_RETIREMENT_AGE is 150', () => {
      expect(CALCULATION_CONFIG.MAX_RETIREMENT_AGE).toBe(150);
    });

    test('MIN_PORTFOLIO_VALUE is 0', () => {
      expect(CALCULATION_CONFIG.MIN_PORTFOLIO_VALUE).toBe(0);
    });

    test('MIN_PROFIT_RATIO is 0', () => {
      expect(CALCULATION_CONFIG.MIN_PROFIT_RATIO).toBe(0);
    });

    test('MAX_PROFIT_RATIO is 1', () => {
      expect(CALCULATION_CONFIG.MAX_PROFIT_RATIO).toBe(1);
    });

    test('DEFAULT_INFLATION_RATE is 2', () => {
      expect(CALCULATION_CONFIG.DEFAULT_INFLATION_RATE).toBe(2.0);
    });
  });
});

// ============================================================================
// TWO_MONTHS_IN_SECONDS
// ============================================================================

describe('TWO_MONTHS_IN_SECONDS', () => {
  test('equals 60 days in seconds (5,184,000)', () => {
    // 2 months approximated as 60 days: 60 * 24 * 60 * 60
    expect(TWO_MONTHS_IN_SECONDS).toBe(60 * 24 * 60 * 60);
  });

  test('is a positive number', () => {
    expect(TWO_MONTHS_IN_SECONDS).toBeGreaterThan(0);
  });
});

// ============================================================================
// getBaseYear
// ============================================================================

describe('getBaseYear', () => {
  test('returns the current year', () => {
    expect(getBaseYear()).toBe(new Date().getFullYear());
  });

  test('returns an integer', () => {
    expect(Number.isInteger(getBaseYear())).toBe(true);
  });

  test('returns a plausible year (2020-2100)', () => {
    const year = getBaseYear();
    expect(year).toBeGreaterThanOrEqual(2020);
    expect(year).toBeLessThan(2100);
  });
});

// ============================================================================
// calculateYearsFromBase
// ============================================================================

describe('calculateYearsFromBase', () => {
  test('returns 0 for current year', () => {
    expect(calculateYearsFromBase(new Date().getFullYear())).toBe(0);
  });

  test('returns positive value for future year', () => {
    const futureYear = new Date().getFullYear() + 10;
    expect(calculateYearsFromBase(futureYear)).toBe(10);
  });

  test('returns negative value for past year', () => {
    const pastYear = new Date().getFullYear() - 5;
    expect(calculateYearsFromBase(pastYear)).toBe(-5);
  });

  test('returns exact difference', () => {
    const year = new Date().getFullYear() + 25;
    expect(calculateYearsFromBase(year)).toBe(25);
  });
});

// ============================================================================
// applyInflation
// ============================================================================

describe('applyInflation', () => {
  test('returns original amount for 0 years', () => {
    expect(applyInflation(1000, 0, 0.03)).toBe(1000);
  });

  test('inflates amount for 1 year at 3%', () => {
    expect(applyInflation(1000, 1, 0.03)).toBeCloseTo(1030, 2);
  });

  test('inflates amount for 10 years at 3%', () => {
    // 1000 * 1.03^10 ≈ 1343.92
    expect(applyInflation(1000, 10, 0.03)).toBeCloseTo(1343.92, 1);
  });

  test('returns 0 for 0 initial amount', () => {
    expect(applyInflation(0, 10, 0.03)).toBe(0);
  });

  test('handles zero inflation rate (no change)', () => {
    expect(applyInflation(1000, 5, 0)).toBe(1000);
  });

  test('handles fractional years', () => {
    const result = applyInflation(1000, 0.5, 0.04);
    expect(result).toBeGreaterThan(1000);
    expect(result).toBeLessThan(1040);
  });

  test('handles high inflation rate', () => {
    // 1000 at 100% inflation for 1 year = 2000
    expect(applyInflation(1000, 1, 1.0)).toBeCloseTo(2000, 1);
  });
});

// ============================================================================
// calculateSafeProfitRatio
// ============================================================================

describe('calculateSafeProfitRatio', () => {
  test('returns ratio of profit for normal inputs', () => {
    // portfolioValue=1000, costBasis=500 → profit=500 → ratio=0.5
    const ratio = calculateSafeProfitRatio(1000, 500);
    expect(ratio).toBeCloseTo(0.5, 5);
  });

  test('returns MIN_PROFIT_RATIO (0) when costBasis is 0', () => {
    // costBasis <= 0 guard returns MIN_PROFIT_RATIO
    const ratio = calculateSafeProfitRatio(1000, 0);
    expect(ratio).toBe(0);
  });

  test('returns 0 when portfolio equals cost basis (no profit)', () => {
    const ratio = calculateSafeProfitRatio(1000, 1000);
    expect(ratio).toBe(0);
  });

  test('returns 0 when cost basis exceeds portfolio value', () => {
    const ratio = calculateSafeProfitRatio(500, 1000);
    expect(ratio).toBe(0);
  });

  test('returns MIN_PROFIT_RATIO for zero portfolioValue', () => {
    const ratio = calculateSafeProfitRatio(0, 500);
    expect(ratio).toBeGreaterThanOrEqual(0);
  });

  test('returns MIN_PROFIT_RATIO for negative portfolioValue', () => {
    const ratio = calculateSafeProfitRatio(-100, 500);
    expect(ratio).toBeGreaterThanOrEqual(0);
  });

  test('result is always between 0 and 1', () => {
    const cases = [
      [10000, 5000],
      [5000, 4000],
      [1000000, 100],
      [100, 99],
    ];
    for (const [portfolio, cost] of cases) {
      const r = calculateSafeProfitRatio(portfolio, cost);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    }
  });
});
