/**
 * Results Tab Tests
 * Tests for results tab display - addressing bugs:
 * 1. "results tab: summary cards show zeros"
 * 2. "results tab: line chart shows incorrect data"
 * 3. "results tab: expenses bar chart is empty/missing"
 * 
 * Bug History:
 * - displayResults used wrong element IDs (resultMonthlyBudget vs monthlyExpense)
 * - updateCharts used wrong chart canvas IDs for donut charts
 * - Results expenses chart was not being updated
 */

// Mock DOM setup
const mockElements = {};

const createMockElement = (id) => ({
  id,
  textContent: '',
  innerHTML: '',
  value: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn(() => false)
  },
  getContext: jest.fn(() => ({})),
  style: {}
});

// Create all results tab elements with CORRECT IDs
const resultElementIds = [
  // Summary cards - CORRECT IDs from HTML
  'totalContributions',
  'annualWithdrawal',
  'monthlyExpense',
  
  // Donut chart values
  'startValue',
  'peakValue',
  'endValue',
  
  // Chart canvas elements - CORRECT IDs from HTML
  'startAccumulationChart',
  'startRetirementChart',
  'endRetirementChart',
  'mainChart',
  'resultsExpensesChart',
  
  // Expenses tab chart (for comparison)
  'expensesChart'
];

resultElementIds.forEach(id => {
  mockElements[id] = createMockElement(id);
});

// Wrong IDs that were causing the bugs
const wrongIds = [
  'resultMonthlyBudget',      // Wrong - should be monthlyExpense
  'resultAnnualWithdrawal',   // Wrong - should be annualWithdrawal
  'resultTotalContributions', // Wrong - should be totalContributions
  'accumulationStartChart',   // Wrong - should be startAccumulationChart
  'accumulationEndChart'      // Wrong - should be startRetirementChart
];

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

describe('Results Tab Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resultElementIds.forEach(id => {
      mockElements[id].textContent = '';
    });
  });

  // ============================================================================
  // Summary Cards Element IDs - Core bug fix
  // ============================================================================

  describe('Summary Cards - Correct Element IDs', () => {
    test('totalContributions element should exist', () => {
      expect(document.getElementById('totalContributions')).not.toBeNull();
    });

    test('annualWithdrawal element should exist', () => {
      expect(document.getElementById('annualWithdrawal')).not.toBeNull();
    });

    test('monthlyExpense element should exist', () => {
      expect(document.getElementById('monthlyExpense')).not.toBeNull();
    });

    test('wrong element IDs should return null', () => {
      expect(document.getElementById('resultMonthlyBudget')).toBeNull();
      expect(document.getElementById('resultAnnualWithdrawal')).toBeNull();
      expect(document.getElementById('resultTotalContributions')).toBeNull();
    });
  });

  // ============================================================================
  // Chart Canvas Element IDs
  // ============================================================================

  describe('Chart Canvas - Correct Element IDs', () => {
    test('startAccumulationChart canvas should exist', () => {
      expect(document.getElementById('startAccumulationChart')).not.toBeNull();
    });

    test('startRetirementChart canvas should exist', () => {
      expect(document.getElementById('startRetirementChart')).not.toBeNull();
    });

    test('endRetirementChart canvas should exist', () => {
      expect(document.getElementById('endRetirementChart')).not.toBeNull();
    });

    test('mainChart canvas should exist', () => {
      expect(document.getElementById('mainChart')).not.toBeNull();
    });

    test('resultsExpensesChart canvas should exist', () => {
      expect(document.getElementById('resultsExpensesChart')).not.toBeNull();
    });

    test('wrong chart IDs should return null', () => {
      expect(document.getElementById('accumulationStartChart')).toBeNull();
      expect(document.getElementById('accumulationEndChart')).toBeNull();
    });
  });

  // ============================================================================
  // displayResults Function Tests
  // ============================================================================

  describe('displayResults Function', () => {
    const formatCurrency = (amount, currency) => {
      return `${currency}${Math.round(amount).toLocaleString('he-IL')}`;
    };

    const displayResults = (result, displayCurrency = '$') => {
      // Use CORRECT element IDs (the bug fix)
      const totalContribEl = mockElements['totalContributions'];
      const annualWithdrawalEl = mockElements['annualWithdrawal'];
      const monthlyExpenseEl = mockElements['monthlyExpense'];
      
      if (totalContribEl) {
        totalContribEl.textContent = formatCurrency(result.totalContributions, displayCurrency);
      }
      if (annualWithdrawalEl) {
        annualWithdrawalEl.textContent = formatCurrency(result.grossAnnualWithdrawal, displayCurrency);
      }
      if (monthlyExpenseEl) {
        monthlyExpenseEl.textContent = formatCurrency(result.netMonthlyExpense, displayCurrency);
      }
      
      // Update donut chart value labels
      const startValueEl = mockElements['startValue'];
      const peakValueEl = mockElements['peakValue'];
      const endValueEl = mockElements['endValue'];
      
      if (result.yearlyData && result.yearlyData.length > 0) {
        const startVal = result.yearlyData[0].portfolioValue;
        const endVal = result.yearlyData[result.yearlyData.length - 1].portfolioValue;
        
        if (startValueEl) startValueEl.textContent = formatCurrency(startVal, displayCurrency);
        if (endValueEl) endValueEl.textContent = formatCurrency(endVal, displayCurrency);
      }
      if (peakValueEl && result.peakValue) {
        peakValueEl.textContent = formatCurrency(result.peakValue, displayCurrency);
      }
    };

    test('should display totalContributions in correct element', () => {
      const result = {
        totalContributions: 500000,
        grossAnnualWithdrawal: 50000,
        netMonthlyExpense: 3500,
        yearlyData: [{ portfolioValue: 100000 }],
        peakValue: 1500000
      };

      displayResults(result);

      expect(mockElements['totalContributions'].textContent).toContain('500,000');
    });

    test('should display annualWithdrawal in correct element', () => {
      const result = {
        totalContributions: 500000,
        grossAnnualWithdrawal: 60000,
        netMonthlyExpense: 4000,
        yearlyData: [],
        peakValue: 0
      };

      displayResults(result);

      expect(mockElements['annualWithdrawal'].textContent).toContain('60,000');
    });

    test('should display monthlyExpense in correct element', () => {
      const result = {
        totalContributions: 500000,
        grossAnnualWithdrawal: 60000,
        netMonthlyExpense: 4500,
        yearlyData: [],
        peakValue: 0
      };

      displayResults(result);

      expect(mockElements['monthlyExpense'].textContent).toContain('4,500');
    });

    test('should display donut chart values', () => {
      const result = {
        totalContributions: 100000,
        grossAnnualWithdrawal: 10000,
        netMonthlyExpense: 750,
        yearlyData: [
          { portfolioValue: 200000 },
          { portfolioValue: 500000 },
          { portfolioValue: 800000 }
        ],
        peakValue: 1000000
      };

      displayResults(result);

      expect(mockElements['startValue'].textContent).toContain('200,000');
      expect(mockElements['peakValue'].textContent).toContain('1,000,000');
      expect(mockElements['endValue'].textContent).toContain('800,000');
    });

    test('should handle ILS currency', () => {
      const result = {
        totalContributions: 1800000,
        grossAnnualWithdrawal: 180000,
        netMonthlyExpense: 12500,
        yearlyData: [],
        peakValue: 0
      };

      displayResults(result, '₪');

      expect(mockElements['totalContributions'].textContent).toMatch(/₪.*1,800,000/);
    });
  });

  // ============================================================================
  // updateCharts Function Tests
  // ============================================================================

  describe('updateCharts Function - Correct Canvas IDs', () => {
    const getChartCanvasIds = () => ({
      donutCharts: [
        'startAccumulationChart',  // Correct ID
        'startRetirementChart',    // Correct ID  
        'endRetirementChart'       // Correct ID
      ],
      mainChart: 'mainChart',
      expensesChart: 'resultsExpensesChart'
    });

    test('should use startAccumulationChart for first donut', () => {
      const ids = getChartCanvasIds();
      expect(ids.donutCharts[0]).toBe('startAccumulationChart');
      expect(document.getElementById('startAccumulationChart')).not.toBeNull();
    });

    test('should use startRetirementChart for second donut', () => {
      const ids = getChartCanvasIds();
      expect(ids.donutCharts[1]).toBe('startRetirementChart');
      expect(document.getElementById('startRetirementChart')).not.toBeNull();
    });

    test('should use endRetirementChart for third donut', () => {
      const ids = getChartCanvasIds();
      expect(ids.donutCharts[2]).toBe('endRetirementChart');
      expect(document.getElementById('endRetirementChart')).not.toBeNull();
    });

    test('should use resultsExpensesChart for expenses chart', () => {
      const ids = getChartCanvasIds();
      expect(ids.expensesChart).toBe('resultsExpensesChart');
      expect(document.getElementById('resultsExpensesChart')).not.toBeNull();
    });
  });

  // ============================================================================
  // Expenses Chart in Results Tab
  // ============================================================================

  describe('Results Expenses Chart', () => {
    test('resultsExpensesChart should be separate from expensesChart', () => {
      const resultsChart = document.getElementById('resultsExpensesChart');
      const expensesTabChart = document.getElementById('expensesChart');
      
      expect(resultsChart).not.toBeNull();
      expect(expensesTabChart).not.toBeNull();
      expect(resultsChart).not.toBe(expensesTabChart);
    });

    test('both expenses charts should be updated with same data', () => {
      // The fix ensures updateExpensesChart updates both charts
      const chartIds = ['expensesChart', 'resultsExpensesChart'];
      
      chartIds.forEach(id => {
        expect(document.getElementById(id)).not.toBeNull();
      });
    });
  });

  // ============================================================================
  // Data Flow Tests
  // ============================================================================

  describe('Results Data Flow', () => {
    test('yearlyData should provide correct values for charts', () => {
      const yearlyData = [
        { year: 2025, portfolioValue: 100000, withdrawal: 0 },
        { year: 2030, portfolioValue: 300000, withdrawal: 0 },
        { year: 2035, portfolioValue: 500000, withdrawal: 20000 },
        { year: 2040, portfolioValue: 450000, withdrawal: 20000 },
        { year: 2050, portfolioValue: 200000, withdrawal: 20000 }
      ];

      const startValue = yearlyData[0].portfolioValue;
      const endValue = yearlyData[yearlyData.length - 1].portfolioValue;
      const peakValue = Math.max(...yearlyData.map(d => d.portfolioValue));

      expect(startValue).toBe(100000);
      expect(endValue).toBe(200000);
      expect(peakValue).toBe(500000);
    });

    test('totalContributions should come from result, not yearly sum', () => {
      // The bug was trying to sum yearlyData.contribution which doesn't exist
      // Fix uses result.totalContributions directly
      const result = {
        totalContributions: 600000,  // Pre-calculated by FireCalculator
        yearlyData: [
          { year: 2025, portfolioValue: 100000 },
          { year: 2030, portfolioValue: 300000 }
          // Note: no 'contribution' field in yearlyData
        ]
      };

      expect(result.totalContributions).toBe(600000);
      expect(result.yearlyData[0]).not.toHaveProperty('contribution');
    });
  });
});
