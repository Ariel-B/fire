/**
 * Currency Utility Unit Tests
 * Tests for currency conversion functions
 */

import {
  getExchangeRates,
  convertToUSD,
  convertToDisplayCurrency,
  convertFromUSD,
  getCurrencySymbol,
  parseCurrency,
  CurrencyConverter,
  createCurrencyConverter
} from '../../../js/utils/currency.js';

describe('Currency Utilities', () => {
  const USD_ILS_RATE = 3.7;

  // ============================================================================
  // getExchangeRates
  // ============================================================================

  describe('getExchangeRates', () => {
    test('returns USD rate as 1.0', () => {
      const rates = getExchangeRates(3.7);

      expect(rates['$']).toBe(1.0);
    });

    test('returns ILS rate from parameter', () => {
      const rates = getExchangeRates(3.7);

      expect(rates['₪']).toBe(3.7);
    });

    test('handles different exchange rates', () => {
      const rates = getExchangeRates(4.0);

      expect(rates['$']).toBe(1.0);
      expect(rates['₪']).toBe(4.0);
    });
  });

  // ============================================================================
  // convertToUSD
  // ============================================================================

  describe('convertToUSD', () => {
    describe('USD amounts', () => {
      test('returns USD amount unchanged', () => {
        const result = convertToUSD(100, '$', USD_ILS_RATE);

        expect(result).toBe(100);
      });

      test('returns 0 for USD amount of 0', () => {
        const result = convertToUSD(0, '$', USD_ILS_RATE);

        expect(result).toBe(0);
      });
    });

    describe('ILS amounts', () => {
      test('converts ILS to USD', () => {
        const result = convertToUSD(370, '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(100, 2); // 370 / 3.7
      });

      test('converts large ILS amount to USD', () => {
        const result = convertToUSD(37000, '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(10000, 2);
      });
    });

    describe('edge cases', () => {
      test('returns 0 for null amount', () => {
        const result = convertToUSD(null, '$', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('returns 0 for undefined amount', () => {
        const result = convertToUSD(undefined, '$', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('returns 0 for zero amount', () => {
        const result = convertToUSD(0, '₪', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('handles negative amounts', () => {
        const result = convertToUSD(-370, '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(-100, 2);
      });

      test('returns original amount for unknown currency (fallback)', () => {
        // Unknown currency (not $ or ₪) falls through to return amount unchanged
        const result = convertToUSD(100, 'EUR', USD_ILS_RATE);

        expect(result).toBe(100);
      });
    });
  });

  // ============================================================================
  // convertToDisplayCurrency
  // ============================================================================

  describe('convertToDisplayCurrency', () => {
    describe('no conversion needed', () => {
      test('returns USD amount when both currencies are USD', () => {
        const result = convertToDisplayCurrency(100, '$', '$', USD_ILS_RATE);

        expect(result).toBe(100);
      });

      test('returns ILS amount when both currencies are ILS', () => {
        const result = convertToDisplayCurrency(370, '₪', '₪', USD_ILS_RATE);

        expect(result).toBe(370);
      });
    });

    describe('USD to ILS conversion', () => {
      test('converts USD to ILS', () => {
        const result = convertToDisplayCurrency(100, '$', '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(370, 2); // 100 * 3.7
      });

      test('converts large USD amount to ILS', () => {
        const result = convertToDisplayCurrency(10000, '$', '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(37000, 2);
      });
    });

    describe('ILS to USD conversion', () => {
      test('converts ILS to USD', () => {
        const result = convertToDisplayCurrency(370, '₪', '$', USD_ILS_RATE);

        expect(result).toBeCloseTo(100, 2); // 370 / 3.7
      });

      test('converts large ILS amount to USD', () => {
        const result = convertToDisplayCurrency(37000, '₪', '$', USD_ILS_RATE);

        expect(result).toBeCloseTo(10000, 2);
      });
    });

    describe('edge cases', () => {
      test('returns 0 for null amount', () => {
        const result = convertToDisplayCurrency(null, '$', '₪', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('returns 0 for undefined amount', () => {
        const result = convertToDisplayCurrency(undefined, '$', '₪', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('returns 0 for zero amount', () => {
        const result = convertToDisplayCurrency(0, '$', '₪', USD_ILS_RATE);

        expect(result).toBe(0);
      });

      test('handles negative amounts', () => {
        const result = convertToDisplayCurrency(-100, '$', '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(-370, 2);
      });

      test('unknown fromCurrency falls back to $ (treated as USD)', () => {
        // toSymbol('EUR') returns '$' (default fallback) so EUR is treated as USD
        const result = convertToDisplayCurrency(100, 'EUR', '₪', USD_ILS_RATE);

        expect(result).toBeCloseTo(370, 2); // Treated as $100 → ₪370
      });
    });
  });

  // ============================================================================
  // convertFromUSD
  // ============================================================================

  describe('convertFromUSD', () => {
    test('returns USD amount unchanged when target is USD', () => {
      const result = convertFromUSD(100, '$', USD_ILS_RATE);

      expect(result).toBe(100);
    });

    test('converts USD to ILS', () => {
      const result = convertFromUSD(100, '₪', USD_ILS_RATE);

      expect(result).toBeCloseTo(370, 2); // 100 * 3.7
    });

    test('returns 0 for null amount', () => {
      const result = convertFromUSD(null, '₪', USD_ILS_RATE);

      expect(result).toBe(0);
    });

    test('returns 0 for undefined amount', () => {
      const result = convertFromUSD(undefined, '₪', USD_ILS_RATE);

      expect(result).toBe(0);
    });

    test('returns 0 for zero amount', () => {
      const result = convertFromUSD(0, '₪', USD_ILS_RATE);

      expect(result).toBe(0);
    });

    test('handles negative amounts', () => {
      const result = convertFromUSD(-100, '₪', USD_ILS_RATE);

      expect(result).toBeCloseTo(-370, 2);
    });
  });

  // ============================================================================
  // getCurrencySymbol
  // ============================================================================

  describe('getCurrencySymbol', () => {
    test('returns $ for USD', () => {
      const result = getCurrencySymbol('$');

      expect(result).toBe('$');
    });

    test('returns ₪ for ILS', () => {
      const result = getCurrencySymbol('₪');

      expect(result).toBe('₪');
    });
  });

  // ============================================================================
  // parseCurrency
  // ============================================================================

  describe('parseCurrency', () => {
    test('parses ₪ as ILS', () => {
      const result = parseCurrency('₪');

      expect(result).toBe('₪');
    });

    test('parses ILS as ILS', () => {
      const result = parseCurrency('ILS');

      expect(result).toBe('₪');
    });

    test('parses $ as USD', () => {
      const result = parseCurrency('$');

      expect(result).toBe('$');
    });

    test('parses USD as USD', () => {
      const result = parseCurrency('USD');

      expect(result).toBe('$');
    });

    test('defaults to USD for unknown currency', () => {
      const result = parseCurrency('EUR');

      expect(result).toBe('$');
    });

    test('defaults to USD for empty string', () => {
      const result = parseCurrency('');

      expect(result).toBe('$');
    });
  });

  // ============================================================================
  // Round-trip Conversions
  // ============================================================================

  describe('Round-trip conversions', () => {
    test('USD -> ILS -> USD preserves value', () => {
      const original = 1000;
      const inILS = convertToDisplayCurrency(original, '$', '₪', USD_ILS_RATE);
      const backToUSD = convertToDisplayCurrency(inILS, '₪', '$', USD_ILS_RATE);

      expect(backToUSD).toBeCloseTo(original, 2);
    });

    test('ILS -> USD -> ILS preserves value', () => {
      const original = 3700;
      const inUSD = convertToUSD(original, '₪', USD_ILS_RATE);
      const backToILS = convertFromUSD(inUSD, '₪', USD_ILS_RATE);

      expect(backToILS).toBeCloseTo(original, 2);
    });

    test('Large amount round-trip preserves value', () => {
      const original = 1000000;
      const inILS = convertToDisplayCurrency(original, '$', '₪', USD_ILS_RATE);
      const backToUSD = convertToDisplayCurrency(inILS, '₪', '$', USD_ILS_RATE);

      expect(backToUSD).toBeCloseTo(original, 0);
    });
  });

  // ============================================================================
  // Different Exchange Rates
  // ============================================================================

  describe('Different exchange rates', () => {
    test('works with rate 4.0', () => {
      const rate = 4.0;
      const result = convertToDisplayCurrency(100, '$', '₪', rate);

      expect(result).toBe(400);
    });

    test('works with rate 3.5', () => {
      const rate = 3.5;
      const result = convertToDisplayCurrency(1000, '$', '₪', rate);

      expect(result).toBe(3500);
    });

    test('works with rate 3.0', () => {
      const rate = 3.0;
      const result = convertToUSD(300, '₪', rate);

      expect(result).toBe(100);
    });
  });

  // ============================================================================
  // CurrencyConverter class
  // ============================================================================

  describe('CurrencyConverter', () => {
    describe('constructor', () => {
      test('creates converter with valid rate', () => {
        const converter = new CurrencyConverter(3.6);
        expect(converter).toBeDefined();
      });

      test('throws for zero rate', () => {
        expect(() => new CurrencyConverter(0)).toThrow('Exchange rate must be positive');
      });

      test('throws for negative rate', () => {
        expect(() => new CurrencyConverter(-1)).toThrow('Exchange rate must be positive');
      });
    });

    describe('convert', () => {
      const converter = new CurrencyConverter(3.6);

      test('converts USD to ILS', () => {
        const usd = { amount: 100, currency: 'USD' };
        const result = converter.convert(usd, 'ILS');
        expect(result.amount).toBeCloseTo(360);
        expect(result.currency).toBe('ILS');
      });

      test('converts ILS to USD', () => {
        const ils = { amount: 360, currency: 'ILS' };
        const result = converter.convert(ils, 'USD');
        expect(result.amount).toBeCloseTo(100);
        expect(result.currency).toBe('USD');
      });

      test('no-op when source and target are same currency', () => {
        const usd = { amount: 100, currency: 'USD' };
        const result = converter.convert(usd, 'USD');
        expect(result).toBe(usd);
      });

      test('handles symbol input for target currency', () => {
        const usd = { amount: 100, currency: 'USD' };
        const result = converter.convert(usd, '₪');
        expect(result.amount).toBeCloseTo(360);
        expect(result.currency).toBe('ILS');
      });

      test('throws for unsupported source currency (EUR)', () => {
        const eur = { amount: 100, currency: 'EUR' };
        expect(() => converter.convert(eur, 'USD')).toThrow('Unsupported source currency');
      });

      test('unknown target currency defaults to USD (normalizeCurrency fallback)', () => {
        // normalizeCurrency('EUR') returns 'USD' with a warning
        // so convert(usd, 'EUR') is treated as convert(usd, 'USD') → no-op
        const usd = { amount: 100, currency: 'USD' };
        const result = converter.convert(usd, 'EUR');
        // Same-currency check returns original object unchanged
        expect(result).toBe(usd);
      });
    });

    describe('getRate', () => {
      const converter = new CurrencyConverter(3.6);

      test('returns 1 for same currency', () => {
        expect(converter.getRate('USD', 'USD')).toBe(1.0);
        expect(converter.getRate('ILS', 'ILS')).toBe(1.0);
      });

      test('returns USD/ILS rate', () => {
        expect(converter.getRate('USD', 'ILS')).toBe(3.6);
      });

      test('returns ILS/USD rate (inverse)', () => {
        expect(converter.getRate('ILS', 'USD')).toBeCloseTo(1 / 3.6);
      });

      test('returns rate for symbol inputs', () => {
        expect(converter.getRate('$', '₪')).toBe(3.6);
      });

      test('unknown currencies normalize to USD (same-currency = rate 1.0)', () => {
        // normalizeCurrency defaults unknown codes to 'USD'
        // so EUR→GBP becomes USD→USD = 1.0
        expect(converter.getRate('EUR', 'GBP')).toBe(1.0);
      });
    });

    describe('getUsdIlsRate', () => {
      test('returns the configured rate', () => {
        const converter = new CurrencyConverter(4.2);
        expect(converter.getUsdIlsRate()).toBe(4.2);
      });
    });

    describe('toUsd', () => {
      test('converts ILS to USD', () => {
        const converter = new CurrencyConverter(3.6);
        const result = converter.toUsd({ amount: 360, currency: 'ILS' });
        expect(result.amount).toBeCloseTo(100);
        expect(result.currency).toBe('USD');
      });

      test('returns USD unchanged', () => {
        const converter = new CurrencyConverter(3.6);
        const usd = { amount: 100, currency: 'USD' };
        expect(converter.toUsd(usd)).toBe(usd);
      });
    });

    describe('toIls', () => {
      test('converts USD to ILS', () => {
        const converter = new CurrencyConverter(3.6);
        const result = converter.toIls({ amount: 100, currency: 'USD' });
        expect(result.amount).toBeCloseTo(360);
        expect(result.currency).toBe('ILS');
      });

      test('returns ILS unchanged', () => {
        const converter = new CurrencyConverter(3.6);
        const ils = { amount: 360, currency: 'ILS' };
        expect(converter.toIls(ils)).toBe(ils);
      });
    });
  });

  // ============================================================================
  // createCurrencyConverter
  // ============================================================================

  describe('createCurrencyConverter', () => {
    test('returns a CurrencyConverter instance', () => {
      const converter = createCurrencyConverter(3.6);
      expect(converter).toBeInstanceOf(CurrencyConverter);
    });

    test('converter has correct rate', () => {
      const converter = createCurrencyConverter(4.5);
      expect(converter.getUsdIlsRate()).toBe(4.5);
    });
  });

  // ============================================================================
  // convertFromUSD (extended)
  // ============================================================================

  describe('convertFromUSD (extended)', () => {
    test('converts USD amount to ILS', () => {
      expect(convertFromUSD(100, '₪', 3.6)).toBeCloseTo(360);
    });

    test('returns USD unchanged when targeting $', () => {
      expect(convertFromUSD(100, '$', 3.6)).toBe(100);
    });

    test('returns 0 for zero input', () => {
      expect(convertFromUSD(0, '₪', 3.6)).toBe(0);
    });
  });

  // ============================================================================
  // parseCurrency (extended)
  // ============================================================================

  describe('parseCurrency', () => {
    test('returns ₪ for ₪ symbol', () => {
      expect(parseCurrency('₪')).toBe('₪');
    });

    test('returns ₪ for ILS code', () => {
      expect(parseCurrency('ILS')).toBe('₪');
    });

    test('returns $ for $ symbol', () => {
      expect(parseCurrency('$')).toBe('$');
    });

    test('returns $ for USD code', () => {
      expect(parseCurrency('USD')).toBe('$');
    });

    test('defaults to $ for unknown input', () => {
      expect(parseCurrency('EUR')).toBe('$');
    });
  });
});
