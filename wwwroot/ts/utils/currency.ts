/**
 * Currency Utilities
 * Pure functions for currency conversion and handling
 * Supports both legacy (decimal + currency) and Money type conversions
 */

import type { Currency, ExchangeRates, CurrencySymbol } from '../types/index.js';
import type { Money, ICurrencyConverter, CurrencyCode } from '../types/money.js';
import { normalizeCurrency, getCurrencySymbol as getSymbol, Money as MoneyFactory } from '../types/money.js';

/**
 * Get exchange rates based on the user-configurable USD/ILS rate
 */
export function getExchangeRates(usdIlsRate: number): ExchangeRates {
  return {
    '$': 1.0,
    '₪': usdIlsRate
  };
}

/**
 * Normalize currency to symbol for legacy ExchangeRates lookup
 * Converts both symbols and ISO codes to symbols
 */
function toSymbol(currency: Currency): CurrencySymbol {
  if (currency === '$' || currency === 'USD') return '$';
  if (currency === '₪' || currency === 'ILS') return '₪';
  return '$'; // Default fallback
}

/**
 * Convert amount from any currency to USD
 */
export function convertToUSD(
  amount: number,
  fromCurrency: Currency,
  usdIlsRate: number
): number {
  if (!amount || amount === 0 || fromCurrency === '$') {
    return amount || 0;
  }

  const exchangeRates = getExchangeRates(usdIlsRate);

  if (fromCurrency === '₪') {
    return amount / exchangeRates['₪'];
  }

  return amount;
}

/**
 * Convert amount from source currency to display currency
 */
export function convertToDisplayCurrency(
  amount: number,
  fromCurrency: Currency,
  displayCurrency: Currency,
  usdIlsRate: number
): number {
  if (!amount || amount === 0 || fromCurrency === displayCurrency) {
    return amount || 0;
  }

  // Normalize to symbols for ExchangeRates lookup
  const fromSymbol = toSymbol(fromCurrency);
  const displaySymbol = toSymbol(displayCurrency);

  const exchangeRates = getExchangeRates(usdIlsRate);

  // First convert to USD
  let amountInUsd = amount;
  if (fromSymbol !== '$') {
    if (fromSymbol === '₪') {
      amountInUsd = amount / exchangeRates['₪'];
    }
  }

  // Then convert from USD to display currency
  if (displaySymbol === '$') {
    return amountInUsd;
  } else {
    return amountInUsd * exchangeRates[displaySymbol];
  }
}

/**
 * Convert amount from USD to target currency
 */
export function convertFromUSD(
  amountInUSD: number,
  toCurrency: Currency,
  usdIlsRate: number
): number {
  // Normalize to symbol for ExchangeRates lookup
  const toSymbol_local = toSymbol(toCurrency);

  if (!amountInUSD || amountInUSD === 0 || toSymbol_local === '$') {
    return amountInUSD || 0;
  }

  const exchangeRates = getExchangeRates(usdIlsRate);
  return amountInUSD * exchangeRates[toSymbol_local];
}

/**
 * Get currency symbol for display
 */
export function getCurrencySymbol(currency: Currency): string {
  return currency;
}

/**
 * Parse currency from string (handles both $ and ₪)
 */
export function parseCurrency(value: string): Currency {
  if (value === '₪' || value === 'ILS') {
    return '₪';
  }
  return '$';
}

// ============================================================================
// Money Type Currency Conversion (Type-Safe)
// ============================================================================

/**
 * CurrencyConverter class implementing ICurrencyConverter interface
 * Provides type-safe Money conversion with configurable USD/ILS exchange rate
 *
 * @example
 * ```typescript
 * const converter = new CurrencyConverter(3.6);
 * const usd = Money.usd(100);
 * const ils = converter.convert(usd, 'ILS'); // ₪360
 * ```
 */
export class CurrencyConverter implements ICurrencyConverter {
  private readonly usdIlsRate: number;

  /**
   * Create a new CurrencyConverter with the specified USD/ILS exchange rate
   * @param usdIlsRate Exchange rate (1 USD = X ILS)
   */
  constructor(usdIlsRate: number) {
    if (usdIlsRate <= 0) {
      throw new Error('Exchange rate must be positive');
    }
    this.usdIlsRate = usdIlsRate;
  }

  /**
   * Convert Money to a different currency
   */
  convert(money: Money, targetCurrency: Currency): Money {
    const targetCode = normalizeCurrency(targetCurrency);

    // No conversion needed if currencies match
    if (money.currency === targetCode) {
      return money;
    }

    // Convert to USD if needed, then to target currency
    let amountInUsd: number;

    if (money.currency === 'USD') {
      amountInUsd = money.amount;
    } else if (money.currency === 'ILS') {
      amountInUsd = money.amount / this.usdIlsRate;
    } else {
      throw new Error(`Unsupported source currency: ${money.currency}`);
    }

    // Convert from USD to target currency
    let targetAmount: number;

    if (targetCode === 'USD') {
      targetAmount = amountInUsd;
    } else if (targetCode === 'ILS') {
      targetAmount = amountInUsd * this.usdIlsRate;
    } else {
      throw new Error(`Unsupported target currency: ${targetCode}`);
    }

    return MoneyFactory.create(targetAmount, targetCode);
  }

  /**
   * Get exchange rate between two currencies
   * @returns rate where 1 fromCurrency = rate toCurrency
   */
  getRate(fromCurrency: Currency, toCurrency: Currency): number {
    const fromCode = normalizeCurrency(fromCurrency);
    const toCode = normalizeCurrency(toCurrency);

    // Same currency
    if (fromCode === toCode) {
      return 1.0;
    }

    // USD to ILS
    if (fromCode === 'USD' && toCode === 'ILS') {
      return this.usdIlsRate;
    }

    // ILS to USD
    if (fromCode === 'ILS' && toCode === 'USD') {
      return 1 / this.usdIlsRate;
    }

    throw new Error(`Unsupported currency pair: ${fromCode} to ${toCode}`);
  }

  /**
   * Get the USD/ILS exchange rate
   */
  getUsdIlsRate(): number {
    return this.usdIlsRate;
  }

  /**
   * Convert Money to USD
   */
  toUsd(money: Money): Money {
    return this.convert(money, 'USD');
  }

  /**
   * Convert Money to ILS
   */
  toIls(money: Money): Money {
    return this.convert(money, 'ILS');
  }
}

/**
 * Helper function to create a CurrencyConverter instance
 * @param usdIlsRate Exchange rate (1 USD = X ILS)
 */
export function createCurrencyConverter(usdIlsRate: number): CurrencyConverter {
  return new CurrencyConverter(usdIlsRate);
}
