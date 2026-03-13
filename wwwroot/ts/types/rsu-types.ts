/**
 * RSU (Restricted Stock Unit) Type Definitions
 * Types for RSU grant management and Israeli Section 102 tax calculations
 */

import type { Currency } from './index.js';
import type { Money } from './money.js';

// ============================================================================
// RSU Enums
// ============================================================================

/**
 * Types of vesting schedules for RSU grants
 */
export type VestingScheduleType = 'Standard';
// Phase 2: | 'Quarterly' | 'Yearly' | 'Cliff' | 'Custom';

/**
 * RSU liquidation strategies optimized for Israeli tax law (Section 102).
 *
 * These strategies determine when RSU shares are sold and how taxes are calculated.
 * Israeli Section 102 provides favorable capital gains tax treatment (25% + 3% surtax)
 * for RSU shares held at least 2 years from the grant date.
 *
 * **Tax Context:**
 * - Section 102 eligible (2+ years from grant): 25% capital gains tax + optional 3% surtax
 * - Not eligible (<2 years): Higher marginal income tax at vest + capital gains on appreciation
 *
 * **Available Strategies:**
 *
 * 1. **SellAfter2Years** (Phase 1 - Implemented):
 *    - When shares vest, they are held (not sold)
 *    - Exactly 2 years after grant date, all vested shares from that grant are sold
 *    - Maximum tax optimization through full Section 102 benefit
 *    - Early retirement: unvested shares forfeited, vested shares continue selling on schedule
 *    - Pros: Maximum tax benefit (25% capital gains on all gains)
 *    - Cons: Concentration risk, delayed liquidity, high forfeiture risk if retiring early
 *
 * 2. **SellAtRetirement** (Phase 2 - Planned):
 *    - At retirement: sell all Section 102 eligible shares immediately
 *    - Hold non-eligible shares until they reach 2-year eligibility, then sell
 *    - All unvested RSUs are forfeited at retirement (standard employment termination rule)
 *    - Pros: Immediate liquidity, lower forfeiture risk, more flexibility in timing
 *    - Cons: Less tax benefit for recently granted shares (<2 years), may sacrifice unvested value
 *
 * @see PRD_RSU_SUPPORT.md Section 3.2 for detailed strategy documentation
 */
export type RsuLiquidationStrategy = 'SellAfter2Years' | 'SellAtRetirement';

/**
 * Types of RSU transactions
 */
export type RsuTransactionType = 'Vest' | 'Sell' | 'Hold' | 'Forfeit';

// ============================================================================
// RSU Grant Types
// ============================================================================

/**
 * Represents a single RSU grant from an employer
 */
export interface RsuGrant {
  /** Unique identifier for the grant */
  id: number;
  /** Date when RSUs were granted by the employer (ISO string) */
  grantDate: string;
  /** Total number of shares granted */
  numberOfShares: number;
  /** Number of shares already sold (reduces remaining shares) */
  sharesSold: number;

  /** Stock price on grant date (legacy decimal + currency) */
  priceAtGrant: number;
  /** Currency of the grant price */
  currency: Currency;

  /** Stock price on grant date (Money type, type-safe) */
  priceAtGrantTyped?: Money;

  /** Number of years until fully vested (default: 4) */
  vestingPeriodYears: number;
  /** Type of vesting schedule */
  vestingType: VestingScheduleType;
}

/**
 * Global configuration for RSU grants (per company/stock symbol)
 */
export interface RsuConfiguration {
  /** Company stock ticker symbol (e.g., GOOGL, MSFT) */
  stockSymbol: string;

  /** Current market price per share (legacy decimal + currency) */
  currentPricePerShare: number;
  /** Whether the current price was fetched from API (true) or manually entered (false) */
  priceIsFromApi: boolean;
  /** Currency of the stock price */
  currency: Currency;

  /** Current market price per share (Money type, type-safe) */
  currentPricePerShareTyped?: Money;
  /** Expected annual return percentage for stock price projection */
  expectedAnnualReturn: number;
  /** Method for projecting future prices */
  returnMethod: 'CAGR' | 'Fixed';
  /** Default vesting period for new grants (years) */
  defaultVestingPeriodYears: number;
  /** Strategy for liquidating vested RSUs */
  liquidationStrategy: RsuLiquidationStrategy;
  /** User's marginal income tax rate (%) for RSU grant value taxation */
  marginalTaxRate: number;
  /** Whether user's annual income exceeds ₪721,560 threshold (3% additional tax) */
  subjectTo3PercentSurtax: boolean;
  /** List of RSU grants */
  grants: RsuGrant[];
}

// ============================================================================
// RSU Transaction Types
// ============================================================================

/**
 * Represents a single RSU transaction (vest, sell, hold, forfeit)
 */
export interface RsuTransaction {
  /** ID of the grant this transaction belongs to */
  grantId: number;
  /** Date of the transaction (ISO string) */
  transactionDate: string;
  /** Type of transaction */
  type: RsuTransactionType;
  /** Number of shares involved */
  shares: number;
  /** Price per share at transaction time */
  pricePerShare: number;
  /** Tax rate applied (as decimal, e.g., 0.25 for 25%) */
  taxRate: number;
  /** Total tax amount paid */
  taxAmount: number;
  /** Whether Section 102 benefit was applied */
  section102Applied: boolean;
}

// ============================================================================
// RSU Timeline Types
// ============================================================================

/**
 * RSU data for a single year in the simulation
 */
export interface RsuYearlyData {
  /** Calendar year */
  year: number;
  /** Number of shares that vested this year */
  sharesVested: number;
  /** Number of shares sold this year */
  sharesSold: number;
  /** Number of vested shares still held (vested but not sold) */
  sharesHeld: number;
  /** Total remaining shares (vested + unvested - sold), i.e. not yet sold */
  totalRemainingShares: number;
  /** Number of unvested shares forfeited (at retirement) */
  sharesForfeited: number;
  /** Market value of all shares */
  marketValue: number;
  /** Value of forfeited shares */
  forfeitedValue: number;
  /** Gross proceeds from sales before tax */
  grossSaleProceeds: number;
  /** Net proceeds from sales after tax */
  netSaleProceeds: number;
  /** Total taxes paid on RSU transactions this year */
  taxesPaid: number;
  /** Projected stock price for this year */
  projectedStockPrice: number;
  /** Individual transactions that occurred this year */
  transactions: RsuTransaction[];
}

// ============================================================================
// RSU Summary Types
// ============================================================================

/**
 * Summary of RSU holdings and activity
 */
export interface RsuSummary {
  /** Total shares granted across all grants */
  totalSharesGranted: number;
  /** Total shares that have vested */
  totalSharesVested: number;
  /** Total shares not yet vested */
  totalSharesUnvested: number;
  /** Total vested shares still held (not sold) */
  totalSharesHeld: number;
  /** Total shares sold */
  totalSharesSold: number;
  /** Total shares lost due to forfeiture at retirement */
  totalSharesForfeited: number;
  /** Current market value of all shares */
  currentMarketValue: number;
  /** Total net proceeds received from all sales */
  totalProceedsToDate: number;
  /** Total taxes paid on all RSU transactions */
  totalTaxesPaid: number;
  /** Dollar value of forfeited shares */
  forfeitedValue: number;
  /** Percentage of total grant value lost to forfeiture (0-100) */
  forfeiturePercentage: number;
}

// ============================================================================
// RSU Calculation Result Types (for API response)
// ============================================================================

/**
 * RSU-specific fields added to FireCalculationResult
 */
export interface RsuCalculationResult {
  /** RSU timeline data for each year */
  rsuTimeline: RsuYearlyData[];
  /** Total RSU value at retirement year */
  totalRsuValueAtRetirement: number;
  /** Total net proceeds from all RSU sales */
  totalRsuNetProceeds: number;
  /** Total taxes paid on RSU transactions */
  totalRsuTaxesPaid: number;
  /** Current RSU summary */
  rsuSummary: RsuSummary | null;
}

/**
 * RSU Summary extended with projection fields used by UI
 */
export interface RsuSummaryWithProjection extends RsuSummary {
  /** Projected net value at retirement (after taxes and proceeds) */
  projectedNetValue: number;
  /** Projected total tax on all RSU sales */
  projectedTax: number;
}

// ============================================================================
// RSU Constants
// ============================================================================

/**
 * Section 102 constants for Israeli tax law
 */
export const RSU_CONSTANTS = {
  /** Number of years shares must be held after grant for Section 102 benefit */
  SECTION_102_HOLDING_PERIOD_YEARS: 2,
  /** Israeli income threshold for 3% surtax (2024 value in ILS) */
  SURTAX_THRESHOLD_ILS: 721560,
  /** Additional surtax rate for high income earners */
  SURTAX_RATE: 0.03,
  /** Default marginal tax rate (top Israeli bracket) */
  DEFAULT_MARGINAL_TAX_RATE: 47,
  /** Default capital gains tax rate */
  DEFAULT_CAPITAL_GAINS_TAX_RATE: 25,
  /** Maximum number of RSU grants allowed */
  MAX_RSU_GRANTS: 50,
  /** Soft limit for RSU grants (show warning above this) */
  SOFT_LIMIT_RSU_GRANTS: 30,
  /** Default vesting period in years */
  DEFAULT_VESTING_PERIOD_YEARS: 4,
  /** Minimum valid vesting period in years */
  MIN_VESTING_PERIOD_YEARS: 1,
  /** Maximum valid vesting period in years */
  MAX_VESTING_PERIOD_YEARS: 10,
} as const;

// ============================================================================
// RSU Chart Types
// ============================================================================

/**
 * Data point for RSU value chart
 */
export interface RsuChartDataPoint {
  year: number;
  /** Total market value (held + unvested for pre-retirement) */
  totalValue: number;
  /** Value of vested shares only */
  vestedValue: number;
  /** Value of held shares (vested but not sold) */
  heldValue: number;
  /** Cumulative net proceeds from sales */
  cumulativeProceeds: number;
  /** Total net value: held shares after tax + cumulative proceeds */
  totalNetValue: number;
  /** Is this the retirement year? */
  isRetirementYear: boolean;
}

/**
 * Options for RSU value chart
 */
export interface RsuChartOptions {
  /** Canvas element ID */
  canvasId: string;
  /** RSU timeline data (aggregated) */
  data: RsuYearlyData[];
  /** Per-grant timeline data */
  grantTimelines?: { grantId: number; grantName: string; grantDate: string; timeline: { year: number; value: number; sharesHeld: number; cumulativeVested: number; totalRemainingShares: number }[] }[];
  /** Display currency */
  currency: Currency;
  /** USD/ILS exchange rate */
  usdIlsRate: number;
  /** Early retirement year (for vertical line) */
  earlyRetirementYear: number;
  /** Average cost basis per share (for net value calculation) */
  costBasisPerShare?: number;
}
