/**
 * Calculation Constants Configuration
 * Shared constants for frontend calculations to ensure consistency
 * 
 * IMPORTANT: These values should match the backend defaults in:
 * - src/Services/CalculationConstants.cs (validation constants)
 * - src/Services/FireCalculator.cs (calculation defaults)
 * 
 * The backend is the SINGLE SOURCE OF TRUTH for all calculations.
 * If constants change, update the backend first, then sync here.
 */

export const CALCULATION_CONFIG = {
  // Default exchange rate (USD/ILS)
  DEFAULT_USD_ILS_RATE: 3.6,
  
  // Default years for target price calculation (when no retirement timeline is provided)
  DEFAULT_TARGET_PRICE_YEARS: 10,
  
  // Maximum simulation years to prevent infinite loops
  MAX_SIMULATION_YEARS: 100,
  
  // Precision for currency display
  CURRENCY_DECIMAL_PLACES: 2,
  
  // Precision for percentage calculations
  PERCENTAGE_DECIMAL_PLACES: 2,
  
  // Default return rates (in percentages)
  DEFAULT_STOCK_RETURN: 7.0,
  DEFAULT_BOND_RETURN: 3.0,
  
  // Tax defaults
  DEFAULT_CAPITAL_GAINS_TAX: 25,
  
  // Withdrawal defaults
  DEFAULT_WITHDRAWAL_RATE: 4.0,
  DEFAULT_INFLATION_RATE: 2.0,
  
  // Portfolio thresholds
  MIN_PORTFOLIO_VALUE: 0,
  MIN_PROFIT_RATIO: 0,
  MAX_PROFIT_RATIO: 1,
  
  // Default profit ratio when calculation is not possible
  DEFAULT_PROFIT_RATIO: 0.5,
  
  // Validation constants for year ranges
  // Minimum valid birth year for input validation
  MIN_BIRTH_YEAR: 1900,
  
  // Maximum years in the future for birth year validation (added to current year)
  MAX_FUTURE_BIRTH_YEARS: 50,
  
  // Minimum valid year for retirement planning
  MIN_RETIREMENT_YEAR: 1900,
  
  // Maximum years in the future for retirement year validation (added to current year)
  MAX_FUTURE_RETIREMENT_YEARS: 150,
  
  // Maximum valid retirement age
  MAX_RETIREMENT_AGE: 150,
  
  // Pension constants
  // Maximum valid monthly pension amount (reasonable upper bound)
  MAX_PENSION_MONTHLY_AMOUNT: 1_000_000,
  
  // Supported currency symbols
  SUPPORTED_CURRENCIES: ['$', '₪'] as readonly string[],
  
  // Time constants for historical data validation
  // Number of days considered as "two months" for historical data validation
  TWO_MONTHS_IN_DAYS: 60,
} as const;

// Two months expressed in seconds (TWO_MONTHS_IN_DAYS × 24 hours × 60 minutes × 60 seconds)
// Defined outside the config object to use the TWO_MONTHS_IN_DAYS constant
// Used for validating historical price data timestamp proximity
export const TWO_MONTHS_IN_SECONDS = CALCULATION_CONFIG.TWO_MONTHS_IN_DAYS * 24 * 60 * 60;

/**
 * Get current base year for inflation calculations
 * This ensures inflation is calculated from the current year, not a hardcoded value
 */
export function getBaseYear(): number {
  return new Date().getFullYear();
}

/**
 * Calculate years from base year for inflation adjustments
 * @param targetYear The year to calculate inflation for
 * @returns Number of years from base year (can be negative for past years)
 */
export function calculateYearsFromBase(targetYear: number): number {
  return targetYear - getBaseYear();
}

/**
 * Apply inflation to an amount
 * @param amount The base amount
 * @param years Number of years to apply inflation
 * @param inflationRate Annual inflation rate as decimal (e.g., 0.02 for 2%)
 * @returns Inflation-adjusted amount
 */
export function applyInflation(amount: number, years: number, inflationRate: number): number {
  return amount * Math.pow(1 + inflationRate, years);
}

/**
 * Calculate profit ratio with safety bounds
 * @param portfolioValue Current portfolio value
 * @param costBasis Total cost basis (contributions)
 * @returns Profit ratio between 0 and 1
 */
export function calculateSafeProfitRatio(portfolioValue: number, costBasis: number): number {
  if (portfolioValue <= 0 || costBasis <= 0) {
    return CALCULATION_CONFIG.MIN_PROFIT_RATIO;
  }
  if (portfolioValue <= costBasis) {
    return CALCULATION_CONFIG.MIN_PROFIT_RATIO;
  }
  const ratio = (portfolioValue - costBasis) / portfolioValue;
  return Math.max(CALCULATION_CONFIG.MIN_PROFIT_RATIO, Math.min(CALCULATION_CONFIG.MAX_PROFIT_RATIO, ratio));
}

export type CalculationConfig = typeof CALCULATION_CONFIG;
