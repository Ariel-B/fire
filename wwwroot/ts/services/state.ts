/**
 * Canonical frontend app state store.
 *
 * The runtime facade in app.ts imports this singleton state object directly,
 * while tests and future modules can use the helpers below to mutate it safely.
 */

import type {
  AppState,
  PortfolioAsset,
  PortfolioAllocation,
  PlannedExpense,
  Currency,
  TabId,
  StateChangeCallback
} from '../types/index.js';

function createDefaultAppState(): AppState {
  return {
    accumulationPortfolio: [],
    retirementAllocation: [],
    expenses: [],
    exchangeRates: { usdToIls: 3.6, ilsToUsd: 1 / 3.6 },
    displayCurrency: '₪',
    activeTab: 'accumulation',
    lastCalculationResult: null,
    lastSuccessfulCalculationInput: null,
    useRetirementPortfolio: false,
    currentFileHandle: null,
    currentFileName: null
  };
}

export const state: AppState = createDefaultAppState();
const listeners: Set<StateChangeCallback> = new Set();

function notifyListeners(): void {
  listeners.forEach(callback => callback(state));
}

function replaceState(partialState: Partial<AppState>): void {
  Object.assign(state, partialState);
  notifyListeners();
}

function cloneArray<T>(items: T[]): T[] {
  return [...items];
}

function getNextId(items: Array<{ id?: number }>): number {
  return items.reduce((maxId, item) => Math.max(maxId, item.id ?? 0), 0) + 1;
}

export function getState(): Readonly<AppState> {
  return state;
}

export function subscribe(callback: StateChangeCallback): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function resetState(): void {
  Object.assign(state, createDefaultAppState());
  notifyListeners();
}

export function setAccumulationPortfolio(portfolio: PortfolioAsset[]): void {
  replaceState({ accumulationPortfolio: cloneArray(portfolio) });
}

export function addAccumulationAsset(asset: Omit<PortfolioAsset, 'id'>): PortfolioAsset {
  const newAsset: PortfolioAsset = { ...asset, id: getNextId(state.accumulationPortfolio) };
  replaceState({
    accumulationPortfolio: [...state.accumulationPortfolio, newAsset]
  });
  return newAsset;
}

export function updateAccumulationAsset(id: number, updates: Partial<PortfolioAsset>): void {
  replaceState({
    accumulationPortfolio: state.accumulationPortfolio.map(asset =>
      asset.id === id ? { ...asset, ...updates } : asset
    )
  });
}

export function removeAccumulationAsset(id: number): void {
  replaceState({
    accumulationPortfolio: state.accumulationPortfolio.filter(asset => asset.id !== id)
  });
}

export function setRetirementAllocation(allocations: PortfolioAllocation[]): void {
  replaceState({ retirementAllocation: cloneArray(allocations) });
}

export function addRetirementAllocation(allocation: Omit<PortfolioAllocation, 'id'>): PortfolioAllocation {
  const newAllocation: PortfolioAllocation = { ...allocation, id: getNextId(state.retirementAllocation) };
  replaceState({
    retirementAllocation: [...state.retirementAllocation, newAllocation]
  });
  return newAllocation;
}

export function updateRetirementAllocation(id: number, updates: Partial<PortfolioAllocation>): void {
  replaceState({
    retirementAllocation: state.retirementAllocation.map(allocation =>
      allocation.id === id ? { ...allocation, ...updates } : allocation
    )
  });
}

export function removeRetirementAllocation(id: number): void {
  replaceState({
    retirementAllocation: state.retirementAllocation.filter(allocation => allocation.id !== id)
  });
}

export function setExpenses(expenses: PlannedExpense[]): void {
  replaceState({ expenses: cloneArray(expenses) });
}

export function addExpense(expense: Omit<PlannedExpense, 'id'>): PlannedExpense {
  const newExpense: PlannedExpense = { ...expense, id: getNextId(state.expenses) };
  replaceState({
    expenses: [...state.expenses, newExpense]
  });
  return newExpense;
}

export function updateExpense(id: number, updates: Partial<PlannedExpense>): void {
  replaceState({
    expenses: state.expenses.map(expense =>
      expense.id === id ? { ...expense, ...updates } : expense
    )
  });
}

export function removeExpense(id: number): void {
  replaceState({
    expenses: state.expenses.filter(expense => expense.id !== id)
  });
}

export function setDisplayCurrency(currency: Currency): void {
  replaceState({ displayCurrency: currency });
}

export function setActiveTab(tab: TabId): void {
  replaceState({ activeTab: tab });
}

export function loadState(newState: Partial<AppState>): void {
  replaceState(newState);
}
