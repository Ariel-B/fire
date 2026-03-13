import type { ExpenseChartData } from '../components/chart-manager.js';
import type { Currency, PlannedExpense } from '../types/index.js';

interface ExpenseCoordinatorState {
  expenses: PlannedExpense[];
  exchangeRates: { usdToIls: number; ilsToUsd: number };
  displayCurrency: Currency;
}

interface SortState {
  column: string | null;
  direction: 'asc' | 'desc';
}

type ExpenseCoordinatorDependencies = {
  state: ExpenseCoordinatorState;
  createExpense: (id?: number, baseYear?: number) => PlannedExpense;
  renderExpenseTable: (
    tableId: string,
    expenses: PlannedExpense[],
    baseYear: number,
    inflationRate: number,
    exchangeRates: { usdToIls: number; ilsToUsd: number },
    displayCurrency: Currency
  ) => void;
  calculateExpenseTotals: (
    expenses: PlannedExpense[],
    baseYear: number,
    inflationRate: number,
    exchangeRates: { usdToIls: number; ilsToUsd: number },
    displayCurrency: Currency
  ) => {
    totalNetAmount: number;
    totalFirstInflation: number;
    totalLastInflation: number;
    grandTotal: number;
    totalOccurrences: number;
  };
  getMoneySymbol: (money: PlannedExpense['netAmount']) => Currency;
  formatCurrency: (amount: number, currency: Currency) => string;
  getElement: <T extends HTMLElement = HTMLElement>(id: string) => T | null;
  updateExpensesBarChart: (
    chartId: string,
    chartData: ExpenseChartData | null,
    displayCurrency: Currency
  ) => void;
  updateExpenseField: (
    expenses: PlannedExpense[],
    id: number,
    field: keyof PlannedExpense,
    value: unknown
  ) => void;
  removeExpenseFromList: (expenses: PlannedExpense[], id: number) => PlannedExpense[];
  updateExpenseAmount: (expenses: PlannedExpense[], id: number, amount: number) => void;
  updateExpenseCurrency: (expenses: PlannedExpense[], id: number, symbol: '$' | '₪') => void;
  getCurrentBaseYear: () => number;
  getInflationRate: () => number;
  calculateAndUpdate: () => void | Promise<void>;
};

export function createExpenseCoordinator(dependencies: ExpenseCoordinatorDependencies) {
  const expenseSortState: SortState = {
    column: null,
    direction: 'asc'
  };

  function updateExpensesTotalRow(): void {
    const totalRow = dependencies.getElement('expensesTotalRow');
    if (!totalRow) return;

    if (dependencies.state.expenses.length === 0) {
      totalRow.innerHTML = '';
      totalRow.classList.add('hidden');
      return;
    }

    const totals = dependencies.calculateExpenseTotals(
      dependencies.state.expenses,
      dependencies.getCurrentBaseYear(),
      dependencies.getInflationRate(),
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency
    );

    totalRow.innerHTML = `
    <td class="px-4 py-4 font-bold text-gray-900">סה"כ</td>
    <td class="px-4 py-4 font-bold text-gray-900">${dependencies.formatCurrency(totals.totalNetAmount, dependencies.state.displayCurrency)}</td>
    <td class="px-3 py-4">-</td>
    <td class="px-4 py-4">-</td>
    <td class="px-3 py-4">-</td>
    <td class="px-3 py-4">-</td>
    <td class="px-4 py-4 font-bold text-orange-700">${dependencies.formatCurrency(totals.totalFirstInflation, dependencies.state.displayCurrency)}</td>
    <td class="px-4 py-4 font-bold text-red-700">${dependencies.formatCurrency(totals.totalLastInflation, dependencies.state.displayCurrency)}</td>
    <td class="px-4 py-4 bg-blue-100 font-bold text-blue-900 text-lg">${dependencies.formatCurrency(totals.grandTotal, dependencies.state.displayCurrency)}</td>
    <td class="px-4 py-4">-</td>
  `;
    totalRow.classList.remove('hidden');
  }

  function buildExpenseChartData(): ExpenseChartData | null {
    if (dependencies.state.expenses.length === 0) {
      return null;
    }

    const baseYear = dependencies.getCurrentBaseYear();
    const inflationRate = dependencies.getInflationRate();
    const expensesByYear: Map<number, Map<string, number>> = new Map();
    const expenseTypes = new Set<string>();

    dependencies.state.expenses.forEach((expense) => {
      const frequencyYears = expense.frequencyYears || 1;
      const repetitionCount = expense.repetitionCount || 1;
      const expenseCurrency = dependencies.getMoneySymbol(expense.netAmount);

      for (let i = 0; i < repetitionCount; i += 1) {
        const year = expense.year + (i * frequencyYears);
        const yearsFromBase = year - baseYear;
        const inflationMultiplier = Math.pow(1 + inflationRate / 100, yearsFromBase);

        let amount = (expense.netAmount?.amount || 0) * inflationMultiplier;

        if (expenseCurrency !== dependencies.state.displayCurrency) {
          if (expenseCurrency === '$' && dependencies.state.displayCurrency === '₪') {
            amount *= dependencies.state.exchangeRates.usdToIls;
          } else if (expenseCurrency === '₪' && dependencies.state.displayCurrency === '$') {
            amount *= dependencies.state.exchangeRates.ilsToUsd;
          }
        }

        if (!expensesByYear.has(year)) {
          expensesByYear.set(year, new Map());
        }

        const yearMap = expensesByYear.get(year);
        if (!yearMap) {
          throw new Error(`Failed to build expense chart data for year ${year}`);
        }

        const expenseType = expense.type || 'אחר';
        expenseTypes.add(expenseType);
        yearMap.set(expenseType, (yearMap.get(expenseType) || 0) + amount);
      }
    });

    const sortedYears = Array.from(expensesByYear.keys()).sort((a, b) => a - b);
    const colors = [
      { bg: 'rgba(239, 68, 68, 0.7)', border: 'rgba(239, 68, 68, 1)' },
      { bg: 'rgba(249, 115, 22, 0.7)', border: 'rgba(249, 115, 22, 1)' },
      { bg: 'rgba(234, 179, 8, 0.7)', border: 'rgba(234, 179, 8, 1)' },
      { bg: 'rgba(34, 197, 94, 0.7)', border: 'rgba(34, 197, 94, 1)' },
      { bg: 'rgba(59, 130, 246, 0.7)', border: 'rgba(59, 130, 246, 1)' },
      { bg: 'rgba(139, 92, 246, 0.7)', border: 'rgba(139, 92, 246, 1)' },
      { bg: 'rgba(236, 72, 153, 0.7)', border: 'rgba(236, 72, 153, 1)' },
      { bg: 'rgba(20, 184, 166, 0.7)', border: 'rgba(20, 184, 166, 1)' }
    ];

    const expenseTypeArray = Array.from(expenseTypes);
    const datasets = expenseTypeArray.map((type, index) => {
      const colorIndex = index % colors.length;
      return {
        label: type,
        data: sortedYears.map((year) => expensesByYear.get(year)?.get(type) || 0),
        backgroundColor: colors[colorIndex].bg,
        borderColor: colors[colorIndex].border,
        borderWidth: 1
      };
    });

    return {
      years: sortedYears.map((year) => String(year)),
      datasets
    };
  }

  function updateExpensesChart(): void {
    const chartData = buildExpenseChartData();
    dependencies.updateExpensesBarChart(
      'expensesChart',
      chartData,
      dependencies.state.displayCurrency
    );
    dependencies.updateExpensesBarChart(
      'resultsExpensesChart',
      chartData,
      dependencies.state.displayCurrency
    );
  }

  function updateExpensesSummary(): void {
    const totals = dependencies.calculateExpenseTotals(
      dependencies.state.expenses,
      dependencies.getCurrentBaseYear(),
      dependencies.getInflationRate(),
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency
    );

    const tabInfo = dependencies.getElement('expenses-tab-info');
    if (tabInfo) {
      tabInfo.textContent = `(${dependencies.formatCurrency(totals.grandTotal, dependencies.state.displayCurrency)})`;
    }

    updateExpensesChart();
  }

  function updateExpenseTable(): void {
    dependencies.renderExpenseTable(
      'expensesTable',
      dependencies.state.expenses,
      dependencies.getCurrentBaseYear(),
      dependencies.getInflationRate(),
      dependencies.state.exchangeRates,
      dependencies.state.displayCurrency
    );
    updateExpensesTotalRow();
    updateExpensesSummary();
  }

  function addExpense(): void {
    const newExpense = dependencies.createExpense(undefined, dependencies.getCurrentBaseYear());
    dependencies.state.expenses.push(newExpense);
    updateExpenseTable();
  }

  function updateExpense(id: number, field: string, value: unknown): void {
    dependencies.updateExpenseField(
      dependencies.state.expenses,
      id,
      field as keyof PlannedExpense,
      value
    );
    updateExpenseTable();
    void dependencies.calculateAndUpdate();
  }

  function removeExpense(id: number): void {
    dependencies.state.expenses = dependencies.removeExpenseFromList(dependencies.state.expenses, id);
    updateExpenseTable();
    void dependencies.calculateAndUpdate();
  }

  function updateExpenseAmountField(id: number, amount: number): void {
    dependencies.updateExpenseAmount(dependencies.state.expenses, id, amount);
    updateExpenseTable();
    void dependencies.calculateAndUpdate();
  }

  function updateExpenseCurrencyField(id: number, symbol: '$' | '₪'): void {
    dependencies.updateExpenseCurrency(dependencies.state.expenses, id, symbol);
    updateExpenseTable();
    void dependencies.calculateAndUpdate();
  }

  function sortExpensesTable(column: string): void {
    if (expenseSortState.column === column) {
      expenseSortState.direction = expenseSortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      expenseSortState.column = column;
      expenseSortState.direction = 'asc';
    }

    const baseYear = dependencies.getCurrentBaseYear();
    const inflationRate = dependencies.getInflationRate();

    dependencies.state.expenses.sort((a, b) => {
      let valueA: number | string = 0;
      let valueB: number | string = 0;

      switch (column) {
        case 'type':
          valueA = a.type || '';
          valueB = b.type || '';
          break;
        case 'netAmount':
          valueA = a.netAmount?.amount || 0;
          valueB = b.netAmount?.amount || 0;
          break;
        case 'year':
          valueA = a.year || 0;
          valueB = b.year || 0;
          break;
        case 'repetitionCount':
          valueA = a.repetitionCount || 1;
          valueB = b.repetitionCount || 1;
          break;
        case 'grandTotal': {
          const calculateGrandTotal = (expense: PlannedExpense): number => {
            const frequencyYears = expense.frequencyYears || 1;
            const repetitionCount = expense.repetitionCount || 1;
            let total = 0;
            for (let i = 0; i < repetitionCount; i += 1) {
              const yearOffset = expense.year + (frequencyYears * i) - baseYear;
              const inflated = (expense.netAmount?.amount || 0)
                * Math.pow(1 + inflationRate / 100, yearOffset);
              total += inflated;
            }
            return total;
          };
          valueA = calculateGrandTotal(a);
          valueB = calculateGrandTotal(b);
          break;
        }
      }

      const multiplier = expenseSortState.direction === 'asc' ? 1 : -1;
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return valueA.localeCompare(valueB, 'he') * multiplier;
      }
      return ((valueA as number) - (valueB as number)) * multiplier;
    });

    updateExpenseTable();
  }

  return {
    addExpense,
    updateExpenseTable,
    updateExpensesTotalRow,
    updateExpensesSummary,
    buildExpenseChartData,
    updateExpensesChart,
    updateExpense,
    removeExpense,
    updateExpenseAmountField,
    updateExpenseCurrencyField,
    sortExpensesTable
  };
}
