/* eslint-env jest */

export function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

export async function flushPromises(times = 1) {
  for (let i = 0; i < times; i += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export function createCalculationResult(overrides = {}) {
  return {
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
    retirementPortfolio: [],
    ...overrides
  };
}

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    _classes: classes,
    add: jest.fn((...names) => names.forEach((name) => classes.add(name))),
    remove: jest.fn((...names) => names.forEach((name) => classes.delete(name))),
    contains: jest.fn((name) => classes.has(name)),
    toggle: jest.fn((name, force) => {
      if (force === true) {
        classes.add(name);
        return true;
      }
      if (force === false) {
        classes.delete(name);
        return false;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    })
  };
}

function createEventTargetBase(element, listeners) {
  element.addEventListener = jest.fn((type, handler) => {
    const handlers = listeners.get(type) || [];
    handlers.push(handler);
    listeners.set(type, handlers);
  });
  element.removeEventListener = jest.fn((type, handler) => {
    const handlers = listeners.get(type) || [];
    listeners.set(type, handlers.filter((entry) => entry !== handler));
  });
  element.dispatchEvent = jest.fn((event) => {
    event.target = event.target || element;
    const handlers = listeners.get(event.type) || [];
    handlers.forEach((handler) => handler(event));
    return true;
  });
}

function defineDomClasses() {
  class MockHTMLElement {
    constructor(id = '', tagName = 'div') {
      this.id = id;
      this.tagName = tagName.toUpperCase();
      this.value = '';
      this.textContent = '';
      this.innerHTML = '';
      this.checked = false;
      this.disabled = false;
      this.readOnly = false;
      this.className = '';
      this.title = '';
      this.type = tagName === 'input' ? 'text' : undefined;
      this.accept = '';
      this.download = '';
      this.href = '';
      this.dataset = {};
      this.style = {};
      this.children = [];
      this.rows = [];
      this.files = [];
      this.parentNode = null;
      this.onchange = null;
      this.classList = createClassList();
      this._listeners = new Map();
      createEventTargetBase(this, this._listeners);
      this.appendChild = jest.fn((child) => {
        child.parentNode = this;
        this.children.push(child);
        return child;
      });
      this.removeChild = jest.fn((child) => {
        this.children = this.children.filter((entry) => entry !== child);
      });
      this.querySelector = jest.fn(() => null);
      this.querySelectorAll = jest.fn(() => []);
      this.insertRow = jest.fn(() => {
        const row = new global.HTMLElement('', 'tr');
        this.rows.push(row);
        return row;
      });
      this.focus = jest.fn();
      this.select = jest.fn();
      this.blur = jest.fn();
      this.click = jest.fn(() => {
        const event = new global.Event('click');
        event.target = this;
        this.dispatchEvent(event);
      });
      this.closest = jest.fn(() => null);
      this.contains = jest.fn((node) => node === this || this.children.includes(node));
      this.setAttribute = jest.fn((name, value) => {
        if (name === 'disabled') {
          this.disabled = true;
        }
        this[name] = value;
      });
      this.removeAttribute = jest.fn((name) => {
        if (name === 'disabled') {
          this.disabled = false;
        }
        delete this[name];
      });
      this.hasAttribute = jest.fn((name) => Object.prototype.hasOwnProperty.call(this, name));
      this.getAttribute = jest.fn((name) => this[name] ?? null);
      this.checkValidity = jest.fn(() => true);
      this.getContext = jest.fn(() => ({
        canvas: this,
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
      }));
    }
  }

  class MockHTMLInputElement extends MockHTMLElement {
    constructor(id = '') {
      super(id, 'input');
    }
  }

  class MockHTMLSelectElement extends MockHTMLElement {
    constructor(id = '') {
      super(id, 'select');
    }
  }

  class MockHTMLTextAreaElement extends MockHTMLElement {
    constructor(id = '') {
      super(id, 'textarea');
    }
  }

  class MockHTMLTableSectionElement extends MockHTMLElement {
    constructor(id = '') {
      super(id, 'tbody');
    }
  }

  global.HTMLElement = MockHTMLElement;
  global.HTMLInputElement = MockHTMLInputElement;
  global.HTMLSelectElement = MockHTMLSelectElement;
  global.HTMLTextAreaElement = MockHTMLTextAreaElement;
  global.HTMLTableSectionElement = MockHTMLTableSectionElement;
  global.Node = MockHTMLElement;
}

function buildElement(id, config = {}) {
  const type = config.type || 'div';
  let element;

  if (type === 'input') {
    element = new global.HTMLInputElement(id);
    element.type = config.inputType || 'text';
  } else if (type === 'select') {
    element = new global.HTMLSelectElement(id);
  } else if (type === 'textarea') {
    element = new global.HTMLTextAreaElement(id);
  } else if (type === 'table-section') {
    element = new global.HTMLTableSectionElement(id);
  } else if (type === 'canvas') {
    element = new global.HTMLElement(id, 'canvas');
  } else {
    element = new global.HTMLElement(id, config.tagName || type);
  }

  if (config.value !== undefined) {
    element.value = config.value;
  }
  if (config.textContent !== undefined) {
    element.textContent = config.textContent;
  }
  if (config.innerHTML !== undefined) {
    element.innerHTML = config.innerHTML;
  }
  if (config.checked !== undefined) {
    element.checked = config.checked;
  }
  if (config.disabled !== undefined) {
    element.disabled = config.disabled;
  }
  if (config.classNames) {
    element.classList = createClassList(config.classNames);
  }
  if (config.dataset) {
    element.dataset = { ...config.dataset };
  }
  if (config.placeholder !== undefined) {
    element.placeholder = config.placeholder;
  }
  if (config.title !== undefined) {
    element.title = config.title;
  }

  return element;
}

const DEFAULT_ELEMENT_CONFIG = {
  birthDate: { type: 'input', value: '1990-01-01' },
  birthYear: { type: 'input', value: '1990' },
  earlyRetirementAge: { type: 'input', value: '55' },
  earlyRetirementAgeRange: { type: 'input', value: '55' },
  earlyRetirementAgeHelp: { type: 'div', textContent: '' },
  fullRetirementAge: { type: 'input', value: '67' },
  fullRetirementAgeRange: { type: 'input', value: '67' },
  monthlyContribution: { type: 'input', value: '7000' },
  monthlyContributionCurrency: { type: 'select', value: '$' },
  withdrawalRate: { type: 'input', value: '4' },
  withdrawalRateRange: { type: 'input', value: '4' },
  inflationRate: { type: 'input', value: '2' },
  inflationRateRange: { type: 'input', value: '2' },
  capitalGainsTax: { type: 'input', value: '25' },
  capitalGainsTaxRange: { type: 'input', value: '25' },
  pensionNetMonthlyAmount: { type: 'input', value: '1500' },
  pensionCurrency: { type: 'select', value: '$' },
  targetMonthlyExpense: { type: 'input', value: '9000' },
  targetMonthlyExpenseCurrency: { type: 'select', value: '$' },
  usdIlsRate: { type: 'input', value: '3.60' },
  usdIlsRateRange: { type: 'input', value: '3.60' },
  adjustContributionsForInflation: { type: 'input', inputType: 'checkbox', checked: false },
  useRetirementPortfolio: { type: 'input', inputType: 'checkbox', checked: false },
  savePlan: { type: 'button' },
  savePlanAs: { type: 'button' },
  loadPlan: { type: 'button' },
  exportToExcel: { type: 'button', innerHTML: '<svg>export</svg>' },
  exportOptionsModal: { type: 'div', classNames: ['hidden'] },
  exportScenarioName: { type: 'input', value: '' },
  exportScenarioNotes: { type: 'textarea', value: '' },
  exportModalConfirm: { type: 'button' },
  exportModalCancel: { type: 'button' },
  displayCurrencyMenuButton: { type: 'button' },
  displayCurrencyMenu: { type: 'div', classNames: ['hidden'] },
  displayCurrencyMenuButtonLabel: { type: 'span', textContent: '$' },
  currencyUSD: { type: 'button', classNames: ['active', 'bg-blue-500', 'text-white'] },
  currencyILS: { type: 'button', classNames: ['bg-white', 'text-gray-700'] },
  totalContributions: { type: 'div' },
  annualWithdrawalNet: { type: 'div' },
  annualWithdrawalGross: { type: 'div' },
  monthlyExpenseNet: { type: 'div' },
  monthlyExpenseGross: { type: 'div' },
  'results-tab-info': { type: 'div' },
  contributionsBreakdown: { type: 'div' },
  startValue: { type: 'div' },
  endValue: { type: 'div' },
  startUnrealizedGain: { type: 'div' },
  endUnrealizedGain: { type: 'div' },
  peakValue: { type: 'div' },
  peakUnrealizedGain: { type: 'div' },
  peakTaxToPay: { type: 'div', classNames: ['hidden'] },
  accumulationEndValue: { type: 'div' },
  accumulationEndUnrealizedGain: { type: 'div' },
  accumulationEndTaxToPay: { type: 'div', classNames: ['hidden'] },
  accumulationTable: { type: 'table-section' },
  expensesTable: { type: 'table-section' },
  retirementAllocationTable: { type: 'table-section' },
  accumulationStartChart: { type: 'canvas' },
  accumulationEndChart: { type: 'canvas' },
  startAccumulationChart: { type: 'canvas' },
  startRetirementChart: { type: 'canvas' },
  endRetirementChart: { type: 'canvas' },
  mainChart: { type: 'canvas' },
  expensesChart: { type: 'canvas' },
  resultsExpensesChart: { type: 'canvas' },
  rsuTimelineChart: { type: 'canvas' },
  rsuSharesChart: { type: 'canvas' },
  rsuNestedDonutChart: { type: 'canvas' },
  'tab-accumulation': { type: 'button', classNames: ['tab-button', 'active', 'border-blue-500', 'text-blue-600'] },
  'tab-rsu': { type: 'button', classNames: ['tab-button', 'border-transparent', 'text-gray-500'] },
  'tab-expenses': { type: 'button', classNames: ['tab-button', 'border-transparent', 'text-gray-500'] },
  'tab-retirement': { type: 'button', classNames: ['tab-button', 'border-transparent', 'text-gray-500'] },
  'tab-results': { type: 'button', classNames: ['tab-button', 'border-transparent', 'text-gray-500'] },
  'tab-money-flow': { type: 'button', classNames: ['tab-button', 'border-transparent', 'text-gray-500'] },
  'content-accumulation': { type: 'div', classNames: ['tab-content'] },
  'content-rsu': { type: 'div', classNames: ['tab-content', 'hidden'] },
  'content-expenses': { type: 'div', classNames: ['tab-content', 'hidden'] },
  'content-retirement': { type: 'div', classNames: ['tab-content', 'hidden'] },
  'content-results': { type: 'div', classNames: ['tab-content', 'hidden'] },
  'content-money-flow': { type: 'div', classNames: ['tab-content', 'hidden'] }
};

export function createAppTestHarness(options = {}) {
  defineDomClasses();

  const alerts = [];
  const documentListeners = new Map();
  const windowListeners = new Map();
  const elements = new Map();
  const selectorMap = new Map();
  const readyState = options.readyState || 'loading';
  const documentBody = new global.HTMLElement('body', 'body');
  const documentElement = new global.HTMLElement('documentElement', 'html');

  global.Event = class Event {
    constructor(type, init = {}) {
      this.type = type;
      Object.assign(this, init);
      this.preventDefault = jest.fn();
      this.stopPropagation = jest.fn();
    }
  };

  global.Chart = jest.fn(() => ({ update: jest.fn(), destroy: jest.fn() }));
  global.Chart.register = jest.fn();
  global.Blob = jest.fn((content, blobOptions) => ({ content, ...blobOptions }));
  global.URL = {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn()
  };
  global.alert = jest.fn((message) => {
    alerts.push(message);
  });

  const getElement = (id, config = null) => {
    if (!elements.has(id)) {
      const mergedConfig = config || DEFAULT_ELEMENT_CONFIG[id] || {};
      elements.set(id, buildElement(id, mergedConfig));
    }

    return elements.get(id);
  };

  Object.entries(DEFAULT_ELEMENT_CONFIG).forEach(([id, config]) => {
    getElement(id, config);
  });

  Object.entries(options.elementOverrides || {}).forEach(([id, config]) => {
    elements.set(id, buildElement(id, { ...(DEFAULT_ELEMENT_CONFIG[id] || {}), ...config }));
  });

  const addListener = (listenerMap, type, handler) => {
    const handlers = listenerMap.get(type) || [];
    handlers.push(handler);
    listenerMap.set(type, handlers);
  };

  const removeListener = (listenerMap, type, handler) => {
    const handlers = listenerMap.get(type) || [];
    listenerMap.set(type, handlers.filter((entry) => entry !== handler));
  };

  const dispatchListeners = (listenerMap, event) => {
    const handlers = listenerMap.get(event.type) || [];
    handlers.forEach((handler) => handler(event));
  };

  global.document = {
    readyState,
    body: documentBody,
    documentElement,
    getElementById: jest.fn((id) => elements.get(id) || null),
    querySelector: jest.fn((selector) => {
      if (selector === '.tab-button.active') {
        return [...elements.values()].find((element) => element.classList.contains('tab-button') && element.classList.contains('active')) || null;
      }
      if (selector.startsWith('#')) {
        return elements.get(selector.slice(1)) || null;
      }
      return selectorMap.get(selector) || null;
    }),
    querySelectorAll: jest.fn((selector) => {
      if (selector === '.tab-button') {
        return [...elements.values()].filter((element) => element.classList.contains('tab-button'));
      }
      if (selector === '.tab-content') {
        return [...elements.values()].filter((element) => element.classList.contains('tab-content'));
      }
      return selectorMap.get(selector) || [];
    }),
    createElement: jest.fn((tagName) => buildElement(`created-${tagName}-${elements.size + 1}`, { type: tagName === 'input' ? 'input' : tagName })),
    createTextNode: jest.fn((text) => ({ textContent: text })),
    addEventListener: jest.fn((type, handler) => addListener(documentListeners, type, handler)),
    removeEventListener: jest.fn((type, handler) => removeListener(documentListeners, type, handler)),
    dispatchEvent: jest.fn((event) => dispatchListeners(documentListeners, event))
  };

  global.window = {
    location: { href: 'http://localhost:5162' },
    addEventListener: jest.fn((type, handler) => addListener(windowListeners, type, handler)),
    removeEventListener: jest.fn((type, handler) => removeListener(windowListeners, type, handler)),
    dispatchEvent: jest.fn((event) => dispatchListeners(windowListeners, event)),
    fireApp: null
  };

  const domUtilsMock = {
    getElement: jest.fn((id) => getElement(id)),
    getInputNumber: jest.fn((id, fallback = 0) => {
      const value = getElement(id)?.value;
      const parsed = Number.parseFloat(String(value ?? ''));
      return Number.isFinite(parsed) ? parsed : fallback;
    }),
    getInputValue: jest.fn((id) => getElement(id)?.value ?? ''),
    setInputValue: jest.fn((id, value) => {
      const element = getElement(id);
      if (element) {
        element.value = String(value);
      }
    }),
    setTextContent: jest.fn((id, value) => {
      const element = getElement(id);
      if (element) {
        element.textContent = value;
      }
    }),
    setupNumberInputFormatting: jest.fn(),
    setupInputSpinners: jest.fn(),
    escapeHtml: jest.fn((value) => String(value))
  };

  return {
    elements,
    alerts,
    documentListeners,
    windowListeners,
    selectorMap,
    domUtilsMock,
    getElement,
    click: (id) => getElement(id).click(),
    dispatchDocumentEvent: (type, init = {}) => {
      const event = new global.Event(type, init);
      global.document.dispatchEvent(event);
      return event;
    }
  };
}

export function loadAppModule(harness, overrides = {}) {
  jest.resetModules();

  const chartManagerMocks = {
    convertPortfolioToChartData: jest.fn(() => []),
    updateDonutChart: jest.fn(),
    updateMainChart: jest.fn(),
    updateExpensesBarChart: jest.fn(),
    resetChartZoom: jest.fn(),
    zoomChartIn: jest.fn(),
    zoomChartOut: jest.fn(),
    panChartLeft: jest.fn(),
    panChartRight: jest.fn(),
    ...(overrides.chartManager || {})
  };

  const portfolioTableMocks = {
    createPortfolioAsset: jest.fn(() => ({
      id: Date.now(),
      symbol: '',
      quantity: 0,
      currentPrice: { amount: 0, currency: 'USD' },
      averageCost: { amount: 0, currency: 'USD' },
      method: 'CAGR',
      value1: 0,
      value2: 0
    })),
    renderPortfolioTable: jest.fn(),
    updateAssetSymbol: jest.fn(),
    handleAssetMethodChange: jest.fn(),
    removeAssetFromPortfolio: jest.fn(),
    updateAssetField: jest.fn(),
    updateAssetCurrency: jest.fn(),
    updateAssetPrice: jest.fn(),
    updateAssetCost: jest.fn(),
    fetchCAGRsForPortfolio: jest.fn(async () => {}),
    fetchMarketCapsForPortfolio: jest.fn(async () => {}),
    fetchPricesForPortfolio: jest.fn(async () => {}),
    ...(overrides.portfolioTable || {})
  };

  const expenseTableMocks = {
    createExpense: jest.fn(() => ({
      id: Date.now(),
      type: '',
      netAmount: { amount: 0, currency: 'USD' },
      year: new Date().getFullYear(),
      frequencyYears: 1,
      repetitionCount: 1
    })),
    renderExpenseTable: jest.fn(),
    calculateExpenseTotals: jest.fn(() => ({ total: 0, count: 0 })),
    removeExpenseFromList: jest.fn(),
    updateExpenseField: jest.fn(),
    updateExpenseAmount: jest.fn(),
    updateExpenseCurrency: jest.fn(),
    ...(overrides.expenseTable || {})
  };

  const firePlanApiMocks = {
    calculateFirePlanAPI: jest.fn(async () => createCalculationResult()),
    FirePlanApiError: class FirePlanApiError extends Error {
      constructor(message, statusCode, originalError) {
        super(message);
        this.name = 'FirePlanApiError';
        this.statusCode = statusCode;
        this.originalError = originalError;
      }
    },
    ...(overrides.firePlanApi || {})
  };

  const assetsApiMocks = {
    fetchAssetPrice: jest.fn(async () => null),
    fetchAssetPriceResponse: jest.fn(async () => null),
    fetchUsdIlsRate: jest.fn(async () => 4.1),
    ...(overrides.assetsApi || {})
  };

  const exportApiMocks = {
    exportToExcel: jest.fn(async () => {}),
    ...(overrides.exportApi || {})
  };

  const rsuStateMocks = {
    getRsuGrants: jest.fn(() => []),
    getRsuConfiguration: jest.fn(() => ({
      stockSymbol: '',
      currentPricePerShare: 0,
      priceIsFromApi: false,
      currency: '$',
      expectedAnnualReturn: 0,
      returnMethod: 'CAGR',
      defaultVestingPeriodYears: 4,
      liquidationStrategy: 'SellAfter2Years',
      marginalTaxRate: 0,
      subjectTo3PercentSurtax: false,
      grants: []
    })),
    getRsuState: jest.fn(() => ({
      includeInCalculations: false,
      configuration: { grants: [] }
    })),
    updateRsuConfiguration: jest.fn(),
    setRsuIncludeInCalculations: jest.fn(),
    loadRsuFromFileData: jest.fn(),
    calculateRsuTimeline: jest.fn(() => []),
    calculatePerGrantTimelines: jest.fn(() => []),
    calculateVestedShares: jest.fn(() => 0),
    calculateSection102EligibleShares: jest.fn(() => 0),
    calculateRsuSummary: jest.fn(() => ({ totalValue: 0, vestedValue: 0 })),
    calculateCanonicalMonthlyTimeline: jest.fn(() => []),
    ...(overrides.rsuState || {})
  };

  const rsuChartMocks = {
    updateRsuValueChart: jest.fn(),
    updateRsuSharesChart: jest.fn(),
    updateRsuNestedDonutChart: jest.fn(),
    setupChartCopyButton: jest.fn(),
    ...(overrides.rsuChart || {})
  };

  const rsuTableMocks = {
    initRsuTable: jest.fn(),
    renderTable: jest.fn(),
    ...(overrides.rsuTable || {})
  };

  const appShellMocks = overrides.appShell
    ? {
        initializeApp: jest.fn(),
        switchTab: jest.fn(),
        configureAppShell: jest.fn(),
        ...overrides.appShell
      }
    : null;

  const sankeyInstances = [];
  class MockSankeyChartManager {
    constructor() {
      this.refresh = jest.fn();
      this.update = jest.fn();
      sankeyInstances.push(this);
    }
  }

  jest.doMock('../../js/utils/dom.js', () => harness.domUtilsMock);
  jest.doMock('../../js/services/calculator.js', () => ({
    calculatePortfolioValue: jest.fn(() => 0),
    calculatePortfolioCostBasis: jest.fn(() => 0)
  }));
  jest.doMock('../../js/api/fire-plan-api.js', () => firePlanApiMocks);
  jest.doMock('../../js/api/assets-api.js', () => assetsApiMocks);
  jest.doMock('../../js/api/export-api.js', () => exportApiMocks);
  jest.doMock('../../js/components/chart-manager.js', () => chartManagerMocks);
  jest.doMock('../../js/components/portfolio-table.js', () => portfolioTableMocks);
  jest.doMock('../../js/components/expense-table.js', () => expenseTableMocks);
  jest.doMock('../../js/components/rsu-table.js', () => rsuTableMocks);
  jest.doMock('../../js/services/rsu-state.js', () => rsuStateMocks);
  jest.doMock('../../js/components/rsu-chart.js', () => rsuChartMocks);
  jest.doMock('../../js/components/sankey-chart.js', () => ({
    SankeyChartManager: overrides.SankeyChartManager || MockSankeyChartManager
  }));
  if (appShellMocks) {
    jest.doMock('../../js/app-shell.js', () => appShellMocks);
  } else {
    jest.dontMock('../../js/app-shell.js');
  }

  const appModule = require('../../js/app.js');

  return {
    appModule,
    mocks: {
      chartManager: chartManagerMocks,
      portfolioTable: portfolioTableMocks,
      expenseTable: expenseTableMocks,
      firePlanApi: firePlanApiMocks,
      assetsApi: assetsApiMocks,
      exportApi: exportApiMocks,
      appShell: appShellMocks,
      rsuState: rsuStateMocks,
      rsuChart: rsuChartMocks,
      rsuTable: rsuTableMocks,
      sankeyInstances
    }
  };
}
