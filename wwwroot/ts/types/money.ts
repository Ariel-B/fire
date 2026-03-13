/**
 * Money Type - Type-safe monetary value with currency
 * Matches the backend C# Money value object for consistent currency handling
 */

// ISO 4217 Currency Codes
export type CurrencyCode = 'USD' | 'ILS';

// Currency symbols for display (backward compatibility)
export type CurrencySymbol = '$' | '₪';

// Union type supporting both ISO codes and symbols
export type Currency = CurrencyCode | CurrencySymbol;

/**
 * Immutable monetary value with explicit currency.
 *
 * Design principles:
 * - Type-safe: Prevents mixing currencies in arithmetic
 * - Explicit conversions: All currency changes require explicit conversion
 * - Immutable: All operations return new Money instances
 * - Serializable: Compatible with JSON serialization
 *
 * @example
 * ```typescript
 * const usd = Money.usd(100);
 * const ils = Money.ils(360);
 *
 * // Type-safe arithmetic (same currency required)
 * const total = usd.add(Money.usd(50)); // OK
 * // const invalid = usd.add(ils); // Runtime error - different currencies
 *
 * // Explicit conversion
 * const ilsConverted = usd.convertTo('ILS', converter);
 * const sum = ilsConverted.add(ils); // OK - both in ILS
 * ```
 */
export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

/**
 * Money factory and utility functions
 */
export const Money = {
  /**
   * Create a Money value with explicit currency
   * @param amount The monetary amount
   * @param currency Currency code ('USD', 'ILS') or symbol ('$', '₪')
   * @returns Money instance
   * @throws Error if currency is unsupported
   */
  create(amount: number, currency: Currency): Money {
    const currencyCode = normalizeCurrency(currency);

    if (!isSupportedCurrency(currencyCode)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }

    return {
      amount,
      currency: currencyCode
    };
  },

  /**
   * Create a Money value in USD
   * @param amount The amount in US dollars
   */
  usd(amount: number): Money {
    return { amount, currency: 'USD' };
  },

  /**
   * Create a Money value in ILS
   * @param amount The amount in Israeli shekels
   */
  ils(amount: number): Money {
    return { amount, currency: 'ILS' };
  },

  /**
   * Create a zero Money value in the specified currency
   * @param currency Currency code or symbol
   */
  zero(currency: Currency): Money {
    return this.create(0, currency);
  },

  /**
   * Check if a value is a valid Money object
   */
  isMoney(value: any): value is Money {
    return value &&
           typeof value === 'object' &&
           typeof value.amount === 'number' &&
           typeof value.currency === 'string' &&
           isSupportedCurrency(value.currency);
  }
};

/**
 * Supported currency registry
 */
const SUPPORTED_CURRENCIES = new Set<CurrencyCode>(['USD', 'ILS']);

/**
 * Symbol to ISO code mapping
 */
const SYMBOL_TO_CODE: Record<CurrencySymbol, CurrencyCode> = {
  '$': 'USD',
  '₪': 'ILS'
};

/**
 * ISO code to symbol mapping
 */
const CODE_TO_SYMBOL: Record<CurrencyCode, CurrencySymbol> = {
  'USD': '$',
  'ILS': '₪'
};

/**
 * Normalize currency input to ISO code
 * @param currency Currency code or symbol
 * @returns ISO 4217 currency code
 */
export function normalizeCurrency(currency: Currency): CurrencyCode {
  // Check if it's already a valid ISO code
  if (isSupportedCurrency(currency)) {
    return currency as CurrencyCode;
  }

  // Try to map symbol to code
  const code = SYMBOL_TO_CODE[currency as CurrencySymbol];
  if (code) {
    return code;
  }

  // Default to USD for unknown currencies (defensive)
  console.warn(`Unknown currency: ${currency}, defaulting to USD`);
  return 'USD';
}

/**
 * Get display symbol for currency code
 * @param currency Currency code
 * @returns Currency symbol for display
 */
export function getCurrencySymbol(currency: Currency): CurrencySymbol {
  const code = normalizeCurrency(currency);
  return CODE_TO_SYMBOL[code] || '$';
}

/**
 * Check if a currency is supported
 * @param currency Currency code to check
 */
export function isSupportedCurrency(currency: string): currency is CurrencyCode {
  return SUPPORTED_CURRENCIES.has(currency as CurrencyCode);
}

/**
 * Get all supported currency codes
 */
export function getSupportedCurrencies(): CurrencyCode[] {
  return Array.from(SUPPORTED_CURRENCIES);
}

/**
 * Get all supported currency symbols
 */
export function getSupportedSymbols(): CurrencySymbol[] {
  return ['$', '₪'];
}

/**
 * Currency converter interface for Money conversions
 */
export interface ICurrencyConverter {
  /**
   * Convert a Money value to another currency
   * @param amount Money to convert
   * @param targetCurrency Target currency code or symbol
   * @returns Converted Money value
   */
  convert(amount: Money, targetCurrency: Currency): Money;

  /**
   * Get exchange rate between two currencies
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Exchange rate (1 fromCurrency = rate toCurrency)
   */
  getRate(fromCurrency: Currency, toCurrency: Currency): number;
}

/**
 * Money arithmetic operations
 * All operations require same currency, throw error otherwise
 */
export const MoneyMath = {
  /**
   * Add two Money values (must be same currency)
   * @throws Error if currencies don't match
   */
  add(a: Money, b: Money): Money {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot add Money with different currencies: ${a.currency} and ${b.currency}. ` +
        `Convert to the same currency first using Money.convertTo()`
      );
    }
    return { amount: a.amount + b.amount, currency: a.currency };
  },

  /**
   * Subtract two Money values (must be same currency)
   * @throws Error if currencies don't match
   */
  subtract(a: Money, b: Money): Money {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot subtract Money with different currencies: ${a.currency} and ${b.currency}. ` +
        `Convert to the same currency first using Money.convertTo()`
      );
    }
    return { amount: a.amount - b.amount, currency: a.currency };
  },

  /**
   * Multiply Money by a scalar
   */
  multiply(money: Money, multiplier: number): Money {
    return { amount: money.amount * multiplier, currency: money.currency };
  },

  /**
   * Divide Money by a scalar
   * @throws Error if divisor is zero
   */
  divide(money: Money, divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide Money by zero');
    }
    return { amount: money.amount / divisor, currency: money.currency };
  },

  /**
   * Compare two Money values (must be same currency)
   * @returns true if a > b
   * @throws Error if currencies don't match
   */
  greaterThan(a: Money, b: Money): boolean {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot compare Money with different currencies: ${a.currency} and ${b.currency}`
      );
    }
    return a.amount > b.amount;
  },

  /**
   * Compare two Money values (must be same currency)
   * @returns true if a < b
   * @throws Error if currencies don't match
   */
  lessThan(a: Money, b: Money): boolean {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot compare Money with different currencies: ${a.currency} and ${b.currency}`
      );
    }
    return a.amount < b.amount;
  },

  /**
   * Compare two Money values (must be same currency)
   * @returns true if a >= b
   * @throws Error if currencies don't match
   */
  greaterThanOrEqual(a: Money, b: Money): boolean {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot compare Money with different currencies: ${a.currency} and ${b.currency}`
      );
    }
    return a.amount >= b.amount;
  },

  /**
   * Compare two Money values (must be same currency)
   * @returns true if a <= b
   * @throws Error if currencies don't match
   */
  lessThanOrEqual(a: Money, b: Money): boolean {
    if (a.currency !== b.currency) {
      throw new Error(
        `Cannot compare Money with different currencies: ${a.currency} and ${b.currency}`
      );
    }
    return a.amount <= b.amount;
  },

  /**
   * Check equality of two Money values
   * @param tolerance Optional tolerance for floating-point comparison
   */
  equals(a: Money, b: Money, tolerance: number = 0): boolean {
    if (a.currency !== b.currency) {
      return false;
    }
    return Math.abs(a.amount - b.amount) <= tolerance;
  },

  /**
   * Get the absolute value of Money
   */
  abs(money: Money): Money {
    return { amount: Math.abs(money.amount), currency: money.currency };
  },

  /**
   * Negate Money (multiply by -1)
   */
  negate(money: Money): Money {
    return { amount: -money.amount, currency: money.currency };
  },

  /**
   * Sum an array of Money values (must all be same currency)
   * @param moneys Array of Money values
   * @param targetCurrency Currency for the result (defaults to first element's currency)
   * @throws Error if currencies don't match
   */
  sum(moneys: Money[], targetCurrency?: CurrencyCode): Money {
    if (moneys.length === 0) {
      return Money.zero(targetCurrency || 'USD');
    }

    const currency = targetCurrency || moneys[0].currency;

    // Verify all currencies match
    for (const money of moneys) {
      if (money.currency !== currency) {
        throw new Error(
          `Cannot sum Money with different currencies. ` +
          `Expected ${currency}, found ${money.currency}. ` +
          `Convert all values to the same currency first.`
        );
      }
    }

    const total = moneys.reduce((sum, money) => sum + money.amount, 0);
    return { amount: total, currency };
  }
};

/**
 * Money conversion utilities
 */
export const MoneyConversion = {
  /**
   * Convert Money to a different currency using a converter
   * @param money Money value to convert
   * @param targetCurrency Target currency code or symbol
   * @param converter Currency converter instance
   * @returns Converted Money value
   */
  convertTo(money: Money, targetCurrency: Currency, converter: ICurrencyConverter): Money {
    return converter.convert(money, targetCurrency);
  },

  /**
   * Convert Money to USD
   */
  toUsd(money: Money, converter: ICurrencyConverter): Money {
    return converter.convert(money, 'USD');
  },

  /**
   * Convert Money to ILS
   */
  toIls(money: Money, converter: ICurrencyConverter): Money {
    return converter.convert(money, 'ILS');
  },

  /**
   * Sum Money values in a target currency (converts as needed)
   * @param moneys Array of Money values (can be mixed currencies)
   * @param targetCurrency Target currency for the sum
   * @param converter Currency converter
   * @returns Sum in target currency
   */
  sumInCurrency(moneys: Money[], targetCurrency: Currency, converter: ICurrencyConverter): Money {
    if (moneys.length === 0) {
      return Money.zero(targetCurrency);
    }

    const targetCode = normalizeCurrency(targetCurrency);

    // Convert all values to target currency, then sum
    const converted = moneys.map(money =>
      money.currency === targetCode
        ? money
        : converter.convert(money, targetCode)
    );

    return MoneyMath.sum(converted, targetCode);
  }
};

/**
 * Money display utilities
 */
export const MoneyDisplay = {
  /**
   * Format Money for display using locale-appropriate formatting
   * @param money Money value to format
   * @param options Formatting options
   * @returns Formatted string (e.g., "$1,234.56" or "₪1,234.56")
   */
  format(money: Money, options?: Intl.NumberFormatOptions): string {
    const symbol = getCurrencySymbol(money.currency);
    const locale = money.currency === 'ILS' ? 'he-IL' : 'en-US';

    const formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    }).format(money.amount);

    return `${symbol}${formatted}`;
  },

  /**
   * Format Money in compact notation (e.g., "$1.2M")
   */
  formatCompact(money: Money): string {
    const symbol = getCurrencySymbol(money.currency);
    const locale = money.currency === 'ILS' ? 'he-IL' : 'en-US';

    const formatted = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(money.amount);

    return `${symbol}${formatted}`;
  },

  /**
   * Parse formatted Money string back to Money
   * @param value Formatted string like "$1,234.56" or "1234.56"
   * @param currency Currency code or symbol
   * @returns Money instance
   */
  parse(value: string, currency: Currency): Money {
    // Remove currency symbols and whitespace
    const cleaned = value.replace(/[$₪,\s]/g, '');
    const amount = parseFloat(cleaned);

    if (isNaN(amount)) {
      throw new Error(`Invalid money value: ${value}`);
    }

    return Money.create(amount, currency);
  }
};

/**
 * Helper to convert legacy decimal + currency to Money
 * @param amount Decimal amount
 * @param currency Currency code or symbol
 * @returns Money instance
 */
export function toMoney(amount: number, currency: Currency): Money {
  return Money.create(amount, currency);
}

/**
 * Helper to convert Money to legacy decimal + currency pair
 * @param money Money instance
 * @returns Tuple of [amount, currency symbol]
 */
export function fromMoney(money: Money): [number, CurrencySymbol] {
  return [money.amount, getCurrencySymbol(money.currency)];
}
