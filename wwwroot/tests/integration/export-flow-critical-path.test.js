/* eslint-env jest */

function createMockElement(id, tagName = 'div') {
  const listeners = new Map();
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

function flushPromises() {
  return new Promise((resolve) => setImmediate(resolve));
}

describe('Export flow critical path', () => {
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
      'targetMonthlyExpenseCurrency', 'usdIlsRate', 'exportToExcel', 'exportOptionsModal',
      'exportScenarioName', 'exportScenarioNotes', 'exportModalConfirm', 'exportModalCancel',
      'currencyUSD', 'currencyILS', 'annualWithdrawalNet', 'annualWithdrawalGross', 'monthlyExpenseNet',
      'monthlyExpenseGross', 'results-tab-info', 'contributionsBreakdown', 'startValue', 'endValue',
      'startUnrealizedGain', 'endUnrealizedGain', 'peakValue', 'peakUnrealizedGain', 'peakTaxToPay',
      'accumulationEndValue', 'accumulationEndUnrealizedGain', 'accumulationEndTaxToPay',
      'accumulationStartChart', 'accumulationEndChart', 'startAccumulationChart', 'startRetirementChart',
      'endRetirementChart', 'mainChart', 'expensesChart', 'resultsExpensesChart', 'totalContributions'
    ].forEach((id) => {
      const tagName = id.includes('Chart') ? 'canvas' : id.includes('Currency') ? 'select' : 'div';
      getElement(id, tagName);
    });

    getElement('birthDate').value = '1990-01-01';
    getElement('birthYear').value = '1990';
    getElement('earlyRetirementAge').value = '55';
    getElement('fullRetirementAge').value = '67';
    getElement('monthlyContribution').value = '7000';
    getElement('monthlyContributionCurrency').value = '$';
    getElement('withdrawalRate').value = '4';
    getElement('inflationRate').value = '2';
    getElement('capitalGainsTax').value = '25';
    getElement('pensionNetMonthlyAmount').value = '1500';
    getElement('pensionCurrency').value = '$';
    getElement('targetMonthlyExpense').value = '9000';
    getElement('targetMonthlyExpenseCurrency').value = '$';
    getElement('usdIlsRate').value = '4.10';
    getElement('currencyUSD').classList._classes.add('active', 'bg-blue-500');
    getElement('exportOptionsModal').classList._classes.add('hidden');

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
      createObjectURL: jest.fn(() => 'blob:export-test'),
      revokeObjectURL: jest.fn()
    };

    global.document = {
      readyState: 'loading',
      body: {
        appendChild: jest.fn(),
        removeChild: jest.fn()
      },
      getElementById: jest.fn((id) => getElement(id)),
      querySelector: jest.fn(() => null),
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

  test('export waits for latest pending calculation and uses that exact input snapshot', async () => {
    let resolveCalculation;
    const exportBodies = [];

    global.fetch = jest.fn((url, options = {}) => {
      if (url === '/api/fireplan/calculate') {
        return new Promise((resolve) => {
          resolveCalculation = () => resolve({
            ok: true,
            json: async () => ({
              totalContributions: 100000,
              totalMonthlyContributions: 7000,
              currentValue: 250000,
              currentCostBasis: 180000,
              peakValue: 400000,
              grossPeakValue: 400000,
              retirementTaxToPay: 0,
              netAnnualWithdrawal: 48000,
              grossAnnualWithdrawal: 50000,
              netMonthlyExpense: 4000,
              grossMonthlyExpense: 4200,
              endValue: 410000,
              yearlyData: [
                {
                  year: 2045,
                  portfolioValue: 410000,
                  totalContributions: 100000,
                  annualWithdrawal: 50000,
                  phase: 'retirement',
                  flowData: {
                    monthlyContributions: 0,
                    portfolioGrowth: 15000,
                    rsuNetProceeds: 0,
                    capitalGainsTax: 0,
                    plannedExpenses: 0,
                    retirementWithdrawals: 50000,
                    retirementRebalancingTax: 0,
                    pensionIncome: 18000,
                    phase: 'retirement',
                    isRetirementYear: true
                  }
                }
              ],
              preRetirementPortfolio: [],
              retirementPortfolio: []
            })
          });
        });
      }

      if (url === '/api/Export/excel') {
        exportBodies.push(JSON.parse(options.body));
        return Promise.resolve({
          ok: true,
          headers: { get: () => 'attachment; filename="Scenario.xlsx"' },
          blob: async () => ({})
        });
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ rate: 4.1 })
      });
    });

    const appModule = require('../../js/app.js');
    const fireApp = appModule.default || appModule;
    const state = fireApp.getState();
    state.displayCurrency = '$';
    state.lastCalculationResult = {
      totalContributions: 1,
      yearlyData: []
    };
    state.lastSuccessfulCalculationInput = {
      birthDate: '1990-01-01',
      birthYear: 1990,
      earlyRetirementYear: 2040,
      fullRetirementAge: 67,
      monthlyContribution: { amount: 5000, currency: 'USD' },
      withdrawalRate: 4,
      inflationRate: 2,
      capitalGainsTax: 25,
      pensionNetMonthly: { amount: 1000, currency: 'USD' },
      targetMonthlyExpense: { amount: 8000, currency: 'USD' },
      usdIlsRate: 3.6,
      accumulationPortfolio: [],
      retirementAllocation: [],
      expenses: [],
      useRetirementPortfolio: false,
      includeRsuInCalculations: false,
      currency: '$'
    };

    appModule.calculateAndUpdate();
    const exportPromise = appModule.exportPlanToExcel();

    await flushPromises();
    expect(exportBodies).toHaveLength(0);

    resolveCalculation();
    await flushPromises();
    await flushPromises();

    elements.get('exportModalConfirm').click();
    await exportPromise;

    expect(exportBodies).toHaveLength(1);
    expect(exportBodies[0].scenarioName).toBe('FIRE Plan');
    expect(exportBodies[0].usdIlsRate).toBe(4.1);
    expect(exportBodies[0].input).toMatchObject({
      birthDate: '1990-01-01',
      earlyRetirementYear: 2045,
      fullRetirementAge: 67,
      monthlyContribution: { amount: 7000, currency: 'USD' },
      pensionNetMonthly: { amount: 1500, currency: 'USD' },
      targetMonthlyExpense: { amount: 9000, currency: 'USD' },
      usdIlsRate: 4.1,
      currency: '$'
    });
  });

  test('export aborts with a user-facing alert when the latest pending calculation fails', async () => {
    let rejectCalculation;
    const exportBodies = [];
    global.alert = jest.fn();

    global.fetch = jest.fn((url, options = {}) => {
      if (url === '/api/fireplan/calculate') {
        return new Promise((resolve, reject) => {
          rejectCalculation = () => reject(new Error('backend unavailable'));
        });
      }

      if (url === '/api/Export/excel') {
        exportBodies.push(JSON.parse(options.body));
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({ rate: 4.1 })
      });
    });

    const appModule = require('../../js/app.js');
    const fireApp = appModule.default || appModule;
    const state = fireApp.getState();
    state.lastCalculationResult = {
      totalContributions: 1,
      yearlyData: []
    };
    state.lastSuccessfulCalculationInput = {
      birthDate: '1990-01-01',
      birthYear: 1990,
      earlyRetirementYear: 2040,
      fullRetirementAge: 67,
      monthlyContribution: { amount: 5000, currency: 'USD' },
      withdrawalRate: 4,
      inflationRate: 2,
      capitalGainsTax: 25,
      pensionNetMonthly: { amount: 1000, currency: 'USD' },
      targetMonthlyExpense: { amount: 8000, currency: 'USD' },
      usdIlsRate: 3.6,
      accumulationPortfolio: [],
      retirementAllocation: [],
      expenses: [],
      useRetirementPortfolio: false,
      includeRsuInCalculations: false,
      currency: '$'
    };

    appModule.calculateAndUpdate();
    const exportPromise = appModule.exportPlanToExcel();

    rejectCalculation();
    await flushPromises();
    await flushPromises();
    await exportPromise;

    expect(state.lastCalculationResult).toBeNull();
    expect(state.lastSuccessfulCalculationInput).toBeNull();
    expect(global.alert).toHaveBeenCalledWith('אין תוצאות חישוב לייצוא. אנא בצע חישוב תחילה.');
    expect(exportBodies).toHaveLength(0);
  });
});
