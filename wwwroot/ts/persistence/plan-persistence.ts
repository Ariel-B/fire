import type {
  Currency,
  FireCalculationResult,
  FirePlanInput,
  PlannedExpense,
  PortfolioAllocation,
  PortfolioAsset,
  TabId
} from '../types/index.js';
import { Money } from '../types/index.js';
import { getElement, setInputValue } from '../utils/dom.js';
import { exportToExcel } from '../api/export-api.js';
import { decryptPlan, encryptPlan, isEncryptedPlan } from '../crypto/plan-crypto.js';
import {
  createPortfolioAsset,
  fetchCAGRsForPortfolio,
  fetchMarketCapsForPortfolio,
  fetchPricesForPortfolio
} from '../components/portfolio-table.js';
import { promptPassword } from '../components/password-dialog.js';
import { loadRsuFromFileData, setRsuIncludeInCalculations } from '../services/rsu-state.js';
import { switchTab } from '../app-shell.js';

type SaveFilePickerFn = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemFileHandle>;

interface FileSystemWritableFileStream {
  write: (data: string | Blob) => Promise<void>;
  close: () => Promise<void>;
}

export interface FileSystemFileHandle {
  createWritable: () => Promise<FileSystemWritableFileStream>;
  getFile: () => Promise<File>;
  name: string;
}

type FileSystemAccessWindow = Window & typeof globalThis & {
  showSaveFilePicker?: SaveFilePickerFn;
  showOpenFilePicker?: (options?: {
    types?: { description: string; accept: Record<string, string[]> }[];
    multiple?: boolean;
  }) => Promise<FileSystemFileHandle[]>;
};

type PersistenceState = {
  accumulationPortfolio: PortfolioAsset[];
  retirementAllocation: PortfolioAllocation[];
  expenses: PlannedExpense[];
  displayCurrency: Currency;
  lastCalculationResult: FireCalculationResult | null;
  useRetirementPortfolio: boolean;
  currentFileHandle: FileSystemFileHandle | null;
  currentFileName: string | null;
};

type PlanPersistenceDependencies = {
  state: PersistenceState;
  buildCalculationInput: () => FirePlanInput;
  getExportInputSnapshot: () => Promise<FirePlanInput | null>;
  applyDisplayCurrencyToUI: (currency: Currency) => void;
  fetchAndUpdateExchangeRate: () => Promise<void>;
  updateRetirementPortfolioCheckbox: () => void;
  updatePortfolioTables: () => void;
  updateRetirementAllocationTable: () => void;
  updateExpenseTable: () => void;
  renderRsuTable: () => void;
  updateRsuSummary: () => void;
  updateRsuUIFromState: () => void;
  fetchRsuStockPrice: (symbol: string) => Promise<void>;
  calculateAndUpdate: () => Promise<void> | void;
  afterRestoreActiveTab?: (activeTabId: TabId) => void;
};

function extractAmount(value: unknown): number {
  if (value && typeof value === 'object' && 'amount' in value) {
    return Number((value as { amount?: unknown }).amount) || 0;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value.replace(/,/g, '')) || 0;
  }
  return 0;
}

function extractCurrencySymbol(value: unknown, fallback: Currency = '₪'): Currency {
  if (value && typeof value === 'object' && 'currency' in value) {
    const currency = (value as { currency?: unknown }).currency;
    if (currency === 'USD' || currency === '$') return '$';
    if (currency === 'ILS' || currency === '₪') return '₪';
  }
  return fallback;
}

function toCurrency(currencyValue: string | Currency | undefined): Currency {
  if (!currencyValue) return '$';
  if (currencyValue === 'USD' || currencyValue === '$') return '$';
  if (currencyValue === 'ILS' || currencyValue === '₪') return '₪';
  return '$';
}

function supportsNativeSavePicker(): boolean {
  return typeof window !== 'undefined' && typeof (window as FileSystemAccessWindow).showSaveFilePicker === 'function';
}

async function saveWithFilePicker(jsonString: string, fileName: string): Promise<FileSystemFileHandle> {
  const filePickerWindow = window as FileSystemAccessWindow;
  if (!filePickerWindow.showSaveFilePicker) {
    throw new Error('File System Access API is not available');
  }

  const fileHandle = await filePickerWindow.showSaveFilePicker({
    suggestedName: fileName,
    types: [
      {
        description: 'FIRE Plan JSON',
        accept: {
          'application/json': ['.json']
        }
      }
    ]
  });

  const writable = await fileHandle.createWritable();
  await writable.write(jsonString);
  await writable.close();

  return fileHandle;
}

async function saveToFileHandle(fileHandle: FileSystemFileHandle, jsonString: string): Promise<void> {
  const writable = await fileHandle.createWritable();
  await writable.write(jsonString);
  await writable.close();
}

function triggerDownloadFallback(jsonString: string, fileName: string): void {
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  const parent = document.body ?? document.documentElement;
  if (!parent) {
    URL.revokeObjectURL(url);
    return;
  }
  parent.appendChild(anchor);
  anchor.click();
  parent.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function normalizeMarketCapFromFile(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.\-]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

interface RawAssetWithLegacyFields extends Partial<PortfolioAsset> {
  averageCostPerShare?: number;
  averageCostCurrency?: string | Currency;
  currentPriceCurrency?: string | Currency;
}

export function normalizeExpensesFromFile(rawExpenses: unknown): PlannedExpense[] {
  if (!Array.isArray(rawExpenses)) {
    return [];
  }

  return rawExpenses.map((rawExpense: any) => {
    let netAmount: Money;
    if (rawExpense.netAmount && typeof rawExpense.netAmount === 'object' && 'amount' in rawExpense.netAmount) {
      const currency = toCurrency(rawExpense.netAmount.currency);
      netAmount = Money.create(rawExpense.netAmount.amount || 0, currency);
    } else if (typeof rawExpense.netAmount === 'number') {
      netAmount = Money.create(rawExpense.netAmount, toCurrency(rawExpense.currency));
    } else if (rawExpense.amount) {
      if (typeof rawExpense.amount === 'object' && 'amount' in rawExpense.amount) {
        netAmount = Money.create(rawExpense.amount.amount || 0, toCurrency(rawExpense.amount.currency));
      } else if (typeof rawExpense.amount === 'number') {
        netAmount = Money.create(rawExpense.amount, toCurrency(rawExpense.currency));
      } else {
        netAmount = Money.usd(0);
      }
    } else {
      netAmount = Money.usd(0);
    }

    return {
      id: rawExpense.id || Date.now(),
      type: rawExpense.type || '',
      netAmount,
      year: rawExpense.year || rawExpense.startYear || new Date().getFullYear(),
      frequencyYears: rawExpense.frequencyYears || 1,
      repetitionCount: rawExpense.repetitionCount || 1
    };
  });
}

export function normalizePortfolioAssetsFromFile(rawAssets: unknown): PortfolioAsset[] {
  if (!Array.isArray(rawAssets)) {
    return [];
  }

  return rawAssets.map((rawAsset) => {
    const asset = rawAsset as RawAssetWithLegacyFields;
    const template = createPortfolioAsset(typeof asset.id === 'number' ? asset.id : undefined);
    const normalizedMarketCap = normalizeMarketCapFromFile(asset.marketCapUsd);

    let currentPrice: Money;
    if (asset.currentPrice && typeof asset.currentPrice === 'object' && 'amount' in asset.currentPrice) {
      currentPrice = Money.create(asset.currentPrice.amount || 0, toCurrency(asset.currentPrice.currency));
    } else if (typeof asset.currentPrice === 'number') {
      currentPrice = Money.create(asset.currentPrice, toCurrency(asset.currentPriceCurrency));
    } else {
      currentPrice = template.currentPrice;
    }

    let averageCost: Money;
    if (asset.averageCost && typeof asset.averageCost === 'object' && 'amount' in asset.averageCost) {
      averageCost = Money.create(asset.averageCost.amount || 0, toCurrency(asset.averageCost.currency));
    } else if (typeof asset.averageCostPerShare === 'number') {
      averageCost = Money.create(asset.averageCostPerShare, toCurrency(asset.averageCostCurrency));
    } else {
      averageCost = template.averageCost;
    }

    const {
      currentPrice: _currentPrice,
      averageCost: _averageCost,
      averageCostPerShare: _averageCostPerShare,
      averageCostCurrency: _averageCostCurrency,
      currentPriceCurrency: _currentPriceCurrency,
      ...assetWithoutMoneyFields
    } = asset;

    return {
      ...template,
      ...assetWithoutMoneyFields,
      id: typeof asset.id === 'number' ? asset.id : template.id,
      currentPrice,
      averageCost,
      marketCapUsd: normalizedMarketCap,
      priceSource: asset.priceSource ?? template.priceSource,
      historicalCAGRs: asset.historicalCAGRs ?? {},
      cagrSource: asset.cagrSource ?? 'manual',
      loadingCAGR: false
    } as PortfolioAsset;
  });
}

export function showExportOptionsModal(): Promise<{ scenarioName: string; scenarioNotes?: string } | null> {
  return new Promise((resolve) => {
    const modal = getElement('exportOptionsModal');
    const nameInput = getElement<HTMLInputElement>('exportScenarioName');
    const notesInput = getElement<HTMLTextAreaElement>('exportScenarioNotes');
    const confirmBtn = getElement('exportModalConfirm');
    const cancelBtn = getElement('exportModalCancel');

    if (!modal || !nameInput || !notesInput || !confirmBtn || !cancelBtn) {
      const missingElements = [
        !modal && 'exportOptionsModal',
        !nameInput && 'exportScenarioName',
        !notesInput && 'exportScenarioNotes',
        !confirmBtn && 'exportModalConfirm',
        !cancelBtn && 'exportModalCancel'
      ].filter(Boolean);
      console.error('Export modal elements not found:', missingElements.join(', '));
      resolve(null);
      return;
    }

    nameInput.value = 'FIRE Plan';
    notesInput.value = '';
    modal.classList.remove('hidden');
    nameInput.focus();
    nameInput.select();

    const cleanup = () => {
      modal.classList.add('hidden');
      confirmBtn.removeEventListener('click', handleConfirm);
      cancelBtn.removeEventListener('click', handleCancel);
      document.removeEventListener('keydown', handleEscape);
      nameInput.classList.remove('border-red-500');
    };

    const handleConfirm = () => {
      const scenarioName = nameInput.value.trim();
      if (!scenarioName) {
        nameInput.classList.add('border-red-500');
        nameInput.focus();
        return;
      }

      const scenarioNotes = notesInput.value.trim() || undefined;
      cleanup();
      resolve({ scenarioName, scenarioNotes });
    };

    const handleCancel = () => {
      cleanup();
      resolve(null);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleCancel();
      } else if (event.key === 'Enter' && event.target === nameInput) {
        handleConfirm();
      }
    };

    confirmBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
    document.addEventListener('keydown', handleEscape);
  });
}

export function createPlanPersistence(dependencies: PlanPersistenceDependencies) {
  const { state } = dependencies;

  const buildPlanData = () => ({
    ...dependencies.buildCalculationInput(),
    displayCurrency: state.displayCurrency,
    savedAt: new Date().toISOString(),
    version: '2.0'
  });

  const buildEncryptedFileName = () => `fire-plan-${new Date().toISOString().slice(0, 10)}.enc.json`;

  async function buildEncryptedPlanPayload(): Promise<{ fileName: string; jsonString: string } | null> {
    const password = await promptPassword('encrypt');
    if (password === null) {
      return null;
    }

    const jsonString = JSON.stringify(buildPlanData(), null, 2);
    const encryptedEnvelope = await encryptPlan(jsonString, password);

    return {
      fileName: buildEncryptedFileName(),
      jsonString: JSON.stringify(encryptedEnvelope, null, 2)
    };
  }

  function isOperationError(error: unknown): boolean {
    return typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      (error as { name?: unknown }).name === 'OperationError';
  }

  async function parseLoadedPlan(text: string): Promise<unknown | null> {
    const rawData = JSON.parse(text);
    if (!isEncryptedPlan(rawData)) {
      return rawData;
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const password = await promptPassword('decrypt');
      if (password === null) {
        return null;
      }

      try {
        const decrypted = await decryptPlan(rawData, password);
        return JSON.parse(decrypted);
      } catch (error) {
        if (isOperationError(error)) {
          alert('סיסמה שגויה');
          continue;
        }

        throw error;
      }
    }

    return null;
  }

  async function savePlan(): Promise<void> {
    try {
      if (state.currentFileHandle && supportsNativeSavePicker()) {
        const encryptedPayload = await buildEncryptedPlanPayload();
        if (!encryptedPayload) {
          return;
        }

        await saveToFileHandle(state.currentFileHandle, encryptedPayload.jsonString);
      } else {
        await savePlanAs();
      }
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('שגיאה בשמירת התוכנית');
    }
  }

  async function savePlanAs(): Promise<void> {
    try {
      const encryptedPayload = await buildEncryptedPlanPayload();
      if (!encryptedPayload) {
        return;
      }

      if (supportsNativeSavePicker()) {
        const fileHandle = await saveWithFilePicker(encryptedPayload.jsonString, encryptedPayload.fileName);
        state.currentFileHandle = fileHandle;
        state.currentFileName = fileHandle.name;
      } else {
        triggerDownloadFallback(encryptedPayload.jsonString, encryptedPayload.fileName);
      }
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('שגיאה בשמירת התוכנית');
    }
  }

  async function loadPlan(): Promise<void> {
    try {
      if (supportsNativeSavePicker()) {
        const filePickerWindow = window as FileSystemAccessWindow;
        if (filePickerWindow.showOpenFilePicker) {
          const [fileHandle] = await filePickerWindow.showOpenFilePicker({
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] }
              }
            ],
            multiple: false
          });

          const file = await fileHandle.getFile();
          state.currentFileHandle = fileHandle;
          state.currentFileName = file.name;
          await processLoadedFile(file);
          return;
        }
      }
    } catch (error) {
      // User cancelled or the native picker failed. Fall through to input-based load.
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;

      state.currentFileHandle = null;
      state.currentFileName = file.name;
      await processLoadedFile(file);
    };

    input.click();
  }

  async function processLoadedFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      const rawData = await parseLoadedPlan(text);
      if (rawData === null) {
        return;
      }

      await loadPlanFromData(rawData);
    } catch (error) {
      console.error('Failed to load plan:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`שגיאה בטעינת התוכנית: ${errorMessage}`);
    }
  }

  // Strip keys that can pollute the prototype chain when spread into a plain object.
  function stripDangerousKeys(obj: Record<string, unknown>): Record<string, unknown> {
    const dangerous = new Set(['__proto__', 'constructor', 'prototype']);
    return Object.fromEntries(Object.entries(obj).filter(([k]) => !dangerous.has(k)));
  }

  async function loadPlanFromData(rawData: unknown): Promise<void> {
    const parsedData = stripDangerousKeys((rawData ?? {}) as Record<string, unknown>) as Record<string, any>;
    const parseYear = (value: unknown): number | undefined => {
      if (value === undefined || value === null) {
        return undefined;
      }

      const parsedYear = Number.parseInt(String(value), 10);
      return Number.isInteger(parsedYear) ? parsedYear : undefined;
    };

    const planData = parsedData.inputs
      ? { ...stripDangerousKeys(parsedData.inputs), ...parsedData }
      : parsedData;
    const rawPortfolioData = planData.accumulationPortfolio ?? planData.portfolio ?? [];
    state.accumulationPortfolio = normalizePortfolioAssetsFromFile(rawPortfolioData);

    if (planData.retirementAllocation) {
      state.retirementAllocation = planData.retirementAllocation;
    }

    const rawExpenses = planData.expenses || planData.plannedExpenses || [];
    state.expenses = normalizeExpensesFromFile(rawExpenses);

    if (typeof planData.useRetirementPortfolio === 'boolean') {
      state.useRetirementPortfolio = planData.useRetirementPortfolio;
    } else {
      const hasCustomRetirementData = state.retirementAllocation &&
        state.retirementAllocation.length > 0 &&
        (planData.retirementAllocation || planData.retirementPortfolio);
      state.useRetirementPortfolio = !!hasCustomRetirementData;
    }

    dependencies.updateRetirementPortfolioCheckbox();

    if (planData.birthDate) {
      setInputValue('birthDate', planData.birthDate);
      const birthYear = new Date(planData.birthDate).getFullYear();
      setInputValue('birthYear', birthYear);
    } else if (planData.birthYear) {
      setInputValue('birthYear', planData.birthYear);
      setInputValue('birthDate', `${planData.birthYear}-01-01`);
    }

    if (planData.earlyRetirementYear) {
      let loadedBirthYear = parseYear(planData.birthYear);

      if (loadedBirthYear === undefined && planData.birthDate) {
        const birthDate = new Date(planData.birthDate);
        if (!isNaN(birthDate.getTime())) {
          loadedBirthYear = birthDate.getFullYear();
        }
      }

      if (loadedBirthYear !== undefined) {
        const loadedEarlyRetirementYear = parseYear(planData.earlyRetirementYear);
        if (loadedEarlyRetirementYear !== undefined) {
          setInputValue('earlyRetirementAge', Math.max(0, loadedEarlyRetirementYear - loadedBirthYear));
        }
      }
    }

    if (planData.fullRetirementAge) setInputValue('fullRetirementAge', planData.fullRetirementAge);
    if (planData.monthlyContribution !== undefined) {
      setInputValue('monthlyContribution', extractAmount(planData.monthlyContribution));
      if (planData.monthlyContribution && typeof planData.monthlyContribution === 'object' && 'currency' in planData.monthlyContribution) {
        setInputValue('monthlyContributionCurrency', extractCurrencySymbol(planData.monthlyContribution));
      } else if (planData.monthlyContributionCurrency) {
        setInputValue('monthlyContributionCurrency', planData.monthlyContributionCurrency);
      }
    }

    if (planData.withdrawalRate) setInputValue('withdrawalRate', planData.withdrawalRate);
    if (planData.inflationRate) setInputValue('inflationRate', planData.inflationRate);
    if (planData.capitalGainsTax) setInputValue('capitalGainsTax', planData.capitalGainsTax);

    const adjustContributionsCheckbox = getElement<HTMLInputElement>('adjustContributionsForInflation');
    if (adjustContributionsCheckbox) {
      adjustContributionsCheckbox.checked = !!planData.adjustContributionsForInflation;
    }

    const pensionValue = planData.pensionNetMonthly ?? planData.pensionNetMonthlyAmount;
    if (pensionValue !== undefined) {
      setInputValue('pensionNetMonthlyAmount', extractAmount(pensionValue));
      if (pensionValue && typeof pensionValue === 'object' && 'currency' in pensionValue) {
        setInputValue('pensionCurrency', extractCurrencySymbol(pensionValue));
      } else if (planData.pensionCurrency) {
        setInputValue('pensionCurrency', planData.pensionCurrency);
      }
    }

    if (planData.targetMonthlyExpense !== undefined) {
      setInputValue('targetMonthlyExpense', extractAmount(planData.targetMonthlyExpense));
      if (planData.targetMonthlyExpense && typeof planData.targetMonthlyExpense === 'object' && 'currency' in planData.targetMonthlyExpense) {
        setInputValue('targetMonthlyExpenseCurrency', extractCurrencySymbol(planData.targetMonthlyExpense));
      } else if (planData.targetMonthlyExpenseCurrency) {
        setInputValue('targetMonthlyExpenseCurrency', planData.targetMonthlyExpenseCurrency);
      }
    }

    if (planData.displayCurrency || planData.currency) {
      state.displayCurrency = (planData.displayCurrency || planData.currency) as Currency;
      dependencies.applyDisplayCurrencyToUI(state.displayCurrency);
    }

    await dependencies.fetchAndUpdateExchangeRate();

    if (planData.rsuConfiguration) {
      loadRsuFromFileData({
        rsuConfiguration: planData.rsuConfiguration,
        rsuIncludeInCalculations: planData.includeRsuInCalculations
      });
      dependencies.updateRsuUIFromState();
      if (planData.rsuConfiguration.stockSymbol) {
        void dependencies.fetchRsuStockPrice(planData.rsuConfiguration.stockSymbol);
      }
    } else if (typeof planData.includeRsuInCalculations === 'boolean') {
      setRsuIncludeInCalculations(planData.includeRsuInCalculations);
      dependencies.updateRsuUIFromState();
    }

    const activeTabButton = document.querySelector('.tab-button.active');
    const activeTabId = (activeTabButton?.id?.replace('tab-', '') as TabId | undefined) || 'accumulation';

    await fetchPricesForPortfolio(state.accumulationPortfolio);
    await fetchCAGRsForPortfolio(state.accumulationPortfolio);
    await fetchMarketCapsForPortfolio(state.accumulationPortfolio);

    dependencies.updatePortfolioTables();
    dependencies.updateRetirementAllocationTable();
    dependencies.updateExpenseTable();
    dependencies.renderRsuTable();
    dependencies.updateRsuSummary();
    await dependencies.calculateAndUpdate();

    switchTab(activeTabId);
    dependencies.afterRestoreActiveTab?.(activeTabId);
  }

  async function exportPlanToExcel(): Promise<void> {
    try {
      const input = await dependencies.getExportInputSnapshot();
      if (!input || !state.lastCalculationResult) {
        alert('אין תוצאות חישוב לייצוא. אנא בצע חישוב תחילה.');
        return;
      }

      const modalResult = await showExportOptionsModal();
      if (!modalResult) {
        return;
      }

      const { scenarioName, scenarioNotes } = modalResult;
      const exportBtn = getElement('exportToExcel');
      if (exportBtn) {
        const originalHtml = exportBtn.innerHTML;
        exportBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>';
        exportBtn.setAttribute('disabled', 'true');

        try {
          await exportToExcel(input, {
            scenarioName,
            scenarioNotes,
            usdIlsRate: input.usdIlsRate
          });
        } finally {
          exportBtn.innerHTML = originalHtml;
          exportBtn.removeAttribute('disabled');
        }
      }
    } catch (error) {
      console.error('Failed to export to Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`שגיאה בייצוא ל-Excel: ${errorMessage}`);

      const exportBtn = getElement('exportToExcel');
      if (exportBtn && exportBtn.hasAttribute('disabled')) {
        exportBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>';
        exportBtn.removeAttribute('disabled');
      }
    }
  }

  return {
    savePlan,
    savePlanAs,
    loadPlan,
    processLoadedFile,
    loadPlanFromData,
    exportPlanToExcel
  };
}
