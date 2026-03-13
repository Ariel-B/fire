/**
 * Target Portfolio Calculation Tests
 * 
 * Tests for the calculateTargetPortfolioValue function which calculates
 * the portfolio value needed to support a target monthly expense.
 * 
 * Formula: Target Portfolio = 12 × monthlyExpense / (1 - taxRate) / withdrawalRate × (1 + inflationRate)^years
 * 
 * Example: Target monthly expense of $20,000 with:
 * - 25% capital gains tax (0.25)
 * - 4% withdrawal rate (0.04)
 * - 0% inflation for year 0
 * 
 * Net Annual = $20,000 × 12 = $240,000
 * Gross Annual = $240,000 / 0.75 = $320,000
 * Target Portfolio = $320,000 / 0.04 = $8,000,000
 */

import { calculateTargetPortfolioValue } from '../../../js/components/chart-manager.js';

describe('Target Portfolio Calculation - יעד תיק להוצאה חודשית', () => {
  
  describe('Basic Calculation (No Inflation)', () => {
    test('should calculate target portfolio for $20,000/month with 25% tax and 4% withdrawal rate', () => {
      // Monthly expense: $20,000
      // Tax rate: 25% (0.25)
      // Withdrawal rate: 4% (0.04)
      // Inflation: 0%
      // Years: 0
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0, 0);
      
      // Expected: 20,000 × 12 / 0.75 / 0.04 = 8,000,000
      expect(result).toBe(8000000);
    });
    
    test('should calculate target portfolio for $10,000/month with 25% tax and 4% withdrawal rate', () => {
      const result = calculateTargetPortfolioValue(10000, 0.25, 0.04, 0, 0);
      
      // Expected: 10,000 × 12 / 0.75 / 0.04 = 4,000,000
      expect(result).toBe(4000000);
    });
    
    test('should calculate target portfolio for $5,000/month with 25% tax and 4% withdrawal rate', () => {
      const result = calculateTargetPortfolioValue(5000, 0.25, 0.04, 0, 0);
      
      // Expected: 5,000 × 12 / 0.75 / 0.04 = 2,000,000
      expect(result).toBe(2000000);
    });
    
    test('should calculate target portfolio with different withdrawal rate (3%)', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.03, 0, 0);
      
      // Expected: 20,000 × 12 / 0.75 / 0.03 = 10,666,666.67
      expect(result).toBeCloseTo(10666666.67, 0);
    });
    
    test('should calculate target portfolio with different tax rate (20%)', () => {
      const result = calculateTargetPortfolioValue(20000, 0.20, 0.04, 0, 0);
      
      // Expected: 20,000 × 12 / 0.80 / 0.04 = 7,500,000
      expect(result).toBe(7500000);
    });
    
    test('should calculate target portfolio with no tax (0%)', () => {
      const result = calculateTargetPortfolioValue(20000, 0, 0.04, 0, 0);
      
      // Expected: 20,000 × 12 / 1.0 / 0.04 = 6,000,000
      expect(result).toBe(6000000);
    });
  });
  
  describe('Inflation Adjustment', () => {
    test('should apply 2% inflation for 1 year', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0.02, 1);
      
      // Base: $8,000,000
      // After 1 year at 2%: 8,000,000 × 1.02 = 8,160,000
      expect(result).toBeCloseTo(8160000, 0);
    });
    
    test('should apply 2% inflation for 5 years', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0.02, 5);
      
      // Base: $8,000,000
      // After 5 years at 2%: 8,000,000 × (1.02)^5 ≈ 8,832,645
      expect(result).toBeCloseTo(8832645, -1); // Within 10
    });
    
    test('should apply 3% inflation for 10 years', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0.03, 10);
      
      // Base: $8,000,000
      // After 10 years at 3%: 8,000,000 × (1.03)^10 ≈ 10,751,331
      expect(result).toBeCloseTo(10751331, -1); // Within 10
    });
    
    test('should handle 0% inflation over multiple years', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0, 10);
      
      // Should remain at base value regardless of years
      expect(result).toBe(8000000);
    });
    
    test('should handle negative inflation years (deflation)', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0.02, -1);
      
      // Going backwards by 1 year: 8,000,000 × (1.02)^(-1) = 7,843,137.25
      expect(result).toBeCloseTo(7843137.25, 0);
    });
  });
  
  describe('Edge Cases', () => {
    test('should return 0 for $0 monthly expense', () => {
      const result = calculateTargetPortfolioValue(0, 0.25, 0.04, 0.02, 0);
      expect(result).toBe(0);
    });
    
    test('should handle very small monthly expense', () => {
      const result = calculateTargetPortfolioValue(100, 0.25, 0.04, 0, 0);
      
      // Expected: 100 × 12 / 0.75 / 0.04 = 40,000
      expect(result).toBe(40000);
    });
    
    test('should handle very large monthly expense', () => {
      const result = calculateTargetPortfolioValue(100000, 0.25, 0.04, 0, 0);
      
      // Expected: 100,000 × 12 / 0.75 / 0.04 = 40,000,000
      expect(result).toBe(40000000);
    });
    
    test('should handle high tax rate (50%)', () => {
      const result = calculateTargetPortfolioValue(20000, 0.50, 0.04, 0, 0);
      
      // Expected: 20,000 × 12 / 0.50 / 0.04 = 12,000,000
      expect(result).toBe(12000000);
    });
    
    test('should handle high withdrawal rate (10%)', () => {
      const result = calculateTargetPortfolioValue(20000, 0.25, 0.10, 0, 0);
      
      // Expected: 20,000 × 12 / 0.75 / 0.10 = 3,200,000
      expect(result).toBe(3200000);
    });
  });
  
  describe('Formula Consistency', () => {
    test('should satisfy: withdrawal × (1 - taxRate) × withdrawalRate = net annual', () => {
      const monthlyExpense = 20000;
      const taxRate = 0.25;
      const withdrawalRate = 0.04;
      
      const targetPortfolio = calculateTargetPortfolioValue(monthlyExpense, taxRate, withdrawalRate, 0, 0);
      const netAnnual = monthlyExpense * 12;
      
      // Verify: targetPortfolio × withdrawalRate × (1 - taxRate) = netAnnual
      const actualNetAnnual = targetPortfolio * withdrawalRate * (1 - taxRate);
      expect(actualNetAnnual).toBeCloseTo(netAnnual, 2);
    });
    
    test('should scale linearly with monthly expense', () => {
      const base = calculateTargetPortfolioValue(10000, 0.25, 0.04, 0, 0);
      const doubled = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0, 0);
      
      expect(doubled).toBe(base * 2);
    });
    
    test('should scale inversely with withdrawal rate', () => {
      const rate4pct = calculateTargetPortfolioValue(20000, 0.25, 0.04, 0, 0);
      const rate8pct = calculateTargetPortfolioValue(20000, 0.25, 0.08, 0, 0);
      
      expect(rate4pct).toBe(rate8pct * 2);
    });
  });
  
  describe('ILS Currency Scenarios (pre-conversion values)', () => {
    // These test USD-equivalent values that would result from ILS conversion
    const usdIlsRate = 3.6;
    
    test('should work with ILS monthly expense converted to USD', () => {
      // Target ₪36,000/month = $10,000/month at 3.6 exchange rate
      const ilsMonthly = 36000;
      const usdMonthly = ilsMonthly / usdIlsRate;
      
      const result = calculateTargetPortfolioValue(usdMonthly, 0.25, 0.04, 0, 0);
      
      // Expected: 10,000 × 12 / 0.75 / 0.04 = 4,000,000 USD
      expect(result).toBe(4000000);
    });
    
    test('should work with ₪72,000/month target (typical Israeli family)', () => {
      // Target ₪72,000/month = $20,000/month at 3.6 exchange rate
      const ilsMonthly = 72000;
      const usdMonthly = ilsMonthly / usdIlsRate;
      
      const result = calculateTargetPortfolioValue(usdMonthly, 0.25, 0.04, 0, 0);
      
      // Expected: $8,000,000 USD = ₪28,800,000 ILS
      expect(result).toBe(8000000);
    });
  });
});
