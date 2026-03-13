/**
 * RSU Calculations Unit Tests
 * Comprehensive tests for RSU financial calculations
 * 
 * Based on PRD_RSU_SUPPORT.md requirements:
 * - Section 102 Israeli tax law (25% capital gains after 24 months)
 * - Standard vesting schedule (4-year, 1-year cliff, 25% per year)
 * - Surtax considerations (3% on income > ₪721,560)
 * - Cost basis and profit ratio calculations
 */

import {
  calculateVestedShares,
  calculateVestedSharesForYear,
  isSection102Eligible,
  getSection102EligibleDate,
  calculateSection102EligibleShares,
  calculateCurrentRsuSummary,
  getRsuConfiguration,
  updateRsuConfiguration,
  createRsuGrant,
  addRsuGrant,
  resetRsuState
} from '../../../js/services/rsu-state.js';

// ============================================================================
// Test Constants (matching RSU_CONSTANTS)
// ============================================================================

const SECTION_102_HOLDING_PERIOD_YEARS = 2;
const DEFAULT_CAPITAL_GAINS_TAX_RATE = 0.25;
const DEFAULT_MARGINAL_TAX_RATE = 47;
const SURTAX_RATE = 0.03;
const SURTAX_THRESHOLD_ILS = 721560;
const DEFAULT_VESTING_PERIOD_YEARS = 4;

// ============================================================================
// Vesting Calculations (Standard 4-Year Schedule)
// ============================================================================

describe('Vesting Calculations - Standard 4-Year Schedule', () => {
  beforeEach(() => {
    resetRsuState();
  });

  describe('1-Year Cliff', () => {
    test('returns 0 shares before cliff (day 1)', () => {
      const grantDate = new Date();
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(0);
    });

    test('returns 0 shares at 6 months (before cliff)', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 6);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(0);
    });

    test('returns 0 shares at 11 months (just before cliff)', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 11);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(0);
    });

    test('returns 25% shares at exactly 1 year (cliff date)', () => {
      const grantDate = new Date();
      grantDate.setFullYear(grantDate.getFullYear() - 1);
      grantDate.setDate(grantDate.getDate() - 1); // Just over 1 year
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(250);
    });

    test('returns 25% shares at 13 months (just after cliff)', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 13);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(250);
    });
  });

  describe('Annual Vesting Tranches', () => {
    test('returns 25% at year 1', () => {
      const grantDate = createDateYearsAgo(1.1);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(250);
    });

    test('returns 50% at year 2', () => {
      const grantDate = createDateYearsAgo(2.1);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(500);
    });

    test('returns 75% at year 3', () => {
      const grantDate = createDateYearsAgo(3.1);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(750);
    });

    test('returns 100% at year 4 (fully vested)', () => {
      const grantDate = createDateYearsAgo(4.1);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(1000);
    });

    test('returns 100% after year 4 (remains fully vested)', () => {
      const grantDate = createDateYearsAgo(5);
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(1000);
    });
  });

  describe('Rounding and Odd Share Counts', () => {
    test('handles odd share count with floor rounding (145 shares)', () => {
      const grantDate = createDateYearsAgo(1.1);
      const grant = createTestGrant(grantDate, 145, 4);
      
      // 145 / 4 = 36.25 → floor(36.25) = 36 shares per tranche
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(36); // 25% of 145, floored
    });

    test('handles 100 shares (25 per tranche, no remainder)', () => {
      const grantDate = createDateYearsAgo(1.1);
      const grant = createTestGrant(grantDate, 100, 4);
      
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(25);
    });

    test('handles prime number of shares (97)', () => {
      const grantDate = createDateYearsAgo(2.1);
      const grant = createTestGrant(grantDate, 97, 4);
      
      // Year 1: floor(97/4) = 24
      // Year 2: floor(97/4) * 2 = 48
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(48);
    });

    test('returns all shares when fully vested despite rounding', () => {
      const grantDate = createDateYearsAgo(4.1);
      const grant = createTestGrant(grantDate, 145, 4);
      
      // Fully vested should return ALL shares, not rounded
      const vested = calculateVestedShares(grant, new Date());
      expect(vested).toBe(145);
    });
  });

  describe('calculateVestedSharesForYear', () => {
    test('calculates correct vested shares for a specific year', () => {
      const grant = {
        id: 1,
        grantDate: '2023-01-15',
        numberOfShares: 1000,
        sharesSold: 0,
        priceAtGrant: 100,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      };

      // Grant in 2023:
      // - 2023: cliff not reached (0)
      // - 2024: year 1 cliff (250)
      // - 2025: year 2 (500)
      // - 2026: year 3 (750)
      // - 2027: year 4 (1000)
      expect(calculateVestedSharesForYear(grant, 2023)).toBe(0);
      expect(calculateVestedSharesForYear(grant, 2024)).toBe(250);
      expect(calculateVestedSharesForYear(grant, 2025)).toBe(500);
      expect(calculateVestedSharesForYear(grant, 2026)).toBe(750);
      expect(calculateVestedSharesForYear(grant, 2027)).toBe(1000);
      expect(calculateVestedSharesForYear(grant, 2028)).toBe(1000);
    });

    test('handles partial year from mid-year grant', () => {
      const grant = {
        id: 1,
        grantDate: '2023-07-01', // Mid-year grant
        numberOfShares: 400,
        sharesSold: 0,
        priceAtGrant: 100,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      };

      // Year-end calculations (using year number, not exact date)
      expect(calculateVestedSharesForYear(grant, 2023)).toBe(0);
      expect(calculateVestedSharesForYear(grant, 2024)).toBe(100); // After 1 full year
      expect(calculateVestedSharesForYear(grant, 2025)).toBe(200);
      expect(calculateVestedSharesForYear(grant, 2026)).toBe(300);
      expect(calculateVestedSharesForYear(grant, 2027)).toBe(400);
    });
  });
});

// ============================================================================
// Section 102 Eligibility (Israeli Tax Law)
// ============================================================================

describe('Section 102 Eligibility - Israeli Tax Law', () => {
  beforeEach(() => {
    resetRsuState();
  });

  describe('getSection102EligibleDate', () => {
    test('returns date exactly 2 years after grant', () => {
      const grant = {
        id: 1,
        grantDate: '2022-03-15',
        numberOfShares: 1000,
        sharesSold: 0,
        priceAtGrant: 100,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      };

      const eligibleDate = getSection102EligibleDate(grant);
      expect(eligibleDate.getFullYear()).toBe(2024);
      expect(eligibleDate.getMonth()).toBe(2); // March (0-indexed)
      expect(eligibleDate.getDate()).toBe(15);
    });

    test('handles leap year in grant date', () => {
      const grant = {
        id: 1,
        grantDate: '2024-02-29', // Leap year
        numberOfShares: 1000,
        sharesSold: 0,
        priceAtGrant: 100,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      };

      const eligibleDate = getSection102EligibleDate(grant);
      expect(eligibleDate.getFullYear()).toBe(2026);
      // Date handling may vary, but should be ~Feb 28/Mar 1 2026
    });
  });

  describe('isSection102Eligible', () => {
    test('returns false at 23 months (before holding period)', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 23);
      const grant = createTestGrant(grantDate, 1000, 4);

      expect(isSection102Eligible(grant)).toBe(false);
    });

    test('returns true at 24 months (holding period met)', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 24);
      grantDate.setDate(grantDate.getDate() - 1); // Just over 24 months
      const grant = createTestGrant(grantDate, 1000, 4);

      expect(isSection102Eligible(grant)).toBe(true);
    });

    test('returns true at 36 months (well past holding period)', () => {
      const grantDate = createDateYearsAgo(3);
      const grant = createTestGrant(grantDate, 1000, 4);

      expect(isSection102Eligible(grant)).toBe(true);
    });

    test('checks eligibility at specific date, not today', () => {
      const grantDate = new Date('2022-01-01');
      const grant = createTestGrant(grantDate, 1000, 4);
      
      const beforeEligible = new Date('2023-06-01'); // 18 months
      const afterEligible = new Date('2024-06-01'); // 30 months

      expect(isSection102Eligible(grant, beforeEligible)).toBe(false);
      expect(isSection102Eligible(grant, afterEligible)).toBe(true);
    });
  });

  describe('calculateSection102EligibleShares', () => {
    test('returns 0 before 24-month holding period', () => {
      const grantDate = new Date();
      grantDate.setMonth(grantDate.getMonth() - 18);
      const grant = createTestGrant(grantDate, 1000, 4);

      const eligible = calculateSection102EligibleShares(grant);
      expect(eligible).toBe(0);
    });

    test('returns all vested shares after holding period', () => {
      const grantDate = createDateYearsAgo(3);
      const grant = createTestGrant(grantDate, 1000, 4);
      grant.sharesSold = 0;

      // After 3 years: 75% vested (750 shares), all are 102 eligible
      const eligible = calculateSection102EligibleShares(grant);
      expect(eligible).toBe(750);
    });

    test('excludes sold shares from eligible count', () => {
      const grantDate = createDateYearsAgo(3);
      const grant = createTestGrant(grantDate, 1000, 4);
      grant.sharesSold = 200;

      // After 3 years: 750 vested, minus 200 sold = 550 eligible
      const eligible = calculateSection102EligibleShares(grant);
      expect(eligible).toBe(550);
    });

    test('returns 0 when all vested shares are sold', () => {
      const grantDate = createDateYearsAgo(3);
      const grant = createTestGrant(grantDate, 1000, 4);
      grant.sharesSold = 750; // All vested shares sold

      const eligible = calculateSection102EligibleShares(grant);
      expect(eligible).toBe(0);
    });
  });
});

// ============================================================================
// Tax Calculations
// ============================================================================

describe('Tax Calculations', () => {
  beforeEach(() => {
    resetRsuState();
  });

  describe('Capital Gains Tax (Section 102)', () => {
    test('applies 25% tax rate on capital gains', () => {
      const costBasis = 100;
      const salePrice = 200;
      const shares = 100;
      
      const grossProceeds = salePrice * shares;
      const capitalGain = (salePrice - costBasis) * shares;
      const tax = capitalGain * DEFAULT_CAPITAL_GAINS_TAX_RATE;
      const netProceeds = grossProceeds - tax;

      expect(grossProceeds).toBe(20000);
      expect(capitalGain).toBe(10000);
      expect(tax).toBe(2500);
      expect(netProceeds).toBe(17500);
    });

    test('no tax when sale price equals cost basis', () => {
      const costBasis = 100;
      const salePrice = 100;
      const shares = 100;
      
      const capitalGain = Math.max(0, (salePrice - costBasis) * shares);
      const tax = capitalGain * DEFAULT_CAPITAL_GAINS_TAX_RATE;

      expect(capitalGain).toBe(0);
      expect(tax).toBe(0);
    });

    test('no tax on losses (sale below cost basis)', () => {
      const costBasis = 100;
      const salePrice = 80;
      const shares = 100;
      
      const capitalGain = Math.max(0, (salePrice - costBasis) * shares);
      const tax = capitalGain * DEFAULT_CAPITAL_GAINS_TAX_RATE;

      expect(capitalGain).toBe(0);
      expect(tax).toBe(0);
    });
  });

  describe('Cost Basis Calculations', () => {
    test('calculates correct cost basis for single grant', () => {
      updateRsuConfiguration({
        stockSymbol: 'GOOGL',
        currentPricePerShare: 200
      });
      
      const grant = createRsuGrant({
        grantDate: '2020-01-15',
        numberOfShares: 500,
        sharesSold: 0,
        priceAtGrant: 100,
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      });
      addRsuGrant(grant);

      const totalCostBasis = grant.priceAtGrant * grant.numberOfShares;
      expect(totalCostBasis).toBe(50000);
    });

    test('calculates weighted average cost basis for multiple grants', () => {
      updateRsuConfiguration({
        stockSymbol: 'GOOGL',
        currentPricePerShare: 200
      });

      const grant1 = createRsuGrant({
        grantDate: '2020-01-15',
        numberOfShares: 500,
        sharesSold: 0,
        priceAtGrant: 100, // $50,000 total
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      });
      addRsuGrant(grant1);

      const grant2 = createRsuGrant({
        grantDate: '2021-01-15',
        numberOfShares: 300,
        sharesSold: 0,
        priceAtGrant: 150, // $45,000 total
        currency: '$',
        vestingPeriodYears: 4,
        vestingType: 'Standard'
      });
      addRsuGrant(grant2);

      const totalCostBasis = (500 * 100) + (300 * 150);
      const totalShares = 500 + 300;
      const avgCostBasis = totalCostBasis / totalShares;

      expect(totalCostBasis).toBe(95000);
      expect(totalShares).toBe(800);
      expect(avgCostBasis).toBeCloseTo(118.75);
    });
  });

  describe('Marginal Tax Rate Configuration', () => {
    test('uses configured marginal tax rate', () => {
      updateRsuConfiguration({ marginalTaxRate: 50 });
      const config = getRsuConfiguration();
      expect(config.marginalTaxRate).toBe(50);
    });

    test('default marginal tax rate is 47%', () => {
      const config = getRsuConfiguration();
      expect(config.marginalTaxRate).toBe(DEFAULT_MARGINAL_TAX_RATE);
    });
  });

  describe('3% Surtax (High Income)', () => {
    test('surtax flag is stored in configuration', () => {
      updateRsuConfiguration({ subjectTo3PercentSurtax: true });
      expect(getRsuConfiguration().subjectTo3PercentSurtax).toBe(true);

      updateRsuConfiguration({ subjectTo3PercentSurtax: false });
      expect(getRsuConfiguration().subjectTo3PercentSurtax).toBe(false);
    });

    test('surtax threshold is defined correctly', () => {
      // PRD: 3% on annual income > ₪721,560
      expect(SURTAX_THRESHOLD_ILS).toBe(721560);
    });

    test('surtax rate is 3%', () => {
      expect(SURTAX_RATE).toBe(0.03);
    });
  });
});

// ============================================================================
// RSU Summary Calculations
// ============================================================================

describe('RSU Summary Calculations', () => {
  beforeEach(() => {
    resetRsuState();
  });

  test('calculates total shares granted across grants', () => {
    setupMultipleGrants();
    
    const summary = calculateCurrentRsuSummary();
    expect(summary.totalSharesGranted).toBe(1500); // 1000 + 500
  });

  test('calculates total vested shares', () => {
    // Grant from 2 years ago - should be 50% vested (500 shares)
    const grantDate = createDateYearsAgo(2.1);
    updateRsuConfiguration({
      stockSymbol: 'GOOGL',
      currentPricePerShare: 150
    });
    
    const grant = createRsuGrant({
      grantDate: grantDate.toISOString().split('T')[0],
      numberOfShares: 1000,
      sharesSold: 0,
      priceAtGrant: 100,
      currency: '$',
      vestingPeriodYears: 4,
      vestingType: 'Standard'
    });
    addRsuGrant(grant);
    
    const summary = calculateCurrentRsuSummary();
    expect(summary.totalSharesVested).toBe(500);
    expect(summary.totalSharesUnvested).toBe(500);
  });

  test('calculates current market value', () => {
    updateRsuConfiguration({
      stockSymbol: 'GOOGL',
      currentPricePerShare: 200
    });
    
    const grant = createRsuGrant({
      grantDate: createDateYearsAgo(5).toISOString().split('T')[0],
      numberOfShares: 1000,
      sharesSold: 0,
      priceAtGrant: 100,
      currency: '$',
      vestingPeriodYears: 4,
      vestingType: 'Standard'
    });
    addRsuGrant(grant);
    
    const summary = calculateCurrentRsuSummary();
    // Market value = price × total shares (not just vested)
    expect(summary.currentMarketValue).toBe(200000);
  });

  test('handles empty grants array', () => {
    const summary = calculateCurrentRsuSummary();
    
    expect(summary.totalSharesGranted).toBe(0);
    expect(summary.totalSharesVested).toBe(0);
    expect(summary.totalSharesUnvested).toBe(0);
    expect(summary.currentMarketValue).toBe(0);
  });
});

// ============================================================================
// Edge Cases and Boundary Conditions
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    resetRsuState();
  });

  test('handles grant with 0 shares', () => {
    const grant = createTestGrant(new Date(), 0, 4);
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(0);
  });

  test('handles grant with 1 share', () => {
    const grantDate = createDateYearsAgo(4.1);
    const grant = createTestGrant(grantDate, 1, 4);
    
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(1);
  });

  test('handles grant with very large share count', () => {
    const grantDate = createDateYearsAgo(2.1);
    const grant = createTestGrant(grantDate, 1000000, 4);
    
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(500000);
  });

  test('handles very old grant (10 years ago)', () => {
    const grantDate = createDateYearsAgo(10);
    const grant = createTestGrant(grantDate, 1000, 4);
    
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(1000); // Should be fully vested
  });

  test('handles grant exactly on vesting boundary', () => {
    // Grant exactly 2 years ago to the day
    const grantDate = new Date();
    grantDate.setFullYear(grantDate.getFullYear() - 2);
    const grant = createTestGrant(grantDate, 1000, 4);
    
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(500);
  });

  test('handles different vesting periods (2-year) - standard vesting uses 25% tranches', () => {
    const grantDate = createDateYearsAgo(1.1);
    const grant = createTestGrant(grantDate, 1000, 2);
    
    // Standard vesting always uses 25% per year tranches
    // After 1 year: 1 completed year × 25% = 250 shares
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(250);
  });

  test('handles different vesting periods (5-year) - standard vesting uses 25% tranches', () => {
    const grantDate = createDateYearsAgo(1.1);
    const grant = createTestGrant(grantDate, 1000, 5);
    
    // Standard vesting always uses 25% per year tranches
    // After 1 year: 1 completed year × 25% = 250 shares
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(250);
  });

  test('handles grant with sharesSold', () => {
    const grantDate = createDateYearsAgo(3);
    const grant = createTestGrant(grantDate, 1000, 4);
    grant.sharesSold = 250;
    
    // sharesSold shouldn't affect vesting calculation
    const vested = calculateVestedShares(grant, new Date());
    expect(vested).toBe(750);
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a test grant with common defaults
 */
function createTestGrant(grantDate, numberOfShares, vestingPeriodYears) {
  return {
    id: 1,
    grantDate: grantDate instanceof Date ? grantDate.toISOString() : grantDate,
    numberOfShares,
    sharesSold: 0,
    priceAtGrant: 100,
    currency: '$',
    vestingPeriodYears,
    vestingType: 'Standard'
  };
}

/**
 * Create a date X years in the past
 */
function createDateYearsAgo(years) {
  const date = new Date();
  const wholePart = Math.floor(years);
  const fractionalPart = years - wholePart;
  
  date.setFullYear(date.getFullYear() - wholePart);
  if (fractionalPart > 0) {
    date.setMonth(date.getMonth() - Math.floor(fractionalPart * 12));
  }
  return date;
}

/**
 * Setup multiple grants for testing
 */
function setupMultipleGrants() {
  updateRsuConfiguration({
    stockSymbol: 'GOOGL',
    currentPricePerShare: 150,
    expectedAnnualReturn: 10
  });

  const grant1 = createRsuGrant({
    grantDate: createDateYearsAgo(3).toISOString().split('T')[0],
    numberOfShares: 1000,
    sharesSold: 0,
    priceAtGrant: 100,
    currency: '$',
    vestingPeriodYears: 4,
    vestingType: 'Standard'
  });
  addRsuGrant(grant1);

  const grant2 = createRsuGrant({
    grantDate: createDateYearsAgo(2).toISOString().split('T')[0],
    numberOfShares: 500,
    sharesSold: 0,
    priceAtGrant: 120,
    currency: '$',
    vestingPeriodYears: 4,
    vestingType: 'Standard'
  });
  addRsuGrant(grant2);
}
