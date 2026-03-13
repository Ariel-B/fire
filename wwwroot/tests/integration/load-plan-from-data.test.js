/* eslint-env jest */

function createMockElement(id, tagName = 'div') {
  const listeners = new Map();
  const rows = [];
  const element = {
    id,
    tagName: tagName.toUpperCase(),
    value: '',
    textContent: '',
    innerHTML: '',
    checked: false,
    disabled: false,
    readOnly: false,
    title: '',
    className: '',
    style: {},
    dataset: {},
    children: [],
    rows,
    classList: {
      _classes: new Set(),
      add: jest.fn((...classes) => {
        classes.forEach((cls) => element.classList._classes.add(cls));
      }),
      remove: jest.fn((...classes) => {
        classes.forEach((cls) => element.classList._classes.delete(cls));
      }),
      contains: jest.fn((cls) => element.classList._classes.has(cls))
    },
    addEventListener: jest.fn((type, handler) => {
      const handlers = listeners.get(type) || [];
      handlers.push(handler);
      listeners.set(type, handlers);
    }),
    removeEventListener: jest.fn((type, handler) => {
      const handlers = listeners.get(type) || [];
      listeners.set(type, handlers.filter((entry) => entry !== handler));
    }),
    dispatchEvent: jest.fn((event) => {
      const handlers = listeners.get(event.type) || [];
      handlers.forEach((handler) => handler(event));
    }),
    focus: jest.fn(),
    select: jest.fn(),
    click: jest.fn(() => {
      const handlers = listeners.get('click') || [];
      handlers.forEach((handler) => handler({ preventDefault() {}, stopPropagation() {}, target: element }));
    }),
    appendChild: jest.fn((child) => {
      element.children.push(child);
      return child;
    }),
    insertRow: jest.fn(() => {
      const row = createMockElement(`${id}-row-${rows.length}`, 'tr');
      row.cells = [];
      row.insertCell = jest.fn(() => {
        const cell = createMockElement(`${row.id}-cell-${row.cells.length}`, 'td');
        row.cells.push(cell);
        return cell;
      });
      rows.push(row);
      return row;
    }),
    deleteRow: jest.fn((index) => {
      rows.splice(index, 1);
    }),
    removeChild: jest.fn((child) => {
      element.children = element.children.filter((entry) => entry !== child);
    }),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    getContext: jest.fn(() => ({
      canvas: element,
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      closePath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() }))
    })),
    setAttribute: jest.fn((name, value) => {
      if (name === 'disabled') {
        element.disabled = true;
        return;
      }
      element[name] = value;
    }),
    removeAttribute: jest.fn((name) => {
      if (name === 'disabled') {
        element.disabled = false;
      }
    }),
    getAttribute: jest.fn((name) => element[name] ?? null),
    _listeners: listeners
  };

  return element;
}

describe('loadPlanFromData automation hook', () => {
  let elements;
  let originalFetch;
  let originalDocument;
  let originalWindow;
  let originalChart;
  let originalEvent;
  let originalBlob;
  let originalUrl;

  beforeEach(() => {
    jest.resetModules();
    elements = new Map();

    const getElement = (id, tagName = 'div') => {
      if (!elements.has(id)) {
        elements.set(id, createMockElement(id, tagName));
      }
      return elements.get(id);
    };

    [
      'birthDate', 'birthYear', 'earlyRetirementAge', 'fullRetirementAge',
      'monthlyContribution', 'monthlyContributionCurrency', 'withdrawalRate', 'inflationRate',
      'capitalGainsTax', 'pensionNetMonthlyAmount', 'pensionCurrency', 'targetMonthlyExpense',
      'targetMonthlyExpenseCurrency', 'usdIlsRate', 'currencyUSD', 'currencyILS',
      'adjustContributionsForInflation', 'useRetirementPortfolio',
      'retirement-disabled-state', 'retirement-enabled-content',
      'annualWithdrawalNet', 'annualWithdrawalGross', 'monthlyExpenseNet', 'monthlyExpenseGross',
      'results-tab-info', 'contributionsBreakdown', 'startValue', 'endValue',
      'startUnrealizedGain', 'endUnrealizedGain', 'peakValue', 'peakUnrealizedGain', 'peakTaxToPay',
      'accumulationEndValue', 'accumulationEndUnrealizedGain', 'accumulationEndTaxToPay',
      'accumulationStartChart', 'accumulationEndChart', 'startAccumulationChart', 'startRetirementChart',
      'endRetirementChart', 'mainChart', 'expensesChart', 'resultsExpensesChart', 'totalContributions',
      'accumulationTable', 'retirementAllocationTable', 'expensesTable', 'expensesTotalRow',
      'tab-accumulation', 'tab-rsu', 'tab-expenses', 'tab-retirement', 'tab-results', 'tab-money-flow',
      'content-accumulation', 'content-rsu', 'content-expenses', 'content-retirement', 'content-results', 'content-money-flow'
    ].forEach((id) => {
      const tagName = id.includes('Chart') ? 'canvas' : id.includes('Table') || id.includes('TotalRow') ? 'tbody' : id.includes('Currency') ? 'select' : 'div';
      getElement(id, tagName);
    });

    getElement('birthDate').value = '1990-01-01';
    getElement('birthYear').value = '1990';
    getElement('earlyRetirementAge').value = '55';
    getElement('fullRetirementAge').value = '67';
    getElement('monthlyContribution').value = '7000';
    getElement('monthlyContributionCurrency').value = '₪';
    getElement('withdrawalRate').value = '4';
    getElement('inflationRate').value = '2';
    getElement('capitalGainsTax').value = '25';
    getElement('pensionNetMonthlyAmount').value = '1500';
    getElement('pensionCurrency').value = '₪';
    getElement('targetMonthlyExpense').value = '9000';
    getElement('targetMonthlyExpenseCurrency').value = '₪';
    getElement('usdIlsRate').value = '3.60';
    getElement('tab-accumulation').classList._classes.add('active', 'border-blue-500', 'text-blue-600');
    getElement('content-rsu').classList._classes.add('hidden');
    getElement('content-expenses').classList._classes.add('hidden');
    getElement('content-retirement').classList._classes.add('hidden');
    getElement('content-results').classList._classes.add('hidden');
    getElement('content-money-flow').classList._classes.add('hidden');

    originalFetch = global.fetch;
    originalDocument = global.document;
    originalWindow = global.window;
    originalChart = global.Chart;
    originalEvent = global.Event;
    originalBlob = global.Blob;
    originalUrl = global.URL;

    global.Chart = jest.fn(() => ({ update: jest.fn(), destroy: jest.fn() }));
    global.Chart.register = jest.fn();
    global.Event = function Event(type) {
      this.type = type;
    };
    global.Blob = jest.fn((content, options) => ({ content, options }));
    global.URL = {
      createObjectURL: jest.fn(() => 'blob:load-plan-test'),
      revokeObjectURL: jest.fn()
    };

    global.document = {
      readyState: 'loading',
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      getElementById: jest.fn((id) => getElement(id)),
      querySelector: jest.fn((selector) => {
        if (selector === '.tab-button.active') {
          return getElement('tab-accumulation');
        }
        return null;
      }),
      querySelectorAll: jest.fn(() => []),
      createElement: jest.fn((tagName) => createMockElement(`created-${tagName}`, tagName)),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    };

    global.window = {
      fireApp: null,
      addEventListener: jest.fn(),
      location: { href: 'http://localhost:5162' }
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.document = originalDocument;
    global.window = originalWindow;
    global.Chart = originalChart;
    global.Event = originalEvent;
    global.Blob = originalBlob;
    global.URL = originalUrl;
    jest.clearAllMocks();
  });

  test('loads a parsed plan through the global automation hook and refreshes calculated state', async () => {
    const demoPlan = {
      birthDate: '2006-01-01',
      birthYear: 2006,
      earlyRetirementYear: 2056,
      fullRetirementAge: 67,
      monthlyContribution: { amount: 2000, currency: 'ILS' },
      adjustContributionsForInflation: true,
      withdrawalRate: 4,
      inflationRate: 3,
      capitalGainsTax: 25,
      pensionNetMonthly: { amount: 10000, currency: 'ILS' },
      targetMonthlyExpense: { amount: 15000, currency: 'ILS' },
      usdIlsRate: 3.09,
      accumulationPortfolio: [
        {
          id: 1772862788688,
          symbol: 'SPY',
          quantity: 15,
          currentPrice: { amount: 672.38, currency: 'USD' },
          averageCost: { amount: 600, currency: 'USD' },
          method: 'CAGR',
          value1: 10,
          value2: 0,
          marketCapUsd: null,
          priceSource: 'api',
          assetName: 'SPDR S&P 500 ETF Trust',
          historicalCAGRs: { 1: 20.2, 3: 17.98, 5: 11.15, 10: 12.58, 15: 11.43, 20: 8.57 },
          cagrSource: 'manual',
          loadingCAGR: false
        },
        {
          id: 1772863084535,
          symbol: 'QQQ',
          quantity: 50,
          currentPrice: { amount: 599.75, currency: 'USD' },
          averageCost: { amount: 550, currency: 'USD' },
          method: 'CAGR',
          value1: 14.23,
          value2: 0,
          marketCapUsd: null,
          priceSource: 'api',
          assetName: 'Invesco QQQ Trust (Nasdaq-100)',
          historicalCAGRs: { 1: 27.9, 3: 23.17, 5: 13.45, 10: 18.57, 15: 16.93, 20: 14.23 },
          cagrSource: '20',
          loadingCAGR: false
        }
      ],
      retirementAllocation: [
        { id: 2, assetType: 'SP 500', targetPercentage: 60, expectedAnnualReturn: 10, description: 'VXUS' },
        { id: 3, assetType: 'ת״א 35', targetPercentage: 30, expectedAnnualReturn: 8, description: 'BND' },
        { id: 4, assetType: 'קרן כספית שקלית', targetPercentage: 10, expectedAnnualReturn: 3, description: 'VMFXX' }
      ],
      expenses: [
        { id: 1772864678012, type: 'חופשה שנתית', netAmount: { amount: 3000, currency: 'USD' }, year: 2058, frequencyYears: 1, repetitionCount: 50 },
        { id: 1772882355532, type: 'מכונית חדשה', netAmount: { amount: 100000, currency: 'ILS' }, year: 2060, frequencyYears: 10, repetitionCount: 4 },
        { id: 1772882448986, type: 'שיפוץ בית', netAmount: { amount: 40000, currency: 'ILS' }, year: 2062, frequencyYears: 5, repetitionCount: 9 }
      ],
      useRetirementPortfolio: true,
      includeRsuInCalculations: true,
      currency: '₪',
      displayCurrency: '₪',
      savedAt: '2026-03-07T11:29:25.372Z',
      version: '2.0'
    };

    global.fetch = jest.fn((url) => {
      if (url === '/api/ExchangeRate/usd-ils') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ rate: 3.95, baseCurrency: 'USD', targetCurrency: 'ILS', source: 'test', timestamp: '2026-03-07T12:00:00Z' })
        });
      }

      if (typeof url === 'string' && url.startsWith('/api/AssetPrices/') && url.endsWith('/cagr')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ cagRs: [{ years: 20, value: 14.23 }] })
        });
      }

      if (typeof url === 'string' && url.startsWith('/api/AssetPrices/') && url.endsWith('/name')) {
        const symbol = url.split('/').slice(-2, -1)[0];
        return Promise.resolve({
          ok: true,
          json: async () => ({ symbol, name: `${symbol} name`, marketCapUsd: 1000000, marketCapCurrency: 'USD' })
        });
      }

      if (typeof url === 'string' && url.startsWith('/api/AssetPrices/')) {
        const symbol = url.split('/').pop();
        return Promise.resolve({
          ok: true,
          json: async () => ({ symbol, price: symbol === 'QQQ' ? 599.75 : 672.38, currency: 'USD', name: `${symbol} name` })
        });
      }

      if (url === '/api/fireplan/calculate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            totalContributions: 100000,
            totalMonthlyContributions: 7000,
            currentValue: 250000,
            currentCostBasis: 180000,
            peakValue: 400000,
            grossPeakValue: 400000,
            retirementTaxToPay: 0,
            endValue: 320000,
            grossAnnualWithdrawal: 50000,
            netMonthlyExpense: 4000,
            yearlyData: [
              {
                year: 2056,
                portfolioValue: 320000,
                totalContributions: 100000,
                annualWithdrawal: 50000,
                phase: 'retirement',
                flowData: {
                  contributions: 0,
                  grossGrowth: 12000,
                  growth: 12000,
                  taxes: 0,
                  plannedExpenses: 0,
                  retirementWithdrawals: 50000,
                  retirementRebalancingTax: 0,
                  pensionIncome: 120000,
                  phase: 'retirement',
                  isRetirementYear: true
                }
              }
            ]
          })
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    const appModule = require('../../js/app.js');
    const fireApp = global.window.fireApp;

    expect(typeof fireApp.loadPlanFromData).toBe('function');

    await fireApp.loadPlanFromData(demoPlan);

    const state = appModule.getState();
    expect(state.accumulationPortfolio).toHaveLength(2);
    expect(state.accumulationPortfolio.map((asset) => asset.symbol)).toEqual(['SPY', 'QQQ']);
    expect(state.retirementAllocation).toHaveLength(3);
    expect(state.expenses).toHaveLength(3);
    expect(state.useRetirementPortfolio).toBe(true);
    expect(state.displayCurrency).toBe('₪');
    expect(state.lastSuccessfulCalculationInput).not.toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/fireplan/calculate', expect.any(Object));
  });

  test('does not derive early retirement age from a fallback year when the plan has no reliable birth year', async () => {
    global.fetch = jest.fn((url) => {
      if (url === '/api/ExchangeRate/usd-ils' || url === '/api/fireplan/calculate') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ yearlyData: [] })
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({})
      });
    });

    require('../../js/app.js');
    const fireApp = global.window.fireApp;
    const originalEarlyRetirementAge = elements.get('earlyRetirementAge').value;

    await fireApp.loadPlanFromData({
      earlyRetirementYear: 2056,
      fullRetirementAge: 67
    });

    expect(elements.get('earlyRetirementAge').value).toBe(originalEarlyRetirementAge);
  });
});
