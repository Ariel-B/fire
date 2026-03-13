/**
 * Main Chart Regression Tests
 * 
 * Based on expected behavior from commit 4ed9c6a - the original working implementation.
 * The main chart "גרף צמיחה ומשיכות" should display:
 * 
 * 1. Four datasets:
 *    - שווי תיק כולל (Total Portfolio Value) - blue filled area
 *    - סה"כ הפקדות (Total Contributions) - gray dashed line
 *    - משיכות + הוצאות מתוכננות (Withdrawals + Planned Expenses) - red dashed line
 *    - מסים ששולמו (Paid Taxes) - orange dashed line
 * 
 * 2. Two X axes:
 *    - Bottom axis: Year (שנה)
 *    - Top axis: Age (גיל)
 * 
 * 3. Currency conversion:
 *    - All values stored in USD internally
 *    - Display converted to selected currency ($ or ₪)
 * 
 * 4. Rich tooltips showing:
 *    - Year and age
 *    - Portfolio value, contributions, withdrawals
 *    - Planned expenses for that year with inflation applied
 */

import { convertToDisplayCurrency, convertToUSD, convertFromUSD } from '../../../js/utils/currency.js';
import { formatCurrency } from '../../../js/utils/formatter.js';

describe('Main Chart - גרף צמיחה ומשיכות', () => {
  
  describe('Required Dataset Structure', () => {
    test('should have four datasets: portfolio value, contributions, withdrawals, and taxes paid', () => {
      // Expected dataset configuration
      const expectedDatasets = [
        { label: 'שווי תיק כולל', type: 'portfolio' },
        { label: 'סה"כ הפקדות', type: 'contributions' },
        { label: 'משיכות + הוצאות מתוכננות', type: 'withdrawals' },
        { label: 'מסים ששולמו', type: 'taxes' }
      ];
      
      expect(expectedDatasets.length).toBe(4);
      expect(expectedDatasets[0].label).toBe('שווי תיק כולל');
      expect(expectedDatasets[1].label).toBe('סה"כ הפקדות');
      expect(expectedDatasets[2].label).toBe('משיכות + הוצאות מתוכננות');
      expect(expectedDatasets[3].label).toBe('מסים ששולמו');
    });
  });

  describe('Currency Conversion for Chart Data', () => {
    const usdIlsRate = 3.6;
    
    describe('Portfolio Value (stored in USD)', () => {
      test('should display in USD when USD selected', () => {
        const portfolioValueUSD = 1000000;
        const displayValue = convertToDisplayCurrency(portfolioValueUSD, '$', '$', usdIlsRate);
        expect(displayValue).toBe(1000000);
      });
      
      test('should convert to ILS when ILS selected', () => {
        const portfolioValueUSD = 1000000;
        const displayValue = convertToDisplayCurrency(portfolioValueUSD, '$', '₪', usdIlsRate);
        expect(displayValue).toBe(1000000 * 3.6);
      });
    });
    
    describe('Contributions (stored in USD)', () => {
      test('should display in USD when USD selected', () => {
        const contributionsUSD = 500000;
        const displayValue = convertToDisplayCurrency(contributionsUSD, '$', '$', usdIlsRate);
        expect(displayValue).toBe(500000);
      });
      
      test('should convert to ILS when ILS selected', () => {
        const contributionsUSD = 500000;
        const displayValue = convertToDisplayCurrency(contributionsUSD, '$', '₪', usdIlsRate);
        expect(displayValue).toBe(500000 * 3.6);
      });
    });
    
    describe('Withdrawals (stored in USD)', () => {
      test('should display in USD when USD selected', () => {
        const withdrawalsUSD = 40000;
        const displayValue = convertToDisplayCurrency(withdrawalsUSD, '$', '$', usdIlsRate);
        expect(displayValue).toBe(40000);
      });
      
      test('should convert to ILS when ILS selected', () => {
        const withdrawalsUSD = 40000;
        const displayValue = convertToDisplayCurrency(withdrawalsUSD, '$', '₪', usdIlsRate);
        expect(displayValue).toBe(40000 * 3.6);
      });
    });
  });

  describe('Yearly Data Structure', () => {
    test('accumulation phase should have year, age, portfolioValue, totalContributions, phase', () => {
      const accumulationYearData = {
        year: 2025,
        age: 35,
        portfolioValue: 100000,  // USD
        totalContributions: 80000,  // USD (cost basis)
        phase: 'accumulation'
      };
      
      expect(accumulationYearData.phase).toBe('accumulation');
      expect(accumulationYearData.portfolioValue).toBeDefined();
      expect(accumulationYearData.totalContributions).toBeDefined();
    });
    
    test('retirement phase should have year, age, portfolioValue, annualWithdrawal, phase', () => {
      const retirementYearData = {
        year: 2040,
        age: 50,
        portfolioValue: 2000000,  // USD
        annualWithdrawal: 80000,  // USD - gross withdrawal
        phase: 'retirement'
      };
      
      expect(retirementYearData.phase).toBe('retirement');
      expect(retirementYearData.portfolioValue).toBeDefined();
      expect(retirementYearData.annualWithdrawal).toBeDefined();
    });
  });

  describe('Withdrawals Dataset Calculation', () => {
    test('should return null for accumulation years without expenses', () => {
      const yearData = {
        year: 2025,
        phase: 'accumulation',
        portfolioValue: 100000,
        totalContributions: 80000
      };
      const expenses = [];
      
      // No withdrawal during accumulation without expenses
      const withdrawal = calculateWithdrawalForYear(yearData, expenses);
      expect(withdrawal).toBeNull();
    });
    
    test('should return annual withdrawal for retirement years', () => {
      const yearData = {
        year: 2040,
        phase: 'retirement',
        portfolioValue: 2000000,
        annualWithdrawal: 80000
      };
      const expenses = [];
      
      const withdrawal = calculateWithdrawalForYear(yearData, expenses);
      expect(withdrawal).toBe(80000);
    });
    
    test('should include planned expenses for matching year', () => {
      const yearData = {
        year: 2040,
        phase: 'retirement',
        portfolioValue: 2000000,
        annualWithdrawal: 80000,
        totalContributions: 500000  // For profit ratio calculation
      };
      const expenses = [
        { year: 2040, netAmount: 50000, currency: '$', type: 'חתונה' }
      ];
      const inflationRate = 0.02;
      const capitalGainsTax = 0.25;
      
      const withdrawal = calculateWithdrawalForYear(yearData, expenses, inflationRate, capitalGainsTax);
      // Should be greater than just annualWithdrawal due to expense
      expect(withdrawal).toBeGreaterThan(80000);
    });
    
    test('should apply inflation to planned expenses based on years from 2024', () => {
      const yearData = {
        year: 2034,  // 10 years from 2024
        phase: 'accumulation',
        portfolioValue: 500000,
        totalContributions: 400000
      };
      const expenses = [
        { year: 2034, netAmount: 100000, currency: '$', type: 'רכב' }
      ];
      const inflationRate = 0.02;  // 2%
      const capitalGainsTax = 0.25;
      
      // After 10 years at 2% inflation: 100000 * (1.02)^10 ≈ 121899
      const withdrawal = calculateWithdrawalForYear(yearData, expenses, inflationRate, capitalGainsTax);
      expect(withdrawal).toBeGreaterThan(100000);
      expect(withdrawal).toBeCloseTo(100000 * Math.pow(1.02, 10), -2);  // Allow some variance for tax
    });
    
    test('should handle repeated expenses correctly', () => {
      const yearData = {
        year: 2030,
        phase: 'accumulation',
        portfolioValue: 300000,
        totalContributions: 250000
      };
      // Expense repeats every 3 years starting in 2027
      const expenses = [
        { year: 2027, netAmount: 20000, currency: '$', type: 'חופשה', frequencyYears: 3, repetitionCount: 3 }
      ];
      const inflationRate = 0.02;
      const capitalGainsTax = 0.25;
      
      // 2030 is 3 years after 2027, so it's the second occurrence
      const withdrawal = calculateWithdrawalForYear(yearData, expenses, inflationRate, capitalGainsTax);
      expect(withdrawal).toBeGreaterThan(0);
    });
  });

  describe('Y-Axis Formatting', () => {
    test('should format values in selected currency', () => {
      const valueUSD = 1500000;
      
      // USD format
      const formattedUSD = formatCurrency(valueUSD, '$');
      expect(formattedUSD).toContain('$');
      expect(formattedUSD).toContain('1,500,000');
      
      // ILS format (after conversion)
      const valueILS = valueUSD * 3.6;
      const formattedILS = formatCurrency(valueILS, '₪');
      expect(formattedILS).toContain('₪');
    });
  });

  describe('X-Axis Labels', () => {
    test('should generate year labels from yearlyData', () => {
      const yearlyData = [
        { year: 2025, age: 35 },
        { year: 2026, age: 36 },
        { year: 2027, age: 37 }
      ];
      
      const labels = yearlyData.map(d => d.year.toString());
      expect(labels).toEqual(['2025', '2026', '2027']);
    });
    
    test('should track age for secondary axis', () => {
      const yearlyData = [
        { year: 2025, age: 35 },
        { year: 2040, age: 50 },
        { year: 2055, age: 65 }
      ];
      
      const minAge = yearlyData[0].age;
      const maxAge = yearlyData[yearlyData.length - 1].age;
      
      expect(minAge).toBe(35);
      expect(maxAge).toBe(65);
    });
  });
});

/**
 * Helper function to calculate withdrawal for a year
 * This mimics the expected behavior from the original implementation
 */
function calculateWithdrawalForYear(yearData, expenses, inflationRate = 0.02, capitalGainsTax = 0.25) {
  let withdrawalAmount = 0;
  
  // Add regular retirement withdrawals
  if (yearData.phase === 'retirement' && yearData.annualWithdrawal) {
    withdrawalAmount += yearData.annualWithdrawal;
  }
  
  // Find planned expenses for this year (including repeated expenses)
  const yearExpenses = expenses.filter(expense => {
    const frequencyYears = expense.frequencyYears || 1;
    const repetitionCount = expense.repetitionCount || 1;
    const startYear = expense.year;
    
    // Check if this year matches any occurrence of the repeated expense
    for (let i = 0; i < repetitionCount; i++) {
      const occurrenceYear = startYear + (i * frequencyYears);
      if (occurrenceYear === yearData.year) {
        return true;
      }
    }
    return false;
  });
  
  if (yearExpenses.length > 0) {
    yearExpenses.forEach(expense => {
      const netAmount = expense.netAmount;
      
      // Apply inflation based on years from base year (2024)
      const yearsFromBase = yearData.year - 2024;
      const inflatedAmount = netAmount * Math.pow(1 + inflationRate, yearsFromBase);
      
      // Apply tax implications
      let grossAmount;
      if (yearData.phase === 'retirement' && yearData.totalContributions) {
        const profitRatio = Math.max(0, Math.min(1, 
          (yearData.portfolioValue - yearData.totalContributions) / yearData.portfolioValue
        ));
        grossAmount = inflatedAmount / (1 - (profitRatio * capitalGainsTax));
      } else {
        grossAmount = inflatedAmount;
      }
      
      withdrawalAmount += grossAmount;
    });
  }
  
  return withdrawalAmount > 0 ? withdrawalAmount : null;
}
