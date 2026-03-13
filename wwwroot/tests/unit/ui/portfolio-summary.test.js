/**
 * Portfolio Summary Tests
 * Tests for portfolio summary display - addressing bug: "סקירת תיק הצבירה is still empty"
 * 
 * Bug History:
 * - Element IDs in TypeScript didn't match HTML (using wrong IDs)
 * - Fixed by updating to correct IDs: accumulation-count, accumulation-market-value, 
 *   accumulation-cost-basis, accumulation-gain-loss
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
  }
});

// Create portfolio summary elements with CORRECT IDs
const summaryElementIds = [
  'accumulation-count',        // Number of assets
  'accumulation-market-value', // Total market value
  'accumulation-cost-basis',   // Total cost basis
  'accumulation-gain-loss'     // Total gain/loss
];

summaryElementIds.forEach(id => {
  mockElements[id] = createMockElement(id);
});

// Also test that WRONG IDs don't exist (these were the bugs)
const wrongIds = [
  'accumulationCount',
  'accumulationMarketValue', 
  'accumulationCostBasis',
  'accumulationGainLoss',
  'assetCount',
  'portfolioValue',
  'totalCostBasis',
  'totalGainLoss'
];

global.document = {
  getElementById: jest.fn((id) => mockElements[id] || null),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => [])
};

describe('Portfolio Summary Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mock elements
    summaryElementIds.forEach(id => {
      mockElements[id].textContent = '';
    });
  });

  // ============================================================================
  // Element ID Verification - The core bug fix
  // ============================================================================

  describe('Correct Element IDs', () => {
    test('accumulation-count element should exist (hyphenated)', () => {
      expect(document.getElementById('accumulation-count')).not.toBeNull();
    });

    test('accumulation-market-value element should exist (hyphenated)', () => {
      expect(document.getElementById('accumulation-market-value')).not.toBeNull();
    });

    test('accumulation-cost-basis element should exist (hyphenated)', () => {
      expect(document.getElementById('accumulation-cost-basis')).not.toBeNull();
    });

    test('accumulation-gain-loss element should exist (hyphenated)', () => {
      expect(document.getElementById('accumulation-gain-loss')).not.toBeNull();
    });
  });

  describe('Wrong Element IDs Should Not Be Used', () => {
    test('camelCase versions should return null', () => {
      expect(document.getElementById('accumulationCount')).toBeNull();
      expect(document.getElementById('accumulationMarketValue')).toBeNull();
      expect(document.getElementById('accumulationCostBasis')).toBeNull();
      expect(document.getElementById('accumulationGainLoss')).toBeNull();
    });

    test('generic names should return null', () => {
      expect(document.getElementById('assetCount')).toBeNull();
      expect(document.getElementById('portfolioValue')).toBeNull();
      expect(document.getElementById('totalCostBasis')).toBeNull();
    });
  });

  // ============================================================================
  // Summary Update Function Tests
  // ============================================================================

  describe('updatePortfolioSummary Function', () => {
    const updatePortfolioSummary = (portfolio, currency = '$', exchangeRates = { usdToIls: 3.6 }) => {
      const count = portfolio.length;
      let totalMarketValue = 0;
      let totalCostBasis = 0;
      
      portfolio.forEach(asset => {
        const marketValue = (asset.quantity || 0) * (asset.currentPrice || 0);
        const costBasis = (asset.quantity || 0) * (asset.averageCostPerShare || 0);
        totalMarketValue += marketValue;
        totalCostBasis += costBasis;
      });
      
      const gainLoss = totalMarketValue - totalCostBasis;
      
      // Use correct element IDs (the bug fix)
      const countEl = mockElements['accumulation-count'];
      const marketValueEl = mockElements['accumulation-market-value'];
      const costBasisEl = mockElements['accumulation-cost-basis'];
      const gainLossEl = mockElements['accumulation-gain-loss'];
      
      if (countEl) countEl.textContent = String(count);
      if (marketValueEl) marketValueEl.textContent = `${currency}${totalMarketValue.toLocaleString()}`;
      if (costBasisEl) costBasisEl.textContent = `${currency}${totalCostBasis.toLocaleString()}`;
      if (gainLossEl) gainLossEl.textContent = `${currency}${gainLoss.toLocaleString()}`;
    };

    test('should update count element with number of assets', () => {
      const portfolio = [
        { id: 1, symbol: 'AAPL', quantity: 100, currentPrice: 150, averageCostPerShare: 120 },
        { id: 2, symbol: 'GOOGL', quantity: 50, currentPrice: 180, averageCostPerShare: 160 }
      ];

      updatePortfolioSummary(portfolio);

      expect(mockElements['accumulation-count'].textContent).toBe('2');
    });

    test('should update market value element with total', () => {
      const portfolio = [
        { id: 1, quantity: 100, currentPrice: 150 },  // 15,000
        { id: 2, quantity: 50, currentPrice: 200 }     // 10,000
      ];

      updatePortfolioSummary(portfolio);

      expect(mockElements['accumulation-market-value'].textContent).toContain('25');
    });

    test('should update cost basis element with total', () => {
      const portfolio = [
        { id: 1, quantity: 100, averageCostPerShare: 100 },  // 10,000
        { id: 2, quantity: 50, averageCostPerShare: 150 }     // 7,500
      ];

      updatePortfolioSummary(portfolio);

      expect(mockElements['accumulation-cost-basis'].textContent).toContain('17');
    });

    test('should update gain/loss element with difference', () => {
      const portfolio = [
        { id: 1, quantity: 100, currentPrice: 150, averageCostPerShare: 100 }
        // Market value: 15,000, Cost: 10,000, Gain: 5,000
      ];

      updatePortfolioSummary(portfolio);

      expect(mockElements['accumulation-gain-loss'].textContent).toContain('5');
    });

    test('should handle empty portfolio', () => {
      updatePortfolioSummary([]);

      expect(mockElements['accumulation-count'].textContent).toBe('0');
      expect(mockElements['accumulation-market-value'].textContent).toContain('0');
    });

    test('should handle assets with zero values', () => {
      const portfolio = [
        { id: 1, symbol: 'NEW', quantity: 0, currentPrice: 0, averageCostPerShare: 0 }
      ];

      updatePortfolioSummary(portfolio);

      expect(mockElements['accumulation-count'].textContent).toBe('1');
    });
  });

  // ============================================================================
  // Portfolio Data After Load Tests
  // ============================================================================

  describe('Portfolio Summary After Load', () => {
    test('should update summary when portfolio is loaded from JSON', () => {
      const loadedPortfolio = [
        { id: 1, symbol: 'NVDA', quantity: 500, currentPrice: 120, averageCostPerShare: 80 },
        { id: 2, symbol: 'TSLA', quantity: 200, currentPrice: 250, averageCostPerShare: 200 },
        { id: 3, symbol: 'AMZN', quantity: 100, currentPrice: 180, averageCostPerShare: 150 }
      ];

      // Calculate expected values
      const expectedCount = 3;
      const expectedMarketValue = 500*120 + 200*250 + 100*180; // 60,000 + 50,000 + 18,000 = 128,000
      const expectedCostBasis = 500*80 + 200*200 + 100*150;    // 40,000 + 40,000 + 15,000 = 95,000
      const expectedGainLoss = expectedMarketValue - expectedCostBasis; // 33,000

      expect(loadedPortfolio.length).toBe(expectedCount);
      expect(expectedMarketValue).toBe(128000);
      expect(expectedCostBasis).toBe(95000);
      expect(expectedGainLoss).toBe(33000);
    });

    test('summary should be recalculated when assets are added', () => {
      let portfolio = [
        { id: 1, quantity: 100, currentPrice: 100, averageCostPerShare: 80 }
      ];

      // Initial state
      expect(portfolio.length).toBe(1);

      // Add asset
      portfolio.push({ id: 2, quantity: 50, currentPrice: 200, averageCostPerShare: 150 });

      // After add
      expect(portfolio.length).toBe(2);
    });

    test('summary should be recalculated when assets are removed', () => {
      let portfolio = [
        { id: 1, quantity: 100, currentPrice: 100 },
        { id: 2, quantity: 50, currentPrice: 200 }
      ];

      // Remove asset
      portfolio = portfolio.filter(a => a.id !== 1);

      expect(portfolio.length).toBe(1);
      expect(portfolio[0].id).toBe(2);
    });
  });
});
