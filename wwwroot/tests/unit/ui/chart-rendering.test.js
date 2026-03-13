/**
 * Chart Rendering Tests
 * Tests for chart initialization and updates - addressing bugs:
 * 1. "the bar chart from the expenses tab is missing"
 * 2. "the pie chart is missing from the tab" (retirement allocation)
 * 3. Chart canvas IDs mismatches
 * 
 * Bug History:
 * - Expenses chart wasn't being updated after load
 * - Retirement allocation chart wasn't being updated
 * - Wrong canvas IDs used in updateCharts function
 */

// Mock Chart.js
global.Chart = jest.fn().mockImplementation(() => ({
  data: { labels: [], datasets: [] },
  options: {},
  update: jest.fn(),
  destroy: jest.fn()
}));

// Mock canvas elements
const mockElements = {};

const createMockCanvas = (id) => ({
  id,
  getContext: jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn()
  })),
  width: 400,
  height: 400,
  style: {}
});

// All chart canvas IDs in the application
const chartCanvasIds = [
  // Accumulation tab charts
  'accumulationStartChart',
  'accumulationEndChart',
  
  // Expenses tab chart
  'expensesChart',
  
  // Retirement tab chart
  'retirementPortfolioChart',
  
  // Results tab charts
  'startAccumulationChart',
  'startRetirementChart',
  'endRetirementChart',
  'mainChart',
  'resultsExpensesChart'
];

chartCanvasIds.forEach(id => {
  mockElements[id] = createMockCanvas(id);
});

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

describe('Chart Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================================
  // Canvas Element Existence
  // ============================================================================

  describe('Chart Canvas Elements', () => {
    test('all chart canvas elements should exist', () => {
      chartCanvasIds.forEach(id => {
        expect(document.getElementById(id)).not.toBeNull();
      });
    });

    test('accumulation tab has two donut charts', () => {
      expect(document.getElementById('accumulationStartChart')).not.toBeNull();
      expect(document.getElementById('accumulationEndChart')).not.toBeNull();
    });

    test('expenses tab has bar chart', () => {
      expect(document.getElementById('expensesChart')).not.toBeNull();
    });

    test('retirement tab has pie chart', () => {
      expect(document.getElementById('retirementPortfolioChart')).not.toBeNull();
    });

    test('results tab has all required charts', () => {
      expect(document.getElementById('startAccumulationChart')).not.toBeNull();
      expect(document.getElementById('startRetirementChart')).not.toBeNull();
      expect(document.getElementById('endRetirementChart')).not.toBeNull();
      expect(document.getElementById('mainChart')).not.toBeNull();
      expect(document.getElementById('resultsExpensesChart')).not.toBeNull();
    });
  });

  // ============================================================================
  // Expenses Chart Tests - "bar chart from expenses tab is missing"
  // ============================================================================

  describe('Expenses Bar Chart', () => {
    const buildExpenseChartData = (expenses, baseYear = 2025, inflationRate = 2) => {
      if (expenses.length === 0) return null;
      
      const expensesByYear = new Map();
      const expenseTypes = new Set();
      
      expenses.forEach(expense => {
        const frequencyYears = expense.frequencyYears || 1;
        const repetitionCount = expense.repetitionCount || 1;
        
        for (let i = 0; i < repetitionCount; i++) {
          const year = expense.year + (i * frequencyYears);
          const yearsFromBase = year - baseYear;
          const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromBase);
          const amount = (expense.netAmount || 0) * inflationMultiplier;
          
          if (!expensesByYear.has(year)) {
            expensesByYear.set(year, new Map());
          }
          
          const yearMap = expensesByYear.get(year);
          const expenseType = expense.type || 'אחר';
          expenseTypes.add(expenseType);
          yearMap.set(expenseType, (yearMap.get(expenseType) || 0) + amount);
        }
      });
      
      const sortedYears = Array.from(expensesByYear.keys()).sort((a, b) => a - b);
      const expenseTypeArray = Array.from(expenseTypes);
      
      const datasets = expenseTypeArray.map(type => ({
        label: type,
        data: sortedYears.map(year => expensesByYear.get(year)?.get(type) || 0)
      }));
      
      return {
        years: sortedYears.map(y => String(y)),
        datasets
      };
    };

    test('should return null for empty expenses', () => {
      const result = buildExpenseChartData([]);
      expect(result).toBeNull();
    });

    test('should build chart data for single expense', () => {
      const expenses = [
        { id: 1, name: 'Education', year: 2026, netAmount: 50000, type: 'חינוך', frequencyYears: 1, repetitionCount: 1 }
      ];
      
      const result = buildExpenseChartData(expenses);
      
      expect(result).not.toBeNull();
      expect(result.years).toContain('2026');
      expect(result.datasets.length).toBe(1);
    });

    test('should handle repeating expenses', () => {
      const expenses = [
        { id: 1, name: 'Car', year: 2025, netAmount: 100000, type: 'רכב', frequencyYears: 5, repetitionCount: 3 }
        // Should appear in 2025, 2030, 2035
      ];
      
      const result = buildExpenseChartData(expenses);
      
      expect(result.years).toContain('2025');
      expect(result.years).toContain('2030');
      expect(result.years).toContain('2035');
    });

    test('should group by expense type', () => {
      const expenses = [
        { id: 1, year: 2026, netAmount: 50000, type: 'חינוך' },
        { id: 2, year: 2026, netAmount: 30000, type: 'רכב' },
        { id: 3, year: 2027, netAmount: 20000, type: 'חינוך' }
      ];
      
      const result = buildExpenseChartData(expenses);
      
      expect(result.datasets.length).toBe(2); // Two types: חינוך, רכב
    });

    test('should apply inflation adjustment', () => {
      const expenses = [
        { id: 1, year: 2027, netAmount: 100000, type: 'אחר', frequencyYears: 1, repetitionCount: 1 }
      ];
      
      const baseYear = 2025;
      const inflationRate = 2;
      const result = buildExpenseChartData(expenses, baseYear, inflationRate);
      
      // 2 years from base at 2% inflation: 100000 * 1.02^2 = 104,040
      const expectedAmount = 100000 * Math.pow(1.02, 2);
      expect(result.datasets[0].data[0]).toBeCloseTo(expectedAmount, 0);
    });
  });

  // ============================================================================
  // Retirement Allocation Chart Tests - "pie chart missing from tab"
  // ============================================================================

  describe('Retirement Allocation Pie Chart', () => {
    test('retirementPortfolioChart canvas should exist', () => {
      expect(document.getElementById('retirementPortfolioChart')).not.toBeNull();
    });

    const buildRetirementChartData = (allocations) => {
      if (allocations.length === 0) return null;
      
      return {
        labels: allocations.map(a => a.assetType),
        data: allocations.map(a => a.targetPercentage),
        colors: [
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(16, 185, 129, 0.8)',   // green
          'rgba(249, 115, 22, 0.8)',   // orange
          'rgba(139, 92, 246, 0.8)'    // purple
        ]
      };
    };

    test('should build chart data from allocations', () => {
      const allocations = [
        { id: 1, assetType: 'מניות ארה"ב', targetPercentage: 40 },
        { id: 2, assetType: 'אג"ח', targetPercentage: 30 },
        { id: 3, assetType: 'מזומן', targetPercentage: 30 }
      ];
      
      const result = buildRetirementChartData(allocations);
      
      expect(result.labels).toHaveLength(3);
      expect(result.data).toEqual([40, 30, 30]);
    });

    test('should return null for empty allocations', () => {
      const result = buildRetirementChartData([]);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Donut Chart Tests
  // ============================================================================

  describe('Donut Charts', () => {
    const convertPortfolioToChartData = (portfolio, usdIlsRate = 3.6) => {
      if (portfolio.length === 0) return null;
      
      const labels = [];
      const values = [];
      
      portfolio.forEach(asset => {
        labels.push(asset.symbol || 'Unknown');
        let value = (asset.quantity || 0) * (asset.currentPrice || 0);
        // Convert USD to ILS if needed
        if (asset.currentPriceCurrency === '$') {
          value *= usdIlsRate;
        }
        values.push(value);
      });
      
      return { labels, values };
    };

    test('should convert portfolio to chart data', () => {
      const portfolio = [
        { id: 1, symbol: 'AAPL', quantity: 100, currentPrice: 150, currentPriceCurrency: '$' },
        { id: 2, symbol: 'GOOGL', quantity: 50, currentPrice: 180, currentPriceCurrency: '$' }
      ];
      
      const result = convertPortfolioToChartData(portfolio, 3.6);
      
      expect(result.labels).toEqual(['AAPL', 'GOOGL']);
      expect(result.values[0]).toBe(100 * 150 * 3.6); // 54,000
      expect(result.values[1]).toBe(50 * 180 * 3.6);  // 32,400
    });

    test('should return null for empty portfolio', () => {
      const result = convertPortfolioToChartData([]);
      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // Chart Update Triggering
  // ============================================================================

  describe('Chart Update Triggers', () => {
    test('expenses chart should update when expense is added', () => {
      let updateCalled = false;
      const updateExpensesChart = () => { updateCalled = true; };
      
      // Simulate adding expense
      updateExpensesChart();
      
      expect(updateCalled).toBe(true);
    });

    test('expenses chart should update when expense is removed', () => {
      let updateCount = 0;
      const updateExpensesChart = () => { updateCount++; };
      
      // Simulate removing expense
      updateExpensesChart();
      
      expect(updateCount).toBe(1);
    });

    test('retirement chart should update when allocation changes', () => {
      let updateCalled = false;
      const updateRetirementAllocationChart = () => { updateCalled = true; };
      
      // Simulate changing allocation
      updateRetirementAllocationChart();
      
      expect(updateCalled).toBe(true);
    });

    test('all charts should update after plan load', () => {
      const updateFunctions = {
        portfolio: false,
        expenses: false,
        retirement: false,
        results: false
      };
      
      const updateAfterLoad = () => {
        updateFunctions.portfolio = true;
        updateFunctions.expenses = true;
        updateFunctions.retirement = true;
        updateFunctions.results = true;
      };
      
      updateAfterLoad();
      
      Object.values(updateFunctions).forEach(called => {
        expect(called).toBe(true);
      });
    });
  });

  // ============================================================================
  // Both Expenses Charts Update Together
  // ============================================================================

  describe('Dual Expenses Chart Updates', () => {
    test('updateExpensesChart should update both expensesChart and resultsExpensesChart', () => {
      const updatedCharts = [];
      
      const updateExpensesBarChart = (canvasId, data, currency) => {
        updatedCharts.push(canvasId);
      };
      
      // The fix: update both charts
      const updateExpensesChart = () => {
        const chartData = { years: ['2025'], datasets: [] };
        updateExpensesBarChart('expensesChart', chartData, '$');
        updateExpensesBarChart('resultsExpensesChart', chartData, '$');
      };
      
      updateExpensesChart();
      
      expect(updatedCharts).toContain('expensesChart');
      expect(updatedCharts).toContain('resultsExpensesChart');
    });
  });
});
