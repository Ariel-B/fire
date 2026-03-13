/**
 * FIRE Planning Tool - Main Application Entry Point
 * 
 * This module initializes the application and provides the global API
 * that the HTML event handlers call into.
 */

import type { AppState, Currency, PortfolioAllocation, FirePlanInput } from './types/index.js';
import { getMoneySymbol } from './types/index.js';
import { formatCurrency } from './utils/formatter.js';
import { convertFromUSD } from './utils/currency.js';
import { getInputNumber, getInputValue, setTextContent, getElement, escapeHtml, setInputValue } from './utils/dom.js';
import { calculatePortfolioValue, calculatePortfolioCostBasis } from './services/calculator.js';
import { calculateFirePlanAPI, FirePlanApiError } from './api/fire-plan-api.js';
import {
  createCalculationOrchestrator,
  gatherInputData as gatherCalculationInput,
  showCalculationError as renderCalculationError
} from './calculation-orchestrator.js';
import { fetchAssetPrice, fetchAssetPriceResponse, fetchUsdIlsRate } from './api/assets-api.js';
import {
  convertPortfolioToChartData,
  updateDonutChart,
  updateMainChart,
  updateExpensesBarChart
} from './components/chart-manager.js';
import {
  createPortfolioAsset,
  renderPortfolioTable,
  updateAssetSymbol,
  handleAssetMethodChange,
  updateAssetField,
  updateAssetCurrency,
  updateAssetPrice,
  updateAssetCost,
  removeAssetFromPortfolio,
  fetchCAGRsForPortfolio,
  fetchMarketCapsForPortfolio,
  fetchPricesForPortfolio,
  type PortfolioType
} from './components/portfolio-table.js';
import {
  createExpense,
  renderExpenseTable,
  calculateExpenseTotals,
  removeExpenseFromList,
  updateExpenseField,
  updateExpenseAmount,
  updateExpenseCurrency
} from './components/expense-table.js';
import { createPortfolioCoordinator } from './orchestration/portfolio-coordinator.js';
import { createExpenseCoordinator } from './orchestration/expense-coordinator.js';
import { createRetirementCoordinator } from './orchestration/retirement-coordinator.js';
import { createResultsCoordinator } from './orchestration/results-coordinator.js';
import { createRsuCoordinator } from './orchestration/rsu-coordinator.js';
import { renderTable as renderRsuTable } from './components/rsu-table.js';
import { getRsuGrants, getRsuConfiguration, getRsuState, updateRsuConfiguration, setRsuIncludeInCalculations, calculateRsuTimeline, calculatePerGrantTimelines, calculateVestedShares, calculateSection102EligibleShares, calculateRsuSummary, calculateCanonicalMonthlyTimeline } from './services/rsu-state.js';
import { updateRsuValueChart, updateRsuSharesChart, updateRsuNestedDonutChart } from './components/rsu-chart.js';
import type { SankeyChartManager } from './components/sankey-chart.js';
import { configureAppShell, initializeApp, switchTab } from './app-shell.js';
import { createPlanPersistence } from './persistence/plan-persistence.js';
import { setRetirementAllocation, state } from './services/state.js';

export { initializeApp, switchTab };

// ============================================================================
// Application State
// ============================================================================

setRetirementAllocation([
  { id: 1, assetType: 'מניות ארה"ב', targetPercentage: 40, expectedAnnualReturn: 10, description: 'VOO/VTI' },
  { id: 2, assetType: 'מניות בינלאומיות', targetPercentage: 20, expectedAnnualReturn: 8, description: 'VXUS' },
  { id: 3, assetType: 'אג"ח', targetPercentage: 30, expectedAnnualReturn: 4, description: 'BND' },
  { id: 4, assetType: 'מזומן/קרן נאמנות', targetPercentage: 10, expectedAnnualReturn: 2, description: 'VMFXX' }
]);

// Initialize Sankey chart manager
let sankeyManager: SankeyChartManager | null = null;

export function getSankeyManager(): SankeyChartManager | null {
  return sankeyManager;
}

export function setSankeyManager(manager: SankeyChartManager | null): void {
  sankeyManager = manager;
}

// ============================================================================
// Utility Functions
// ============================================================================

function cloneFirePlanInput(input: FirePlanInput): FirePlanInput {
  return JSON.parse(JSON.stringify(input)) as FirePlanInput;
}

function getSelectedCurrency(): Currency {
  // Currency is selected via buttons, not a select element
  // Check which button has the active class
  const usdBtn = getElement('currencyUSD');
  const ilsBtn = getElement('currencyILS');
  
  if (ilsBtn?.classList.contains('active') || ilsBtn?.classList.contains('bg-blue-500')) {
    return '₪';
  }
  if (usdBtn?.classList.contains('active') || usdBtn?.classList.contains('bg-blue-500')) {
    return '$';
  }
  // If no button is marked active yet, fall back to state
  return state.displayCurrency;
}

export function applyDisplayCurrencyToUI(currency: Currency): void {
  const currencyUSD = getElement('currencyUSD');
  const currencyILS = getElement('currencyILS');

  if (currency === '₪') {
    currencyILS?.classList.add('bg-blue-500', 'text-white', 'active');
    currencyILS?.classList.remove('bg-white', 'text-gray-700');
    currencyUSD?.classList.remove('bg-blue-500', 'text-white', 'active');
    currencyUSD?.classList.add('bg-white', 'text-gray-700');
  } else {
    currencyUSD?.classList.add('bg-blue-500', 'text-white', 'active');
    currencyUSD?.classList.remove('bg-white', 'text-gray-700');
    currencyILS?.classList.remove('bg-blue-500', 'text-white', 'active');
    currencyILS?.classList.add('bg-white', 'text-gray-700');
  }

  const displayCurrencyMenuButtonLabel = getElement('displayCurrencyMenuButtonLabel');
  if (displayCurrencyMenuButtonLabel) {
    displayCurrencyMenuButtonLabel.textContent = currency;
  }
}

export function setDisplayCurrency(currency: Currency): void {
  state.displayCurrency = currency;
  applyDisplayCurrencyToUI(currency);
  updatePortfolioTables();
  updateExpenseTable();
  calculateAndUpdate();
}

function getCurrentBaseYear(): number {
  return new Date().getFullYear();
}

export function getEarlyRetirementYear(): number {
  const birthYear = getInputNumber('birthYear', 1990);
  const earlyRetirementAge = getInputNumber('earlyRetirementAge', 50);
  return birthYear + earlyRetirementAge;
}

function getInflationRate(): number {
  return getInputNumber('inflationRate', 2);
}

export function getUsdIlsRate(): number {
  return getInputNumber('usdIlsRate', 3.6);
}

function getTargetMonthlyExpenseCurrency(): Currency {
  const select = document.getElementById('targetMonthlyExpenseCurrency') as HTMLSelectElement | null;
  return (select?.value as Currency) || '₪';
}

// ============================================================================
// Portfolio Functions
// ============================================================================

const portfolioCoordinator = createPortfolioCoordinator({
  state,
  createPortfolioAsset,
  renderPortfolioTable,
  calculatePortfolioValue,
  calculatePortfolioCostBasis,
  setTextContent,
  getElement,
  formatCurrency,
  convertPortfolioToChartData,
  updateDonutChart,
  getUsdIlsRate,
  getEarlyRetirementYear,
  updateAssetSymbol,
  updateAssetField,
  updateAssetCurrency,
  updateAssetPrice,
  updateAssetCost,
  handleAssetMethodChange,
  removeAssetFromPortfolio,
  calculateAndUpdate
});

export const {
  addAccumulationRow,
  updatePortfolioTables,
  updatePortfolioSummary,
  updateAccumulationTabInfo,
  updatePortfolioAssetSymbol,
  updatePortfolioAsset,
  updatePortfolioAssetCurrency,
  updatePortfolioAssetPrice,
  updatePortfolioAssetCost,
  handleMethodChange,
  removePortfolioAsset,
  sortPortfolioTable
} = portfolioCoordinator;

export function updateCAGRManual(
  type: PortfolioType,
  id: number,
  value: number
): void {
  const portfolio = type === 'accumulation' ? state.accumulationPortfolio : [];
  const asset = portfolio.find(a => a.id === id);
  if (asset) {
    asset.value1 = value;
    asset.cagrSource = 'manual';
    updatePortfolioTables();
    calculateAndUpdate();
  }
}

const retirementCoordinator = createRetirementCoordinator({
  state,
  getElement,
  setTextContent,
  escapeHtml,
  updateDonutChart,
  getUsdIlsRate,
  getEarlyRetirementYear,
  calculateAndUpdate
});

export const {
  addRetirementAllocationRow,
  updateRetirementAllocationField,
  removeRetirementAllocation,
  updateRetirementAllocationTable,
  updateRetirementPortfolioCheckbox,
  onRetirementPortfolioCheckboxChange
} = retirementCoordinator;

// ============================================================================
// Expense Functions
// ============================================================================

const expenseCoordinator = createExpenseCoordinator({
  state,
  createExpense,
  renderExpenseTable,
  calculateExpenseTotals,
  getMoneySymbol,
  formatCurrency,
  getElement,
  updateExpensesBarChart,
  updateExpenseField,
  removeExpenseFromList,
  updateExpenseAmount,
  updateExpenseCurrency,
  getCurrentBaseYear,
  getInflationRate,
  calculateAndUpdate
});

export const {
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
} = expenseCoordinator;

// ============================================================================
// Calculation Functions
// ============================================================================

export function calculateAndUpdate(): void {
  calculationOrchestrator.calculateAndUpdate();
}

const rsuCoordinator = createRsuCoordinator({
  getElement,
  setTextContent,
  getRsuGrants,
  getRsuConfiguration,
  getRsuState,
  updateRsuConfiguration,
  setRsuIncludeInCalculations,
  calculateRsuSummary,
  fetchAssetPriceResponse,
  getEarlyRetirementYear,
  calculateAndUpdate
});

export const {
  updateRsuSummary,
  fetchRsuStockPrice,
  updateRsuUIFromState,
  setupEventListeners: setupRsuEventListeners,
  onTabActivated: onRsuTabActivated
} = rsuCoordinator;

const resultsCoordinator = createResultsCoordinator({
  state,
  convertFromUSD,
  formatCurrency,
  setTextContent,
  getElement,
  getUsdIlsRate,
  getEarlyRetirementYear,
  getInputNumber,
  getTargetMonthlyExpenseCurrency,
  convertPortfolioToChartData,
  updateDonutChart,
  updateMainChart,
  updateExpensesChart,
  getRsuGrants,
  calculateRsuTimeline,
  calculatePerGrantTimelines,
  calculateVestedShares,
  calculateSection102EligibleShares,
  getRsuConfiguration,
  updateRsuValueChart,
  updateRsuSharesChart,
  updateRsuNestedDonutChart,
  getSankeyManager
});

const { displayResults, updateCharts } = resultsCoordinator;

const calculationOrchestrator = createCalculationOrchestrator({
  state,
  gatherInputData: () => gatherCalculationInput({
    state,
    getEarlyRetirementYear,
    getTargetMonthlyExpenseCurrency,
    getUsdIlsRate
  }),
  cloneFirePlanInput,
  calculateFirePlanAPI,
  displayResults,
  updateCharts,
  showCalculationError: renderCalculationError,
  isFirePlanApiError: (error): error is FirePlanApiError => error instanceof FirePlanApiError,
  getFirePlanApiErrorMessage: (error) => error instanceof Error ? error.message : 'שגיאה בחישוב התוכנית',
  getFirePlanApiStatusCode: (error) => error instanceof FirePlanApiError ? error.statusCode : undefined
});

// ============================================================================
// Currency Functions
// ============================================================================

export function onCurrencyChange(): void {
  // Backwards-compatible: derive from UI buttons
  setDisplayCurrency(getSelectedCurrency());
}

/**
 * Fetch the current USD/ILS exchange rate from the API and update the UI.
 * This is called on app initialization and can be called to refresh the rate.
 */
export async function fetchAndUpdateExchangeRate(): Promise<void> {
  try {
    const rate = await fetchUsdIlsRate();
    
    // Update the input field with the fetched rate
    setInputValue('usdIlsRate', rate.toFixed(2));
    
    // Update the range slider if it exists
    const rangeInput = getElement<HTMLInputElement>('usdIlsRateRange');
    if (rangeInput) {
      rangeInput.value = rate.toFixed(2);
    }
    
    // Update state
    state.exchangeRates = {
      usdToIls: rate,
      ilsToUsd: 1 / rate
    };
    
    // Update UI
    updatePortfolioTables();
    updateExpenseTable();
    calculateAndUpdate();
  } catch (error) {
    console.error('Failed to fetch exchange rate from API:', error);
    // Keep using the default/current rate
  }
}

export async function updateExchangeRate(): Promise<void> {
  const rate = getUsdIlsRate();
  state.exchangeRates = {
    usdToIls: rate,
    ilsToUsd: 1 / rate
  };
  updatePortfolioTables();
  updateExpenseTable();
  calculateAndUpdate();
}

const persistence = createPlanPersistence({
  state,
  buildCalculationInput: () => gatherCalculationInput({
    state,
    getEarlyRetirementYear,
    getTargetMonthlyExpenseCurrency,
    getUsdIlsRate
  }),
  getExportInputSnapshot: () => calculationOrchestrator.getExportInputSnapshot(),
  applyDisplayCurrencyToUI,
  fetchAndUpdateExchangeRate,
  updateRetirementPortfolioCheckbox,
  updatePortfolioTables,
  updateRetirementAllocationTable,
  updateExpenseTable,
  renderRsuTable,
  updateRsuSummary,
  updateRsuUIFromState,
  fetchRsuStockPrice,
  calculateAndUpdate,
  afterRestoreActiveTab: (activeTabId) => {
    if (activeTabId === 'money-flow') {
      setTimeout(() => {
        sankeyManager?.refresh();
      }, 100);
    }
  }
});

export const {
  savePlan,
  savePlanAs,
  loadPlan,
  loadPlanFromData,
  exportPlanToExcel
} = persistence;

// App bootstrap wiring lives in app-shell.ts.

configureAppShell({
  state,
  applyDisplayCurrencyToUI,
  getUsdIlsRate,
  fetchAndUpdateExchangeRate,
  updateRetirementPortfolioCheckbox,
  updateRetirementAllocationTable,
  updateRsuSummary,
  calculateAndUpdate,
  updateRsuUIFromState,
  setupRsuEventListeners,
  onRsuTabActivated,
  getEarlyRetirementYear,
  getSankeyManager,
  setSankeyManager,
  setDisplayCurrency,
  updateExchangeRate,
  onRetirementPortfolioCheckboxChange,
  savePlan,
  savePlanAs,
  loadPlan,
  exportPlanToExcel,
  sortPortfolioTable,
  sortExpensesTable,
  addAccumulationRow,
  addExpense,
  addRetirementAllocationRow,
  updatePortfolioAssetSymbol,
  updatePortfolioAsset,
  updatePortfolioAssetCurrency,
  updatePortfolioAssetPrice,
  handleMethodChange,
  updateCAGRManual,
  updatePortfolioAssetCost,
  removePortfolioAsset,
  updateExpenseCurrencyField,
  updateExpenseAmountField,
  updateExpense,
  removeExpense,
  updateRetirementAllocationField,
  removeRetirementAllocation
});

// ============================================================================
// Public Compatibility API
// ============================================================================

export function getState(): AppState {
  return state;
}

const publicFireAppAPI = {
  calculateAndUpdate,
  exportPlanToExcel,
  savePlan,
  savePlanAs,
  loadPlan,
  loadPlanFromData,
  switchTab
};

const fireAppModuleAPI = {
  // Internal/testing facade across portfolio, expenses, retirement, persistence, currency, and tabs
  addAccumulationRow,
  updatePortfolioAssetSymbol,
  updatePortfolioAsset,
  updatePortfolioAssetCurrency,
  updatePortfolioAssetPrice,
  updatePortfolioAssetCost,
  handleMethodChange,
  updateCAGRManual,
  removePortfolioAsset,
  sortPortfolioTable,
  
  // Expense functions
  addExpense,
  updateExpense,
  updateExpenseAmount: updateExpenseAmountField,
  updateExpenseCurrency: updateExpenseCurrencyField,
  removeExpense,
  sortExpensesTable,
  
  // Retirement allocation functions
  addRetirementAllocationRow,
  updateRetirementAllocationField,
  removeRetirementAllocation,
  
  // Calculation
  calculateAndUpdate,
  
  // File operations
  exportPlanToExcel,
  savePlan,
  savePlanAs,
  loadPlan,
  loadPlanFromData,
  
  // Currency
  onCurrencyChange,
  updateExchangeRate,
  fetchAndUpdateExchangeRate,
  
  // Tab navigation
  switchTab,
  
  // State access (tests/internal diagnostics)
  getState
};

declare global {
  interface Window {
    fireApp: typeof publicFireAppAPI;
  }
}

// Make API available globally
if (typeof window !== 'undefined') {
  window.fireApp = publicFireAppAPI;
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
  } else {
    initializeApp();
  }
}

export { publicFireAppAPI };
export default fireAppModuleAPI;
