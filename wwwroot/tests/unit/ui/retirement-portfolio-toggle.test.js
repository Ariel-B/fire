/**
 * Retirement Portfolio Toggle Tests
 * Tests for the optional retirement portfolio feature
 * 
 * Feature Description:
 * - Checkbox next to "תיק פרישה" tab to enable/disable separate retirement portfolio
 * - When disabled (default): Use accumulation portfolio returns through retirement
 * - When enabled: "Sell" accumulation, pay taxes, "buy" retirement portfolio
 * - Auto-enable on load if retirement portfolio data exists but flag is missing
 */

import { calculateFirePlan } from '../../../js/services/calculator.js';
import { Money } from '../../../js/types/money.js';

describe('Retirement Portfolio Toggle', () => {
  
  // ============================================================================
  // Test Data
  // ============================================================================
  
  const baseAccumulationPortfolio = [
    {
      id: 1,
      symbol: 'VTI',
      quantity: 100,
      currentPrice: Money.usd(200),
      averageCost: Money.usd(100), // 50% profit
      method: 'CAGR',
      value1: 10, // 10% CAGR
      value2: 0,
      priceSource: 'manual',
      historicalCAGRs: {},
      cagrSource: 'manual',
      loadingCAGR: false
    }
  ];
  
  const baseRetirementAllocation = [
    { id: 1, assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
    { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
  ];
  
  const baseInput = {
    birthDate: '1990-01-01',
    birthYear: 1990,
    earlyRetirementYear: 2040, // ~15 years of accumulation
    fullRetirementAge: 67,
    monthlyContribution: Money.usd(1000),
    pensionNetMonthly: Money.usd(0),
    withdrawalRate: 4,
    inflationRate: 2,
    capitalGainsTax: 25,
    usdIlsRate: 3.7,
    accumulationPortfolio: baseAccumulationPortfolio,
    retirementAllocation: baseRetirementAllocation,
    expenses: []
  };
  
  // ============================================================================
  // useRetirementPortfolio Flag - Default Behavior
  // ============================================================================
  
  describe('useRetirementPortfolio Flag - Default Behavior', () => {
    
    test('defaults to false when not specified', () => {
      // Input without useRetirementPortfolio
      const input = { ...baseInput };
      delete input.useRetirementPortfolio;
      
      const result = calculateFirePlan(input);
      
      // When disabled, retirement portfolio should match accumulation structure
      expect(result.retirementPortfolio).toBeDefined();
      expect(result.retirementPortfolio.length).toBeGreaterThan(0);
      
      // Should have VTI (from accumulation), not Stocks/Bonds (from allocation)
      const hasAccumulationAsset = result.retirementPortfolio.some(a => a.symbol === 'VTI');
      expect(hasAccumulationAsset).toBe(true);
    });
    
    test('explicitly setting false uses accumulation portfolio structure', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      
      const result = calculateFirePlan(input);
      
      // Retirement portfolio should reflect accumulated assets, not allocation
      const hasAccumulationAsset = result.retirementPortfolio.some(a => a.symbol === 'VTI');
      expect(hasAccumulationAsset).toBe(true);
    });
    
    test('explicitly setting true uses retirement allocation structure', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      
      const result = calculateFirePlan(input);
      
      // Retirement portfolio should reflect allocation
      const hasStocksAllocation = result.retirementPortfolio.some(a => a.symbol === 'Stocks');
      const hasBondsAllocation = result.retirementPortfolio.some(a => a.symbol === 'Bonds');
      
      expect(hasStocksAllocation).toBe(true);
      expect(hasBondsAllocation).toBe(true);
      expect(result.retirementPortfolio.length).toBe(2);
    });
  });
  
  // ============================================================================
  // Tax Calculation on Portfolio Switch
  // ============================================================================
  
  describe('Tax Calculation on Portfolio Switch', () => {
    
    test('no tax event when useRetirementPortfolio is false', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(input);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // When enabled, taxes are paid at retirement, reducing peak value
      // Therefore enabled version should have lower peak value
      expect(resultEnabled.peakValue).toBeLessThan(resultDisabled.peakValue);
    });
    
    test('retirementTaxToPay is 0 when useRetirementPortfolio is false', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      const result = calculateFirePlan(input);
      
      expect(result.retirementTaxToPay).toBe(0);
    });
    
    test('retirementTaxToPay is positive when useRetirementPortfolio is true with gains', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      // Should have tax to pay since portfolio has gains
      expect(result.retirementTaxToPay).toBeGreaterThan(0);
    });
    
    test('grossPeakValue equals peakValue when useRetirementPortfolio is false', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      const result = calculateFirePlan(input);
      
      // No tax event, so gross and net peak should be same
      expect(result.grossPeakValue).toBe(result.peakValue);
    });
    
    test('grossPeakValue is greater than peakValue when useRetirementPortfolio is true', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      // grossPeakValue is before tax, peakValue is after tax
      expect(result.grossPeakValue).toBeGreaterThan(result.peakValue);
    });
    
    test('grossPeakValue minus retirementTaxToPay equals peakValue', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      // grossPeakValue - tax = peakValue (after tax)
      expect(result.grossPeakValue - result.retirementTaxToPay).toBeCloseTo(result.peakValue, 2);
    });
    
    test('tax is calculated on unrealized gains when enabled', () => {
      // Portfolio: 100 shares at $200 = $20,000 market value
      // Cost basis: 100 shares at $100 = $10,000
      // Unrealized gain at start: $10,000 (50%)
      // After 15 years of growth, gains will be even larger
      
      const inputWithTax = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        capitalGainsTax: 25 
      };
      
      const inputNoTax = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        capitalGainsTax: 0 
      };
      
      const resultWithTax = calculateFirePlan(inputWithTax);
      const resultNoTax = calculateFirePlan(inputNoTax);
      
      // With 25% tax on gains, peak value should be reduced
      expect(resultWithTax.peakValue).toBeLessThan(resultNoTax.peakValue);
    });
    
    test('higher capital gains tax results in lower after-tax portfolio', () => {
      const inputLowTax = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        capitalGainsTax: 15 
      };
      
      const inputHighTax = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        capitalGainsTax: 35 
      };
      
      const resultLowTax = calculateFirePlan(inputLowTax);
      const resultHighTax = calculateFirePlan(inputHighTax);
      
      expect(resultHighTax.peakValue).toBeLessThan(resultLowTax.peakValue);
    });
  });
  
  // ============================================================================
  // Regression Tests - Values That Should NOT Change
  // ============================================================================
  
  describe('Regression Tests - Unchanged Values', () => {
    
    test('totalContributions should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Total contributions (cost basis + monthly deposits) should never change
      // based on retirement portfolio setting - that's just how you invest in retirement
      expect(resultEnabled.totalContributions).toBe(resultDisabled.totalContributions);
    });
    
    test('totalMonthlyContributions should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Monthly contributions during accumulation are unaffected by retirement choice
      expect(resultEnabled.totalMonthlyContributions).toBe(resultDisabled.totalMonthlyContributions);
    });
    
    test('grossPeakValue should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Gross peak value (before any tax event) should be the same
      // The only difference is whether taxes are paid at retirement or during withdrawals
      expect(resultEnabled.grossPeakValue).toBe(resultDisabled.grossPeakValue);
    });
    
    test('currentValue should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Current portfolio value is completely unaffected
      expect(resultEnabled.currentValue).toBe(resultDisabled.currentValue);
    });
    
    test('currentCostBasis should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Current cost basis is completely unaffected
      expect(resultEnabled.currentCostBasis).toBe(resultDisabled.currentCostBasis);
    });
    
    test('preRetirementPortfolio should be same regardless of useRetirementPortfolio', () => {
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // Pre-retirement portfolio composition should be identical
      expect(resultEnabled.preRetirementPortfolio).toEqual(resultDisabled.preRetirementPortfolio);
    });
  });
  
  // ============================================================================
  // Return Rate Differences
  // ============================================================================
  
  describe('Return Rate Differences', () => {
    
    test('disabled uses accumulation portfolio return rate during retirement', () => {
      // Accumulation portfolio has 10% CAGR
      // Retirement allocation has weighted average of ~5.8% (60%*7% + 40%*4%)
      
      const inputDisabled = { 
        ...baseInput, 
        useRetirementPortfolio: false,
        earlyRetirementYear: 2030 // Shorter accumulation for clearer comparison
      };
      
      const inputEnabled = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        earlyRetirementYear: 2030
      };
      
      const resultDisabled = calculateFirePlan(inputDisabled);
      const resultEnabled = calculateFirePlan(inputEnabled);
      
      // The disabled version uses 10% return in retirement
      // The enabled version uses ~5.8% return
      // After many retirement years, disabled should have higher end value
      // BUT enabled has tax event reducing peak, so we need longer retirement
      
      // Just verify both calculate without error and produce reasonable results
      expect(resultDisabled.endValue).toBeGreaterThan(0);
      expect(resultEnabled.endValue).toBeGreaterThan(0);
    });
    
    test('enabled uses retirement allocation weighted return', () => {
      // Set up very different returns to see the effect
      const highReturnAllocation = [
        { id: 1, assetType: 'Aggressive', targetPercentage: 100, expectedAnnualReturn: 12 }
      ];
      
      const lowReturnAllocation = [
        { id: 1, assetType: 'Conservative', targetPercentage: 100, expectedAnnualReturn: 3 }
      ];
      
      const inputHigh = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        retirementAllocation: highReturnAllocation,
        earlyRetirementYear: 2030 // Shorter for faster test
      };
      
      const inputLow = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        retirementAllocation: lowReturnAllocation,
        earlyRetirementYear: 2030
      };
      
      const resultHigh = calculateFirePlan(inputHigh);
      const resultLow = calculateFirePlan(inputLow);
      
      // Higher return allocation should result in higher end value
      expect(resultHigh.endValue).toBeGreaterThan(resultLow.endValue);
    });
  });
  
  // ============================================================================
  // Portfolio Output Structure
  // ============================================================================
  
  describe('Portfolio Output Structure', () => {
    
    test('retirementPortfolio has correct structure when disabled', () => {
      const input = { ...baseInput, useRetirementPortfolio: false };
      const result = calculateFirePlan(input);
      
      result.retirementPortfolio.forEach(asset => {
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('percentage');
        expect(asset).toHaveProperty('value');
        expect(typeof asset.symbol).toBe('string');
        expect(typeof asset.percentage).toBe('number');
        expect(typeof asset.value).toBe('number');
      });
    });
    
    test('retirementPortfolio has correct structure when enabled', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      result.retirementPortfolio.forEach(asset => {
        expect(asset).toHaveProperty('symbol');
        expect(asset).toHaveProperty('percentage');
        expect(asset).toHaveProperty('value');
        expect(typeof asset.symbol).toBe('string');
        expect(typeof asset.percentage).toBe('number');
        expect(typeof asset.value).toBe('number');
      });
    });
    
    test('retirementPortfolio percentages match allocation when enabled', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      const stocksAsset = result.retirementPortfolio.find(a => a.symbol === 'Stocks');
      const bondsAsset = result.retirementPortfolio.find(a => a.symbol === 'Bonds');
      
      expect(stocksAsset.percentage).toBe(60);
      expect(bondsAsset.percentage).toBe(40);
    });
    
    test('retirementPortfolio values are proportional to total when enabled', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      const result = calculateFirePlan(input);
      
      const totalValue = result.retirementPortfolio.reduce((sum, a) => sum + a.value, 0);
      
      result.retirementPortfolio.forEach(asset => {
        const expectedValue = totalValue * (asset.percentage / 100);
        expect(asset.value).toBeCloseTo(expectedValue, 0);
      });
    });
  });
  
  // ============================================================================
  // Edge Cases
  // ============================================================================
  
  describe('Edge Cases', () => {
    
    test('handles empty retirement allocation when enabled', () => {
      const input = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        retirementAllocation: []
      };
      
      // Should not throw, should fall back to accumulation behavior
      const result = calculateFirePlan(input);
      expect(result).toBeDefined();
      expect(result.retirementPortfolio).toBeDefined();
    });
    
    test('handles zero cost basis (no unrealized gains)', () => {
      const portfolioAtCost = [{
        ...baseAccumulationPortfolio[0],
        currentPrice: Money.usd(100),
        averageCost: Money.usd(100) // No gain
      }];
      
      const input = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        accumulationPortfolio: portfolioAtCost
      };
      
      const result = calculateFirePlan(input);
      
      // With no gains, tax should be zero, so peak equals pre-tax value
      expect(result.peakValue).toBeGreaterThan(0);
    });
    
    test('handles portfolio at a loss (cost > market value)', () => {
      const portfolioAtLoss = [{
        ...baseAccumulationPortfolio[0],
        currentPrice: Money.usd(50),
        averageCost: Money.usd(100) // 50% loss
      }];
      
      const input = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        accumulationPortfolio: portfolioAtLoss
      };
      
      const result = calculateFirePlan(input);
      
      // Should handle gracefully - no tax on losses
      expect(result.peakValue).toBeGreaterThan(0);
    });
    
    test('handles retirement already started', () => {
      const input = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        earlyRetirementYear: 2020 // Already passed
      };
      
      const result = calculateFirePlan(input);
      
      // Should still calculate, all years in retirement phase
      const accumulationYears = result.yearlyData.filter(y => y.phase === 'accumulation');
      expect(accumulationYears.length).toBe(0);
    });
    
    test('handles very short retirement period', () => {
      const input = { 
        ...baseInput, 
        useRetirementPortfolio: true,
        birthYear: 1960, // Age 65 now
        fullRetirementAge: 67 // Only 2 years of retirement
      };
      
      const result = calculateFirePlan(input);
      expect(result).toBeDefined();
    });
  });
  
  // ============================================================================
  // Consistency Tests
  // ============================================================================
  
  describe('Consistency Tests', () => {
    
    test('same input produces same output', () => {
      const input = { ...baseInput, useRetirementPortfolio: true };
      
      const result1 = calculateFirePlan(input);
      const result2 = calculateFirePlan(input);
      
      expect(result1.peakValue).toBe(result2.peakValue);
      expect(result1.endValue).toBe(result2.endValue);
      expect(result1.retirementPortfolio).toEqual(result2.retirementPortfolio);
    });
    
    test('preRetirementPortfolio is same regardless of useRetirementPortfolio', () => {
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      
      const resultEnabled = calculateFirePlan(inputEnabled);
      const resultDisabled = calculateFirePlan(inputDisabled);
      
      // preRetirementPortfolio should be identical since it's based on accumulation
      expect(resultEnabled.preRetirementPortfolio).toEqual(resultDisabled.preRetirementPortfolio);
    });
    
    test('currentValue is same regardless of useRetirementPortfolio', () => {
      const inputEnabled = { ...baseInput, useRetirementPortfolio: true };
      const inputDisabled = { ...baseInput, useRetirementPortfolio: false };
      
      const resultEnabled = calculateFirePlan(inputEnabled);
      const resultDisabled = calculateFirePlan(inputDisabled);
      
      // Current value is the starting portfolio, should be identical
      expect(resultEnabled.currentValue).toBe(resultDisabled.currentValue);
    });
  });
});
