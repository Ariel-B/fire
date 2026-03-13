/**
 * Test suite for loading plans with Money type fields
 * Ensures that portfolio assets and planned expenses are normalized by the
 * dedicated persistence module when loading saved files, including older save
 * formats that still use legacy money field names and plain numeric amounts.
 */

import { Money } from '../../../js/types/money.js';
import {
  normalizeExpensesFromFile,
  normalizePortfolioAssetsFromFile
} from '../../../js/persistence/plan-persistence.js';

describe('Load Plan - Money Type Conversion', () => {
  describe('Money Type Structure', () => {
    it('should have amount and currency properties', () => {
      const usd = Money.usd(100);
      expect(usd).toHaveProperty('amount');
      expect(usd).toHaveProperty('currency');
      expect(usd.amount).toBe(100);
      expect(usd.currency).toBe('USD');
    });

    it('should create Money from currency code', () => {
      const money = Money.create(50, 'ILS');
      expect(money.amount).toBe(50);
      expect(money.currency).toBe('ILS');
    });

    it('should create Money from currency symbol', () => {
      const money = Money.create(75, '$');
      expect(money.amount).toBe(75);
      expect(money.currency).toBe('USD');
    });
  });

  describe('Portfolio asset normalization', () => {
    it('should convert plain object money fields into Money values', () => {
      const [asset] = normalizePortfolioAssetsFromFile([
        {
          id: 1,
          symbol: 'AAPL',
          quantity: 10,
          currentPrice: { amount: 150, currency: 'USD' },
          averageCost: { amount: 120, currency: 'USD' },
          method: 'CAGR',
          value1: 10,
          value2: 0
        }
      ]);

      expect(asset.currentPrice.amount).toBe(150);
      expect(asset.currentPrice.currency).toBe('USD');
      expect(asset.averageCost.amount).toBe(120);
      expect(asset.averageCost.currency).toBe('USD');
    });

    it('should support legacy current price and average cost fields in the same portfolio', () => {
      const assets = normalizePortfolioAssetsFromFile([
        {
          id: 1,
          symbol: 'AAPL',
          currentPrice: { amount: 150, currency: 'USD' },
          averageCost: { amount: 120, currency: 'USD' }
        },
        {
          id: 2,
          symbol: 'VOO',
          currentPrice: 450.25,
          currentPriceCurrency: '$',
          averageCostPerShare: 400,
          averageCostCurrency: '$'
        }
      ]);

      expect(assets[0].currentPrice.amount).toBe(150);
      expect(assets[0].averageCost.amount).toBe(120);
      expect(assets[1].currentPrice.amount).toBe(450.25);
      expect(assets[1].currentPrice.currency).toBe('USD');
      expect(assets[1].averageCost.amount).toBe(400);
      expect(assets[1].averageCost.currency).toBe('USD');
    });

    it('should preserve non-money fields and normalize market cap strings', () => {
      const [asset] = normalizePortfolioAssetsFromFile([
        {
          id: 1,
          symbol: 'AAPL',
          quantity: 10,
          currentPrice: { amount: 150, currency: 'USD' },
          averageCost: { amount: 120, currency: 'USD' },
          marketCapUsd: '$2,500,000.00',
          priceSource: 'api',
          assetName: 'Apple Inc.',
          historicalCAGRs: { 1: 15, 3: 20, 5: 18 },
          cagrSource: 'manual',
          loadingCAGR: true
        }
      ]);

      expect(asset.id).toBe(1);
      expect(asset.symbol).toBe('AAPL');
      expect(asset.quantity).toBe(10);
      expect(asset.assetName).toBe('Apple Inc.');
      expect(asset.marketCapUsd).toBe(2500000);
      expect(asset.priceSource).toBe('api');
      expect(asset.historicalCAGRs).toEqual({ 1: 15, 3: 20, 5: 18 });
      expect(asset.loadingCAGR).toBe(false);
    });
  });

  describe('Expense normalization', () => {
    it('should normalize Money and legacy numeric expense amounts', () => {
      const expenses = normalizeExpensesFromFile([
        {
          id: 1,
          type: 'Vacation',
          netAmount: { amount: 3000, currency: 'USD' },
          year: 2058,
          frequencyYears: 1,
          repetitionCount: 2
        },
        {
          id: 2,
          type: 'Car',
          netAmount: 100000,
          currency: '₪',
          startYear: 2060
        }
      ]);

      expect(expenses).toHaveLength(2);
      expect(expenses[0].netAmount.amount).toBe(3000);
      expect(expenses[0].netAmount.currency).toBe('USD');
      expect(expenses[1].netAmount.amount).toBe(100000);
      expect(expenses[1].netAmount.currency).toBe('ILS');
      expect(expenses[1].year).toBe(2060);
      expect(expenses[1].frequencyYears).toBe(1);
      expect(expenses[1].repetitionCount).toBe(1);
    });

    it('should normalize older amount field variants and default missing values safely', () => {
      const [expense] = normalizeExpensesFromFile([
        {
          type: 'Renovation',
          amount: { amount: 40000, currency: '$' }
        }
      ]);

      expect(expense.netAmount.amount).toBe(40000);
      expect(expense.netAmount.currency).toBe('USD');
      expect(expense.frequencyYears).toBe(1);
      expect(expense.repetitionCount).toBe(1);
    });
  });
});
