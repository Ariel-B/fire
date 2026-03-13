/* eslint-env jest */

function loadModule() {
  return require('../../../js/orchestration/portfolio-coordinator.js');
}

function createMockElement() {
  return {
    textContent: '',
    innerHTML: '',
    className: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  };
}

function createDependencies(overrides = {}) {
  const state = {
    accumulationPortfolio: [
      {
        id: 1,
        symbol: 'AAA',
        quantity: 5,
        currentPrice: { amount: 10, currency: 'USD' },
        averageCost: { amount: 8, currency: 'USD' },
        method: 'CAGR',
        value1: 0,
        value2: 0
      }
    ],
    exchangeRates: { usdToIls: 3.6, ilsToUsd: 1 / 3.6 },
    displayCurrency: '$'
  };

  const elements = {
    accumulationStartUnrealizedGain: createMockElement(),
    'accumulation-gain-loss': createMockElement(),
    'accumulation-tab-total': createMockElement()
  };

  return {
    state,
    createPortfolioAsset: jest.fn(() => ({
      id: 2,
      symbol: '',
      quantity: 0,
      currentPrice: { amount: 0, currency: 'USD' },
      averageCost: { amount: 0, currency: 'USD' },
      method: 'CAGR',
      value1: 0,
      value2: 0
    })),
    renderPortfolioTable: jest.fn(),
    calculatePortfolioValue: jest.fn(() => 50),
    calculatePortfolioCostBasis: jest.fn(() => 40),
    setTextContent: jest.fn(),
    getElement: jest.fn((id) => elements[id] ?? null),
    formatCurrency: jest.fn((amount, currency) => `${currency}${amount}`),
    convertPortfolioToChartData: jest.fn(() => [{ symbol: 'AAA', value: 50 }]),
    updateDonutChart: jest.fn(),
    getUsdIlsRate: jest.fn(() => 3.6),
    getEarlyRetirementYear: jest.fn(() => 2030),
    updateAssetSymbol: jest.fn(async (portfolio, id, symbol, onUpdate) => {
      const asset = portfolio.find((entry) => entry.id === id);
      asset.symbol = symbol;
      onUpdate();
    }),
    updateAssetField: jest.fn((portfolio, id, field, value) => {
      const asset = portfolio.find((entry) => entry.id === id);
      asset[field] = value;
    }),
    updateAssetCurrency: jest.fn(),
    updateAssetPrice: jest.fn(),
    updateAssetCost: jest.fn(),
    handleAssetMethodChange: jest.fn(),
    removeAssetFromPortfolio: jest.fn((portfolio, id) => portfolio.filter((entry) => entry.id !== id)),
    calculateAndUpdate: jest.fn(),
    ...overrides
  };
}

describe('portfolio coordinator', () => {
  test('adds an accumulation row and refreshes portfolio views without recalculating', () => {
    const { createPortfolioCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createPortfolioCoordinator(dependencies);

    coordinator.addAccumulationRow();

    expect(dependencies.createPortfolioAsset).toHaveBeenCalledTimes(1);
    expect(dependencies.state.accumulationPortfolio).toHaveLength(2);
    expect(dependencies.renderPortfolioTable).toHaveBeenCalledWith(
      'accumulationTable',
      dependencies.state.accumulationPortfolio,
      'accumulation',
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency,
      4
    );
    expect(dependencies.calculateAndUpdate).not.toHaveBeenCalled();
  });

  test('updates asset symbols through the component helper and recalculates from the callback', async () => {
    const { createPortfolioCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createPortfolioCoordinator(dependencies);

    await coordinator.updatePortfolioAssetSymbol('accumulation', 1, 'NVDA');

    expect(dependencies.updateAssetSymbol).toHaveBeenCalledWith(
      dependencies.state.accumulationPortfolio,
      1,
      'NVDA',
      expect.any(Function)
    );
    expect(dependencies.state.accumulationPortfolio[0].symbol).toBe('NVDA');
    expect(dependencies.renderPortfolioTable).toHaveBeenCalled();
    expect(dependencies.calculateAndUpdate).toHaveBeenCalledTimes(1);
  });

  test('sorts the accumulation portfolio and toggles direction on repeated requests', () => {
    const { createPortfolioCoordinator } = loadModule();
    const dependencies = createDependencies({
      state: {
        accumulationPortfolio: [
          {
            id: 1,
            symbol: 'AAA',
            quantity: 1,
            currentPrice: { amount: 300, currency: 'USD' },
            averageCost: { amount: 200, currency: 'USD' }
          },
          {
            id: 2,
            symbol: 'BBB',
            quantity: 1,
            currentPrice: { amount: 100, currency: 'USD' },
            averageCost: { amount: 50, currency: 'USD' }
          }
        ],
        exchangeRates: { usdToIls: 3.6, ilsToUsd: 1 / 3.6 },
        displayCurrency: '$'
      }
    });
    const coordinator = createPortfolioCoordinator(dependencies);

    coordinator.sortPortfolioTable('marketValue');
    expect(dependencies.state.accumulationPortfolio.map((asset) => asset.id)).toEqual([2, 1]);

    coordinator.sortPortfolioTable('marketValue');
    expect(dependencies.state.accumulationPortfolio.map((asset) => asset.id)).toEqual([1, 2]);
  });
});
