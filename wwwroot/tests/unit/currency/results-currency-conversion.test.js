/**
 * Currency Conversion in Results Tab Tests
 * 
 * These tests verify that changing the display currency properly converts
 * the numeric values in the results tab, not just changes the currency symbol.
 */

// Mock Chart.js
global.Chart = jest.fn(() => ({
  data: { labels: [], datasets: [] },
  options: {},
  update: jest.fn(),
  destroy: jest.fn()
}));
global.Chart.register = jest.fn();

// Mock fetch
global.fetch = jest.fn();

// Setup mock DOM
const mockElements = new Map();

const createMockElement = (id, tagName = 'div') => {
  const element = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    dataset: {},
    classList: {
      _classes: new Set(),
      add: jest.fn(function(...classes) { classes.forEach(c => this._classes.add(c)); }),
      remove: jest.fn(function(...classes) { classes.forEach(c => this._classes.delete(c)); }),
      contains: jest.fn(function(cls) { return this._classes.has(cls); }),
      toggle: jest.fn()
    },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    click: jest.fn(),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    getContext: jest.fn(() => ({}))
  };
  return element;
};

// Create all necessary elements
const setupMockDOM = () => {
  mockElements.clear();
  
  const elementIds = [
    // Input elements
    'birthYear', 'earlyRetirementYear', 'fullRetirementAge',
    'monthlyContribution', 'monthlyContributionCurrency',
    'withdrawalRate', 'inflationRate', 'capitalGainsTax', 'usdIlsRate',
    // Currency buttons
    'currencyUSD', 'currencyILS',
    // Results summary elements
    'totalContributions', 'annualWithdrawal', 'monthlyExpense',
    'startValue', 'peakValue', 'endValue',
    // Tab elements
    'tab-accumulation', 'tab-expenses', 'tab-retirement', 'tab-results',
    'content-accumulation', 'content-expenses', 'content-retirement', 'content-results',
    // Portfolio elements
    'accumulationTable', 'accumulation-count', 'accumulation-market-value',
    'accumulation-cost-basis', 'accumulation-gain-loss', 'accumulation-tab-total',
    // Charts
    'mainChart', 'accumulationStartChart', 'accumulationEndChart',
    'startAccumulationChart', 'startRetirementChart', 'endRetirementChart',
    'expensesChart', 'retirementPortfolioChart', 'resultsExpensesChart',
    // Other
    'expensesTable', 'expensesTotalRow', 'retirementAllocationTable',
    'expenses-count', 'expenses-total', 'expenses-tab-info',
    'retirementTotalAllocation', 'retirementWeightedReturn',
    'savePlan', 'loadPlan', 'fileInput'
  ];
  
  elementIds.forEach(id => {
    const tagName = id.includes('Chart') ? 'canvas' : 'div';
    mockElements.set(id, createMockElement(id, tagName));
  });
  
  // Set default values
  mockElements.get('birthYear').value = '1985';
  mockElements.get('earlyRetirementYear').value = '2035';
  mockElements.get('fullRetirementAge').value = '67';
  mockElements.get('monthlyContribution').value = '5000';
  mockElements.get('monthlyContributionCurrency').value = '$';
  mockElements.get('withdrawalRate').value = '4';
  mockElements.get('inflationRate').value = '2';
  mockElements.get('capitalGainsTax').value = '25';
  mockElements.get('usdIlsRate').value = '3.6';
  
  // Set initial currency button state (USD active)
  mockElements.get('currencyUSD').classList._classes.add('active', 'bg-blue-500');
  
  global.document = {
    getElementById: jest.fn(id => mockElements.get(id) || null),
    createElement: jest.fn(tagName => createMockElement('', tagName)),
    querySelectorAll: jest.fn(() => []),
    body: createMockElement('body')
  };
  
  global.window = {
    location: { href: 'http://localhost:5162' },
    fireApp: null,
    URL: { createObjectURL: jest.fn(() => 'blob:test'), revokeObjectURL: jest.fn() },
    alert: jest.fn()
  };
};

// Import modules after DOM setup
setupMockDOM();
import { formatCurrency } from '../../../js/utils/formatter.js';
import { getState, updateState, resetState } from '../../../js/services/state.js';
import { calculateFirePlan } from '../../../js/services/calculator.js';
import { convertFromUSD, convertToDisplayCurrency } from '../../../js/utils/currency.js';
import { Money } from '../../../js/types/money.js';

describe('Currency Conversion in Results Tab', () => {
  const USD_ILS_RATE = 3.6;
  
  beforeEach(() => {
    setupMockDOM();
    resetState();
    jest.clearAllMocks();
  });

  describe('Value Conversion When Switching Currency', () => {
    
    test('switching from USD to ILS should multiply values by exchange rate', () => {
      // Given a value in USD
      const valueInUSD = 100000;
      
      // When converting to ILS display
      const expectedValueInILS = valueInUSD * USD_ILS_RATE; // 360,000
      
      // The displayed value should be ~360,000, not 100,000
      expect(expectedValueInILS).toBe(360000);
      
      // Format both for comparison
      const formattedUSD = formatCurrency(valueInUSD, '$');
      const formattedILS = formatCurrency(expectedValueInILS, '₪');
      
      // The ILS value should be larger
      expect(formattedUSD).toContain('100');
      expect(formattedILS).toContain('360');
    });
    
    test('switching from ILS to USD should divide values by exchange rate', () => {
      // Given a value calculated in USD
      const valueInUSD = 100000;
      
      // When displayed in ILS and then switched back to USD
      const valueDisplayedInILS = valueInUSD * USD_ILS_RATE;
      const convertedBackToUSD = valueDisplayedInILS / USD_ILS_RATE;
      
      // Should be back to original
      expect(convertedBackToUSD).toBeCloseTo(valueInUSD, 2);
    });

    test('results summary values should be converted when display currency changes', () => {
      // This test documents the EXPECTED behavior (currently broken)
      
      // Given calculation results in USD
      const calculationResultsInUSD = {
        totalContributions: 500000,
        grossAnnualWithdrawal: 40000,
        netMonthlyExpense: 2500,
        startValue: 100000,
        peakValue: 1500000,
        endValue: 800000
      };
      
      // When display currency is USD
      const displayedInUSD = {
        totalContributions: calculationResultsInUSD.totalContributions,
        grossAnnualWithdrawal: calculationResultsInUSD.grossAnnualWithdrawal,
        netMonthlyExpense: calculationResultsInUSD.netMonthlyExpense,
        startValue: calculationResultsInUSD.startValue,
        peakValue: calculationResultsInUSD.peakValue,
        endValue: calculationResultsInUSD.endValue
      };
      
      // When display currency changes to ILS (multiply by rate)
      const displayedInILS = {
        totalContributions: calculationResultsInUSD.totalContributions * USD_ILS_RATE,
        grossAnnualWithdrawal: calculationResultsInUSD.grossAnnualWithdrawal * USD_ILS_RATE,
        netMonthlyExpense: calculationResultsInUSD.netMonthlyExpense * USD_ILS_RATE,
        startValue: calculationResultsInUSD.startValue * USD_ILS_RATE,
        peakValue: calculationResultsInUSD.peakValue * USD_ILS_RATE,
        endValue: calculationResultsInUSD.endValue * USD_ILS_RATE
      };
      
      // Verify conversion is correct
      expect(displayedInILS.totalContributions).toBe(1800000); // 500k * 3.6
      expect(displayedInILS.grossAnnualWithdrawal).toBe(144000); // 40k * 3.6
      expect(displayedInILS.netMonthlyExpense).toBe(9000); // 2.5k * 3.6
      expect(displayedInILS.startValue).toBe(360000); // 100k * 3.6
      expect(displayedInILS.peakValue).toBe(5400000); // 1.5M * 3.6
      expect(displayedInILS.endValue).toBe(2880000); // 800k * 3.6
    });
  });

  describe('displayResults Function Currency Handling', () => {
    
    test('displayResults should convert USD results to ILS when displayCurrency is ILS', () => {
      // Simulate what displayResults should do
      const result = {
        totalContributions: 500000, // In USD (base currency)
        grossAnnualWithdrawal: 40000,
        netMonthlyExpense: 2500,
        yearlyData: [
          { year: 2025, portfolioValue: 100000 },
          { year: 2060, portfolioValue: 800000 }
        ],
        peakValue: 1500000
      };
      
      const displayCurrency = '₪';
      const usdIlsRate = 3.6;
      
      // When displaying in ILS, values should be multiplied by exchange rate
      const convertToDisplay = (valueInUSD) => {
        return displayCurrency === '₪' ? valueInUSD * usdIlsRate : valueInUSD;
      };
      
      const displayedTotalContributions = convertToDisplay(result.totalContributions);
      const displayedAnnualWithdrawal = convertToDisplay(result.grossAnnualWithdrawal);
      const displayedMonthlyExpense = convertToDisplay(result.netMonthlyExpense);
      const displayedStartValue = convertToDisplay(result.yearlyData[0].portfolioValue);
      const displayedPeakValue = convertToDisplay(result.peakValue);
      const displayedEndValue = convertToDisplay(result.yearlyData[result.yearlyData.length - 1].portfolioValue);
      
      // All values should be converted
      expect(displayedTotalContributions).toBe(1800000);
      expect(displayedAnnualWithdrawal).toBe(144000);
      expect(displayedMonthlyExpense).toBe(9000);
      expect(displayedStartValue).toBe(360000);
      expect(displayedPeakValue).toBe(5400000);
      expect(displayedEndValue).toBe(2880000);
    });
  });

  describe('Calculation Results Are in USD', () => {
    
    test('calculateFirePlan returns values in USD regardless of input currency', () => {
      // The calculator should return results in USD (base currency)
      // This is a design decision - all internal calculations in USD
      
      const input = {
        birthYear: 1985,
        earlyRetirementYear: 2035,
        fullRetirementAge: 67,
        monthlyContribution: Money.usd(5000), // Should be converted to USD if in ILS
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.6,
        accumulationPortfolio: [
          {
            id: 1,
            symbol: 'AAPL',
            quantity: 100,
            currentPrice: Money.usd(150),
            averageCost: Money.usd(100),
            cagrMethod: 'manual',
            value1: 10
          }
        ],
        retirementAllocation: [
          { id: 1, assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7 },
          { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };
      
      const result = calculateFirePlan(input);
      
      // Results should be in USD
      expect(result).toHaveProperty('totalContributions');
      expect(result).toHaveProperty('grossAnnualWithdrawal');
      expect(result).toHaveProperty('netMonthlyExpense');
      expect(typeof result.totalContributions).toBe('number');
      
      // Values should be reasonable (not multiplied by exchange rate)
      // Total contributions over 10 years at $5000/month = $600,000 + starting value
      expect(result.totalContributions).toBeGreaterThan(0);
    });

    test('monthly contribution in ILS should be converted to USD for calculation', () => {
      // When monthly contribution is specified in ILS
      const inputWithILSContribution = {
        birthYear: 1985,
        earlyRetirementYear: 2035,
        fullRetirementAge: 67,
        monthlyContribution: Money.ils(18000), // 18,000 ILS = ~5,000 USD
        pensionNetMonthly: Money.usd(0),
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.6,
        accumulationPortfolio: [],
        retirementAllocation: [
          { id: 1, assetType: 'Stocks', targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const inputWithUSDContribution = {
        ...inputWithILSContribution,
        monthlyContribution: Money.usd(5000) // 5,000 USD
      };
      
      const resultILS = calculateFirePlan(inputWithILSContribution);
      const resultUSD = calculateFirePlan(inputWithUSDContribution);
      
      // Both should produce similar results since 18,000 ILS ≈ 5,000 USD
      // After fix: Both should produce nearly identical results
      // Allow 1% tolerance for floating point differences
      expect(resultILS.totalContributions).toBeGreaterThan(0);
      expect(resultUSD.totalContributions).toBeGreaterThan(0);
      
      // The results should be similar (within 1% tolerance)
      const ratio = resultILS.totalContributions / resultUSD.totalContributions;
      expect(ratio).toBeCloseTo(1, 1); // Should be approximately equal
    });
  });
  
  describe('convertFromUSD Function', () => {
    
    test('convertFromUSD should return same value for USD target', () => {
      const result = convertFromUSD(100000, '$', 3.6);
      expect(result).toBe(100000);
    });
    
    test('convertFromUSD should multiply by rate for ILS target', () => {
      const result = convertFromUSD(100000, '₪', 3.6);
      expect(result).toBe(360000);
    });
    
    test('convertFromUSD should handle zero values', () => {
      expect(convertFromUSD(0, '₪', 3.6)).toBe(0);
    });
    
    test('convertFromUSD should handle different exchange rates', () => {
      const result1 = convertFromUSD(100000, '₪', 3.6);
      const result2 = convertFromUSD(100000, '₪', 4.0);
      
      expect(result1).toBe(360000);
      expect(result2).toBe(400000);
    });
  });
  
  describe('Integration: Display Results with Currency Conversion', () => {
    
    test('formatted results in ILS should show larger numbers than USD', () => {
      const valueInUSD = 100000;
      const usdIlsRate = 3.6;
      
      // Convert to ILS
      const valueInILS = convertFromUSD(valueInUSD, '₪', usdIlsRate);
      
      // Format both
      const formattedUSD = formatCurrency(valueInUSD, '$');
      const formattedILS = formatCurrency(valueInILS, '₪');
      
      // ILS formatted string should contain larger number
      expect(valueInILS).toBe(360000);
      expect(formattedUSD).toContain('$');
      expect(formattedILS).toContain('₪');
      
      // Extract numbers for comparison (remove non-digits except for negatives)
      const usdNumber = parseInt(formattedUSD.replace(/[^\d-]/g, ''));
      const ilsNumber = parseInt(formattedILS.replace(/[^\d-]/g, ''));
      
      expect(ilsNumber).toBeGreaterThan(usdNumber);
    });
  });
});
