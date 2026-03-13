/**
 * Tests for Total Contributions Display
 * 
 * Bug: "סה"כ הפקדות is somehow less than the accumulation portfolio in the beginning"
 * 
 * The issue is that totalContributions shows the cost basis (what was deposited),
 * while the portfolio value shows market value (which includes unrealized gains).
 * 
 * Expected behavior:
 * 1. totalContributions at retirement = currentCostBasis + actual monthly contributions invested
 *    (partial current year + full future years)
 * 2. startValue should show currentValue (current market value of portfolio)
 * 3. If portfolio has unrealized gains, currentValue > currentCostBasis, so totalContributions
 *    at the START can be less than startValue - but at the END it should include all contributions
 */

import {
  calculateFirePlan,
  calculatePortfolioValue,
  calculatePortfolioCostBasis
} from '../../../js/services/calculator.js';
import { Money } from '../../../js/types/money.js';

describe('Total Contributions Calculation', () => {
  const FIXED_CURRENT_DATE = new Date('2025-03-07T00:00:00Z');

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(FIXED_CURRENT_DATE);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const getAccumulationMonths = (accumulationYears, currentDate = FIXED_CURRENT_DATE) => {
    if (accumulationYears <= 0) {
      return 0;
    }

    const remainingMonthsInCurrentYear = 12 - currentDate.getMonth();
    return remainingMonthsInCurrentYear + (Math.max(0, accumulationYears - 1) * 12);
  };
  
  describe('Basic total contributions logic', () => {
    
    test('totalContributions should start from cost basis, not market value', () => {
      const currentYear = new Date().getFullYear();
      const accumulationYears = 10;
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear + accumulationYears, // 10 years from now
        monthlyContribution: Money.usd(1000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // Market value: $50,000
            averageCost: Money.usd(300), // Cost basis: $30,000
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Current cost basis: 100 × $300 = $30,000
      const expectedCostBasis = 30000;
      // Monthly contributions over the partial current year and remaining full years
      const expectedContributions = 1000 * getAccumulationMonths(accumulationYears);
      // Total contributions at retirement: cost basis + monthly contributions
      const expectedTotalContributions = expectedCostBasis + expectedContributions;
      
      expect(result.totalContributions).toBeCloseTo(expectedTotalContributions, -2); // Allow for rounding
      
      // totalMonthlyContributions should be just the monthly contributions (excluding cost basis)
      expect(result.totalMonthlyContributions).toBeCloseTo(expectedContributions, -2);
    });

    test('totalMonthlyContributions should be zero when no accumulation period', () => {
      const currentYear = new Date().getFullYear();
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear, // No accumulation
        monthlyContribution: Money.usd(5000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500),
            averageCost: Money.usd(300),
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // With no accumulation years, totalMonthlyContributions should be 0
      expect(result.totalMonthlyContributions).toBe(0);
      // But totalContributions should equal cost basis
      expect(result.totalContributions).toBe(30000);
    });

    test('currentValue should be market value, not cost basis', () => {
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: 2035,
        monthlyContribution: Money.usd(0),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // Market value: $50,000
            averageCost: Money.usd(300), // Cost basis: $30,000
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Current market value: 100 × $500 = $50,000
      expect(result.currentValue).toBe(50000);
    });

    test('portfolio with gains: currentValue > cost basis (totalContributions base)', () => {
      const portfolio = [
        {
          symbol: 'SPY',
          quantity: 100,
          currentPrice: Money.usd(500), // Market value: $50,000
          averageCost: Money.usd(300) // Cost basis: $30,000
        }
      ];
      
      const marketValue = calculatePortfolioValue(portfolio, 3.7);
      const costBasis = calculatePortfolioCostBasis(portfolio, 3.7);
      
      expect(marketValue).toBe(50000);
      expect(costBasis).toBe(30000);
      expect(marketValue).toBeGreaterThan(costBasis);
    });
  });

  describe('Edge case: Zero accumulation years', () => {
    
    test('when already at retirement year, totalContributions equals cost basis only', () => {
      const currentYear = new Date().getFullYear();
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear, // Retire this year - no accumulation
        monthlyContribution: Money.usd(1000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // Market value: $50,000
            averageCost: Money.usd(300), // Cost basis: $30,000
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // With zero accumulation years, totalContributions = costBasis = $30,000
      expect(result.totalContributions).toBe(30000);
      
      // Current value is still market value = $50,000
      expect(result.currentValue).toBe(50000);
      
      // This is the key insight: when there's no accumulation period,
      // totalContributions (cost basis) CAN be less than currentValue (market value)
      // if there are unrealized gains
      expect(result.totalContributions).toBeLessThan(result.currentValue);
    });
  });

  describe('Results display values', () => {
    
    test('startValue should equal currentValue for consistent display', () => {
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: 2035,
        monthlyContribution: Money.usd(1000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500),
            averageCost: Money.usd(300),
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // The startValue displayed should be currentValue (market value)
      // NOT yearlyData[0].portfolioValue (which is after first year growth)
      expect(result.currentValue).toBe(50000);
      
      // If yearlyData exists, first year should be > currentValue due to growth
      if (result.yearlyData.length > 0) {
        expect(result.yearlyData[0].portfolioValue).toBeGreaterThan(result.currentValue);
      }
    });

    test('with positive accumulation, totalContributions at retirement should exceed initial portfolio', () => {
      const currentYear = new Date().getFullYear();
      const accumulationYears = 10;
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear + accumulationYears, // 10 years from now
        monthlyContribution: Money.usd(2000), // $2000/month
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // $50,000 market value
            averageCost: Money.usd(300), // $30,000 cost basis
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Total contributions: cost basis + actual invested contributions over the remaining months
      const expectedMinimum = 30000 + (2000 * getAccumulationMonths(accumulationYears));
      
      expect(result.totalContributions).toBeCloseTo(expectedMinimum, -2);
      // With substantial contributions, totalContributions SHOULD exceed current portfolio value
      expect(result.totalContributions).toBeGreaterThan(result.currentValue);
    });
  });

  describe('Currency handling in contributions', () => {
    
    test('ILS monthly contribution should be converted to USD for calculations', () => {
      const currentYear = new Date().getFullYear();
      const accumulationYears = 5;
      const usdIlsRate = 3.7;
      const monthlyContributionILS = 3700; // Should equal $1000 USD
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear + accumulationYears, // 5 years from now
        monthlyContribution: Money.ils(monthlyContributionILS),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: usdIlsRate,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500),
            averageCost: Money.usd(500),
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Cost basis: 100 × $500 = $50,000
      // Monthly contribution in USD: ₪3,700 / 3.7 = $1,000
      // Total contributions over the actual invested months in the accumulation period
      // Total: $50,000 + monthly contributions
      const expectedTotal = 50000 + (1000 * getAccumulationMonths(accumulationYears));
      
      expect(result.totalContributions).toBeCloseTo(expectedTotal, -2);
    });
  });

  describe('Bug scenario: totalContributions less than starting portfolio', () => {
    
    test('DOCUMENTED: with no accumulation and unrealized gains, totalContributions < currentValue', () => {
      // This is the user's reported bug scenario
      // They have a portfolio with gains and are already at/past retirement year
      const currentYear = new Date().getFullYear();
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear, // No accumulation period
        monthlyContribution: Money.usd(5000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // Market value: $50,000
            averageCost: Money.usd(200), // Cost basis: $20,000 (150% gain!)
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // With no accumulation years, totalContributions = cost basis = $20,000
      expect(result.totalContributions).toBe(20000);
      
      // currentValue = market value = $50,000
      expect(result.currentValue).toBe(50000);
      
      // This is the confusing part: totalContributions < currentValue
      // The user sees "total deposits" less than "starting portfolio"
      expect(result.totalContributions).toBeLessThan(result.currentValue);
      
      // The difference is unrealized gains (not deposits)
      const unrealizedGains = result.currentValue - result.totalContributions;
      expect(unrealizedGains).toBe(30000);
    });

    test('result should include currentCostBasis for display purposes', () => {
      const currentYear = new Date().getFullYear();
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear + 5,
        monthlyContribution: Money.usd(1000),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500),
            averageCost: Money.usd(300),
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Result should include currentCostBasis so we can show unrealized gains
      expect(result.currentCostBasis).toBe(30000);
      
      // Unrealized gains = currentValue - currentCostBasis
      expect(result.currentValue - result.currentCostBasis).toBe(20000);
    });

    test('unrealizedGains can be calculated from result for display', () => {
      const currentYear = new Date().getFullYear();
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear, // No accumulation
        monthlyContribution: Money.usd(0),
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'AAPL',
            quantity: 50,
            currentPrice: Money.usd(200), // Market value: $10,000
            averageCost: Money.usd(100), // Cost basis: $5,000
            method: 'CAGR',
            value1: 8
          },
          {
            symbol: 'GOOG',
            quantity: 20,
            currentPrice: Money.usd(150), // Market value: $3,000
            averageCost: Money.usd(200), // Cost basis: $4,000 (loss)
            method: 'CAGR',
            value1: 12
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Market value: $10,000 + $3,000 = $13,000
      expect(result.currentValue).toBe(13000);
      
      // Cost basis: $5,000 + $4,000 = $9,000
      expect(result.currentCostBasis).toBe(9000);
      
      // Net unrealized gain: $13,000 - $9,000 = $4,000
      const unrealizedGains = result.currentValue - result.currentCostBasis;
      expect(unrealizedGains).toBe(4000);
      
      // With no accumulation, totalContributions = costBasis = $9,000
      expect(result.totalContributions).toBe(9000);
    });

    test('with adequate accumulation, totalContributions should eventually exceed currentValue', () => {
      const currentYear = new Date().getFullYear();
      
      const input = {
        birthDate: '1985-01-01',
        birthYear: 1985,
        earlyRetirementYear: currentYear + 5, // 5 years of accumulation
        monthlyContribution: Money.usd(2000), // $2,000/month = $24,000/year
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.7,
        accumulationPortfolio: [
          {
            symbol: 'SPY',
            quantity: 100,
            currentPrice: Money.usd(500), // Market value: $50,000
            averageCost: Money.usd(200), // Cost basis: $20,000
            method: 'CAGR',
            value1: 10
          }
        ],
        retirementAllocation: [
          { assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);
      
      // Cost basis: $20,000
      // 5 years of contributions: partial current year + 4 full years
      // Total contributions: $140,000
      const expectedContributions = 20000 + (2000 * getAccumulationMonths(5));
      
      expect(result.totalContributions).toBeCloseTo(expectedContributions, -2);
      
      // With $140,000 in contributions, it exceeds the $50,000 current value
      expect(result.totalContributions).toBeGreaterThan(result.currentValue);
    });
  });
});
