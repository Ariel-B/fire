/* eslint-env jest */

function loadModule() {
  return require('../../../js/orchestration/retirement-coordinator.js');
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
    textContent: '',
    innerHTML: '',
    checked: false,
    className: '',
    classList: createClassList(initialClasses)
  };
}

function createMockTable() {
  return {
    innerHTML: '',
    rows: [],
    insertRow: jest.fn(function insertRow() {
      const row = { innerHTML: '', dataset: {}, setAttribute: jest.fn() };
      this.rows.push(row);
      return row;
    })
  };
}

function createDependencies(overrides = {}) {
  const state = {
    retirementAllocation: [
      { id: 1, assetType: 'Stocks', targetPercentage: 60, expectedAnnualReturn: 7, description: '' },
      { id: 2, assetType: 'Bonds', targetPercentage: 40, expectedAnnualReturn: 4, description: '' }
    ],
    displayCurrency: '$',
    useRetirementPortfolio: false
  };

  const elements = {
    retirementAllocationTable: createMockTable(),
    retirementTotalAllocation: createMockElement(),
    retirementWeightedReturn: createMockElement(),
    'retirement-tab-info': createMockElement(),
    useRetirementPortfolio: { ...createMockElement(), checked: false },
    'retirement-disabled-state': createMockElement(),
    'retirement-enabled-content': createMockElement(['hidden'])
  };

  return {
    state,
    getElement: jest.fn((id) => elements[id] ?? null),
    setTextContent: jest.fn((id, value) => {
      const element = elements[id];
      if (element) {
        element.textContent = value;
      }
    }),
    escapeHtml: jest.fn((value) => value),
    updateDonutChart: jest.fn(),
    getUsdIlsRate: jest.fn(() => 3.6),
    getEarlyRetirementYear: jest.fn(() => 2045),
    calculateAndUpdate: jest.fn(),
    ...overrides
  };
}

describe('retirement coordinator', () => {
  test('refreshes the retirement allocation table, summary text, tab info, and chart from state', () => {
    const { createRetirementCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRetirementCoordinator(dependencies);

    coordinator.updateRetirementAllocationTable();

    expect(dependencies.getElement('retirementAllocationTable').rows).toHaveLength(2);
    expect(dependencies.getElement('retirementAllocationTable').rows[0].innerHTML).toContain('data-retirement-action="update-field"');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('retirementTotalAllocation', '100%');
    expect(dependencies.setTextContent).toHaveBeenCalledWith('retirementWeightedReturn', '5.80%');
    expect(dependencies.getElement('retirement-tab-info').textContent).toBe('(תשואה: 5.8%)');
    expect(dependencies.updateDonutChart).toHaveBeenCalledWith(
      'retirementPortfolioChart',
      [
        { symbol: 'Stocks', value: 60, percentage: 60, currency: '$' },
        { symbol: 'Bonds', value: 40, percentage: 40, currency: '$' }
      ],
      2045,
      '$',
      3.6
    );
  });

  test('updates the checkbox-driven retirement tab visibility and recalculates on toggle change', () => {
    const { createRetirementCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRetirementCoordinator(dependencies);
    const checkbox = dependencies.getElement('useRetirementPortfolio');

    checkbox.checked = true;

    coordinator.onRetirementPortfolioCheckboxChange();

    expect(dependencies.state.useRetirementPortfolio).toBe(true);
    expect(dependencies.getElement('retirement-disabled-state').classList.add).toHaveBeenCalledWith('hidden');
    expect(dependencies.getElement('retirement-enabled-content').classList.remove).toHaveBeenCalledWith('hidden');
    expect(dependencies.calculateAndUpdate).toHaveBeenCalledTimes(1);
  });

  test('adds, updates, and removes allocations while refreshing the table and recalculating', () => {
    const { createRetirementCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRetirementCoordinator(dependencies);
    const expectedNewId = Math.max(...dependencies.state.retirementAllocation.map((allocation) => allocation.id)) + 1;

    coordinator.addRetirementAllocationRow();
    const addedAllocation = dependencies.state.retirementAllocation[2];
    expect(addedAllocation).toEqual({
      id: expectedNewId,
      assetType: '',
      targetPercentage: 0,
      expectedAnnualReturn: 0,
      description: ''
    });

    coordinator.updateRetirementAllocationField(expectedNewId, 'assetType', 'Cash');
    coordinator.removeRetirementAllocation(expectedNewId);

    expect(dependencies.state.retirementAllocation).toHaveLength(2);
    expect(dependencies.calculateAndUpdate).toHaveBeenCalledTimes(3);
  });

  test('recomputes the next allocation id after loaded state replaces retirement allocations', () => {
    const { createRetirementCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createRetirementCoordinator(dependencies);

    dependencies.state.retirementAllocation = [
      { id: 10, assetType: 'Loaded stocks', targetPercentage: 70, expectedAnnualReturn: 8, description: '' },
      { id: 11, assetType: 'Loaded bonds', targetPercentage: 30, expectedAnnualReturn: 4, description: '' }
    ];

    coordinator.addRetirementAllocationRow();

    expect(dependencies.state.retirementAllocation[2]).toEqual({
      id: 12,
      assetType: '',
      targetPercentage: 0,
      expectedAnnualReturn: 0,
      description: ''
    });
  });
});
