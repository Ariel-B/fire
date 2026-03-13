/* eslint-env jest */

function loadModule() {
  return require('../../../js/orchestration/expense-coordinator.js');
}

function createMockElement() {
  return {
    textContent: '',
    innerHTML: '',
    classList: {
      add: jest.fn(),
      remove: jest.fn()
    }
  };
}

function createDependencies(overrides = {}) {
  const state = {
    expenses: [
      {
        id: 1,
        type: 'Vacation',
        netAmount: { amount: 1000, currency: 'USD' },
        year: 2026,
        frequencyYears: 1,
        repetitionCount: 2
      }
    ],
    exchangeRates: { usdToIls: 3.5, ilsToUsd: 1 / 3.5 },
    displayCurrency: '₪'
  };

  const elements = {
    expensesTotalRow: createMockElement(),
    'expenses-tab-info': createMockElement()
  };

  return {
    state,
    createExpense: jest.fn(() => ({
      id: 2,
      type: '',
      netAmount: { amount: 0, currency: 'USD' },
      year: 2026,
      frequencyYears: 1,
      repetitionCount: 1
    })),
    renderExpenseTable: jest.fn(),
    calculateExpenseTotals: jest.fn(() => ({
      totalNetAmount: 3500,
      totalFirstInflation: 3500,
      totalLastInflation: 3600,
      grandTotal: 7100,
      totalOccurrences: 2
    })),
    getMoneySymbol: jest.fn((money) => (money.currency === 'ILS' ? '₪' : '$')),
    formatCurrency: jest.fn((amount, currency) => `${currency}${amount}`),
    getElement: jest.fn((id) => elements[id] ?? null),
    updateExpensesBarChart: jest.fn(),
    updateExpenseField: jest.fn((expenses, id, field, value) => {
      const expense = expenses.find((entry) => entry.id === id);
      expense[field] = value;
    }),
    removeExpenseFromList: jest.fn((expenses, id) => expenses.filter((entry) => entry.id !== id)),
    updateExpenseAmount: jest.fn((expenses, id, amount) => {
      const expense = expenses.find((entry) => entry.id === id);
      expense.netAmount = { ...expense.netAmount, amount };
    }),
    updateExpenseCurrency: jest.fn((expenses, id, symbol) => {
      const expense = expenses.find((entry) => entry.id === id);
      expense.netAmount = {
        ...expense.netAmount,
        currency: symbol === '₪' ? 'ILS' : 'USD'
      };
    }),
    getCurrentBaseYear: jest.fn(() => 2026),
    getInflationRate: jest.fn(() => 10),
    calculateAndUpdate: jest.fn(),
    ...overrides
  };
}

describe('expense coordinator', () => {
  test('adds an expense row and refreshes expense views without recalculating', () => {
    const { createExpenseCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createExpenseCoordinator(dependencies);

    coordinator.addExpense();

    expect(dependencies.createExpense).toHaveBeenCalledWith(undefined, 2026);
    expect(dependencies.state.expenses).toHaveLength(2);
    expect(dependencies.renderExpenseTable).toHaveBeenCalled();
    expect(dependencies.calculateAndUpdate).not.toHaveBeenCalled();
  });

  test('updates total row, tab summary, and both charts when expense table refreshes', () => {
    const { createExpenseCoordinator } = loadModule();
    const dependencies = createDependencies();
    const coordinator = createExpenseCoordinator(dependencies);

    coordinator.updateExpenseTable();

    expect(dependencies.renderExpenseTable).toHaveBeenCalledWith(
      'expensesTable',
      dependencies.state.expenses,
      2026,
      10,
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency
    );
    expect(dependencies.getElement('expensesTotalRow').innerHTML).toContain('₪7100');
    expect(dependencies.getElement('expenses-tab-info').textContent).toBe('(₪7100)');
    expect(dependencies.updateExpensesBarChart).toHaveBeenNthCalledWith(
      1,
      'expensesChart',
      expect.objectContaining({
        years: ['2026', '2027']
      }),
      '₪'
    );
    expect(dependencies.updateExpensesBarChart).toHaveBeenNthCalledWith(
      2,
      'resultsExpensesChart',
      expect.any(Object),
      '₪'
    );
  });

  test('sorts expenses by type and toggles direction on repeated requests', () => {
    const { createExpenseCoordinator } = loadModule();
    const dependencies = createDependencies({
      state: {
        expenses: [
          {
            id: 1,
            type: 'Zoo',
            netAmount: { amount: 50, currency: 'USD' },
            year: 2026,
            frequencyYears: 1,
            repetitionCount: 1
          },
          {
            id: 2,
            type: 'Apartment',
            netAmount: { amount: 100, currency: 'USD' },
            year: 2026,
            frequencyYears: 1,
            repetitionCount: 1
          }
        ],
        exchangeRates: { usdToIls: 3.5, ilsToUsd: 1 / 3.5 },
        displayCurrency: '$'
      }
    });
    const coordinator = createExpenseCoordinator(dependencies);

    coordinator.sortExpensesTable('type');
    expect(dependencies.state.expenses.map((expense) => expense.id)).toEqual([2, 1]);

    coordinator.sortExpensesTable('type');
    expect(dependencies.state.expenses.map((expense) => expense.id)).toEqual([1, 2]);
  });
});
