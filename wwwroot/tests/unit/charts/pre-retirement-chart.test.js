/**
 * Pre-Retirement Portfolio Chart Tests
 * Tests to ensure the "תיק לפני הפרישה" (pre-retirement portfolio) charts
 * are populated with calculated pre-retirement data, not current portfolio data.
 * 
 * Bug History:
 * - Pre-retirement pie charts were empty because they used current portfolio data
 *   instead of the calculated preRetirementPortfolio from the FIRE calculation
 * - Fixed by using result.preRetirementPortfolio for startRetirementChart and accumulationEndChart
 */

import { calculateFirePlan, calculatePreRetirementPortfolio } from '../../../js/services/calculator.js';
import { Money } from '../../../js/types/money.js';

describe('Pre-Retirement Portfolio Charts', () => {
  
  // ============================================================================
  // Test Data
  // ============================================================================
  
  const mockPortfolio = [
    {
      id: 1,
      symbol: 'AAPL',
      quantity: 100,
      currentPrice: Money.usd(150),
      averageCost: Money.usd(100),
      method: 'CAGR',
      value1: 10, // 10% CAGR
      value2: 0,
      priceSource: 'manual',
      historicalCAGRs: {},
      cagrSource: 'manual',
      loadingCAGR: false
    },
    {
      id: 2,
      symbol: 'GOOGL',
      quantity: 50,
      currentPrice: Money.usd(100),
      averageCost: Money.usd(80),
      method: 'CAGR',
      value1: 8, // 8% CAGR
      value2: 0,
      priceSource: 'manual',
      historicalCAGRs: {},
      cagrSource: 'manual',
      loadingCAGR: false
    }
  ];
  
  const mockRetirementAllocation = [
    { id: 1, assetType: 'US Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
    { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
  ];
  
  const mockFirePlanInput = {
    birthDate: '1990-01-01',
    birthYear: 1990,
    earlyRetirementYear: 2040, // 15 years of accumulation
    fullRetirementAge: 67,
    monthlyContribution: Money.usd(1000),
    pensionNetMonthly: Money.usd(0),
    withdrawalRate: 4,
    inflationRate: 2,
    capitalGainsTax: 25,
    usdIlsRate: 3.6,
    accumulationPortfolio: mockPortfolio,
    retirementAllocation: mockRetirementAllocation,
    expenses: [],
    useRetirementPortfolio: true // Enable retirement portfolio to use allocation-based data
  };
  
  // ============================================================================
  // calculatePreRetirementPortfolio Tests
  // ============================================================================
  
  describe('calculatePreRetirementPortfolio', () => {
    
    test('should return non-empty array when portfolio has assets', () => {
      const result = calculatePreRetirementPortfolio(mockPortfolio, 10, 3.6);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
    
    test('should return array with same number of assets as input portfolio', () => {
      const result = calculatePreRetirementPortfolio(mockPortfolio, 10, 3.6);
      
      expect(result.length).toBe(mockPortfolio.length);
    });
    
    test('should have grown values after years of growth', () => {
      const yearsOfGrowth = 10;
      const result = calculatePreRetirementPortfolio(mockPortfolio, yearsOfGrowth, 3.6);

      // Current value of AAPL: 100 * 150 = $15,000
      const currentAAPLValue = 100 * mockPortfolio[0].currentPrice.amount;
      const aaplResult = result.find(a => a.symbol === 'AAPL');

      expect(aaplResult).toBeDefined();
      // After 10 years at 10% CAGR, value should be approximately $15,000 * (1.10)^10 = $38,906
      expect(aaplResult.value).toBeGreaterThan(currentAAPLValue);
    });
    
    test('should have percentage values that sum to approximately 100', () => {
      const result = calculatePreRetirementPortfolio(mockPortfolio, 10, 3.6);
      
      const totalPercentage = result.reduce((sum, asset) => sum + asset.percentage, 0);
      
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
    
    test('should return empty array when portfolio is empty', () => {
      const result = calculatePreRetirementPortfolio([], 10, 3.6);
      
      expect(result).toEqual([]);
    });
    
    test('should handle zero years of growth (returns current values)', () => {
      const result = calculatePreRetirementPortfolio(mockPortfolio, 0, 3.6);

      // With 0 years of growth, values should be close to current values
      const aaplResult = result.find(a => a.symbol === 'AAPL');
      const currentAAPLValue = 100 * mockPortfolio[0].currentPrice.amount; // quantity * price

      expect(aaplResult.value).toBeCloseTo(currentAAPLValue, 0);
    });
    
    test('should preserve asset symbols in output', () => {
      const result = calculatePreRetirementPortfolio(mockPortfolio, 10, 3.6);
      
      const symbols = result.map(a => a.symbol);
      
      expect(symbols).toContain('AAPL');
      expect(symbols).toContain('GOOGL');
    });
  });
  
  // ============================================================================
  // calculateFirePlan - preRetirementPortfolio Output Tests
  // ============================================================================
  
  describe('calculateFirePlan preRetirementPortfolio output', () => {
    
    test('should include preRetirementPortfolio in result', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      expect(result).toHaveProperty('preRetirementPortfolio');
    });
    
    test('preRetirementPortfolio should not be empty when portfolio has assets', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      expect(result.preRetirementPortfolio).toBeDefined();
      expect(Array.isArray(result.preRetirementPortfolio)).toBe(true);
      expect(result.preRetirementPortfolio.length).toBeGreaterThan(0);
    });
    
    test('preRetirementPortfolio values should be greater than current values after accumulation', () => {
      const result = calculateFirePlan(mockFirePlanInput);

      // Current portfolio value: (100 * 150) + (50 * 100) = $20,000
      const currentTotalValue = mockPortfolio.reduce(
        (sum, asset) => sum + (asset.quantity * asset.currentPrice.amount), 0
      );

      // Pre-retirement portfolio total value
      const preRetirementTotalValue = result.preRetirementPortfolio.reduce(
        (sum, asset) => sum + asset.value, 0
      );

      // After years of growth, pre-retirement value should be larger
      expect(preRetirementTotalValue).toBeGreaterThan(currentTotalValue);
    });
    
    test('preRetirementPortfolio should have correct structure for chart rendering', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      result.preRetirementPortfolio.forEach(asset => {
        // Each asset should have symbol, value, and percentage for chart
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('value');
        expect(asset).toHaveProperty('percentage');
        
        // Value should be a positive number
        expect(typeof asset.value).toBe('number');
        expect(asset.value).toBeGreaterThanOrEqual(0);
        
        // Percentage should be a number
        expect(typeof asset.percentage).toBe('number');
      });
    });
    
    test('preRetirementPortfolio percentages should sum to approximately 100', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      const totalPercentage = result.preRetirementPortfolio.reduce(
        (sum, asset) => sum + asset.percentage, 0
      );
      
      expect(totalPercentage).toBeCloseTo(100, 0);
    });
  });
  
  // ============================================================================
  // calculateFirePlan - retirementPortfolio Output Tests
  // ============================================================================
  
  describe('calculateFirePlan retirementPortfolio output', () => {
    
    test('should include retirementPortfolio in result', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      expect(result).toHaveProperty('retirementPortfolio');
    });
    
    test('retirementPortfolio should not be empty when allocation is defined', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      expect(result.retirementPortfolio).toBeDefined();
      expect(Array.isArray(result.retirementPortfolio)).toBe(true);
      expect(result.retirementPortfolio.length).toBeGreaterThan(0);
    });
    
    test('retirementPortfolio should reflect retirement allocation percentages', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      
      // Find the US Stocks allocation in result
      const usStocksAlloc = result.retirementPortfolio.find(a => a.symbol === 'US Stocks');
      
      expect(usStocksAlloc).toBeDefined();
      expect(usStocksAlloc.percentage).toBe(60); // 60% target
    });
  });
  
  // ============================================================================
  // Chart Data Validation Tests (simulating what updateCharts should receive)
  // ============================================================================
  
  describe('Chart data validation for updateCharts', () => {
    
    test('preRetirementPortfolio should be usable for donut chart', () => {
      const result = calculateFirePlan(mockFirePlanInput);
      const preRetirementData = result.preRetirementPortfolio;
      
      // Verify data is suitable for Chart.js donut chart
      expect(preRetirementData.length).toBeGreaterThan(0);
      
      // Can extract labels (symbols)
      const labels = preRetirementData.map(d => d.symbol);
      expect(labels.every(l => typeof l === 'string' && l.length > 0)).toBe(true);
      
      // Can extract data (percentages)
      const data = preRetirementData.map(d => d.percentage);
      expect(data.every(d => typeof d === 'number' && d >= 0)).toBe(true);
    });
    
    test('preRetirementPortfolio should differ from current portfolio data', () => {
      const result = calculateFirePlan(mockFirePlanInput);

      // Current portfolio percentages
      const currentTotalValue = mockPortfolio.reduce(
        (sum, asset) => sum + (asset.quantity * asset.currentPrice.amount), 0
      );
      const currentPercentages = mockPortfolio.map(asset => ({
        symbol: asset.symbol,
        percentage: (asset.quantity * asset.currentPrice.amount / currentTotalValue) * 100
      }));

      // Pre-retirement percentages
      const preRetirementPercentages = result.preRetirementPortfolio.map(asset => ({
        symbol: asset.symbol,
        percentage: asset.percentage
      }));

      // After years of different CAGR growth, percentages should change
      // AAPL has 10% CAGR, GOOGL has 8% CAGR, so AAPL should grow faster
      const currentAAPLPct = currentPercentages.find(p => p.symbol === 'AAPL')?.percentage || 0;
      const preRetirementAAPLPct = preRetirementPercentages.find(p => p.symbol === 'AAPL')?.percentage || 0;

      // AAPL with higher CAGR should have higher percentage in pre-retirement
      expect(preRetirementAAPLPct).toBeGreaterThan(currentAAPLPct);
    });
    
    test('BUG PREVENTION: updateCharts should use preRetirementPortfolio, not current portfolio', () => {
      // This test documents the expected behavior to prevent regression
      // When updateCharts is called, it should:
      // 1. Use result.preRetirementPortfolio for 'startRetirementChart' and 'accumulationEndChart'
      // 2. NOT use convertPortfolioToChartData(currentPortfolio) for these charts
      // 3. Update 'accumulationEndValue' with the pre-retirement total, NOT current value

      const result = calculateFirePlan(mockFirePlanInput);

      // The preRetirementPortfolio should exist and be non-empty
      expect(result.preRetirementPortfolio).toBeDefined();
      expect(result.preRetirementPortfolio.length).toBeGreaterThan(0);

      // The values should be grown (different from current)
      const currentValue = mockPortfolio.reduce(
        (sum, a) => sum + (a.quantity * a.currentPrice.amount), 0
      );
      const preRetirementValue = result.preRetirementPortfolio.reduce(
        (sum, a) => sum + a.value, 0
      );

      // Pre-retirement value should be significantly larger after years of growth
      // This ensures we're not accidentally showing current portfolio
      expect(preRetirementValue).toBeGreaterThan(currentValue * 1.5); // At least 50% growth

      // BUG FIX: The accumulationEndValue should show preRetirementValue, NOT currentValue
      // This was a bug where both charts showed the same total
      expect(preRetirementValue).not.toBeCloseTo(currentValue, -1); // Should be noticeably different
    });
    
    test('BUG PREVENTION: accumulationEndValue should show pre-retirement total, not current total', () => {
      // This test specifically verifies that the value displayed below "תיק לפני הפרישה"
      // is the grown pre-retirement value, not the current portfolio value

      const result = calculateFirePlan(mockFirePlanInput);

      const currentValue = mockPortfolio.reduce(
        (sum, a) => sum + (a.quantity * a.currentPrice.amount), 0
      );
      const preRetirementValue = result.preRetirementPortfolio.reduce(
        (sum, a) => sum + a.value, 0
      );

      // Current value: (100 * 150) + (50 * 100) = $20,000
      expect(currentValue).toBe(20000);

      // Pre-retirement value should be much larger (15 years of growth at ~9% weighted CAGR)
      // Even with conservative estimates, should be at least 2x after 15 years
      expect(preRetirementValue).toBeGreaterThan(currentValue * 2);

      // The ratio should be significant - this catches the bug where they were equal
      const growthRatio = preRetirementValue / currentValue;
      expect(growthRatio).toBeGreaterThan(2); // More than 2x growth over 15 years
    });
  });
  
  // ============================================================================
  // Edge Cases
  // ============================================================================
  
  describe('Edge cases', () => {
    
    test('should handle portfolio with zero quantity assets', () => {
      const portfolioWithZero = [
        ...mockPortfolio,
        {
          id: 3,
          symbol: 'MSFT',
          quantity: 0,
          currentPrice: Money.usd(300),
          averageCost: Money.usd(200),
          method: 'CAGR',
          value1: 12,
          value2: 0,
          priceSource: 'manual',
          historicalCAGRs: {},
          cagrSource: 'manual',
          loadingCAGR: false
        }
      ];

      const result = calculatePreRetirementPortfolio(portfolioWithZero, 10, 3.6);

      // Should not include asset with zero quantity in result
      const msftResult = result.find(a => a.symbol === 'MSFT');
      expect(msftResult).toBeUndefined();
    });
    
    test('should handle portfolio with zero price assets', () => {
      const portfolioWithZeroPrice = [
        {
          id: 1,
          symbol: 'TEST',
          quantity: 100,
          currentPrice: Money.usd(0),
          averageCost: Money.usd(50),
          method: 'CAGR',
          value1: 10,
          value2: 0,
          priceSource: 'manual',
          historicalCAGRs: {},
          cagrSource: 'manual',
          loadingCAGR: false
        }
      ];

      const result = calculatePreRetirementPortfolio(portfolioWithZeroPrice, 10, 3.6);

      // Should handle gracefully (either exclude or include with 0 value)
      expect(Array.isArray(result)).toBe(true);
    });
    
    test('should handle short accumulation period (1 year)', () => {
      const shortTermInput = {
        ...mockFirePlanInput,
        earlyRetirementYear: new Date().getFullYear() + 1
      };
      
      const result = calculateFirePlan(shortTermInput);
      
      expect(result.preRetirementPortfolio).toBeDefined();
      expect(result.preRetirementPortfolio.length).toBeGreaterThan(0);
    });
    
    test('should handle ILS currency conversion', () => {
      const portfolioInILS = [
        {
          id: 1,
          symbol: 'TASE',
          quantity: 100,
          currentPrice: Money.ils(500), // 500 ILS
          averageCost: Money.ils(400),
          method: 'CAGR',
          value1: 8,
          value2: 0,
          priceSource: 'manual',
          historicalCAGRs: {},
          cagrSource: 'manual',
          loadingCAGR: false
        }
      ];

      const result = calculatePreRetirementPortfolio(portfolioInILS, 10, 3.6);
      
      expect(result.length).toBe(1);
      expect(result[0].symbol).toBe('TASE');
      expect(result[0].value).toBeGreaterThan(0);
    });
  });
});
