/**
 * State Management Unit Tests
 * Tests for the canonical frontend app state store
 */

import {
  getState,
  subscribe,
  resetState,
  setAccumulationPortfolio,
  addAccumulationAsset,
  updateAccumulationAsset,
  removeAccumulationAsset,
  setRetirementAllocation,
  addRetirementAllocation,
  updateRetirementAllocation,
  removeRetirementAllocation,
  setExpenses,
  addExpense,
  updateExpense,
  removeExpense,
  setDisplayCurrency,
  setActiveTab,
  loadState
} from '../../../js/services/state.js';

describe('State Management', () => {
  beforeEach(() => {
    resetState();
  });

  describe('getState', () => {
    test('returns runtime defaults used by the app facade', () => {
      const state = getState();

      expect(state.accumulationPortfolio).toEqual([]);
      expect(state.retirementAllocation).toEqual([]);
      expect(state.expenses).toEqual([]);
      expect(state.exchangeRates).toEqual({ usdToIls: 3.6, ilsToUsd: 1 / 3.6 });
      expect(state.displayCurrency).toBe('₪');
      expect(state.activeTab).toBe('accumulation');
      expect(state.lastCalculationResult).toBeNull();
      expect(state.lastSuccessfulCalculationInput).toBeNull();
      expect(state.useRetirementPortfolio).toBe(false);
      expect(state.currentFileHandle).toBeNull();
      expect(state.currentFileName).toBeNull();
    });

    test('does not expose stale legacy-only state fields', () => {
      const state = getState();

      expect(state.retirementPortfolio).toBeUndefined();
      expect(state.currentSort).toBeUndefined();
      expect(state.nextAssetId).toBeUndefined();
      expect(state.nextExpenseId).toBeUndefined();
      expect(state.nextAllocationId).toBeUndefined();
    });
  });

  describe('subscribe', () => {
    test('notifies subscribers when state changes', () => {
      const callback = jest.fn();
      const unsubscribe = subscribe(callback);

      setDisplayCurrency('$');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(expect.objectContaining({
        displayCurrency: '$'
      }));

      unsubscribe();
    });

    test('unsubscribe stops future notifications', () => {
      const callback = jest.fn();
      const unsubscribe = subscribe(callback);

      unsubscribe();
      setDisplayCurrency('$');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('resetState', () => {
    test('restores runtime defaults after state changes', () => {
      loadState({
        displayCurrency: '$',
        activeTab: 'money-flow',
        exchangeRates: { usdToIls: 4.2, ilsToUsd: 1 / 4.2 },
        currentFileName: 'saved-plan.json',
        useRetirementPortfolio: true
      });

      resetState();

      expect(getState()).toEqual(expect.objectContaining({
        exchangeRates: { usdToIls: 3.6, ilsToUsd: 1 / 3.6 },
        displayCurrency: '₪',
        activeTab: 'accumulation',
        currentFileName: null,
        useRetirementPortfolio: false
      }));
    });
  });

  describe('Accumulation Portfolio', () => {
    test('addAccumulationAsset derives the next id from current state', () => {
      loadState({
        accumulationPortfolio: [{ id: 5, symbol: 'AAPL' }]
      });

      const asset = addAccumulationAsset({ symbol: 'MSFT', quantity: 10 });

      expect(asset.id).toBe(6);
      expect(getState().accumulationPortfolio).toHaveLength(2);
    });

    test('setAccumulationPortfolio stores a defensive copy', () => {
      const original = [{ id: 1, symbol: 'AAPL' }];

      setAccumulationPortfolio(original);
      original.push({ id: 2, symbol: 'MSFT' });

      expect(getState().accumulationPortfolio).toEqual([{ id: 1, symbol: 'AAPL' }]);
    });

    test('updateAccumulationAsset updates only the targeted asset', () => {
      addAccumulationAsset({ symbol: 'AAPL', quantity: 10 });
      addAccumulationAsset({ symbol: 'MSFT', quantity: 5 });

      updateAccumulationAsset(1, { quantity: 20 });

      expect(getState().accumulationPortfolio).toEqual([
        expect.objectContaining({ id: 1, symbol: 'AAPL', quantity: 20 }),
        expect.objectContaining({ id: 2, symbol: 'MSFT', quantity: 5 })
      ]);
    });

    test('removeAccumulationAsset removes the targeted asset', () => {
      addAccumulationAsset({ symbol: 'AAPL' });
      addAccumulationAsset({ symbol: 'MSFT' });

      removeAccumulationAsset(1);

      expect(getState().accumulationPortfolio).toEqual([
        expect.objectContaining({ id: 2, symbol: 'MSFT' })
      ]);
    });
  });

  describe('Retirement Allocation', () => {
    test('addRetirementAllocation derives the next id from current state', () => {
      loadState({
        retirementAllocation: [{ id: 7, assetType: 'Stocks', targetPercentage: 60 }]
      });

      const allocation = addRetirementAllocation({ assetType: 'Bonds', targetPercentage: 40 });

      expect(allocation.id).toBe(8);
      expect(getState().retirementAllocation).toHaveLength(2);
    });

    test('setRetirementAllocation stores a defensive copy', () => {
      const original = [{ id: 1, assetType: 'Stocks' }];

      setRetirementAllocation(original);
      original.push({ id: 2, assetType: 'Bonds' });

      expect(getState().retirementAllocation).toEqual([{ id: 1, assetType: 'Stocks' }]);
    });

    test('updateRetirementAllocation and removeRetirementAllocation update the targeted row', () => {
      addRetirementAllocation({ assetType: 'Stocks', targetPercentage: 60 });
      addRetirementAllocation({ assetType: 'Bonds', targetPercentage: 40 });

      updateRetirementAllocation(2, { targetPercentage: 35 });
      removeRetirementAllocation(1);

      expect(getState().retirementAllocation).toEqual([
        expect.objectContaining({ id: 2, assetType: 'Bonds', targetPercentage: 35 })
      ]);
    });
  });

  describe('Expenses', () => {
    test('addExpense derives the next id from current state', () => {
      loadState({
        expenses: [{ id: 3, description: 'Rent' }]
      });

      const expense = addExpense({ description: 'Travel', year: 2030 });

      expect(expense.id).toBe(4);
      expect(getState().expenses).toHaveLength(2);
    });

    test('setExpenses stores a defensive copy', () => {
      const original = [{ id: 1, description: 'Rent' }];

      setExpenses(original);
      original.push({ id: 2, description: 'Travel' });

      expect(getState().expenses).toEqual([{ id: 1, description: 'Rent' }]);
    });

    test('updateExpense and removeExpense update the targeted expense', () => {
      addExpense({ description: 'Rent', netAmount: 1000 });
      addExpense({ description: 'Travel', netAmount: 2000 });

      updateExpense(2, { netAmount: 2500 });
      removeExpense(1);

      expect(getState().expenses).toEqual([
        expect.objectContaining({ id: 2, description: 'Travel', netAmount: 2500 })
      ]);
    });
  });

  describe('UI State', () => {
    test('setDisplayCurrency updates the display currency', () => {
      setDisplayCurrency('$');

      expect(getState().displayCurrency).toBe('$');
    });

    test('setActiveTab accepts all runtime tabs, including the money-flow view', () => {
      setActiveTab('money-flow');

      expect(getState().activeTab).toBe('money-flow');
    });
  });

  describe('loadState', () => {
    test('merges runtime properties without clearing unspecified state', () => {
      addExpense({ description: 'Keep me' });

      loadState({
        displayCurrency: '$',
        exchangeRates: { usdToIls: 4.15, ilsToUsd: 1 / 4.15 },
        currentFileName: 'loaded-plan.json'
      });

      expect(getState()).toEqual(expect.objectContaining({
        displayCurrency: '$',
        exchangeRates: { usdToIls: 4.15, ilsToUsd: 1 / 4.15 },
        currentFileName: 'loaded-plan.json'
      }));
      expect(getState().expenses).toHaveLength(1);
    });

    test('can update calculation snapshots and file context together', () => {
      const result = { totalContributions: 1000 };
      const input = { birthYear: 1990 };

      loadState({
        lastCalculationResult: result,
        lastSuccessfulCalculationInput: input,
        currentFileHandle: { name: 'fire-plan.json' }
      });

      expect(getState()).toEqual(expect.objectContaining({
        lastCalculationResult: result,
        lastSuccessfulCalculationInput: input,
        currentFileHandle: { name: 'fire-plan.json' }
      }));
    });
  });
});
