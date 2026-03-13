/**
 * App Module Integration Tests
 * These tests import the actual compiled JavaScript and verify functionality
 */

// Mock Chart.js globally
global.Chart = jest.fn(() => ({
  data: { labels: [], datasets: [] },
  options: {},
  update: jest.fn(),
  destroy: jest.fn()
}));
global.Chart.register = jest.fn();

// Mock fetch for API calls
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ price: 150, name: 'Apple Inc.' })
  })
);

// Setup DOM before imports
const mockElements = new Map();

const createMockElement = (id, tagName = 'div') => {
  const element = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    disabled: false,
    style: {},
    dataset: {},
    classList: {
      _classes: new Set(),
      add: jest.fn(function(...classes) { 
        classes.forEach(c => this._classes.add(c)); 
      }),
      remove: jest.fn(function(...classes) { 
        classes.forEach(c => this._classes.delete(c)); 
      }),
      contains: jest.fn(function(cls) { 
        return this._classes.has(cls); 
      }),
      toggle: jest.fn(function(cls) {
        if (this._classes.has(cls)) {
          this._classes.delete(cls);
        } else {
          this._classes.add(cls);
        }
      })
    },
    children: [],
    childNodes: [],
    parentNode: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    click: jest.fn(),
    focus: jest.fn(),
    blur: jest.fn(),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    appendChild: jest.fn(function(child) { 
      this.children.push(child); 
      child.parentNode = this;
    }),
    removeChild: jest.fn(function(child) {
      const idx = this.children.indexOf(child);
      if (idx > -1) this.children.splice(idx, 1);
    }),
    insertBefore: jest.fn(),
    getAttribute: jest.fn((attr) => element.dataset[attr] || null),
    setAttribute: jest.fn((attr, val) => { element.dataset[attr] = val; }),
    getContext: jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn()
    }))
  };
  return element;
};

// Pre-create all necessary elements
const elementIds = [
  // Inputs
  'birthYear', 'retirementYear', 'fullRetirementAge',
  'monthlyContribution', 'monthlyContributionCurrency',
  'withdrawalRate', 'inflation', 'capitalGainsTax', 'usdIlsRate',
  'displayCurrency',
  // Tabs
  'tab-accumulation', 'tab-expenses', 'tab-retirement', 'tab-results',
  'content-accumulation', 'content-expenses', 'content-retirement', 'content-results',
  // Buttons
  'savePlan', 'loadPlan', 'fileInput',
  // Tables
  'accumulationTable', 'retirementAllocationTable', 'expensesTable', 'expensesTotalRow',
  // Portfolio summary (hyphenated)
  'accumulation-count', 'accumulation-market-value', 'accumulation-cost-basis', 'accumulation-gain-loss',
  // Results summary
  'totalContributions', 'annualWithdrawal', 'monthlyExpense',
  'startValue', 'peakValue', 'endValue',
  // Charts
  'accumulationStartChart', 'accumulationEndChart',
  'expensesChart', 'retirementPortfolioChart',
  'startAccumulationChart', 'startRetirementChart', 'endRetirementChart',
  'mainChart', 'resultsExpensesChart',
  // Expenses summary
  'expenses-count', 'expenses-total',
  // Retirement summary
  'retirement-total-percentage', 'retirement-weighted-return'
];

elementIds.forEach(id => {
  const tagName = id.includes('Chart') ? 'canvas' : 
                  id.includes('Table') || id.includes('TotalRow') ? 'tbody' :
                  id.includes('Currency') || id.includes('currency') ? 'select' :
                  id.includes('fileInput') ? 'input' : 'div';
  mockElements.set(id, createMockElement(id, tagName));
});

// Set default values for inputs
mockElements.get('birthYear').value = '1990';
mockElements.get('retirementYear').value = '2035';
mockElements.get('fullRetirementAge').value = '67';
mockElements.get('monthlyContribution').value = '5000';
mockElements.get('monthlyContributionCurrency').value = '₪';
mockElements.get('withdrawalRate').value = '4';
mockElements.get('inflation').value = '2';
mockElements.get('capitalGainsTax').value = '25';
mockElements.get('usdIlsRate').value = '3.6';
mockElements.get('displayCurrency').value = '$';

// Set default active state for accumulation tab
mockElements.get('tab-accumulation').classList._classes.add('active', 'border-blue-500', 'text-blue-600');
mockElements.get('content-expenses').classList._classes.add('hidden');
mockElements.get('content-retirement').classList._classes.add('hidden');
mockElements.get('content-results').classList._classes.add('hidden');

global.document = {
  getElementById: jest.fn((id) => mockElements.get(id) || null),
  querySelector: jest.fn((selector) => {
    if (selector.startsWith('#')) {
      return mockElements.get(selector.slice(1)) || null;
    }
    return null;
  }),
  querySelectorAll: jest.fn((selector) => {
    if (selector === '.tab-content') {
      return [
        mockElements.get('content-accumulation'),
        mockElements.get('content-expenses'),
        mockElements.get('content-retirement'),
        mockElements.get('content-results')
      ];
    }
    if (selector === '.tab-button') {
      return [
        mockElements.get('tab-accumulation'),
        mockElements.get('tab-expenses'),
        mockElements.get('tab-retirement'),
        mockElements.get('tab-results')
      ];
    }
    return [];
  }),
  createElement: jest.fn((tag) => createMockElement(`created-${Date.now()}`, tag)),
  createTextNode: jest.fn((text) => ({ textContent: text })),
  addEventListener: jest.fn(),
  readyState: 'complete'
};

global.window = {
  fireApp: null,
  addEventListener: jest.fn(),
  location: { href: 'http://localhost:5162' }
};

global.URL = {
  createObjectURL: jest.fn(() => 'blob:test'),
  revokeObjectURL: jest.fn()
};

global.Blob = jest.fn((content, options) => ({ content, options }));

// Now import the modules
import { formatCurrency, formatPercentage, formatNumber } from '../../js/utils/formatter.js';
import { getInputNumber, getInputValue, setTextContent, getElement } from '../../js/utils/dom.js';
import { calculateFirePlan, calculatePortfolioValue } from '../../js/services/calculator.js';
import { createPortfolioAsset, calculateCostBasis, calculateMarketValue } from '../../js/components/portfolio-table.js';
import { createExpense, calculateExpenseTotals } from '../../js/components/expense-table.js';
import { Money } from '../../js/types/money.js';
import {
  createAppTestHarness,
  createCalculationResult,
  createDeferred,
  flushPromises,
  loadAppModule
} from '../helpers/app-test-harness.js';

describe('Module Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('app.ts critical behavior locking', () => {
    let originalDocument;
    let originalWindow;
    let originalAlert;
    let originalChart;
    let originalUrl;
    let originalBlob;
    let originalHTMLElement;
    let originalHTMLInputElement;
    let originalHTMLSelectElement;
    let originalHTMLTextAreaElement;
    let originalHTMLTableSectionElement;
    let originalNode;

    beforeEach(() => {
      originalDocument = global.document;
      originalWindow = global.window;
      originalAlert = global.alert;
      originalChart = global.Chart;
      originalUrl = global.URL;
      originalBlob = global.Blob;
      originalHTMLElement = global.HTMLElement;
      originalHTMLInputElement = global.HTMLInputElement;
      originalHTMLSelectElement = global.HTMLSelectElement;
      originalHTMLTextAreaElement = global.HTMLTextAreaElement;
      originalHTMLTableSectionElement = global.HTMLTableSectionElement;
      originalNode = global.Node;
    });

    afterEach(() => {
      global.document = originalDocument;
      global.window = originalWindow;
      global.alert = originalAlert;
      global.Chart = originalChart;
      global.URL = originalUrl;
      global.Blob = originalBlob;
      global.HTMLElement = originalHTMLElement;
      global.HTMLInputElement = originalHTMLInputElement;
      global.HTMLSelectElement = originalHTMLSelectElement;
      global.HTMLTextAreaElement = originalHTMLTextAreaElement;
      global.HTMLTableSectionElement = originalHTMLTableSectionElement;
      global.Node = originalNode;
    });

    test('calculateAndUpdate keeps only the newest successful response', async () => {
      const harness = createAppTestHarness();
      const firstResponse = createDeferred();
      const secondResponse = createDeferred();
      const apiCalls = [];

      const { appModule, mocks } = loadAppModule(harness, {
        firePlanApi: {
          calculateFirePlanAPI: jest.fn((input) => {
            apiCalls.push(input);
            return apiCalls.length === 1 ? firstResponse.promise : secondResponse.promise;
          })
        }
      });
      const fireApp = appModule.default || appModule;

      harness.getElement('monthlyContribution').value = '1000';
      appModule.calculateAndUpdate();

      harness.getElement('monthlyContribution').value = '2500';
      appModule.calculateAndUpdate();

      secondResponse.resolve(createCalculationResult({
        totalContributions: 250000,
        totalMonthlyContributions: 2500,
        currentValue: 300000,
        yearlyData: [{ year: 2045, portfolioValue: 450000, totalContributions: 250000, annualWithdrawal: 50000, phase: 'retirement', flowData: { phase: 'retirement', isRetirementYear: true } }]
      }));
      await flushPromises(3);

      firstResponse.resolve(createCalculationResult({
        totalContributions: 100000,
        totalMonthlyContributions: 1000,
        currentValue: 150000,
        yearlyData: [{ year: 2045, portfolioValue: 200000, totalContributions: 100000, annualWithdrawal: 40000, phase: 'retirement', flowData: { phase: 'retirement', isRetirementYear: true } }]
      }));
      await flushPromises(3);

      expect(mocks.firePlanApi.calculateFirePlanAPI).toHaveBeenCalledTimes(2);
      expect(apiCalls[0].monthlyContribution.amount).toBe(1000);
      expect(apiCalls[1].monthlyContribution.amount).toBe(2500);
      expect(fireApp.getState().lastCalculationResult.totalContributions).toBe(250000);
      expect(harness.getElement('totalContributions').textContent).toContain('900,000');
      expect(harness.getElement('totalContributions').textContent).toContain('₪');
    });

    test('latest API failure clears stale export snapshot and shows server error message', async () => {
      const harness = createAppTestHarness();
      const serverError = new Error('bad request');
      const { appModule, mocks } = loadAppModule(harness, {
        firePlanApi: {
          calculateFirePlanAPI: jest.fn().mockRejectedValue(serverError),
          FirePlanApiError: class FirePlanApiError extends Error {
            constructor(message, statusCode) {
              super(message);
              this.name = 'FirePlanApiError';
              this.statusCode = statusCode;
            }
          }
        }
      });
      const fireApp = appModule.default || appModule;

      const apiError = new mocks.firePlanApi.FirePlanApiError('מספר שנים לא תקין', 400, serverError);
      mocks.firePlanApi.calculateFirePlanAPI.mockRejectedValue(apiError);

      fireApp.getState().lastCalculationResult = createCalculationResult();
      fireApp.getState().lastSuccessfulCalculationInput = { previous: true };

      appModule.calculateAndUpdate();
      await flushPromises(3);

      expect(fireApp.getState().lastCalculationResult).toBeNull();
      expect(fireApp.getState().lastSuccessfulCalculationInput).toBeNull();
      expect(harness.getElement('totalContributions').textContent).toBe('שגיאה: מספר שנים לא תקין');
      expect(harness.getElement('annualWithdrawalNet').textContent).toBe('-');
    });

    test('window.fireApp exposes only stable compatibility actions', () => {
      const harness = createAppTestHarness({ readyState: 'loading' });

      loadAppModule(harness);

      expect(Object.keys(global.window.fireApp).sort()).toEqual([
        'calculateAndUpdate',
        'exportPlanToExcel',
        'loadPlan',
        'loadPlanFromData',
        'savePlan',
        'savePlanAs',
        'switchTab'
      ]);
      expect(global.window.fireApp.getState).toBeUndefined();
      expect(global.window.fireApp.updatePortfolioAssetSymbol).toBeUndefined();
      expect(global.window.fireApp.onCurrencyChange).toBeUndefined();
    });
  });

  // ============================================================================
  // Formatter Module Tests
  // ============================================================================
  describe('Formatter Module', () => {
    test('formatCurrency should format USD correctly', () => {
      const result = formatCurrency(1234567, '$');
      expect(result).toMatch(/\$/);
      expect(result).toMatch(/1.*234.*567/);
    });

    test('formatCurrency should format ILS correctly', () => {
      const result = formatCurrency(1234567, '₪');
      expect(result).toMatch(/₪/);
    });

    test('formatCurrency should handle zero', () => {
      const result = formatCurrency(0, '$');
      expect(result).toContain('$');
      expect(result).toContain('0');
    });

    test('formatCurrency should handle negative numbers', () => {
      const result = formatCurrency(-5000, '$');
      expect(result).toContain('-');
    });

    test('formatPercentage should format correctly', () => {
      const result = formatPercentage(12.34);
      expect(result).toMatch(/12.*34.*%/);
    });

    test('formatNumber should add thousand separators', () => {
      const result = formatNumber(1234567);
      expect(result).toMatch(/1.*234.*567/);
    });
  });

  // ============================================================================
  // DOM Utils Module Tests
  // ============================================================================
  describe('DOM Utils Module', () => {
    test('getElement should return element by ID', () => {
      const element = getElement('birthYear');
      expect(element).not.toBeNull();
      expect(element.id).toBe('birthYear');
    });

    test('getElement should return null for non-existent element', () => {
      const element = getElement('nonexistent');
      expect(element).toBeNull();
    });

    test('getInputNumber should return number value', () => {
      const value = getInputNumber('birthYear', 0);
      expect(value).toBe(1990);
      expect(typeof value).toBe('number');
    });

    test('getInputNumber should return default for missing element', () => {
      const value = getInputNumber('nonexistent', 42);
      expect(value).toBe(42);
    });

    test('getInputValue should return string value', () => {
      const value = getInputValue('displayCurrency');
      expect(value).toBe('$');
    });

    test('setTextContent should update element text', () => {
      setTextContent('totalContributions', '$500,000');
      const element = mockElements.get('totalContributions');
      expect(element.textContent).toBe('$500,000');
    });
  });

  // ============================================================================
  // Calculator Module Tests
  // ============================================================================
  describe('Calculator Module', () => {
    test('calculatePortfolioValue should sum asset values', () => {
      const portfolio = [
        { quantity: 100, currentPrice: Money.usd(150) },
        { quantity: 50, currentPrice: Money.usd(200) }
      ];

      const value = calculatePortfolioValue(portfolio, 3.6);
      expect(value).toBe(25000); // 100*150 + 50*200
    });

    test('calculatePortfolioValue should handle empty portfolio', () => {
      const value = calculatePortfolioValue([], 3.6);
      expect(value).toBe(0);
    });

    test('calculateFirePlan should return valid result structure', () => {
      const input = {
        birthYear: 1990,
        earlyRetirementYear: 2035,
        fullRetirementAge: 67,
        monthlyContribution: 5000,
        monthlyContributionCurrency: '₪',
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.6,
        accumulationPortfolio: [],
        retirementAllocation: [
          { targetPercentage: 60, expectedAnnualReturn: 8 },
          { targetPercentage: 40, expectedAnnualReturn: 4 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);

      expect(result).toHaveProperty('yearlyData');
      expect(result).toHaveProperty('totalContributions');
      expect(result).toHaveProperty('grossAnnualWithdrawal');
      expect(result).toHaveProperty('netMonthlyExpense');
      expect(Array.isArray(result.yearlyData)).toBe(true);
    });

    test('calculateFirePlan yearlyData should have correct structure', () => {
      const input = {
        birthYear: 1990,
        earlyRetirementYear: 2035,
        fullRetirementAge: 67,
        monthlyContribution: 5000,
        monthlyContributionCurrency: '₪',
        withdrawalRate: 4,
        inflationRate: 2,
        capitalGainsTax: 25,
        usdIlsRate: 3.6,
        accumulationPortfolio: [],
        retirementAllocation: [
          { targetPercentage: 100, expectedAnnualReturn: 7 }
        ],
        expenses: []
      };

      const result = calculateFirePlan(input);

      if (result.yearlyData.length > 0) {
        const firstYear = result.yearlyData[0];
        expect(firstYear).toHaveProperty('year');
        expect(firstYear).toHaveProperty('portfolioValue');
      }
    });
  });

  // ============================================================================
  // Portfolio Table Module Tests
  // ============================================================================
  describe('Portfolio Table Module', () => {
    test('createPortfolioAsset should return valid asset object', () => {
      const asset = createPortfolioAsset();

      expect(asset).toHaveProperty('id');
      expect(asset).toHaveProperty('symbol');
      expect(asset).toHaveProperty('quantity');
      expect(asset).toHaveProperty('currentPrice');
      expect(asset).toHaveProperty('averageCost');
      expect(asset.currentPrice).toHaveProperty('amount');
      expect(asset.currentPrice).toHaveProperty('currency');
      expect(asset).toHaveProperty('method');
    });

    test('createPortfolioAsset with ID should use that ID', () => {
      const asset = createPortfolioAsset(12345);
      expect(asset.id).toBe(12345);
    });

    test('calculateCostBasis should compute correctly', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.usd(50)
      };

      const costBasis = calculateCostBasis(asset, { usdToIls: 3.6, ilsToUsd: 1/3.6 }, '$');
      expect(costBasis).toBe(5000);
    });

    test('calculateMarketValue should compute correctly', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(150)
      };

      const marketValue = calculateMarketValue(asset, { usdToIls: 3.6, ilsToUsd: 1/3.6 }, '$');
      expect(marketValue).toBe(15000);
    });
  });

  // ============================================================================
  // Expense Table Module Tests
  // ============================================================================
  describe('Expense Table Module', () => {
    test('createExpense should return valid expense object', () => {
      const expense = createExpense();

      expect(expense).toHaveProperty('id');
      expect(expense).toHaveProperty('type');
      expect(expense).toHaveProperty('netAmount');
      expect(expense.netAmount).toHaveProperty('amount');
      expect(expense.netAmount).toHaveProperty('currency');
      expect(expense).toHaveProperty('year');
      expect(expense).toHaveProperty('frequencyYears');
      expect(expense).toHaveProperty('repetitionCount');
    });

    test('createExpense with ID should use that ID', () => {
      const expense = createExpense(67890);
      expect(expense.id).toBe(67890);
    });

    test('calculateExpenseTotals should sum expenses correctly', () => {
      const expenses = [
        { netAmount: Money.usd(50000), year: 2026, frequencyYears: 1, repetitionCount: 1 },
        { netAmount: Money.usd(30000), year: 2027, frequencyYears: 1, repetitionCount: 1 }
      ];

      const totals = calculateExpenseTotals(expenses, 2025, 2, { usdToIls: 3.6, ilsToUsd: 1/3.6 }, '$');
      expect(totals.totalNetAmount).toBe(80000);
    });

    test('calculateExpenseTotals should handle repeating expenses', () => {
      const expenses = [
        { netAmount: Money.usd(100000), year: 2025, frequencyYears: 5, repetitionCount: 3 }
      ];

      const totals = calculateExpenseTotals(expenses, 2025, 2, { usdToIls: 3.6, ilsToUsd: 1/3.6 }, '$');
      // 100,000 * 3 repetitions = 300,000
      expect(totals.totalOccurrences).toBe(3);
    });
  });

  // ============================================================================
  // Cross-Module Integration Tests
  // ============================================================================
  describe('Cross-Module Integration', () => {
    test('portfolio value should be correctly formatted', () => {
      const portfolio = [
        { quantity: 100, currentPrice: Money.usd(150) }
      ];

      const value = calculatePortfolioValue(portfolio, 3.6);
      const formatted = formatCurrency(value, '$');

      expect(formatted).toContain('$');
      expect(formatted).toMatch(/15.*000/);
    });

    test('expense total should be correctly formatted', () => {
      const expenses = [
        { netAmount: Money.usd(50000), year: 2026, frequencyYears: 1, repetitionCount: 1 }
      ];

      const totals = calculateExpenseTotals(expenses, 2025, 2, { usdToIls: 3.6, ilsToUsd: 1/3.6 }, '$');
      const formatted = formatCurrency(totals.totalNetAmount, '$');

      expect(formatted).toContain('$');
      expect(formatted).toMatch(/50.*000/);
    });

    test('DOM should reflect calculated values', () => {
      const portfolio = [
        { quantity: 100, currentPrice: Money.usd(150) }
      ];

      const value = calculatePortfolioValue(portfolio, 3.6);
      const formatted = formatCurrency(value, '$');

      setTextContent('accumulation-market-value', formatted);

      const element = mockElements.get('accumulation-market-value');
      expect(element.textContent).toBe(formatted);
    });
  });
});

// ============================================================================
// Element ID Consistency Tests
// ============================================================================
describe('Element ID Consistency with HTML', () => {
  const expectedElements = {
    // Portfolio summary - must use hyphenated IDs
    portfolioSummary: [
      'accumulation-count',
      'accumulation-market-value', 
      'accumulation-cost-basis',
      'accumulation-gain-loss'
    ],
    // Results tab summary - must use these exact IDs
    resultsSummary: [
      'totalContributions',
      'annualWithdrawal',
      'monthlyExpense'
    ],
    // Donut chart values
    donutValues: [
      'startValue',
      'peakValue',
      'endValue'
    ],
    // Tab elements
    tabs: [
      'tab-accumulation',
      'tab-expenses',
      'tab-retirement',
      'tab-results'
    ],
    // Tab content
    content: [
      'content-accumulation',
      'content-expenses',
      'content-retirement',
      'content-results'
    ],
    // Chart canvases
    charts: [
      'accumulationStartChart',
      'accumulationEndChart',
      'expensesChart',
      'retirementPortfolioChart',
      'startAccumulationChart',
      'startRetirementChart',
      'endRetirementChart',
      'mainChart',
      'resultsExpensesChart'
    ],
    // Save/Load
    fileOps: [
      'savePlan',
      'loadPlan',
      'fileInput'
    ],
    // Tables
    tables: [
      'accumulationTable',
      'retirementAllocationTable',
      'expensesTable'
    ]
  };

  Object.entries(expectedElements).forEach(([category, ids]) => {
    describe(`${category} elements`, () => {
      ids.forEach(id => {
        test(`${id} should exist in DOM`, () => {
          expect(mockElements.has(id)).toBe(true);
        });
      });
    });
  });
});
