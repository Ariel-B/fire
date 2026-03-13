/**
 * Formatter Utilities
 * Pure functions for number and currency formatting
 * Supports both legacy (decimal + currency) and Money type formatting
 */

import type { Currency } from '../types/index.js';
import type { Money } from '../types/money.js';
import { getCurrencySymbol, normalizeCurrency } from '../types/money.js';

function trimTrailingZeros(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

/**
 * Format a number as currency with proper locale and symbol
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options || {};

  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === '₪' ? '₪0' : '$0';
  }

  const locale = currency === '₪' ? 'he-IL' : 'en-US';
  const currencyCode = currency === '₪' ? 'ILS' : 'USD';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(amount);
  } catch {
    // Fallback formatting
    const formatted = amount.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    });
    return currency === '₪' ? `₪${formatted}` : `$${formatted}`;
  }
}

/**
 * Safe currency formatting with error handling
 */
export function safeFormatCurrency(
  amount: number | undefined | null,
  currency: Currency
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return currency === '₪' ? '₪0' : '$0';
  }
  return formatCurrency(amount, currency);
}

/**
 * Format a number as percentage
 */
export function formatPercentage(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 1, maximumFractionDigits = 2 } = options || {};

  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(maximumFractionDigits)}%`;
}

/**
 * Format a large number with compact notation (e.g., 1.5M, 250K)
 */
export function formatCompactNumber(value: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`;
  }

  return `${sign}${absValue.toFixed(0)}`;
}

export function formatCompactCurrency(
  value: number | null | undefined,
  currency: Currency
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return currency === '₪' ? '₪0' : '$0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const symbol = currency === '₪' ? '₪' : '$';

  const units = [
    { threshold: 1_000_000_000_000, suffix: 'T' },
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' }
  ];

  for (const { threshold, suffix } of units) {
    if (absValue >= threshold) {
      const scaled = absValue / threshold;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      const formatted = trimTrailingZeros(scaled.toFixed(decimals));
      return `${sign}${symbol}${formatted}${suffix}`;
    }
  }

  return formatCurrency(value, currency, {
    minimumFractionDigits: value < 1 && value !== 0 ? 2 : 0,
    maximumFractionDigits: value < 1 && value !== 0 ? 2 : 0
  });
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 2 } = options || {};

  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits,
    maximumFractionDigits
  });
}

/**
 * Parse a formatted number string back to a number
 */
export function parseFormattedNumber(value: string): number {
  if (!value) return 0;

  // Remove currency symbols, commas, and whitespace
  const cleaned = value
    .replace(/[$₪,\s]/g, '')
    .replace(/[^\d.-]/g, '');

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// Money Type Formatting (Type-Safe)
// ============================================================================

/**
 * Format a Money value for display with proper locale and symbol
 * Uses the Money type for type-safe currency handling
 *
 * @example
 * ```typescript
 * formatMoney(Money.usd(1234.56)); // "$1,234.56"
 * formatMoney(Money.ils(5678.90)); // "₪5,678.90"
 * ```
 */
export function formatMoney(
  money: Money,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  const { minimumFractionDigits = 0, maximumFractionDigits = 0 } = options || {};

  if (money.amount === null || money.amount === undefined || isNaN(money.amount)) {
    const symbol = getCurrencySymbol(money.currency);
    return `${symbol}0`;
  }

  const locale = money.currency === 'ILS' ? 'he-IL' : 'en-US';
  const currencyCode = money.currency;

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits,
      maximumFractionDigits
    }).format(money.amount);
  } catch {
    // Fallback formatting
    const formatted = money.amount.toLocaleString(locale, {
      minimumFractionDigits,
      maximumFractionDigits
    });
    const symbol = getCurrencySymbol(money.currency);
    return `${symbol}${formatted}`;
  }
}

/**
 * Safe Money formatting with error handling
 * Returns formatted string or fallback value
 */
export function safeFormatMoney(money: Money | null | undefined): string {
  if (!money || money.amount === null || money.amount === undefined || isNaN(money.amount)) {
    return '$0';
  }
  return formatMoney(money);
}

/**
 * Format Money with compact notation (e.g., $1.5M, ₪250K)
 *
 * @example
 * ```typescript
 * formatCompactMoney(Money.usd(1500000)); // "$1.5M"
 * formatCompactMoney(Money.ils(250000));  // "₪250K"
 * ```
 */
export function formatCompactMoney(money: Money | null | undefined): string {
  if (!money || money.amount === null || money.amount === undefined || isNaN(money.amount)) {
    return '$0';
  }

  const absValue = Math.abs(money.amount);
  const sign = money.amount < 0 ? '-' : '';
  const symbol = getCurrencySymbol(money.currency);

  const units = [
    { threshold: 1_000_000_000_000, suffix: 'T' },
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' }
  ];

  for (const { threshold, suffix } of units) {
    if (absValue >= threshold) {
      const scaled = absValue / threshold;
      const decimals = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
      const formatted = trimTrailingZeros(scaled.toFixed(decimals));
      return `${sign}${symbol}${formatted}${suffix}`;
    }
  }

  return formatMoney(money, {
    minimumFractionDigits: money.amount < 1 && money.amount !== 0 ? 2 : 0,
    maximumFractionDigits: money.amount < 1 && money.amount !== 0 ? 2 : 0
  });
}

/**
 * Format Money for input fields (no symbol, with separators)
 * Useful for editable input fields where currency symbol is shown separately
 *
 * @example
 * ```typescript
 * formatMoneyForInput(Money.usd(1234.56)); // "1,234.56"
 * ```
 */
export function formatMoneyForInput(money: Money): string {
  if (!money || money.amount === null || money.amount === undefined || isNaN(money.amount)) {
    return '0';
  }

  return money.amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}
