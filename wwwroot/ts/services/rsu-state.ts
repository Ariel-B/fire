/**
 * RSU State Management Module
 * Manages RSU grants and configuration state separately from main app state
 */

import type { Currency } from '../types/index.js';
import type {
  RsuGrant,
  RsuConfiguration,
  RsuSummary,
  RsuSummaryWithProjection,
  RsuYearlyData,
  VestingScheduleType,
  RsuLiquidationStrategy
} from '../types/rsu-types.js';
import { calculateSection102Tax, aggregateMonthlyToYearly } from './rsu-calculations.js';
import { RSU_CONSTANTS } from '../types/rsu-types.js';
import { Money } from '../types/money.js';

// ============================================================================
// RSU State Interface
// ============================================================================

/**
 * RSU-specific application state
 */
export interface RsuState {
  /** RSU configuration including all grants */
  configuration: RsuConfiguration;
  /** Next available grant ID */
  nextGrantId: number;
  /** Whether RSU tab is currently active */
  isActive: boolean;
  /** Whether RSU is included in FIRE calculations */
  includeInCalculations: boolean;
  /** Last calculated RSU summary */
  lastSummary: RsuSummary | null;
  /** Last calculated RSU timeline */
  lastTimeline: RsuYearlyData[];
  /** Loading state for API calls */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

// ============================================================================
// Initial State
// ============================================================================

/**
 * Create default RSU configuration
 * Initializes both legacy decimal + currency fields and typed Money fields
 */
function createDefaultConfiguration(): RsuConfiguration {
  return {
    stockSymbol: '',
    currentPricePerShare: 0,
    priceIsFromApi: false,
    currency: '$',
    // Initialize Money typed field for type-safe operations
    currentPricePerShareTyped: Money.usd(0),
    expectedAnnualReturn: 10,
    returnMethod: 'CAGR',
    defaultVestingPeriodYears: RSU_CONSTANTS.DEFAULT_VESTING_PERIOD_YEARS,
    liquidationStrategy: 'SellAfter2Years',
    marginalTaxRate: RSU_CONSTANTS.DEFAULT_MARGINAL_TAX_RATE,
    subjectTo3PercentSurtax: true,
    grants: []
  };
}

/**
 * Initial RSU state
 */
const initialState: RsuState = {
  configuration: createDefaultConfiguration(),
  nextGrantId: 1,
  isActive: false,
  includeInCalculations: true,
  lastSummary: null,
  lastTimeline: [],
  isLoading: false,
  error: null
};

// ============================================================================
// State Instance
// ============================================================================

let rsuState: RsuState = { ...initialState };

// ============================================================================
// State Getters
// ============================================================================

/**
 * Get current RSU state
 */
export function getRsuState(): RsuState {
  return rsuState;
}

/**
 * Get RSU configuration
 */
export function getRsuConfiguration(): RsuConfiguration {
  return rsuState.configuration;
}

/**
 * Get all RSU grants
 */
export function getRsuGrants(): RsuGrant[] {
  return rsuState.configuration.grants;
}

/**
 * Get a specific grant by ID
 */
export function getRsuGrant(id: number): RsuGrant | undefined {
  return rsuState.configuration.grants.find(g => g.id === id);
}

/**
 * Check if RSU should be included in calculations
 */
export function isRsuEnabled(): boolean {
  return rsuState.includeInCalculations && rsuState.configuration.grants.length > 0;
}

/**
 * Get last calculated RSU summary
 */
export function getLastRsuSummary(): RsuSummary | null {
  return rsuState.lastSummary;
}

/**
 * Get last calculated RSU timeline
 */
export function getLastRsuTimeline(): RsuYearlyData[] {
  return rsuState.lastTimeline;
}

// ============================================================================
// State Setters
// ============================================================================

/**
 * Update RSU configuration
 * Automatically syncs the Money typed field when price or currency is updated
 */
export function updateRsuConfiguration(updates: Partial<RsuConfiguration>): void {
  const updatedConfig = {
    ...rsuState.configuration,
    ...updates
  };

  // Sync Money typed field if price or currency was updated
  if ('currentPricePerShare' in updates || 'currency' in updates) {
    updatedConfig.currentPricePerShareTyped = Money.create(
      updatedConfig.currentPricePerShare,
      updatedConfig.currency
    );
  }

  rsuState.configuration = updatedConfig;
  notifyListeners();
}

/**
 * Set RSU stock symbol
 */
export function setRsuStockSymbol(symbol: string): void {
  rsuState.configuration.stockSymbol = symbol.toUpperCase().trim();
  notifyListeners();
}

/**
 * Set RSU current price
 * Automatically syncs the Money typed field
 */
export function setRsuCurrentPrice(price: number, currency: Currency = '$'): void {
  rsuState.configuration.currentPricePerShare = price;
  rsuState.configuration.currency = currency;
  // Sync Money typed field
  rsuState.configuration.currentPricePerShareTyped = Money.create(price, currency);
  notifyListeners();
}

/**
 * Set RSU expected annual return
 */
export function setRsuExpectedReturn(rate: number, method: 'CAGR' | 'Fixed' = 'CAGR'): void {
  rsuState.configuration.expectedAnnualReturn = rate;
  rsuState.configuration.returnMethod = method;
  notifyListeners();
}

/**
 * Set RSU marginal tax rate
 */
export function setRsuMarginalTaxRate(rate: number): void {
  rsuState.configuration.marginalTaxRate = Math.max(0, Math.min(100, rate));
  notifyListeners();
}

/**
 * Set RSU surtax eligibility
 */
export function setRsuSurtaxEligibility(eligible: boolean): void {
  rsuState.configuration.subjectTo3PercentSurtax = eligible;
  notifyListeners();
}

/**
 * Set RSU liquidation strategy
 */
export function setRsuLiquidationStrategy(strategy: RsuLiquidationStrategy): void {
  rsuState.configuration.liquidationStrategy = strategy;
  notifyListeners();
}

/**
 * Toggle RSU inclusion in calculations
 */
export function setRsuIncludeInCalculations(include: boolean): void {
  rsuState.includeInCalculations = include;
  notifyListeners();
}

// ============================================================================
// Grant Management
// ============================================================================

/**
 * Create a new RSU grant with default values
 * Initializes both legacy decimal + currency fields and typed Money fields
 */
export function createRsuGrant(overrides?: Partial<RsuGrant>): RsuGrant {
  const price = overrides?.priceAtGrant ?? rsuState.configuration.currentPricePerShare ?? 0;
  const currency = overrides?.currency ?? rsuState.configuration.currency ?? '$';
  const grant: RsuGrant = {
    id: rsuState.nextGrantId,
    grantDate: new Date().toISOString().split('T')[0],
    numberOfShares: 0,
    sharesSold: 0,
    priceAtGrant: price,
    currency: currency,
    // Initialize Money typed field for type-safe operations
    priceAtGrantTyped: Money.create(price, currency),
    vestingPeriodYears: rsuState.configuration.defaultVestingPeriodYears,
    vestingType: 'Standard',
    ...overrides
  };
  return grant;
}

/**
 * Add a new RSU grant
 */
export function addRsuGrant(grant: RsuGrant): void {
  // Check grant limit
  if (rsuState.configuration.grants.length >= RSU_CONSTANTS.MAX_RSU_GRANTS) {
    rsuState.error = `Maximum ${RSU_CONSTANTS.MAX_RSU_GRANTS} grants allowed`;
    notifyListeners();
    return;
  }

  // Warn if approaching limit
  if (rsuState.configuration.grants.length >= RSU_CONSTANTS.SOFT_LIMIT_RSU_GRANTS) {
    console.warn(`Warning: ${rsuState.configuration.grants.length + 1} RSU grants may slow calculations`);
  }

  rsuState.configuration.grants.push(grant);
  rsuState.nextGrantId++;
  rsuState.error = null;
  notifyListeners();
}

/**
 * Update an existing RSU grant
 * Automatically syncs the Money typed field when price or currency is updated
 */
export function updateRsuGrant(id: number, updates: Partial<RsuGrant>): void {
  const index = rsuState.configuration.grants.findIndex(g => g.id === id);
  if (index === -1) {
    rsuState.error = `Grant ${id} not found`;
    notifyListeners();
    return;
  }

  const updatedGrant = {
    ...rsuState.configuration.grants[index],
    ...updates
  };

  // Sync Money typed field if price or currency was updated
  if ('priceAtGrant' in updates || 'currency' in updates) {
    updatedGrant.priceAtGrantTyped = Money.create(
      updatedGrant.priceAtGrant,
      updatedGrant.currency
    );
  }

  rsuState.configuration.grants[index] = updatedGrant;
  rsuState.error = null;
  notifyListeners();
}

/**
 * Remove an RSU grant
 */
export function removeRsuGrant(id: number): void {
  const index = rsuState.configuration.grants.findIndex(g => g.id === id);
  if (index === -1) {
    rsuState.error = `Grant ${id} not found`;
    notifyListeners();
    return;
  }

  rsuState.configuration.grants.splice(index, 1);
  rsuState.error = null;
  notifyListeners();
}

/**
 * Remove all RSU grants
 */
export function clearRsuGrants(): void {
  rsuState.configuration.grants = [];
  rsuState.error = null;
  notifyListeners();
}

// ============================================================================
// Calculation Results
// ============================================================================

/**
 * Update RSU calculation results
 */
export function setRsuCalculationResults(
  summary: RsuSummary | null,
  timeline: RsuYearlyData[]
): void {
  rsuState.lastSummary = summary;
  rsuState.lastTimeline = timeline;
  notifyListeners();
}

/**
 * Set loading state
 */
export function setRsuLoading(isLoading: boolean): void {
  rsuState.isLoading = isLoading;
  notifyListeners();
}

/**
 * Set error state
 */
export function setRsuError(error: string | null): void {
  rsuState.error = error;
  notifyListeners();
}

// ============================================================================
// Vesting Calculations (Client-side)
// ============================================================================

/**
 * Calculate vested shares for a grant as of a specific date (client-side)
 */
export function calculateVestedShares(grant: RsuGrant, asOfDate: Date): number {
  const grantDate = new Date(grant.grantDate);

  // Calculate completed calendar years (inclusive of exact anniversary day).
  // Using calendar-year arithmetic avoids the 365.25-day floating-point error
  // where a grant exactly 2 years old evaluates to 1.9986... elapsed years and
  // floors to 1 completed year instead of 2.
  let completedCalendarYears = asOfDate.getFullYear() - grantDate.getFullYear();
  if (
    asOfDate.getMonth() < grantDate.getMonth() ||
    (asOfDate.getMonth() === grantDate.getMonth() && asOfDate.getDate() < grantDate.getDate())
  ) {
    completedCalendarYears--;
  }

  // Fully vested
  if (completedCalendarYears >= grant.vestingPeriodYears) {
    return grant.numberOfShares;
  }

  // Standard vesting: 1-year cliff, then 25% yearly
  if (grant.vestingType === 'Standard') {
    if (completedCalendarYears < 1) {
      return 0; // Before cliff
    }
    const vestingRate = Math.min(1.0, completedCalendarYears * 0.25);
    return Math.floor(grant.numberOfShares * vestingRate);
  }

  // Linear vesting (fallback) — use elapsed milliseconds for fractional precision
  const elapsedMs = asOfDate.getTime() - grantDate.getTime();
  const elapsedYears = elapsedMs / (365.25 * 24 * 60 * 60 * 1000);
  const linearRate = elapsedYears / grant.vestingPeriodYears;
  return Math.floor(grant.numberOfShares * Math.min(1.0, linearRate));
}

/**
 * Get Section 102 eligible date for a grant
 */
export function getSection102EligibleDate(grant: RsuGrant): Date {
  const grantDate = new Date(grant.grantDate);
  return new Date(grantDate.getFullYear() + RSU_CONSTANTS.SECTION_102_HOLDING_PERIOD_YEARS,
    grantDate.getMonth(), grantDate.getDate());
}

/**
 * Check if shares from a grant are Section 102 eligible
 */
export function isSection102Eligible(grant: RsuGrant, asOfDate: Date = new Date()): boolean {
  const eligibleDate = getSection102EligibleDate(grant);
  return asOfDate >= eligibleDate;
}

/**
 * Calculate Section 102 eligible shares for a grant
 * Per IBI: "הטבת המס ניתנת רק אם המימוש מתבצע לאחר 24 חודשים לפחות ממועד ההקצאה"
 * After 2 years from grant date, all vested shares are 102 eligible
 * 
 * @param grant - The RSU grant
 * @param asOfDate - Date to calculate eligibility (default: now)
 * @returns Number of shares eligible for Section 102 tax treatment (25% capital gains)
 */
export function calculateSection102EligibleShares(grant: RsuGrant, asOfDate: Date = new Date()): number {
  const sharesSold = grant.sharesSold || 0;
  
  // If grant is not yet 2 years old, no shares are 102 eligible
  if (!isSection102Eligible(grant, asOfDate)) {
    return 0;
  }
  
  // After 2 years from grant, all vested shares (minus sold) are 102 eligible
  const vestedShares = calculateVestedShares(grant, asOfDate);
  return Math.max(0, vestedShares - sharesSold);
}

/**
 * Calculate current RSU summary (client-side approximation)
 */
export function calculateCurrentRsuSummary(): RsuSummary {
  const config = rsuState.configuration;
  const now = new Date();

  const summary: RsuSummary = {
    totalSharesGranted: 0,
    totalSharesVested: 0,
    totalSharesUnvested: 0,
    totalSharesHeld: 0,
    totalSharesSold: 0,
    totalSharesForfeited: 0,
    currentMarketValue: 0,
    totalProceedsToDate: 0,
    totalTaxesPaid: 0,
    forfeitedValue: 0,
    forfeiturePercentage: 0
  };

  for (const grant of config.grants) {
    const vested = calculateVestedShares(grant, now);
    summary.totalSharesGranted += grant.numberOfShares;
    summary.totalSharesVested += vested;
    summary.totalSharesUnvested += (grant.numberOfShares - vested);
  }

  // For current summary, all vested shares are held (not yet sold)
  summary.totalSharesHeld = summary.totalSharesVested;
  summary.currentMarketValue = summary.totalSharesGranted * config.currentPricePerShare;

  return summary;
}

// ============================================================================
// State Persistence
// ============================================================================

const RSU_STORAGE_KEY = 'firePlanningTool_rsuState';

/**
 * Save RSU state to localStorage
 */
export function saveRsuState(): void {
  try {
    const stateToSave = {
      configuration: rsuState.configuration,
      nextGrantId: rsuState.nextGrantId,
      includeInCalculations: rsuState.includeInCalculations
    };
    localStorage.setItem(RSU_STORAGE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('Failed to save RSU state:', error);
  }
}

/**
 * Load RSU state from localStorage
 */
export function loadRsuState(): void {
  try {
    const saved = localStorage.getItem(RSU_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      rsuState.configuration = {
        ...createDefaultConfiguration(),
        ...parsed.configuration
      };
      rsuState.nextGrantId = parsed.nextGrantId || 1;
      rsuState.includeInCalculations = parsed.includeInCalculations ?? true;
      notifyListeners();
    }
  } catch (error) {
    console.error('Failed to load RSU state:', error);
  }
}

/**
 * Clear RSU state from localStorage
 */
export function clearRsuStorage(): void {
  try {
    localStorage.removeItem(RSU_STORAGE_KEY);
    rsuState = { ...initialState };
    notifyListeners();
  } catch (error) {
    console.error('Failed to clear RSU storage:', error);
  }
}

/**
 * Reset RSU state to initial values
 */
export function resetRsuState(): void {
  rsuState = {
    ...initialState,
    configuration: createDefaultConfiguration()
  };
  notifyListeners();
}

// ============================================================================
// State Change Listeners
// ============================================================================

type RsuStateListener = (state: RsuState) => void;
const listeners: RsuStateListener[] = [];

/**
 * Subscribe to RSU state changes
 */
export function subscribeToRsuState(listener: RsuStateListener): () => void {
  listeners.push(listener);
  // Return unsubscribe function
  return () => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
    }
  };
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(rsuState);
    } catch (error) {
      console.error('RSU state listener error:', error);
    }
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate RSU configuration
 */
export function validateRsuConfiguration(): string[] {
  const errors: string[] = [];
  const config = rsuState.configuration;

  if (config.grants.length > 0) {
    if (!config.stockSymbol) {
      errors.push('Stock symbol is required');
    }
    if (config.currentPricePerShare <= 0) {
      errors.push('Current price must be greater than 0');
    }
  }

  for (const grant of config.grants) {
    if (grant.numberOfShares <= 0) {
      errors.push(`Grant ${grant.id}: Number of shares must be greater than 0`);
    }
    if (grant.priceAtGrant <= 0) {
      errors.push(`Grant ${grant.id}: Grant price must be greater than 0`);
    }
    if (grant.vestingPeriodYears < RSU_CONSTANTS.MIN_VESTING_PERIOD_YEARS ||
        grant.vestingPeriodYears > RSU_CONSTANTS.MAX_VESTING_PERIOD_YEARS) {
      errors.push(`Grant ${grant.id}: Vesting period must be between ${RSU_CONSTANTS.MIN_VESTING_PERIOD_YEARS} and ${RSU_CONSTANTS.MAX_VESTING_PERIOD_YEARS} years`);
    }
    const grantDate = new Date(grant.grantDate);
    if (grantDate > new Date()) {
      errors.push(`Grant ${grant.id}: Grant date cannot be in the future`);
    }
  }

  return errors;
}

/**
 * Check if RSU configuration is valid
 */
export function isRsuConfigurationValid(): boolean {
  return validateRsuConfiguration().length === 0;
}

/**
 * Calculate total vested shares for a grant at a given year
 * Uses direct calculation to avoid rounding errors from percentage-based deltas
 */
export function calculateVestedSharesForYear(grant: RsuGrant, year: number): number {
  const grantDate = new Date(grant.grantDate);
  const grantYear = grantDate.getFullYear();
  const yearsFromGrant = year - grantYear;
  
  if (yearsFromGrant >= grant.vestingPeriodYears) {
    // Fully vested - return all shares
    return grant.numberOfShares;
  } else if (yearsFromGrant >= 1) {
    // Standard 4-year vesting with 1-year cliff
    // After cliff (year 1+), vest 25% per year
    const vestingTranches = Math.floor(yearsFromGrant);
    const sharesPerTranche = Math.floor(grant.numberOfShares / grant.vestingPeriodYears);
    const remainder = grant.numberOfShares % grant.vestingPeriodYears;
    
    // Calculate vested shares: sharesPerTranche * tranches, plus remainder for completed tranches
    // For 145 shares over 4 years: each tranche gets 36, plus 1 extra to distribute
    // Vest as: 36+1=37 (year 1), 36 (year 2), 36 (year 3), 36 (year 4)
    let vestedShares = sharesPerTranche * vestingTranches;
    
    // Add remainder shares as they complete final tranches
    // Remainder is added to the last tranche(s), so only add once we've completed enough tranches
    if (vestingTranches >= grant.vestingPeriodYears) {
      vestedShares += remainder;
    } else if (remainder > 0 && vestingTranches === grant.vestingPeriodYears - 1) {
      // Last tranche gets the remainder
      vestedShares += remainder;
    }
    
    return vestedShares;
  }
  
  return 0; // Not yet at cliff
}

/**
 * Monthly RSU data point for shares chart
 */
export interface MonthlySharesData {
  /** Date of this data point */
  date: Date;
  /** Month label for display (e.g., "Jan 2025") */
  label: string;
  /** Cumulative vested shares */
  cumulativeVested: number;
  /** Cumulative sold shares */
  cumulativeSold: number;
}

/**
 * Calculate monthly vested and sold shares for chart display
 * Generates data points from now until retirement year
 * Uses proper Section 102 logic: can sell vested shares 2 years after GRANT DATE
 * 
 * The strategy only sells NEWLY vested shares going forward, not shares that
 * were vested before the chart start date (to respect user's current holdings)
 */
export function calculateMonthlySharesTimeline(retirementYear: number): MonthlySharesData[] {
  const config = rsuState.configuration;
  const grants = config.grants;
  
  if (grants.length === 0) {
    return [];
  }
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(retirementYear, 11, 31); // End of retirement year
  
  const liquidationStrategy = config.liquidationStrategy;
  
  const timeline: MonthlySharesData[] = [];
  
  // Hebrew month names
  const hebrewMonths = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  
  // Track state per grant
  interface GrantState {
    soldShares: number;           // Cumulative sold shares
    lastVestedShares: number;     // Vested shares at previous month (to detect new vesting)
    is102Eligible: boolean;       // Whether grant has reached 102 eligibility (24 months from grant)
  }
  const grantState: Map<number, GrantState> = new Map();
  
  // Initialize grant state with current sold shares and current vested shares
  // Check if grant is already 102-eligible at start
  // For grants already 102-eligible, sell all held shares immediately (optimal strategy)
  for (const grant of grants) {
    const grantDate = new Date(grant.grantDate);
    const monthsSinceGrant = (startDate.getFullYear() - grantDate.getFullYear()) * 12 + 
                              (startDate.getMonth() - grantDate.getMonth());
    const currentVested = calculateVestedShares(grant, startDate);
    const alreadyEligible = monthsSinceGrant >= 24;
    
    // If already 102-eligible and liquidation strategy is SellAfter2Years,
    // sell all currently held shares (vested - sold) immediately
    let initialSold = grant.sharesSold || 0;
    if (alreadyEligible && liquidationStrategy === 'SellAfter2Years') {
      // Sell all vested shares that are currently held
      initialSold = currentVested;
    }
    
    grantState.set(grant.id, {
      soldShares: initialSold,
      lastVestedShares: currentVested,
      is102Eligible: alreadyEligible
    });
  }
  
  // Iterate month by month
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Calculate cumulative vested and sold at this month across all grants
    let cumulativeVested = 0;
    let cumulativeSold = 0;
    
    for (const grant of grants) {
      const grantDate = new Date(grant.grantDate);
      const vestedShares = calculateVestedShares(grant, currentDate);
      cumulativeVested += vestedShares;
      
      // Get grant state
      const state = grantState.get(grant.id)!;
      
      if (liquidationStrategy === 'SellAfter2Years') {
        // Check if grant is Section 102 eligible (2 years from grant date)
        const monthsSinceGrant = (year - grantDate.getFullYear()) * 12 + (month - grantDate.getMonth());
        const is102Eligible = monthsSinceGrant >= 24;
        
        if (is102Eligible) {
          // When grant first becomes 102-eligible, sell ALL currently vested shares (the backlog)
          // After that, sell only newly vested shares each month
          if (!state.is102Eligible) {
            // First time becoming eligible - sell all vested shares minus what's already sold
            state.is102Eligible = true;
            const vestedNotSold = vestedShares - state.soldShares;
            if (vestedNotSold > 0) {
              state.soldShares += vestedNotSold;
            }
          } else {
            // Already was eligible - just sell newly vested shares
            const newlyVested = Math.max(0, vestedShares - state.lastVestedShares);
            if (newlyVested > 0) {
              state.soldShares += newlyVested;
            }
          }
        }
      }
      
      // Update last vested for next iteration
      state.lastVestedShares = vestedShares;
      
      cumulativeSold += state.soldShares;
    }
    
    // At retirement (December of retirement year), sell ALL remaining held shares
    // This includes both unvested shares that finally vest and any held shares from before
    if (year === retirementYear && month === 11) {
      // Force sell everything - update each grant's sold count to match vested
      for (const grant of grants) {
        const vestedShares = calculateVestedShares(grant, currentDate);
        const state = grantState.get(grant.id)!;
        if (state.soldShares < vestedShares) {
          state.soldShares = vestedShares;
        }
      }
      // Recalculate total sold
      cumulativeSold = 0;
      for (const grant of grants) {
        cumulativeSold += grantState.get(grant.id)!.soldShares;
      }
    }
    
    // Format label: "ינו׳ 2025"
    const label = `${hebrewMonths[month]} ${year}`;
    
    

    timeline.push({
      date: new Date(currentDate),
      label,
      cumulativeVested,
      cumulativeSold
    });
    
    // Move to next month
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  return timeline;
}

/**
 * Monthly RSU data point for value chart
 */
export interface MonthlyValueData {
  /** Date of this data point */
  date: Date;
  /** Month label for display (e.g., "ינו׳ 2025") */
  label: string;
  /** Total market value of all shares (held + unvested that will vest) */
  totalValue: number;
  /** Net value after estimated tax (held shares after tax + cumulative proceeds) */
  totalNetValue: number;
  /** Cumulative net proceeds from sales */
  cumulativeProceeds: number;
  /** Cumulative taxes paid (sum of taxes for all grants up to this month) */
  cumulativeTaxes: number;
  /** Total gross proceeds (sum of gross proceed amounts before tax across all grants) */
  totalGrossProceeds: number;
  /** Per-grant breakdown of cumulative gross/net/taxes up to this month */
  perGrant: { grantId: number; cumulativeGrossProceeds: number; cumulativeProceeds: number; cumulativeTaxes: number }[];
}

/**
 * Calculate canonical monthly RSU values for chart display
 * Generates data points from now until retirement year and is the single source-of-truth
 * for all timeline calculations and projections (replaces legacy calculateMonthlyValueTimeline).
 */
export function calculateCanonicalMonthlyTimeline(retirementYear: number): MonthlyValueData[] {
  const config = rsuState.configuration;
  const grants = config.grants;
  
  if (grants.length === 0 || config.currentPricePerShare <= 0) {
    return [];
  }
  
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(retirementYear, 11, 31); // End of retirement year
  
  const liquidationStrategy = config.liquidationStrategy;
  const expectedReturn = config.expectedAnnualReturn / 100;
  const section102TaxRate = 0.25; // 25% capital gains tax
  
  const timeline: MonthlyValueData[] = [];
  
  // Hebrew month names
  const hebrewMonths = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
  
  // Track state per grant
  interface GrantState {
    soldShares: number;           // Cumulative sold shares
    cumulativeProceeds: number;   // Cumulative net proceeds from sales (future sales only)
    lastVestedShares: number;     // Vested shares at previous month
    is102Eligible: boolean;       // Whether grant has reached 102 eligibility
    cumulativeTaxes: number;      // Cumulative taxes paid by this grant
    cumulativeGrossProceeds: number; // Cumulative gross proceeds for this grant (before tax)
  }
  const grantState: Map<number, GrantState> = new Map();
  
  // Initialize grant state
  // Note: grant.sharesSold represents shares ALREADY sold by user (historical)
  // We don't count proceeds for those - they're already in the user's bank
  // We only track FUTURE sales based on the liquidation strategy
  for (const grant of grants) {
    const grantDate = new Date(grant.grantDate);
    const monthsSinceGrant = (startDate.getFullYear() - grantDate.getFullYear()) * 12 + 
                              (startDate.getMonth() - grantDate.getMonth());
    const currentVested = calculateVestedShares(grant, startDate);
    const alreadyEligible = monthsSinceGrant >= 24;
    
    // Start with user's already-sold shares (historical, no proceeds tracked)
    let initialSold = grant.sharesSold || 0;
    let initialProceeds = 0;
    let initialTaxes = 0;
    let initialGross = 0;
    
    // If already 102-eligible and liquidation strategy is SellAfter2Years,
    // sell all currently HELD shares (vested but not yet sold) immediately
    if (alreadyEligible && liquidationStrategy === 'SellAfter2Years') {
      const heldShares = currentVested - initialSold;
        if (heldShares > 0) {
        const salePrice = config.currentPricePerShare;
        const costBasis = grant.priceAtGrant * heldShares;
        const grossProceeds = salePrice * heldShares;
        const capitalGain = Math.max(0, grossProceeds - costBasis);
        const tax = capitalGain * section102TaxRate;
        initialProceeds = grossProceeds - tax;
        initialTaxes = tax;
          initialGross = grossProceeds;
        // Record taxes paid for already-102-eligible initial sales so taxes and proceeds
        // are consistent with `grossProceeds - cumulativeProceeds` and `cumulativeTaxes`.
        // (initialTaxes assigned above)
        initialSold = currentVested; // Now all vested shares are sold
      }
    }
    
      grantState.set(grant.id, {
      soldShares: initialSold,
      cumulativeProceeds: initialProceeds,
      lastVestedShares: currentVested,
      is102Eligible: alreadyEligible,
      cumulativeTaxes: initialTaxes || 0,
      cumulativeGrossProceeds: initialGross || 0
    });
  }
  
  // Iterate month by month
  const currentDate = new Date(startDate);
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth();
  
  while (currentDate <= endDate) {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Calculate months from now for price projection
    const monthsFromNow = (year - baseYear) * 12 + (month - baseMonth);
    const projectedPrice = config.currentPricePerShare * Math.pow(1 + expectedReturn, monthsFromNow / 12);
    
    let totalValue = 0;
    let totalHeldShares = 0;
    let totalHeldCostBasis = 0;
    let totalCumulativeProceeds = 0;
    let totalCumulativeTaxes = 0;
    
    for (const grant of grants) {
      const grantDate = new Date(grant.grantDate);
      const vestedShares = calculateVestedShares(grant, currentDate);
      const state = grantState.get(grant.id)!;
      
      // Handle sales based on liquidation strategy
      if (liquidationStrategy === 'SellAfter2Years') {
        const monthsSinceGrant = (year - grantDate.getFullYear()) * 12 + (month - grantDate.getMonth());
        const is102Eligible = monthsSinceGrant >= 24;
        
        if (is102Eligible) {
          if (!state.is102Eligible) {
            // First time becoming eligible - sell all vested shares
            state.is102Eligible = true;
            const sharesToSell = vestedShares - state.soldShares;
            if (sharesToSell > 0) {
              const costBasis = grant.priceAtGrant * sharesToSell;
              const grossProceeds = projectedPrice * sharesToSell;
              const capitalGain = Math.max(0, grossProceeds - costBasis);
              const tax = capitalGain * section102TaxRate;
              state.cumulativeProceeds += grossProceeds - tax;
              state.cumulativeTaxes += tax;
              state.cumulativeGrossProceeds += grossProceeds;
              // This includes both unvested shares that finally vest and any held shares from before
              state.soldShares = vestedShares;
            }
          } else {
            // Already eligible - sell newly vested shares
            const newlyVested = Math.max(0, vestedShares - state.lastVestedShares);
              if (newlyVested > 0) {
              const costBasis = grant.priceAtGrant * newlyVested;
              const grossProceeds = projectedPrice * newlyVested;
              const capitalGain = Math.max(0, grossProceeds - costBasis);
              const tax = capitalGain * section102TaxRate;
              state.cumulativeProceeds += grossProceeds - tax;
              state.cumulativeTaxes += tax;
              state.cumulativeGrossProceeds += grossProceeds;
              state.soldShares += newlyVested;
            }
          }
        }
      }
      
      state.lastVestedShares = vestedShares;
      
      // Calculate held shares and their value
      const heldShares = vestedShares - state.soldShares;
      totalHeldShares += heldShares;
      totalHeldCostBasis += grant.priceAtGrant * heldShares;
      totalCumulativeProceeds += state.cumulativeProceeds;
      
      // Total value includes remaining shares (not yet sold): held + unvested
      const remainingShares = grant.numberOfShares - state.soldShares;
      totalValue += remainingShares * projectedPrice;
    }
    
    // At retirement (December of retirement year), sell ALL remaining held shares
      if (year === retirementYear && month === 11) {
      for (const grant of grants) {
        const vestedShares = calculateVestedShares(grant, currentDate);
        const state = grantState.get(grant.id)!;
        const sharesToSell = Math.max(0, vestedShares - state.soldShares);
        // At retirement, sell all remaining held shares. Taxes may differ
        // depending on Section 102 eligibility and surtax configuration.
        if (sharesToSell > 0) {
          const eligibleShares = calculateSection102EligibleShares(grant, currentDate);
          // Cap eligibleShares at the number we're selling
          const eligibleToSell = Math.min(sharesToSell, Math.max(0, eligibleShares));
          const nonEligibleToSell = Math.max(0, sharesToSell - eligibleToSell);

          let taxTotal = 0;
          if (eligibleToSell > 0) {
            const costBasis102 = grant.priceAtGrant * eligibleToSell;
            const grossProceeds102 = projectedPrice * eligibleToSell;
            const capitalGain102 = Math.max(0, grossProceeds102 - costBasis102);
            const tax102 = capitalGain102 * section102TaxRate;
            taxTotal += tax102;
            state.cumulativeProceeds += grossProceeds102 - tax102;
            state.cumulativeGrossProceeds += grossProceeds102;
          }
          if (nonEligibleToSell > 0) {
            const costBasisNon102 = grant.priceAtGrant * nonEligibleToSell;
            const grossProceedsNon102 = projectedPrice * nonEligibleToSell;
            const capitalGainNon102 = Math.max(0, grossProceedsNon102 - costBasisNon102);
            const marginal = rsuState.configuration.marginalTaxRate / 100;
            const surtax = rsuState.configuration.subjectTo3PercentSurtax ? RSU_CONSTANTS.SURTAX_RATE : 0;
            const taxNon102 = capitalGainNon102 * (marginal + surtax);
            taxTotal += taxNon102;
            state.cumulativeProceeds += grossProceedsNon102 - taxNon102;
            state.cumulativeGrossProceeds += grossProceedsNon102;
          }
          // per-grant retirement sell updated (no debug logs)
          state.cumulativeTaxes += taxTotal;
          state.soldShares = vestedShares;
        }
      }
      // After processing all grants' retirement sells, accumulate cumulativeTaxes totals
      for (const grant of grants) {
          const state = grantState.get(grant.id)!;
          totalCumulativeTaxes += state.cumulativeTaxes;
        }
      // Recalculate totals after retirement sale
      totalHeldShares = 0;
      totalHeldCostBasis = 0;
      totalCumulativeProceeds = 0;
      for (const grant of grants) {
        const state = grantState.get(grant.id)!;
        totalCumulativeProceeds += state.cumulativeProceeds;
      }
    }
    
    // Calculate net value of held shares (after estimated tax)
    const heldGrossValue = totalHeldShares * projectedPrice;
    const heldCapitalGain = Math.max(0, heldGrossValue - totalHeldCostBasis);
    const heldNetValue = heldGrossValue - (heldCapitalGain * section102TaxRate);
    
    // Total net value = net value of held shares + cumulative proceeds
    const totalNetValue = heldNetValue + totalCumulativeProceeds;
    
    const label = `${hebrewMonths[month]} ${year}`;
    
    const perGrantArr = grants.map(g => {
      const s = grantState.get(g.id)!;
      return {
        grantId: g.id,
        cumulativeGrossProceeds: s.cumulativeGrossProceeds || 0,
        cumulativeProceeds: s.cumulativeProceeds || 0,
        cumulativeTaxes: s.cumulativeTaxes || 0
      };
    });

    const totalGross = perGrantArr.reduce((sum, p) => sum + (p.cumulativeGrossProceeds || 0), 0);
    // Ensure total cumulative taxes reflect the sum of per-grant cumulative taxes
    totalCumulativeTaxes = perGrantArr.reduce((sum, p) => sum + (p.cumulativeTaxes || 0), 0);
    const totalTaxSum = perGrantArr.reduce((sum, p) => sum + (p.cumulativeTaxes || 0), 0);

    // (Diagnostics removed)

    timeline.push({
      date: new Date(currentDate),
      label,
      totalValue,
      totalNetValue,
      cumulativeProceeds: totalCumulativeProceeds,
      cumulativeTaxes: totalTaxSum,
      totalGrossProceeds: totalGross,
      perGrant: perGrantArr
    });
    
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  // Cache lastTimeline as yearly data for convenience
  rsuState.lastTimeline = aggregateMonthlyToYearly ? aggregateMonthlyToYearly(timeline as any) : [];
  return timeline;
}

// Deprecated legacy alias removed. Old API calculateMonthlyValueTimeline has been removed
// in favor of calculateCanonicalMonthlyTimeline to encourage a single source-of-truth.

/**
 * Calculate a full RSU summary including projected net and projected tax using
 * the canonical monthly timeline.
 */
export function calculateRsuSummary(retirementYear: number): RsuSummaryWithProjection {
  const currentSummary = calculateCurrentRsuSummary();
  const config = rsuState.configuration;
  // Use the canonical monthly timeline as the authoritative data source for projected values
  const timeline = calculateCanonicalMonthlyTimeline(retirementYear);

  let projectedNetValue = 0;
  let projectedTax = 0;

  if (timeline.length > 0) {
          const final = timeline[timeline.length - 1];
          projectedNetValue = final.totalNetValue || 0;
          projectedTax = final.cumulativeTaxes || 0;
  }

  const summary: RsuSummaryWithProjection = {
    ...currentSummary,
    projectedNetValue,
    projectedTax
  };

  // Cache summary
  rsuState.lastSummary = summary;
  return summary;
}

/**
 * Calculate RSU timeline for chart display (client-side approximation)
 * This provides a simplified projection without the full backend tax calculations
 */
export function calculateRsuTimeline(
  startYear: number,
  endYear: number,
  retirementYear: number
): RsuYearlyData[] {
  const config = rsuState.configuration;
  const grants = config.grants;
  
  if (grants.length === 0 || config.currentPricePerShare <= 0) {
    return [];
  }
  
  const timeline: RsuYearlyData[] = [];
  const expectedReturn = config.expectedAnnualReturn / 100;
  const liquidationStrategy = config.liquidationStrategy;
  
  // Calculate total shares already sold across all grants
  const totalSharesAlreadySold = grants.reduce((sum, g) => sum + (g.sharesSold || 0), 0);
  
  // Calculate total shares vested BEFORE startYear across all grants
  let totalSharesVestedBeforeStart = 0;
  for (const grant of grants) {
    totalSharesVestedBeforeStart += calculateVestedSharesForYear(grant, startYear - 1);
  }
  
  // Track shares pending sale for SellAfter2Years strategy
  // Key: year when shares should be sold, Value: number of shares
  const sharesPendingSale: Map<number, number> = new Map();
  
  // For SellAfter2Years strategy, schedule already-102-eligible shares for immediate sale
  // These are shares that have been vested for 2+ years and haven't been sold yet
  if (liquidationStrategy === 'SellAfter2Years') {
    for (const grant of grants) {
      const grantDate = new Date(grant.grantDate);
      const grantYear = grantDate.getFullYear();
      // A grant is 102-eligible 2 years after grant date
      const eligibleYear = grantYear + 2;
      
      if (eligibleYear <= startYear) {
        // This grant is already 102-eligible, schedule held shares for sale in first year
        const vestedShares = calculateVestedSharesForYear(grant, startYear - 1);
        const sharesSold = grant.sharesSold || 0;
        const heldShares = Math.max(0, vestedShares - sharesSold);
        if (heldShares > 0) {
          const existing = sharesPendingSale.get(startYear) || 0;
          sharesPendingSale.set(startYear, existing + heldShares);
        }
      }
    }
  }
  
  // Start with shares vested before start, minus already sold shares
  let cumulativeHeldShares = totalSharesVestedBeforeStart - totalSharesAlreadySold;
  let cumulativeNetProceeds = 0;
  
  for (let year = startYear; year <= endYear; year++) {
    const yearsFromNow = year - new Date().getFullYear();
    const projectedPrice = config.currentPricePerShare * Math.pow(1 + expectedReturn, yearsFromNow);
    
    let sharesVestedThisYear = 0;
    let sharesSoldThisYear = 0;
    let sharesHeldThisYear = 0;
    let sharesForfeited = 0;
    
    // Calculate vesting for each grant using direct share calculation to avoid rounding errors
    for (const grant of grants) {
      const vestedThisYear = calculateVestedSharesForYear(grant, year);
      const vestedPrevYear = calculateVestedSharesForYear(grant, year - 1);
      const newVestedShares = vestedThisYear - vestedPrevYear;
      sharesVestedThisYear += newVestedShares;
      
      // At retirement, unvested shares are forfeited
      if (year === retirementYear) {
        const unvested = grant.numberOfShares - vestedThisYear;
        sharesForfeited += unvested;
      }
    }
    
    // Add vested shares to held shares
    cumulativeHeldShares += sharesVestedThisYear;
    
    // SellAfter2Years strategy: schedule shares to be sold 2 years after vesting
    if (liquidationStrategy === 'SellAfter2Years' && sharesVestedThisYear > 0) {
      const sellYear = year + 2;
      const existing = sharesPendingSale.get(sellYear) || 0;
      sharesPendingSale.set(sellYear, existing + sharesVestedThisYear);
    }
    
    // Calculate shares to sell this year based on strategy
    if (liquidationStrategy === 'SellAfter2Years') {
      // Sell shares that were vested 2 years ago (Section 102 eligible)
      const pendingShares = sharesPendingSale.get(year) || 0;
      if (pendingShares > 0 && cumulativeHeldShares > 0) {
        sharesSoldThisYear = Math.min(pendingShares, cumulativeHeldShares);
        sharesPendingSale.delete(year);
      }
      
      // At retirement, also sell any remaining held shares
      if (year === retirementYear && cumulativeHeldShares > sharesSoldThisYear) {
        sharesSoldThisYear = cumulativeHeldShares;
      }
    }
    
    // Calculate net proceeds for shares sold
    if (sharesSoldThisYear > 0) {
      // Calculate net proceeds (simplified: 25% capital gains tax on profit)
      const section102TaxRate = 0.25;
      // Calculate cost basis only for remaining shares (excluding already sold)
      const totalRemainingShares = grants.reduce((sum, g) => sum + g.numberOfShares - (g.sharesSold || 0), 0);
      const totalCostBasis = grants.reduce((sum, g) => {
        const remaining = g.numberOfShares - (g.sharesSold || 0);
        return sum + g.priceAtGrant * remaining;
      }, 0);
      const avgCostBasis = totalRemainingShares > 0 ? totalCostBasis / totalRemainingShares : 0;
      const profit = (projectedPrice - avgCostBasis) * sharesSoldThisYear;
      const taxOnSale = profit > 0 ? profit * section102TaxRate : 0;
      const grossProceeds = projectedPrice * sharesSoldThisYear;
      const netProceeds = grossProceeds - taxOnSale;
      
      cumulativeNetProceeds += netProceeds;
      cumulativeHeldShares -= sharesSoldThisYear;
    }
    
    // Ensure held shares doesn't go below 0
    sharesHeldThisYear = Math.max(0, cumulativeHeldShares);
    
    // Calculate total market value (for remaining shares)
    const totalShares = grants.reduce((sum, g) => {
      const sharesSold = g.sharesSold || 0;
      const remainingShares = g.numberOfShares - sharesSold;
      
      // Use actual vesting calculation
      const vestedShares = calculateVestedSharesForYear(g, year);
      
      // Before retirement: count remaining unvested shares too
      if (year < retirementYear) {
        return sum + remainingShares;
      }
      // After retirement: only count vested remaining shares
      return sum + Math.max(0, vestedShares - sharesSold);
    }, 0);
    
    // Calculate total remaining shares (vested + unvested - sold)
    // This includes unvested shares before retirement, but they are forfeited at retirement
    const totalRemainingShares = grants.reduce((sum, g) => {
      const sharesSold = g.sharesSold || 0;
      const remainingShares = g.numberOfShares - sharesSold;
      
      // Before retirement: all remaining shares (vested + unvested)
      if (year < retirementYear) {
        return sum + remainingShares;
      }
      // At/after retirement: unvested shares are forfeited
      const vestedShares = calculateVestedSharesForYear(g, year);
      return sum + Math.max(0, vestedShares - sharesSold);
    }, 0);
    
    // Market value uses held shares (vested only, as unvested can't be sold)
    const marketValue = sharesHeldThisYear * projectedPrice;
    
    // Calculate net sale proceeds for THIS year only (delta from cumulative)
    const previousCumulativeProceeds = timeline.reduce((sum, t) => sum + (t.netSaleProceeds || 0), 0);
    const netSaleProceedsThisYear = sharesSoldThisYear > 0 ? cumulativeNetProceeds - previousCumulativeProceeds : 0;
    
    timeline.push({
      year,
      sharesVested: sharesVestedThisYear,
      sharesSold: sharesSoldThisYear,
      sharesHeld: sharesHeldThisYear,
      totalRemainingShares: totalRemainingShares - sharesSoldThisYear, // Remaining after this year's sales
      sharesForfeited,
      marketValue,
      forfeitedValue: sharesForfeited * projectedPrice,
      grossSaleProceeds: sharesSoldThisYear * projectedPrice,
      netSaleProceeds: netSaleProceedsThisYear,
      taxesPaid: 0, // Simplified
      projectedStockPrice: projectedPrice,
      transactions: []
    });
  }
  
  return timeline;
}

/**
 * Per-grant timeline data for chart display
 */
export interface GrantTimelineData {
  grantId: number;
  grantName: string;
  grantDate: string;
  initialSharesSold: number;  // Shares already sold from this grant before chart start year
  timeline: { year: number; value: number; sharesHeld: number; cumulativeVested: number; totalRemainingShares: number; cumulativeSold: number }[];
}

/**
 * Calculate per-grant timelines for chart display
 * Returns timeline data for each individual grant
 */
export function calculatePerGrantTimelines(
  startYear: number,
  endYear: number,
  retirementYear: number
): GrantTimelineData[] {
  const config = rsuState.configuration;
  const grants = config.grants;
  
  if (grants.length === 0 || config.currentPricePerShare <= 0) {
    return [];
  }
  
  const expectedReturn = config.expectedAnnualReturn / 100;
  const liquidationStrategy = config.liquidationStrategy;
  const grantTimelines: GrantTimelineData[] = [];
  
  for (const grant of grants) {
    const grantDate = new Date(grant.grantDate);
    const grantYear = grantDate.getFullYear();
    const timeline: { year: number; value: number; sharesHeld: number; cumulativeVested: number; totalRemainingShares: number; cumulativeSold: number }[] = [];
    
    // Track shares pending sale for this grant
    const sharesPendingSale: Map<number, number> = new Map();
    
    // Calculate how many shares vested BEFORE startYear using direct calculation
    const sharesVestedBeforeStart = calculateVestedSharesForYear(grant, startYear - 1);
    
    // Shares already sold from this grant before the chart period
    const initialSharesSoldForGrant = grant.sharesSold || 0;
    
    // Start with shares vested before start, minus already sold shares
    let cumulativeHeldShares = sharesVestedBeforeStart - initialSharesSoldForGrant;
    // Cumulative vested starts with shares vested before the chart begins
    let cumulativeVestedShares = sharesVestedBeforeStart;
    // Cumulative sold starts with shares already sold
    let cumulativeSoldShares = initialSharesSoldForGrant;
    
    for (let year = startYear; year <= endYear; year++) {
      const yearsFromNow = year - new Date().getFullYear();
      const projectedPrice = config.currentPricePerShare * Math.pow(1 + expectedReturn, yearsFromNow);
      
      // Calculate vested shares using direct calculation to avoid rounding errors
      const vestedThisYear = calculateVestedSharesForYear(grant, year);
      const vestedPrevYear = calculateVestedSharesForYear(grant, year - 1);
      const sharesVestedThisYear = vestedThisYear - vestedPrevYear;
      
      // Track cumulative vested shares (never decreases)
      cumulativeVestedShares += sharesVestedThisYear;
      
      // Add vested shares to held shares
      cumulativeHeldShares += sharesVestedThisYear;
      
      // Schedule shares to be sold 2 years after vesting
      if (liquidationStrategy === 'SellAfter2Years' && sharesVestedThisYear > 0) {
        const sellYear = year + 2;
        const existing = sharesPendingSale.get(sellYear) || 0;
        sharesPendingSale.set(sellYear, existing + sharesVestedThisYear);
      }
      
      // Calculate shares to sell this year
      let sharesSoldThisYear = 0;
      if (liquidationStrategy === 'SellAfter2Years') {
        const pendingShares = sharesPendingSale.get(year) || 0;
        if (pendingShares > 0 && cumulativeHeldShares > 0) {
          sharesSoldThisYear = Math.min(pendingShares, cumulativeHeldShares);
          sharesPendingSale.delete(year);
        }
        
        // At retirement, sell any remaining held shares
        if (year === retirementYear && cumulativeHeldShares > sharesSoldThisYear) {
          sharesSoldThisYear = cumulativeHeldShares;
        }
      }
      
      // Deduct sold shares and track cumulative sold
      if (sharesSoldThisYear > 0) {
        cumulativeHeldShares -= sharesSoldThisYear;
        cumulativeSoldShares += sharesSoldThisYear;
      }
      
      // Ensure held shares doesn't go below 0
      const sharesHeld = Math.max(0, cumulativeHeldShares);
      const marketValue = sharesHeld * projectedPrice;
      
      // Calculate total remaining shares for this grant (granted - sold)
      const totalSharesSoldForGrant = grant.sharesSold || 0;
      const totalGrantShares = grant.numberOfShares;
      // Total remaining = granted - all historical sales (not affected by year)
      let totalRemainingForGrant: number;
      if (year < retirementYear) {
        // Before retirement: granted - sold (includes both vested and unvested)
        totalRemainingForGrant = totalGrantShares - totalSharesSoldForGrant;
      } else {
        // At/after retirement: only vested shares count (unvested is forfeited)
        // Use cumulativeVestedShares since sharesHeld has been auto-sold
        totalRemainingForGrant = cumulativeVestedShares;
      }
      
      timeline.push({
        year,
        value: marketValue,
        sharesHeld,
        cumulativeVested: cumulativeVestedShares,
        totalRemainingShares: Math.max(0, totalRemainingForGrant),
        cumulativeSold: cumulativeSoldShares
      });
    }
    
    // Create grant name from date
    const grantName = `מענק ${grantDate.toLocaleDateString('he-IL', { month: 'short', year: 'numeric' })}`;
    
    grantTimelines.push({
      grantId: grant.id,
      grantName,
      grantDate: grant.grantDate,
      initialSharesSold: initialSharesSoldForGrant,
      timeline
    });
  }
  
  return grantTimelines;
}

/**
 * Load RSU state from file data (used when loading plan from JSON)
 * Automatically syncs Money typed fields for all grants
 */
export function loadRsuFromFileData(data: {
  rsuConfiguration?: Partial<RsuConfiguration>;
  rsuNextGrantId?: number;
  rsuIncludeInCalculations?: boolean;
}): void {
  if (data.rsuConfiguration) {
    const config = {
      ...createDefaultConfiguration(),
      ...data.rsuConfiguration,
      // Ensure grants array exists
      grants: data.rsuConfiguration.grants || []
    };

    // Sync Money typed field for configuration price
    config.currentPricePerShareTyped = Money.create(
      config.currentPricePerShare,
      config.currency
    );

    // Sync Money typed fields for all grants
    config.grants = config.grants.map(grant => ({
      ...grant,
      priceAtGrantTyped: Money.create(grant.priceAtGrant, grant.currency)
    }));

    rsuState.configuration = config;
  }
  if (typeof data.rsuNextGrantId === 'number') {
    rsuState.nextGrantId = data.rsuNextGrantId;
  } else if (data.rsuConfiguration?.grants?.length) {
    // Calculate next ID from grants if not provided
    const maxId = Math.max(...data.rsuConfiguration.grants.map(g => g.id), 0);
    rsuState.nextGrantId = maxId + 1;
  }
  if (typeof data.rsuIncludeInCalculations === 'boolean') {
    rsuState.includeInCalculations = data.rsuIncludeInCalculations;
  }
  notifyListeners();
}
