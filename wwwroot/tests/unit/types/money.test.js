/**
 * Money Type Unit Tests
 * Tests for Money value object, MoneyMath, MoneyConversion, MoneyDisplay,
 * and utility functions: toMoney, fromMoney, normalizeCurrency, getCurrencySymbol,
 * isSupportedCurrency, getSupportedCurrencies, getSupportedSymbols
 */

import {
  Money,
  MoneyMath,
  MoneyConversion,
  MoneyDisplay,
  normalizeCurrency,
  getCurrencySymbol,
  isSupportedCurrency,
  getSupportedCurrencies,
  getSupportedSymbols,
  toMoney,
  fromMoney
} from '../../../js/types/money.js';

// Simple mock converter for MoneyConversion tests
function makeConverter(usdIlsRate) {
  return {
    convert(money, targetCurrency) {
      const targetCode = targetCurrency === '₪' ? 'ILS' : targetCurrency === '$' ? 'USD' : targetCurrency;
      if (money.currency === targetCode) return money;
      if (money.currency === 'USD' && targetCode === 'ILS') return { amount: money.amount * usdIlsRate, currency: 'ILS' };
      if (money.currency === 'ILS' && targetCode === 'USD') return { amount: money.amount / usdIlsRate, currency: 'USD' };
      throw new Error(`Unsupported: ${money.currency} -> ${targetCode}`);
    },
    getRate(from, to) {
      const f = from === '$' ? 'USD' : from === '₪' ? 'ILS' : from;
      const t = to === '$' ? 'USD' : to === '₪' ? 'ILS' : to;
      if (f === t) return 1;
      if (f === 'USD' && t === 'ILS') return usdIlsRate;
      return 1 / usdIlsRate;
    }
  };
}

// ============================================================================
// Money factory
// ============================================================================

describe('Money factory', () => {
  describe('Money.usd', () => {
    test('creates USD Money', () => {
      const m = Money.usd(100);
      expect(m.amount).toBe(100);
      expect(m.currency).toBe('USD');
    });

    test('creates Money with zero', () => {
      const m = Money.usd(0);
      expect(m.amount).toBe(0);
    });

    test('creates Money with negative amount', () => {
      const m = Money.usd(-50);
      expect(m.amount).toBe(-50);
    });
  });

  describe('Money.ils', () => {
    test('creates ILS Money', () => {
      const m = Money.ils(360);
      expect(m.amount).toBe(360);
      expect(m.currency).toBe('ILS');
    });
  });

  describe('Money.create', () => {
    test('creates USD from ISO code', () => {
      const m = Money.create(100, 'USD');
      expect(m.currency).toBe('USD');
    });

    test('creates ILS from ISO code', () => {
      const m = Money.create(360, 'ILS');
      expect(m.currency).toBe('ILS');
    });

    test('creates USD from $ symbol', () => {
      const m = Money.create(100, '$');
      expect(m.currency).toBe('USD');
    });

    test('creates ILS from ₪ symbol', () => {
      const m = Money.create(360, '₪');
      expect(m.currency).toBe('ILS');
    });

    test('falls back to USD for unsupported currency', () => {
      // normalizeCurrency defaults unknowns to USD
      const m = Money.create(100, 'EUR');
      expect(m.currency).toBe('USD');
    });
  });

  describe('Money.zero', () => {
    test('creates zero USD', () => {
      const m = Money.zero('USD');
      expect(m.amount).toBe(0);
      expect(m.currency).toBe('USD');
    });

    test('creates zero ILS', () => {
      const m = Money.zero('ILS');
      expect(m.amount).toBe(0);
      expect(m.currency).toBe('ILS');
    });
  });

  describe('Money.isMoney', () => {
    test('returns true for valid Money', () => {
      expect(Money.isMoney({ amount: 100, currency: 'USD' })).toBe(true);
    });

    test('returns false for missing currency', () => {
      expect(Money.isMoney({ amount: 100 })).toBe(false);
    });

    test('returns false for unsupported currency', () => {
      expect(Money.isMoney({ amount: 100, currency: 'EUR' })).toBe(false);
    });

    test('returns falsy for null', () => {
      expect(Money.isMoney(null)).toBeFalsy();
    });

    test('returns false for non-object', () => {
      expect(Money.isMoney(42)).toBe(false);
    });
  });
});

// ============================================================================
// MoneyMath
// ============================================================================

describe('MoneyMath', () => {
  describe('add (already tested elsewhere - basic smoke)', () => {
    test('adds same-currency values', () => {
      const result = MoneyMath.add(Money.usd(100), Money.usd(50));
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.add(Money.usd(100), Money.ils(50))).toThrow();
    });
  });

  describe('subtract', () => {
    test('subtracts same-currency values', () => {
      const result = MoneyMath.subtract(Money.usd(100), Money.usd(30));
      expect(result.amount).toBe(70);
      expect(result.currency).toBe('USD');
    });

    test('returns negative result when b > a', () => {
      const result = MoneyMath.subtract(Money.usd(30), Money.usd(100));
      expect(result.amount).toBe(-70);
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.subtract(Money.usd(100), Money.ils(30))).toThrow();
    });
  });

  describe('multiply', () => {
    test('multiplies by positive scalar', () => {
      const result = MoneyMath.multiply(Money.usd(100), 3);
      expect(result.amount).toBe(300);
      expect(result.currency).toBe('USD');
    });

    test('multiplies by zero', () => {
      const result = MoneyMath.multiply(Money.usd(100), 0);
      expect(result.amount).toBe(0);
    });

    test('multiplies by fractional scalar', () => {
      const result = MoneyMath.multiply(Money.usd(100), 0.5);
      expect(result.amount).toBeCloseTo(50);
    });

    test('multiplies by negative scalar', () => {
      const result = MoneyMath.multiply(Money.usd(100), -1);
      expect(result.amount).toBe(-100);
    });

    test('preserves currency', () => {
      const result = MoneyMath.multiply(Money.ils(360), 2);
      expect(result.currency).toBe('ILS');
    });
  });

  describe('divide', () => {
    test('divides by positive scalar', () => {
      const result = MoneyMath.divide(Money.usd(100), 4);
      expect(result.amount).toBeCloseTo(25);
      expect(result.currency).toBe('USD');
    });

    test('throws when dividing by zero', () => {
      expect(() => MoneyMath.divide(Money.usd(100), 0)).toThrow('Cannot divide Money by zero');
    });

    test('preserves currency', () => {
      const result = MoneyMath.divide(Money.ils(360), 2);
      expect(result.currency).toBe('ILS');
    });
  });

  describe('greaterThan', () => {
    test('returns true when a > b', () => {
      expect(MoneyMath.greaterThan(Money.usd(200), Money.usd(100))).toBe(true);
    });

    test('returns false when a < b', () => {
      expect(MoneyMath.greaterThan(Money.usd(100), Money.usd(200))).toBe(false);
    });

    test('returns false when a === b', () => {
      expect(MoneyMath.greaterThan(Money.usd(100), Money.usd(100))).toBe(false);
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.greaterThan(Money.usd(100), Money.ils(100))).toThrow();
    });
  });

  describe('lessThan', () => {
    test('returns true when a < b', () => {
      expect(MoneyMath.lessThan(Money.usd(50), Money.usd(100))).toBe(true);
    });

    test('returns false when a > b', () => {
      expect(MoneyMath.lessThan(Money.usd(100), Money.usd(50))).toBe(false);
    });

    test('returns false when a === b', () => {
      expect(MoneyMath.lessThan(Money.usd(100), Money.usd(100))).toBe(false);
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.lessThan(Money.usd(100), Money.ils(100))).toThrow();
    });
  });

  describe('greaterThanOrEqual', () => {
    test('returns true when a > b', () => {
      expect(MoneyMath.greaterThanOrEqual(Money.usd(200), Money.usd(100))).toBe(true);
    });

    test('returns true when a === b', () => {
      expect(MoneyMath.greaterThanOrEqual(Money.usd(100), Money.usd(100))).toBe(true);
    });

    test('returns false when a < b', () => {
      expect(MoneyMath.greaterThanOrEqual(Money.usd(50), Money.usd(100))).toBe(false);
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.greaterThanOrEqual(Money.usd(100), Money.ils(100))).toThrow();
    });
  });

  describe('lessThanOrEqual', () => {
    test('returns true when a < b', () => {
      expect(MoneyMath.lessThanOrEqual(Money.usd(50), Money.usd(100))).toBe(true);
    });

    test('returns true when a === b', () => {
      expect(MoneyMath.lessThanOrEqual(Money.usd(100), Money.usd(100))).toBe(true);
    });

    test('returns false when a > b', () => {
      expect(MoneyMath.lessThanOrEqual(Money.usd(200), Money.usd(100))).toBe(false);
    });

    test('throws for different currencies', () => {
      expect(() => MoneyMath.lessThanOrEqual(Money.usd(100), Money.ils(100))).toThrow();
    });
  });

  describe('equals', () => {
    test('returns true for same amount and currency', () => {
      expect(MoneyMath.equals(Money.usd(100), Money.usd(100))).toBe(true);
    });

    test('returns false for different amounts', () => {
      expect(MoneyMath.equals(Money.usd(100), Money.usd(101))).toBe(false);
    });

    test('returns false for different currencies', () => {
      expect(MoneyMath.equals(Money.usd(100), Money.ils(100))).toBe(false);
    });

    test('uses tolerance for floating-point comparison', () => {
      expect(MoneyMath.equals(Money.usd(100), Money.usd(100.0001), 0.001)).toBe(true);
    });

    test('fails when outside tolerance', () => {
      expect(MoneyMath.equals(Money.usd(100), Money.usd(100.5), 0.1)).toBe(false);
    });
  });

  describe('abs', () => {
    test('returns absolute value of negative amount', () => {
      const result = MoneyMath.abs(Money.usd(-100));
      expect(result.amount).toBe(100);
    });

    test('returns same value for positive amount', () => {
      const result = MoneyMath.abs(Money.usd(100));
      expect(result.amount).toBe(100);
    });

    test('returns zero unchanged', () => {
      const result = MoneyMath.abs(Money.usd(0));
      expect(result.amount).toBe(0);
    });

    test('preserves currency', () => {
      expect(MoneyMath.abs(Money.ils(-360)).currency).toBe('ILS');
    });
  });

  describe('negate', () => {
    test('negates positive amount', () => {
      expect(MoneyMath.negate(Money.usd(100)).amount).toBe(-100);
    });

    test('negates negative amount', () => {
      expect(MoneyMath.negate(Money.usd(-100)).amount).toBe(100);
    });

    test('negates zero', () => {
      expect(MoneyMath.negate(Money.usd(0)).amount).toBe(-0);
    });

    test('preserves currency', () => {
      expect(MoneyMath.negate(Money.ils(360)).currency).toBe('ILS');
    });
  });

  describe('sum', () => {
    test('sums multiple values', () => {
      const result = MoneyMath.sum([Money.usd(100), Money.usd(200), Money.usd(50)]);
      expect(result.amount).toBe(350);
      expect(result.currency).toBe('USD');
    });

    test('returns zero for empty array (defaults to USD)', () => {
      const result = MoneyMath.sum([]);
      expect(result.amount).toBe(0);
      expect(result.currency).toBe('USD');
    });

    test('returns zero in specified currency for empty array', () => {
      const result = MoneyMath.sum([], 'ILS');
      expect(result.currency).toBe('ILS');
    });

    test('throws when currencies differ', () => {
      expect(() => MoneyMath.sum([Money.usd(100), Money.ils(200)])).toThrow();
    });

    test('uses targetCurrency to validate', () => {
      expect(() => MoneyMath.sum([Money.usd(100)], 'ILS')).toThrow();
    });

    test('sums single element', () => {
      const result = MoneyMath.sum([Money.usd(42)]);
      expect(result.amount).toBe(42);
    });
  });
});

// ============================================================================
// MoneyConversion
// ============================================================================

describe('MoneyConversion', () => {
  const converter = makeConverter(3.6);

  describe('convertTo', () => {
    test('converts USD to ILS via converter', () => {
      const result = MoneyConversion.convertTo(Money.usd(100), 'ILS', converter);
      expect(result.amount).toBeCloseTo(360);
      expect(result.currency).toBe('ILS');
    });

    test('converts ILS to USD via converter', () => {
      const result = MoneyConversion.convertTo(Money.ils(360), 'USD', converter);
      expect(result.amount).toBeCloseTo(100);
      expect(result.currency).toBe('USD');
    });
  });

  describe('toUsd', () => {
    test('converts ILS to USD', () => {
      const result = MoneyConversion.toUsd(Money.ils(360), converter);
      expect(result.amount).toBeCloseTo(100);
      expect(result.currency).toBe('USD');
    });

    test('no-op for USD', () => {
      const usd = Money.usd(100);
      const result = MoneyConversion.toUsd(usd, converter);
      expect(result).toEqual(usd);
    });
  });

  describe('toIls', () => {
    test('converts USD to ILS', () => {
      const result = MoneyConversion.toIls(Money.usd(100), converter);
      expect(result.amount).toBeCloseTo(360);
      expect(result.currency).toBe('ILS');
    });

    test('no-op for ILS', () => {
      const ils = Money.ils(360);
      const result = MoneyConversion.toIls(ils, converter);
      expect(result).toEqual(ils);
    });
  });

  describe('sumInCurrency', () => {
    test('sums same-currency values', () => {
      const result = MoneyConversion.sumInCurrency([Money.usd(100), Money.usd(50)], 'USD', converter);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe('USD');
    });

    test('converts mixed currencies before summing', () => {
      const result = MoneyConversion.sumInCurrency([Money.usd(100), Money.ils(360)], 'USD', converter);
      // 100 USD + 360 ILS (= 100 USD) = 200 USD
      expect(result.amount).toBeCloseTo(200);
    });

    test('returns zero in target currency for empty array', () => {
      const result = MoneyConversion.sumInCurrency([], 'ILS', converter);
      expect(result.amount).toBe(0);
      expect(result.currency).toBe('ILS');
    });
  });
});

// ============================================================================
// MoneyDisplay
// ============================================================================

describe('MoneyDisplay', () => {
  describe('format', () => {
    test('formats USD with symbol', () => {
      const result = MoneyDisplay.format(Money.usd(1234));
      expect(result).toMatch(/\$.*1,?234/);
    });

    test('formats ILS with symbol', () => {
      const result = MoneyDisplay.format(Money.ils(5000));
      expect(result).toMatch(/₪|5,?000/);
    });

    test('includes two decimal places by default', () => {
      const result = MoneyDisplay.format(Money.usd(1000));
      expect(result).toContain('1,000.00');
    });

    test('handles zero USD amount', () => {
      const result = MoneyDisplay.format(Money.usd(0));
      expect(result).toContain('0');
    });
  });

  describe('formatCompact', () => {
    test('formats large USD values compactly', () => {
      const result = MoneyDisplay.formatCompact(Money.usd(1_500_000));
      expect(result).toMatch(/\$.*1\.?5M?/);
    });

    test('formats large ILS values compactly', () => {
      const result = MoneyDisplay.formatCompact(Money.ils(500_000));
      expect(result).toMatch(/₪.*500K?/);
    });
  });

  describe('parse', () => {
    test('parses "$1,234.56" to USD Money', () => {
      const result = MoneyDisplay.parse('$1,234.56', 'USD');
      expect(result.amount).toBeCloseTo(1234.56);
      expect(result.currency).toBe('USD');
    });

    test('parses "₪5000" to ILS Money', () => {
      const result = MoneyDisplay.parse('₪5000', '₪');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('ILS');
    });

    test('parses plain number string', () => {
      const result = MoneyDisplay.parse('1234', 'USD');
      expect(result.amount).toBe(1234);
    });

    test('throws for invalid string', () => {
      expect(() => MoneyDisplay.parse('not-a-number', 'USD')).toThrow();
    });
  });
});

// ============================================================================
// Utility functions: normalizeCurrency, getCurrencySymbol, isSupportedCurrency
// ============================================================================

describe('normalizeCurrency', () => {
  test('returns USD for $ symbol', () => {
    expect(normalizeCurrency('$')).toBe('USD');
  });

  test('returns ILS for ₪ symbol', () => {
    expect(normalizeCurrency('₪')).toBe('ILS');
  });

  test('returns USD for USD code', () => {
    expect(normalizeCurrency('USD')).toBe('USD');
  });

  test('returns ILS for ILS code', () => {
    expect(normalizeCurrency('ILS')).toBe('ILS');
  });

  test('defaults to USD for unknown currency', () => {
    expect(normalizeCurrency('EUR')).toBe('USD');
  });
});

describe('getCurrencySymbol', () => {
  test('returns $ for USD', () => {
    expect(getCurrencySymbol('USD')).toBe('$');
  });

  test('returns ₪ for ILS', () => {
    expect(getCurrencySymbol('ILS')).toBe('₪');
  });

  test('returns $ for $ symbol input', () => {
    expect(getCurrencySymbol('$')).toBe('$');
  });

  test('returns ₪ for ₪ symbol input', () => {
    expect(getCurrencySymbol('₪')).toBe('₪');
  });
});

describe('isSupportedCurrency', () => {
  test('returns true for USD', () => {
    expect(isSupportedCurrency('USD')).toBe(true);
  });

  test('returns true for ILS', () => {
    expect(isSupportedCurrency('ILS')).toBe(true);
  });

  test('returns false for EUR', () => {
    expect(isSupportedCurrency('EUR')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isSupportedCurrency('')).toBe(false);
  });
});

describe('getSupportedCurrencies', () => {
  test('returns array containing USD and ILS', () => {
    const currencies = getSupportedCurrencies();
    expect(currencies).toContain('USD');
    expect(currencies).toContain('ILS');
  });

  test('returns exactly 2 currencies', () => {
    expect(getSupportedCurrencies()).toHaveLength(2);
  });
});

describe('getSupportedSymbols', () => {
  test('returns array containing $ and ₪', () => {
    const symbols = getSupportedSymbols();
    expect(symbols).toContain('$');
    expect(symbols).toContain('₪');
  });

  test('returns exactly 2 symbols', () => {
    expect(getSupportedSymbols()).toHaveLength(2);
  });
});

// ============================================================================
// toMoney / fromMoney helpers
// ============================================================================

describe('toMoney', () => {
  test('creates USD Money from amount and code', () => {
    const m = toMoney(100, 'USD');
    expect(m.amount).toBe(100);
    expect(m.currency).toBe('USD');
  });

  test('creates ILS Money from symbol', () => {
    const m = toMoney(360, '₪');
    expect(m.currency).toBe('ILS');
  });
});

describe('fromMoney', () => {
  test('extracts amount and USD symbol', () => {
    const [amount, symbol] = fromMoney(Money.usd(100));
    expect(amount).toBe(100);
    expect(symbol).toBe('$');
  });

  test('extracts amount and ILS symbol', () => {
    const [amount, symbol] = fromMoney(Money.ils(360));
    expect(amount).toBe(360);
    expect(symbol).toBe('₪');
  });
});
