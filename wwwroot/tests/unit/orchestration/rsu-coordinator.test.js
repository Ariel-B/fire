/* eslint-env jest */

function loadModule() {
  return require('../../../js/orchestration/rsu-coordinator.js');
}

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    add: jest.fn((...names) => names.forEach((name) => classes.add(name))),
    remove: jest.fn((...names) => names.forEach((name) => classes.delete(name))),
    contains: jest.fn((name) => classes.has(name))
  };
}

function createMockElement(initialClasses = []) {
  return {
    value: '',
    textContent: '',
    checked: false,
    disabled: false,
    readOnly: false,
    placeholder: '',
    title: '',
    classList: createClassList(initialClasses),
    _listeners: new Map(),
    addEventListener: jest.fn(function addEventListener(type, handler) {
      this._listeners.set(type, handler);
    }),
    dispatch(type) {
      const handler = this._listeners.get(type);
      if (handler) {
        return handler();
      }
      return undefined;
    }
  };
}

function createDependencies(overrides = {}) {
  const elements = {
    rsuCurrentPrice: createMockElement(['border-gray-300', 'bg-white']),
    rsuCurrency: createMockElement(['border-gray-300', 'bg-white']),
    rsuExpectedReturn: createMockElement(),
    rsuReturnMethod: createMockElement(),
    rsuMarginalTaxRate: createMockElement(),
    rsuSurtax: createMockElement(),
    rsuStockSymbol: createMockElement(),
    rsuLiquidationStrategy: createMockElement(),
    includeRsuInCalculations: createMockElement(),
    'rsu-tab-info': createMockElement()
  };

  const grants = [
    {
      id: 1,
      grantDate: '2022-01-01',
      numberOfShares: 100,
      sharesSold: 10,
      vestingPeriodYears: 4
    }
  ];

  return {
    getElement: jest.fn((id) => elements[id] ?? null),
    setTextContent: jest.fn(),
    getRsuGrants: jest.fn(() => grants),
    getRsuConfiguration: jest.fn(() => ({
      stockSymbol: 'AAPL',
      currentPricePerShare: 150,
      priceIsFromApi: true,
      currency: '$',
      expectedAnnualReturn: 12,
      returnMethod: 'CAGR',
      defaultVestingPeriodYears: 4,
      liquidationStrategy: 'SellAfter2Years',
      marginalTaxRate: 47,
      subjectTo3PercentSurtax: true,
      grants
    })),
    getRsuState: jest.fn(() => ({
      includeInCalculations: true
    })),
    updateRsuConfiguration: jest.fn(),
    setRsuIncludeInCalculations: jest.fn(),
    calculateVestedShares: jest.fn(() => 60),
    calculateSection102EligibleShares: jest.fn(() => 30),
    calculateRsuSummary: jest.fn(() => ({
      projectedNetValue: 9000,
      projectedTax: 2000
    })),
    fetchAssetPriceResponse: jest.fn(async () => ({ price: 222.22, currency: 'USD' })),
    getEarlyRetirementYear: jest.fn(() => 2045),
    calculateAndUpdate: jest.fn(),
    ...overrides,
    elements
  };
}

describe('rsu coordinator', () => {
  test('refreshes the RSU summary cards and tab info from RSU state', () => {
    const { createRsuCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRsuCoordinator(dependencies);

    coordinator.updateRsuSummary();

    expect(dependencies.calculateRsuSummary).toHaveBeenCalledWith(2045);
    expect(dependencies.setTextContent).toHaveBeenCalledWith('rsuCurrentValue', '$13,500');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('rsuActiveGrants', '1');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('rsuProjectedNet', '$9,000');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('rsuProjectedTax', 'מס: $2,000');
    expect(dependencies.getElement('rsu-tab-info').textContent).toBe('($13,500)');
  });

  test('restores RSU form fields from saved state including API read-only styling', () => {
    const { createRsuCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRsuCoordinator(dependencies);

    coordinator.updateRsuUIFromState();

    expect(dependencies.getElement('rsuStockSymbol').value).toBe('AAPL');
    expect(dependencies.getElement('rsuCurrentPrice').value).toBe('150.00');
    expect(dependencies.getElement('rsuCurrentPrice').readOnly).toBe(true);
    expect(dependencies.getElement('rsuCurrency').value).toBe('$');
    expect(dependencies.getElement('rsuCurrency').disabled).toBe(true);
    expect(dependencies.getElement('includeRsuInCalculations').checked).toBe(true);
  });

  test('normalizes saved ISO currency codes to the RSU select symbol values', () => {
    const { createRsuCoordinator } = loadModule();
    const dependencies = createDependencies({
      getRsuConfiguration: jest.fn(() => ({
        stockSymbol: 'AAPL',
        currentPricePerShare: 150,
        priceIsFromApi: false,
        currency: 'ILS',
        expectedAnnualReturn: 12,
        returnMethod: 'CAGR',
        defaultVestingPeriodYears: 4,
        liquidationStrategy: 'SellAfter2Years',
        marginalTaxRate: 47,
        subjectTo3PercentSurtax: true,
        grants: []
      }))
    });
    const coordinator = createRsuCoordinator(dependencies);

    coordinator.updateRsuUIFromState();

    expect(dependencies.getElement('rsuCurrency').value).toBe('₪');
  });

  test('wires RSU-specific listeners and preserves fetch-on-tab-open behavior', async () => {
    const { createRsuCoordinator } = loadModule();
    const dependencies = createDependencies({
      getRsuConfiguration: jest.fn(() => ({
        stockSymbol: 'MSFT',
        currentPricePerShare: 0,
        priceIsFromApi: false,
        currency: '$',
        expectedAnnualReturn: 10,
        returnMethod: 'CAGR',
        defaultVestingPeriodYears: 4,
        liquidationStrategy: 'SellAfter2Years',
        marginalTaxRate: 47,
        subjectTo3PercentSurtax: true,
        grants: []
      }))
    });
    const coordinator = createRsuCoordinator(dependencies);

    coordinator.setupEventListeners();
    dependencies.getElement('includeRsuInCalculations').checked = true;
    dependencies.getElement('includeRsuInCalculations').dispatch('change');

    dependencies.getElement('rsuStockSymbol').value = ' nvda ';
    await dependencies.getElement('rsuStockSymbol').dispatch('change');
    await coordinator.onTabActivated();

    expect(dependencies.setRsuIncludeInCalculations).toHaveBeenCalledWith(true);
    expect(dependencies.updateRsuConfiguration).toHaveBeenCalledWith({ stockSymbol: 'NVDA' });
    expect(dependencies.fetchAssetPriceResponse).toHaveBeenCalledWith('NVDA');
    expect(dependencies.fetchAssetPriceResponse).toHaveBeenCalledWith('MSFT');
    expect(dependencies.calculateAndUpdate).toHaveBeenCalled();
  });
});
