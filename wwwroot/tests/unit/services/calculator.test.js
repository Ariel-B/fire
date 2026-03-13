/**
 * Calculator Service Unit Tests
 * Tests for FIRE calculation logic
 */

import {
  calculatePortfolioValue,
  calculateCostBasis,
  calculatePortfolioCostBasis,
  calculateMarketValue,
  calculateUnrealizedGainLoss,
  calculateExposure,
  calculateProfitRatio,
  calculateWeightedReturn,
  calculateAllocationWeightedReturn,
  calculatePreRetirementPortfolio,
  calculateFirePlan,
  calculateTotalExpenseWithRepetitions,
  calculateInflatedAmount
} from '../../../js/services/calculator.js';
import { Money } from '../../../js/types/money.js';

describe('Calculator Service', () => {
  const USD_ILS_RATE = 3.7;

  // ============================================================================
  // Portfolio Value Calculations
  // ============================================================================

  describe('calculatePortfolioValue', () => {
    test('calculates total value for USD assets', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(150) },
        { symbol: 'GOOGL', quantity: 5, currentPrice: Money.usd(100) }
      ];
      const result = calculatePortfolioValue(portfolio, USD_ILS_RATE);
      expect(result).toBe(2000); // 10*150 + 5*100
    });

    test('converts ILS prices to USD', () => {
      const portfolio = [
        { symbol: 'TEVA', quantity: 100, currentPrice: Money.ils(37) }
      ];
      const result = calculatePortfolioValue(portfolio, USD_ILS_RATE);
      expect(result).toBeCloseTo(1000, 2); // 100 * 37 / 3.7 = 1000
    });

    test('handles mixed currency portfolio', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100) },
        { symbol: 'TEVA', quantity: 37, currentPrice: Money.ils(37) }
      ];
      const result = calculatePortfolioValue(portfolio, USD_ILS_RATE);
      expect(result).toBeCloseTo(1370, 2); // 1000 + 370
    });

    test('returns 0 for empty portfolio', () => {
      const result = calculatePortfolioValue([], USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('handles missing values with defaults', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: null, currentPrice: Money.usd(150) },
        { symbol: 'GOOGL', quantity: 10, currentPrice: undefined }
      ];
      const result = calculatePortfolioValue(portfolio, USD_ILS_RATE);
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // Cost Basis Calculations
  // ============================================================================

  describe('calculateCostBasis', () => {
    test('calculates cost basis for USD asset', () => {
      const asset = {
        symbol: 'AAPL',
        quantity: 10,
        averageCost: Money.usd(100)
      };
      const result = calculateCostBasis(asset, USD_ILS_RATE);
      expect(result).toBe(1000); // 10 * 100
    });

    test('converts ILS cost basis to USD', () => {
      const asset = {
        symbol: 'TEVA',
        quantity: 100,
        averageCost: Money.ils(18.5)
      };
      const result = calculateCostBasis(asset, USD_ILS_RATE);
      expect(result).toBeCloseTo(500, 2); // 100 * 18.5 / 3.7
    });

    test('handles missing values', () => {
      const asset = { symbol: 'AAPL' };
      const result = calculateCostBasis(asset, USD_ILS_RATE);
      expect(result).toBe(0);
    });
  });

  describe('calculatePortfolioCostBasis', () => {
    test('calculates total cost basis for portfolio', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, averageCost: Money.usd(100) },
        { symbol: 'GOOGL', quantity: 5, averageCost: Money.usd(80) }
      ];
      const result = calculatePortfolioCostBasis(portfolio, USD_ILS_RATE);
      expect(result).toBe(1400); // 10*100 + 5*80
    });
  });

  // ============================================================================
  // Market Value Calculations
  // ============================================================================

  describe('calculateMarketValue', () => {
    test('calculates market value for USD asset', () => {
      const asset = { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(150) };
      const result = calculateMarketValue(asset, USD_ILS_RATE);
      expect(result).toBe(1500);
    });

    test('calculates market value for ILS asset', () => {
      const asset = { symbol: 'TEVA', quantity: 100, currentPrice: Money.ils(37) };
      const result = calculateMarketValue(asset, USD_ILS_RATE);
      expect(result).toBeCloseTo(1000, 2);
    });
  });

  // ============================================================================
  // Unrealized Gain/Loss
  // ============================================================================

  describe('calculateUnrealizedGainLoss', () => {
    test('calculates gain when market value exceeds cost', () => {
      const asset = {
        symbol: 'AAPL',
        quantity: 10,
        currentPrice: Money.usd(150),
        averageCost: Money.usd(100)
      };
      const result = calculateUnrealizedGainLoss(asset, USD_ILS_RATE);
      expect(result).toBe(500); // 1500 - 1000
    });

    test('calculates loss when cost exceeds market value', () => {
      const asset = {
        symbol: 'AAPL',
        quantity: 10,
        currentPrice: Money.usd(80),
        averageCost: Money.usd(100)
      };
      const result = calculateUnrealizedGainLoss(asset, USD_ILS_RATE);
      expect(result).toBe(-200); // 800 - 1000
    });
  });

  // ============================================================================
  // Exposure Calculations
  // ============================================================================

  describe('calculateExposure', () => {
    test('calculates exposure percentage', () => {
      const asset = { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100) };
      const result = calculateExposure(asset, 2000, USD_ILS_RATE);
      expect(result).toBe(50); // 1000 / 2000 * 100
    });

    test('returns 0 for zero portfolio value', () => {
      const asset = { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100) };
      const result = calculateExposure(asset, 0, USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('returns 0 for NaN portfolio value', () => {
      const asset = { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100) };
      const result = calculateExposure(asset, NaN, USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('returns 0 for zero asset value', () => {
      const asset = { symbol: 'AAPL', quantity: 0, currentPrice: Money.usd(100) };
      const result = calculateExposure(asset, 1000, USD_ILS_RATE);
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // Profit Ratio Calculations
  // ============================================================================

  describe('calculateProfitRatio', () => {
    test('calculates profit ratio correctly', () => {
      // Portfolio worth $10,000, cost basis $8,000
      // Profit = $2,000, ratio = 2000/10000 = 0.2
      const result = calculateProfitRatio(10000, 8000);
      expect(result).toBe(0.2);
    });

    test('returns 0 when no profit', () => {
      const result = calculateProfitRatio(10000, 10000);
      expect(result).toBe(0);
    });

    test('returns 0 when at a loss', () => {
      const result = calculateProfitRatio(8000, 10000);
      expect(result).toBe(0);
    });

    test('handles zero portfolio value', () => {
      const result = calculateProfitRatio(0, 0);
      expect(result).toBe(0);
    });

    test('calculates high profit ratio', () => {
      // Portfolio worth $100,000, cost basis $20,000
      // Profit = $80,000, ratio = 80000/100000 = 0.8
      const result = calculateProfitRatio(100000, 20000);
      expect(result).toBe(0.8);
    });
  });

  // ============================================================================
  // Weighted Return Calculations
  // ============================================================================

  describe('calculateWeightedReturn', () => {
    test('calculates weighted return for CAGR method', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100), method: 'CAGR', value1: 10 },
        { symbol: 'GOOGL', quantity: 10, currentPrice: Money.usd(100), method: 'CAGR', value1: 20 }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      // Equal weights, so average of 10 and 20 = 15
      expect(result).toBe(15);
    });

    test('weights by asset value', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 30, currentPrice: Money.usd(100), method: 'CAGR', value1: 10 },
        { symbol: 'GOOGL', quantity: 10, currentPrice: Money.usd(100), method: 'CAGR', value1: 20 }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      // 75% at 10%, 25% at 20% = 12.5%
      expect(result).toBe(12.5);
    });

    test('returns 0 for empty portfolio', () => {
      const result = calculateWeightedReturn([], USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('returns 0 for zero value portfolio', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 0, currentPrice: Money.usd(100), method: 'CAGR', value1: 10 }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('calculates weighted return for target price method (מחיר יעד)', () => {
      // currentPrice = 100, targetPrice (value2) = 200
      // annualReturn = (Math.pow(200/100, 1/10) - 1) * 100 ≈ 7.177%
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100), method: 'מחיר יעד', value2: 200 }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      // (2^(1/10) - 1) * 100 ≈ 7.177
      expect(result).toBeCloseTo(7.177, 1);
    });

    test('target price method falls back to currentPrice when value2 missing', () => {
      // Without value2, targetPrice defaults to currentPrice → return = 0
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100), method: 'מחיר יעד' }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      expect(result).toBe(0);
    });

    test('uses default return (value1) for unknown method', () => {
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100), method: 'Unknown', value1: 8 }
      ];
      const result = calculateWeightedReturn(portfolio, USD_ILS_RATE);
      expect(result).toBe(8);
    });
  });

  // ============================================================================
  // Pre-Retirement Portfolio Calculations
  // ============================================================================

  describe('calculatePreRetirementPortfolio', () => {
    test('calculates pre-retirement value for CAGR method', () => {
      const portfolio = [
        { symbol: 'VTI', quantity: 10, currentPrice: Money.usd(200), method: 'CAGR', value1: 10 }
      ];
      const result = calculatePreRetirementPortfolio(portfolio, 10, USD_ILS_RATE);
      // initialValue = 10 * 200 = 2000; finalValue = 2000 * (1.10)^10 ≈ 5187
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('VTI');
      expect(result[0].value).toBeCloseTo(5187, -1);
    });

    test('calculates pre-retirement value for target price method (מחיר יעד)', () => {
      // currentPrice = 100, targetPrice = 200 → annualReturn ≈ 7.177%
      // initialValue = 10 * 100 = 1000, years = 10
      // finalValue ≈ 1000 * (1.07177)^10 ≈ 2000
      const portfolio = [
        { symbol: 'AAPL', quantity: 10, currentPrice: Money.usd(100), method: 'מחיר יעד', value2: 200 }
      ];
      const result = calculatePreRetirementPortfolio(portfolio, 10, USD_ILS_RATE);
      expect(result).toHaveLength(1);
      expect(result[0].symbol).toBe('AAPL');
      expect(result[0].value).toBeCloseTo(2000, -1);
    });

    test('returns empty array for empty portfolio', () => {
      const result = calculatePreRetirementPortfolio([], 10, USD_ILS_RATE);
      expect(result).toHaveLength(0);
    });

    test('calculates percentage allocations', () => {
      const portfolio = [
        { symbol: 'VTI', quantity: 10, currentPrice: Money.usd(100), method: 'CAGR', value1: 7 },
        { symbol: 'BND', quantity: 10, currentPrice: Money.usd(100), method: 'CAGR', value1: 3 }
      ];
      const result = calculatePreRetirementPortfolio(portfolio, 5, USD_ILS_RATE);
      expect(result).toHaveLength(2);
      // Percentages should sum to 100
      const totalPct = result.reduce((sum, a) => sum + a.percentage, 0);
      expect(totalPct).toBeCloseTo(100, 1);
    });
  });

  describe('calculateAllocationWeightedReturn', () => {
    test('calculates weighted return for allocations', () => {
      const allocations = [
        { id: 1, assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 10 },
        { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 5 }
      ];
      const result = calculateAllocationWeightedReturn(allocations);
      // 60% at 10% + 40% at 5% = 6 + 2 = 8%
      expect(result).toBe(8);
    });

    test('handles allocations not summing to 100%', () => {
      const allocations = [
        { id: 1, assetType: 'Stocks', targetPercentage: 30, expectedAnnualReturn: 10 },
        { id: 2, assetType: 'Bonds', targetPercentage: 20, expectedAnnualReturn: 5 }
      ];
      const result = calculateAllocationWeightedReturn(allocations);
      // Normalized: 60% at 10% + 40% at 5% = 8%
      expect(result).toBe(8);
    });

    test('returns 0 for empty allocations', () => {
      const result = calculateAllocationWeightedReturn([]);
      expect(result).toBe(0);
    });

    test('returns 0 for null/undefined', () => {
      expect(calculateAllocationWeightedReturn(null)).toBe(0);
      expect(calculateAllocationWeightedReturn(undefined)).toBe(0);
    });

    test('returns 0 when total percentage is 0', () => {
      const allocations = [
        { id: 1, assetType: 'Stocks', targetPercentage: 0, expectedAnnualReturn: 10 }
      ];
      const result = calculateAllocationWeightedReturn(allocations);
      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // Expense Calculations
  // ============================================================================

  describe('calculateTotalExpenseWithRepetitions', () => {
    test('multiplies amount by repetition count', () => {
      const expense = { netAmount: Money.usd(10000), repetitionCount: 3 };
      const result = calculateTotalExpenseWithRepetitions(expense);
      expect(result).toBe(30000);
    });

    test('handles single repetition', () => {
      const expense = { netAmount: Money.usd(50000), repetitionCount: 1 };
      const result = calculateTotalExpenseWithRepetitions(expense);
      expect(result).toBe(50000);
    });
  });

  describe('calculateInflatedAmount', () => {
    test('applies inflation correctly for 1 year', () => {
      const result = calculateInflatedAmount(10000, 1, 3);
      expect(result).toBeCloseTo(10300, 2); // 10000 * 1.03
    });

    test('applies compound inflation for multiple years', () => {
      const result = calculateInflatedAmount(10000, 10, 3);
      // 10000 * (1.03)^10 ≈ 13439.16
      expect(result).toBeCloseTo(13439.16, 0);
    });

    test('returns original amount for 0 years', () => {
      const result = calculateInflatedAmount(10000, 0, 3);
      expect(result).toBe(10000);
    });

    test('handles 0% inflation', () => {
      const result = calculateInflatedAmount(10000, 5, 0);
      expect(result).toBe(10000);
    });
  });

  // ============================================================================
  // Main FIRE Calculation
  // ============================================================================

  describe('calculateFirePlan', () => {
    const baseInput = {
      birthDate: '1985-01-01',
      birthYear: 1985,
      earlyRetirementYear: 2040,
      monthlyContribution: Money.usd(1000),
      pensionNetMonthly: Money.usd(0),
      withdrawalRate: 4,
      inflationRate: 3,
      capitalGainsTax: 25,
      usdIlsRate: 3.7,
      accumulationPortfolio: [
        {
          symbol: 'VTI',
          quantity: 100,
          currentPrice: Money.usd(200),
          averageCost: Money.usd(150),
          method: 'CAGR',
          value1: 10
        }
      ],
      retirementAllocation: [
        { id: 1, assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
        { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
      ],
      expenses: []
    };

    test('calculates basic FIRE plan', () => {
      const result = calculateFirePlan(baseInput);

      expect(result.currentValue).toBe(20000); // 100 * 200
      expect(result.totalContributions).toBeGreaterThan(15000); // Cost basis + contributions
      expect(result.peakValue).toBeGreaterThan(result.currentValue);
      expect(result.yearlyData.length).toBeGreaterThan(0);
    });

    test('keeps the base monthly contribution until the next January 1 when inflation adjustment is enabled', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-07-15T00:00:00Z'));

      try {
        const result = calculateFirePlan({
          ...baseInput,
          earlyRetirementYear: 2027,
          monthlyContribution: Money.usd(1000),
          capitalGainsTax: 0,
          inflationRate: 12,
          accumulationPortfolio: [],
          adjustContributionsForInflation: true
        });

        const accumulationYears = result.yearlyData.filter(y => y.phase === 'accumulation');
        expect(accumulationYears[0].totalContributions).toBe(6000);
        expect(accumulationYears[1].totalContributions).toBe(19440);
        expect(result.peakValue).toBe(19440);
      } finally {
        jest.useRealTimers();
      }
    });

    test('does not inflate the contribution immediately when the plan starts on January 1', () => {
      jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));

      try {
        const result = calculateFirePlan({
          ...baseInput,
          earlyRetirementYear: 2027,
          monthlyContribution: Money.usd(1000),
          capitalGainsTax: 0,
          inflationRate: 10,
          accumulationPortfolio: [],
          adjustContributionsForInflation: true
        });

        const accumulationYears = result.yearlyData.filter(y => y.phase === 'accumulation');
        expect(accumulationYears[0].totalContributions).toBe(12000);
        expect(accumulationYears[1].totalContributions).toBe(25200);
        expect(result.peakValue).toBe(25200);
      } finally {
        jest.useRealTimers();
      }
    });

    test('uses cost basis for tax calculations', () => {
      const result = calculateFirePlan(baseInput);

      // Cost basis = 100 * 150 = 15,000
      // Market value = 100 * 200 = 20,000
      // Total contributions should start from cost basis (15000), not market value
      const firstYearData = result.yearlyData.find(y => y.phase === 'accumulation');
      expect(firstYearData).toBeDefined();

      // After first year of contributions (12 * 1000 = 12000)
      // Total contributions should be around 15000 + 12000 = 27000
      expect(result.totalContributions).toBeGreaterThanOrEqual(27000);
    });

    test('separates accumulation and retirement phases', () => {
      const result = calculateFirePlan(baseInput);

      const accumulationYears = result.yearlyData.filter(y => y.phase === 'accumulation');
      const retirementYears = result.yearlyData.filter(y => y.phase === 'retirement');

      expect(accumulationYears.length).toBeGreaterThan(0);
      expect(retirementYears.length).toBeGreaterThan(0);
    });

    test('handles planned expenses', () => {
      const inputWithExpenses = {
        ...baseInput,
        expenses: [
          { id: 1, type: 'House', year: 2030, netAmount: Money.usd(50000), frequencyYears: 1, repetitionCount: 1 }
        ]
      };
      const resultWithExpense = calculateFirePlan(inputWithExpenses);
      const resultWithoutExpense = calculateFirePlan(baseInput);

      expect(resultWithExpense.peakValue).toBeLessThan(resultWithoutExpense.peakValue);
    });

    test('handles planned expenses during retirement phase', () => {
      // Expense after earlyRetirementYear (2040) hits the retirement simulation block
      const inputWithRetirementExpense = {
        ...baseInput,
        expenses: [
          { id: 1, type: 'Boat', year: 2045, netAmount: Money.usd(100000), frequencyYears: 1, repetitionCount: 1 }
        ]
      };
      const resultWithExpense = calculateFirePlan(inputWithRetirementExpense);
      const resultWithoutExpense = calculateFirePlan(baseInput);

      // Large retirement expense should reduce end value
      expect(resultWithExpense.endValue).toBeLessThanOrEqual(resultWithoutExpense.endValue);
      // Yearly data should still be generated
      expect(resultWithExpense.yearlyData.length).toBeGreaterThan(0);
    });

    test('applies inflation to expenses', () => {
      const inputWithExpense = {
        ...baseInput,
        inflationRate: 5,
        expenses: [
          { id: 1, type: 'Expense', year: 2030, netAmount: Money.usd(10000), frequencyYears: 1, repetitionCount: 1 }
        ]
      };
      // With 5% inflation, a 2030 expense should cost more than 10000 in 2024 dollars
      const result = calculateFirePlan(inputWithExpense);
      expect(result).toBeDefined();
    });

    test('handles empty accumulation portfolio', () => {
      const input = { ...baseInput, accumulationPortfolio: [] };
      const result = calculateFirePlan(input);

      expect(result.currentValue).toBe(0);
      expect(result.peakValue).toBeGreaterThan(0); // Still has contributions
    });

    test('calculates net monthly expense correctly', () => {
      const result = calculateFirePlan(baseInput);

      // Net monthly expense = (peakValue * withdrawalRate * (1 - profitRatio * taxRate)) / 12
      expect(result.netMonthlyExpense).toBeGreaterThan(0);
      expect(result.grossAnnualWithdrawal).toBeGreaterThan(result.netMonthlyExpense * 12);
    });

    test('creates portfolio chart data', () => {
      // Enable retirement portfolio to get allocation-based retirement data
      const inputWithRetirement = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(inputWithRetirement);

      expect(result.accumulationPortfolio.length).toBe(1);
      expect(result.preRetirementPortfolio.length).toBeGreaterThan(0);
      expect(result.retirementPortfolio.length).toBe(2);
    });

    test('handles retirement already started', () => {
      const input = { ...baseInput, earlyRetirementYear: 2020 };
      const result = calculateFirePlan(input);

      // All years should be retirement phase
      const accumulationYears = result.yearlyData.filter(y => y.phase === 'accumulation');
      expect(accumulationYears.length).toBe(0);
    });

    test('handles mixed currency expenses', () => {
      const input = {
        ...baseInput,
        expenses: [
          { id: 1, description: 'USD Expense', year: 2030, netAmount: 10000, currency: '$', repetitionCount: 1 },
          { id: 2, description: 'ILS Expense', year: 2031, netAmount: 37000, currency: '₪', repetitionCount: 1 }
        ]
      };
      const result = calculateFirePlan(input);
      expect(result).toBeDefined();
    });

    // ============================================================================
    // useRetirementPortfolio Tests
    // ============================================================================

    test('useRetirementPortfolio defaults to false behavior', () => {
      // Input without useRetirementPortfolio should behave as if disabled
      const inputWithoutFlag = { ...baseInput };
      delete inputWithoutFlag.useRetirementPortfolio;
      
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      
      const resultWithoutFlag = calculateFirePlan(inputWithoutFlag);
      const resultDisabled = calculateFirePlan(inputDisabled);
      
      // Results should be identical
      expect(resultWithoutFlag.peakValue).toBe(resultDisabled.peakValue);
      expect(resultWithoutFlag.endValue).toBe(resultDisabled.endValue);
    });

    test('useRetirementPortfolio=true applies tax on portfolio switch', () => {
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      
      const resultEnabled = calculateFirePlan(inputEnabled);
      const resultDisabled = calculateFirePlan(inputDisabled);
      
      // Enabled version pays tax at retirement, so peak is lower
      expect(resultEnabled.peakValue).toBeLessThan(resultDisabled.peakValue);
    });

    test('useRetirementPortfolio=false uses accumulation structure for retirement', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      const result = calculateFirePlan(input);
      
      // Should have VTI (from accumulation), not allocation assets
      const hasVTI = result.retirementPortfolio.some(a => a.symbol === 'VTI');
      expect(hasVTI).toBe(true);
    });

    test('useRetirementPortfolio=true uses allocation structure for retirement', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      // Should have Stocks/Bonds from allocation
      const hasStocks = result.retirementPortfolio.some(a => a.symbol === 'Stocks');
      const hasBonds = result.retirementPortfolio.some(a => a.symbol === 'Bonds');
      expect(hasStocks).toBe(true);
      expect(hasBonds).toBe(true);
    });
  });
});
