/**
 * Frontend app shell bootstrap and DOM wiring.
 *
 * This module owns startup activation, top-level listener registration,
 * and tab switching while delegating stateful workflows to configured app runtime dependencies.
 */

import type { Currency, PortfolioAllocation, TabId } from './types/index.js';
import { getElement, setupNumberInputFormatting, setupInputSpinners } from './utils/dom.js';
import { setActiveTab } from './services/state.js';
import {
  updateDonutChart,
  resetChartZoom,
  zoomChartIn,
  zoomChartOut,
  panChartLeft,
  panChartRight
} from './components/chart-manager.js';
import { initRsuTable } from './components/rsu-table.js';
import { setupChartCopyButton } from './components/rsu-chart.js';
import { SankeyChartManager } from './components/sankey-chart.js';
import { initializeInflationInfoPanel } from './components/inflation-info-panel.js';
import type { PortfolioType } from './components/portfolio-table.js';

type AppShellDependencies = {
  state: {
    exchangeRates: { usdToIls: number; ilsToUsd: number };
    displayCurrency: Currency;
    activeTab: TabId;
  };
  applyDisplayCurrencyToUI: (currency: Currency) => void;
  getUsdIlsRate: () => number;
  fetchAndUpdateExchangeRate: () => Promise<void>;
  updateRetirementPortfolioCheckbox: () => void;
  updateRetirementAllocationTable: () => void;
  updateRsuSummary: () => void;
  calculateAndUpdate: () => void;
  updateRsuUIFromState: () => void;
  setupRsuEventListeners: () => void;
  onRsuTabActivated: () => void | Promise<void>;
  getEarlyRetirementYear: () => number;
  getSankeyManager: () => SankeyChartManager | null;
  setSankeyManager: (manager: SankeyChartManager | null) => void;
  setDisplayCurrency: (currency: Currency) => void;
  updateExchangeRate: () => Promise<void>;
  onRetirementPortfolioCheckboxChange: () => void;
  savePlan: () => void | Promise<void>;
  savePlanAs: () => void | Promise<void>;
  loadPlan: () => void | Promise<void>;
  exportPlanToExcel: () => void | Promise<void>;
  sortPortfolioTable: (column: string) => void;
  sortExpensesTable: (column: string) => void;
  addAccumulationRow: () => void;
  addExpense: () => void;
  addRetirementAllocationRow: () => void;
  updatePortfolioAssetSymbol: (type: PortfolioType, id: number, symbol: string) => void | Promise<void>;
  updatePortfolioAsset: (type: PortfolioType, id: number, field: string, value: unknown) => void;
  updatePortfolioAssetCurrency: (type: PortfolioType, id: number, value: string) => void;
  updatePortfolioAssetPrice: (type: PortfolioType, id: number, value: number) => void;
  handleMethodChange: (type: PortfolioType, id: number, value: string) => void;
  updateCAGRManual: (type: PortfolioType, id: number, value: number) => void;
  updatePortfolioAssetCost: (type: PortfolioType, id: number, value: number) => void;
  removePortfolioAsset: (type: PortfolioType, id: number) => void;
  updateExpenseCurrencyField: (id: number, symbol: '$' | '₪') => void;
  updateExpenseAmountField: (id: number, amount: number) => void;
  updateExpense: (id: number, field: string, value: unknown) => void;
  removeExpense: (id: number) => void;
  updateRetirementAllocationField: (id: number, field: keyof PortfolioAllocation, value: string | number) => void;
  removeRetirementAllocation: (id: number) => void;
};

let appShellDependencies: AppShellDependencies | null = null;

export function configureAppShell(dependencies: AppShellDependencies): void {
  appShellDependencies = dependencies;
}

function getAppShellDependencies(): AppShellDependencies {
  if (!appShellDependencies) {
    throw new Error('App shell dependencies must be configured via configureAppShell() before calling app shell functions.');
  }

  return appShellDependencies;
}

export function initializeApp(): void {
  const app = getAppShellDependencies();
  const defaultRate = app.getUsdIlsRate();
  app.state.exchangeRates = {
    usdToIls: defaultRate,
    ilsToUsd: 1 / defaultRate
  };

  app.applyDisplayCurrencyToUI(app.state.displayCurrency);
  void app.fetchAndUpdateExchangeRate();

  setupEventListeners();

  setupNumberInputFormatting('monthlyContribution', 0);
  setupNumberInputFormatting('targetMonthlyExpense', 0);
  setupNumberInputFormatting('pensionNetMonthlyAmount', 0);

  setupInputSpinners('monthlyContribution', 100, 0);
  setupInputSpinners('targetMonthlyExpense', 100, 0);
  setupInputSpinners('pensionNetMonthlyAmount', 100, 0);

  app.updateRetirementPortfolioCheckbox();
  app.updateRetirementAllocationTable();

  initRsuTable('rsu-grants-container', () => {
    app.updateRsuSummary();
    app.calculateAndUpdate();
  });

  app.updateRsuUIFromState();
  app.updateRsuSummary();

  app.setSankeyManager(new SankeyChartManager());

  initializeInflationInfoPanel();

  const currentYear = new Date().getFullYear();
  const earlyRetirementYear = app.getEarlyRetirementYear();
  updateDonutChart('accumulationStartChart', [], currentYear, app.state.displayCurrency, app.state.exchangeRates.usdToIls);
  updateDonutChart('accumulationEndChart', [], earlyRetirementYear, app.state.displayCurrency, app.state.exchangeRates.usdToIls);

  app.calculateAndUpdate();
}

function setupInputSync(numberId: string, rangeId: string): void {
  const numberInput = getElement<HTMLInputElement>(numberId);
  const rangeInput = getElement<HTMLInputElement>(rangeId);

  if (numberInput && rangeInput) {
    rangeInput.addEventListener('input', () => {
      numberInput.value = rangeInput.value;
      numberInput.dispatchEvent(new Event('input'));
    });

    rangeInput.addEventListener('change', () => {
      numberInput.dispatchEvent(new Event('change'));
    });

    numberInput.addEventListener('input', () => {
      rangeInput.value = numberInput.value;
    });
  }
}

function setupEventListeners(): void {
  const app = getAppShellDependencies();
  const syncedInputs = [
    ['earlyRetirementAge', 'earlyRetirementAgeRange'],
    ['fullRetirementAge', 'fullRetirementAgeRange'],
    ['inflationRate', 'inflationRateRange'],
    ['withdrawalRate', 'withdrawalRateRange'],
    ['capitalGainsTax', 'capitalGainsTaxRange'],
    ['usdIlsRate', 'usdIlsRateRange']
  ];

  syncedInputs.forEach(([numberId, rangeId]) => {
    setupInputSync(numberId, rangeId);
  });

  const birthDateInput = getElement('birthDate') as HTMLInputElement | null;
  const birthYearInput = getElement('birthYear') as HTMLInputElement | null;
  if (birthDateInput && birthYearInput) {
    birthDateInput.addEventListener('change', () => {
      const dateValue = birthDateInput.value;
      if (dateValue) {
        const year = new Date(dateValue).getFullYear();
        birthYearInput.value = String(year);
      }
    });
  }

  const displayCurrencyMenuButton = getElement('displayCurrencyMenuButton');
  const displayCurrencyMenu = getElement('displayCurrencyMenu');

  function closeDisplayCurrencyMenu(): void {
    if (displayCurrencyMenu) {
      displayCurrencyMenu.classList.add('hidden');
    }
    if (displayCurrencyMenuButton) {
      displayCurrencyMenuButton.setAttribute('aria-expanded', 'false');
    }
  }

  function toggleDisplayCurrencyMenu(): void {
    if (!displayCurrencyMenu || !displayCurrencyMenuButton) {
      return;
    }

    const willOpen = displayCurrencyMenu.classList.contains('hidden');
    if (willOpen) {
      displayCurrencyMenu.classList.remove('hidden');
      displayCurrencyMenuButton.setAttribute('aria-expanded', 'true');
    } else {
      closeDisplayCurrencyMenu();
    }
  }

  if (displayCurrencyMenuButton) {
    displayCurrencyMenuButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDisplayCurrencyMenu();
    });
  }

  document.addEventListener('click', (e) => {
    if (!displayCurrencyMenu || !displayCurrencyMenuButton) {
      return;
    }

    const target = e.target as Node | null;
    const clickInside =
      (target && displayCurrencyMenu.contains(target)) ||
      (target && displayCurrencyMenuButton.contains(target));

    if (!clickInside) {
      closeDisplayCurrencyMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeDisplayCurrencyMenu();
    }
  });

  const currencyUSD = getElement('currencyUSD');
  const currencyILS = getElement('currencyILS');

  if (currencyUSD) {
    currencyUSD.addEventListener('click', () => {
      app.setDisplayCurrency('$');
      closeDisplayCurrencyMenu();
    });
  }

  if (currencyILS) {
    currencyILS.addEventListener('click', () => {
      app.setDisplayCurrency('₪');
      closeDisplayCurrencyMenu();
    });
  }

  const rateInput = getElement('usdIlsRate');
  if (rateInput) {
    rateInput.addEventListener('change', app.updateExchangeRate);
    rateInput.addEventListener('input', app.updateExchangeRate);
  }

  const retirementCheckbox = getElement<HTMLInputElement>('useRetirementPortfolio');
  if (retirementCheckbox) {
    retirementCheckbox.addEventListener('change', app.onRetirementPortfolioCheckboxChange);
  }

  const adjustContributionsCheckbox = getElement<HTMLInputElement>('adjustContributionsForInflation');
  if (adjustContributionsCheckbox) {
    adjustContributionsCheckbox.addEventListener('change', app.calculateAndUpdate);
  }

  document.querySelectorAll<HTMLElement>('[data-stop-tab-toggle="true"]').forEach(element => {
    element.addEventListener('click', event => {
      event.stopPropagation();
    });
  });

  const inputIds = [
    'birthDate', 'birthYear', 'earlyRetirementAge', 'fullRetirementAge',
    'monthlyContribution', 'monthlyContributionCurrency', 'withdrawalRate', 'inflationRate',
    'capitalGainsTax', 'targetMonthlyExpense', 'targetMonthlyExpenseCurrency',
    'pensionNetMonthlyAmount', 'pensionCurrency'
  ];

  inputIds.forEach(id => {
    const element = getElement(id) as HTMLInputElement | HTMLSelectElement;
    if (element) {
      if (element instanceof HTMLInputElement) {
        const validate = () => {
          if (!element.checkValidity()) {
            element.classList.add('border-red-500', 'ring-1', 'ring-red-500');
            element.classList.remove('border-gray-300');
          } else {
            element.classList.remove('border-red-500', 'ring-1', 'ring-red-500');
            element.classList.add('border-gray-300');
          }
        };

        element.addEventListener('input', validate);
        validate();
      }

      element.addEventListener('change', app.calculateAndUpdate);
      element.addEventListener('input', app.calculateAndUpdate);
    }
  });

  const earlyRetirementInput = getElement<HTMLInputElement>('earlyRetirementAge');
  const fullRetirementInput = getElement<HTMLInputElement>('fullRetirementAge');
  const earlyRetirementHelp = getElement('earlyRetirementAgeHelp');

  if (earlyRetirementInput && fullRetirementInput) {
    const updateEarlyRetirementLimit = () => {
      const maxAge = fullRetirementInput.value;
      earlyRetirementInput.max = maxAge;

      if (earlyRetirementHelp) {
        earlyRetirementHelp.textContent = `טווח: 30 - ${maxAge}`;
      }

      const event = new Event('input');
      earlyRetirementInput.dispatchEvent(event);
    };

    fullRetirementInput.addEventListener('input', updateEarlyRetirementLimit);
    updateEarlyRetirementLimit();
  }

  const saveBtn = getElement('savePlan');
  if (saveBtn) {
    saveBtn.addEventListener('click', app.savePlan);
  }

  const saveAsBtn = getElement('savePlanAs');
  if (saveAsBtn) {
    saveAsBtn.addEventListener('click', app.savePlanAs);
  }

  const loadBtn = getElement('loadPlan');
  if (loadBtn) {
    loadBtn.addEventListener('click', app.loadPlan);
  }

  const exportBtn = getElement('exportToExcel');
  if (exportBtn) {
    exportBtn.addEventListener('click', app.exportPlanToExcel);
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      app.savePlan();
    }
  });

  const tabIds = ['tab-accumulation', 'tab-rsu', 'tab-expenses', 'tab-retirement', 'tab-results', 'tab-money-flow'];
  tabIds.forEach(tabId => {
    const tabButton = getElement(tabId);
    if (tabButton) {
      tabButton.addEventListener('click', () => switchTab(tabId.replace('tab-', '') as TabId));
    }
  });

  document.querySelectorAll<HTMLElement>('[data-sort-target="portfolio"]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.sortColumn;
      if (column) {
        app.sortPortfolioTable(column);
      }
    });
  });

  document.querySelectorAll<HTMLElement>('[data-sort-target="expenses"]').forEach(header => {
    header.addEventListener('click', () => {
      const column = header.dataset.sortColumn;
      if (column) {
        app.sortExpensesTable(column);
      }
    });
  });

  const addAssetBtn = getElement('addAccumulationRow');
  if (addAssetBtn) {
    addAssetBtn.addEventListener('click', app.addAccumulationRow);
  }

  const addExpenseBtn = getElement('addExpenseRow');
  if (addExpenseBtn) {
    addExpenseBtn.addEventListener('click', app.addExpense);
  }

  const addRetirementAllocationBtn = getElement('addRetirementAllocationRow');
  if (addRetirementAllocationBtn) {
    addRetirementAllocationBtn.addEventListener('click', app.addRetirementAllocationRow);
  }

  const resetZoomBtn = getElement('resetZoomBtn');
  if (resetZoomBtn) {
    resetZoomBtn.addEventListener('click', () => resetChartZoom('mainChart'));
  }

  const zoomInBtn = getElement('zoomInBtn');
  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => zoomChartIn('mainChart'));
  }

  const zoomOutBtn = getElement('zoomOutBtn');
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => zoomChartOut('mainChart'));
  }

  const panLeftBtn = getElement('panLeftBtn');
  if (panLeftBtn) {
    panLeftBtn.addEventListener('click', () => panChartLeft('mainChart'));
  }

  const panRightBtn = getElement('panRightBtn');
  if (panRightBtn) {
    panRightBtn.addEventListener('click', () => panChartRight('mainChart'));
  }

  setupChartCopyButton('mainChart');
  setupChartCopyButton('expensesChart');
  setupChartCopyButton('resultsExpensesChart');

  setupDynamicTableEventListeners();
  app.setupRsuEventListeners();
}

function setupDynamicTableEventListeners(): void {
  const app = getAppShellDependencies();
  const accumulationTable = getElement<HTMLTableSectionElement>('accumulationTable');
  if (accumulationTable) {
    accumulationTable.addEventListener('change', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-portfolio-action]');
      if (!actionElement) {
        return;
      }

      const assetId = Number(actionElement.dataset.assetId);
      const type = (actionElement.dataset.portfolioType as PortfolioType | undefined) ?? 'accumulation';
      if (!assetId) {
        return;
      }

      if (actionElement instanceof HTMLSelectElement && actionElement.dataset.portfolioAction === 'update-currency') {
        app.updatePortfolioAssetCurrency(type, assetId, actionElement.value);
        return;
      }

      if (!(actionElement instanceof HTMLInputElement || actionElement instanceof HTMLSelectElement)) {
        return;
      }

      switch (actionElement.dataset.portfolioAction) {
        case 'update-symbol':
          void app.updatePortfolioAssetSymbol(type, assetId, actionElement.value);
          break;
        case 'update-price':
          app.updatePortfolioAssetPrice(type, assetId, parseFloat(actionElement.value));
          break;
        case 'method-change':
          app.handleMethodChange(type, assetId, actionElement.value);
          break;
        case 'update-cagr-manual':
          app.updateCAGRManual(type, assetId, parseFloat(actionElement.value));
          break;
        case 'update-cost':
          app.updatePortfolioAssetCost(type, assetId, parseFloat(actionElement.value));
          break;
        case 'update-field': {
          const field = actionElement.dataset.portfolioField;
          if (!field) {
            return;
          }

          const parsedValue = field === 'quantity' || field.startsWith('value')
            ? parseFloat(actionElement.value)
            : actionElement.value;
          app.updatePortfolioAsset(type, assetId, field, parsedValue);
          break;
        }
      }
    });

    accumulationTable.addEventListener('focusout', event => {
      const target = event.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement) || target.dataset.portfolioAction !== 'update-symbol') {
        return;
      }

      const assetId = Number(target.dataset.assetId);
      const type = (target.dataset.portfolioType as PortfolioType | undefined) ?? 'accumulation';
      if (!assetId) {
        return;
      }

      void app.updatePortfolioAssetSymbol(type, assetId, target.value);
    });

    accumulationTable.addEventListener('click', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-portfolio-action="remove"]');
      if (!actionElement) {
        return;
      }

      const assetId = Number(actionElement.dataset.assetId);
      const type = (actionElement.dataset.portfolioType as PortfolioType | undefined) ?? 'accumulation';
      if (!assetId) {
        return;
      }

      app.removePortfolioAsset(type, assetId);
    });
  }

  const expensesTable = getElement<HTMLTableSectionElement>('expensesTable');
  if (expensesTable) {
    expensesTable.addEventListener('change', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-expense-action]');
      if (!actionElement) {
        return;
      }

      const expenseId = Number(actionElement.dataset.expenseId);
      if (!expenseId) {
        return;
      }

      if (actionElement instanceof HTMLSelectElement && actionElement.dataset.expenseAction === 'update-currency') {
        app.updateExpenseCurrencyField(expenseId, actionElement.value as '$' | '₪');
        return;
      }

      if (!(actionElement instanceof HTMLInputElement)) {
        return;
      }

      switch (actionElement.dataset.expenseAction) {
        case 'update-amount':
          app.updateExpenseAmountField(expenseId, parseFloat(actionElement.value));
          break;
        case 'update-field': {
          const field = actionElement.dataset.expenseField;
          if (!field) {
            return;
          }

          const parsedValue = field === 'type'
            ? actionElement.value
            : parseInt(actionElement.value, 10);
          app.updateExpense(expenseId, field, parsedValue);
          break;
        }
      }
    });

    expensesTable.addEventListener('click', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-expense-action="remove"]');
      if (!actionElement) {
        return;
      }

      const expenseId = Number(actionElement.dataset.expenseId);
      if (!expenseId) {
        return;
      }

      app.removeExpense(expenseId);
    });
  }

  const retirementAllocationTable = getElement<HTMLTableSectionElement>('retirementAllocationTable');
  if (retirementAllocationTable) {
    retirementAllocationTable.addEventListener('change', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-retirement-action="update-field"]');
      if (!(target instanceof HTMLInputElement) || !actionElement) {
        return;
      }

      const allocationId = Number(actionElement.dataset.allocationId);
      const field = actionElement.dataset.allocationField as keyof PortfolioAllocation | undefined;
      if (!allocationId || !field) {
        return;
      }

      const parsedValue = field === 'assetType' ? target.value : parseFloat(target.value) || 0;
      app.updateRetirementAllocationField(allocationId, field, parsedValue);
    });

    retirementAllocationTable.addEventListener('click', event => {
      const target = event.target as HTMLElement | null;
      const actionElement = target?.closest<HTMLElement>('[data-retirement-action="remove"]');
      if (!actionElement) {
        return;
      }

      const allocationId = Number(actionElement.dataset.allocationId);
      if (!allocationId) {
        return;
      }

      app.removeRetirementAllocation(allocationId);
    });
  }
}

export function switchTab(tabName: TabId): void {
  const app = getAppShellDependencies();
  const tabs: TabId[] = ['accumulation', 'rsu', 'expenses', 'retirement', 'results', 'money-flow'];
  const activeTab = tabs.includes(tabName) ? tabName : 'accumulation';

  setActiveTab(activeTab);

  tabs.forEach(tab => {
    const tabButton = getElement(`tab-${tab}`);
    const tabContent = getElement(`content-${tab}`);

    if (tabButton && tabContent) {
      if (tab === activeTab) {
        tabButton.classList.add('active', 'border-blue-500', 'text-blue-600');
        tabButton.classList.remove('border-transparent', 'text-gray-500');
        tabContent.classList.remove('hidden');
      } else {
        tabButton.classList.remove('active', 'border-blue-500', 'text-blue-600');
        tabButton.classList.add('border-transparent', 'text-gray-500');
        tabContent.classList.add('hidden');
      }
    }
  });

  if (activeTab === 'rsu') {
    void app.onRsuTabActivated();
  }

  const sankeyManager = app.getSankeyManager();
  if (activeTab === 'money-flow' && sankeyManager) {
    setTimeout(() => {
      sankeyManager.refresh();
    }, 50);
  }
}
