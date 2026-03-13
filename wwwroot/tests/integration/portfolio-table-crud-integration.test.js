/**
 * Portfolio Table CRUD Integration Tests
 * Tests portfolio asset creation, updates, deletion, and currency conversion
 */

import {
  createPortfolioAsset,
  calculateCostBasis,
  calculateMarketValue
} from '../../js/components/portfolio-table.js';
import { Money } from '../../js/types/money.js';

describe('Portfolio Table CRUD Integration', () => {
  const exchangeRates = { usdToIls: 3.6, ilsToUsd: 1 / 3.6 };

  describe('Asset Creation', () => {
    test('should create new asset with default values', () => {
      const asset = createPortfolioAsset();
      
      expect(asset).toBeDefined();
      expect(asset.id).toBeGreaterThan(0);
      expect(asset.symbol).toBe('');
      expect(asset.quantity).toBe(0);
      expect(asset.currentPrice.amount).toBe(0);
      expect(asset.currentPrice.currency).toBe('USD');
      expect(asset.averageCost.amount).toBe(0);
      expect(asset.method).toBe('CAGR');
      expect(asset.priceSource).toBe('manual');
    });

    test('should create asset with custom ID', () => {
      const customId = 12345;
      const asset = createPortfolioAsset(customId);
      
      expect(asset.id).toBe(customId);
    });

    test('should create multiple assets with unique IDs', async () => {
      const asset1 = createPortfolioAsset();
      await new Promise(resolve => setTimeout(resolve, 2)); // Ensure different timestamps
      const asset2 = createPortfolioAsset();
      
      expect(asset1.id).not.toBe(asset2.id);
    });
  });

  describe('Cost Basis Calculations', () => {
    test('should calculate cost basis in USD', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(50);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      
      expect(costBasis).toBe(5000); // 100 * 50
    });

    test('should calculate cost basis with ILS price to USD display', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.ils(180); // 180 ILS per share
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      
      expect(costBasis).toBeCloseTo(5000, 1); // 100 * 180 / 3.6 = 5000
    });

    test('should calculate cost basis with USD price to ILS display', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(50);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '₪');
      
      expect(costBasis).toBeCloseTo(18000, 1); // 100 * 50 * 3.6 = 18000
    });

    test('should handle zero quantity', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 0;
      asset.averageCost = Money.usd(50);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      
      expect(costBasis).toBe(0);
    });

    test('should handle zero average cost', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(0);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      
      expect(costBasis).toBe(0);
    });
  });

  describe('Market Value Calculations', () => {
    test('should calculate market value in USD', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.usd(75);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBe(7500); // 100 * 75
    });

    test('should calculate market value with ILS price to USD display', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.ils(270); // 270 ILS per share
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBeCloseTo(7500, 1); // 100 * 270 / 3.6 = 7500
    });

    test('should calculate market value with USD price to ILS display', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.usd(75);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '₪');
      
      expect(marketValue).toBeCloseTo(27000, 1); // 100 * 75 * 3.6 = 27000
    });

    test('should handle fractional quantities', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 10.5;
      asset.currentPrice = Money.usd(100);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBe(1050); // 10.5 * 100
    });
  });

  describe('Gain/Loss Calculations', () => {
    test('should calculate gain when market value exceeds cost basis', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(50);
      asset.currentPrice = Money.usd(75);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      const gainLoss = marketValue - costBasis;
      
      expect(gainLoss).toBe(2500); // 7500 - 5000
    });

    test('should calculate loss when market value below cost basis', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(75);
      asset.currentPrice = Money.usd(50);
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      const gainLoss = marketValue - costBasis;
      
      expect(gainLoss).toBe(-2500); // 5000 - 7500
    });

    test('should handle gain/loss with currency conversion', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.averageCost = Money.usd(50); // USD cost basis
      asset.currentPrice = Money.ils(270); // ILS current price
      
      const costBasis = calculateCostBasis(asset, exchangeRates, '$');
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      const gainLoss = marketValue - costBasis;
      
      expect(costBasis).toBe(5000);
      expect(marketValue).toBeCloseTo(7500, 1);
      expect(gainLoss).toBeCloseTo(2500, 1);
    });
  });

  describe('Currency Conversion Edge Cases', () => {
    test('should handle same currency conversion (USD to USD)', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.usd(100);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBe(10000);
    });

    test('should handle same currency conversion (ILS to ILS)', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.ils(360);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '₪');
      
      expect(marketValue).toBe(36000);
    });

    test('should handle extreme exchange rates', () => {
      const extremeRates = { usdToIls: 10, ilsToUsd: 0.1 };
      const asset = createPortfolioAsset();
      asset.quantity = 100;
      asset.currentPrice = Money.usd(100);
      
      const marketValue = calculateMarketValue(asset, extremeRates, '₪');
      
      expect(marketValue).toBe(100000); // 100 * 100 * 10
    });
  });

  describe('Portfolio Totals', () => {
    test('should calculate total cost basis for multiple assets', () => {
      const asset1 = createPortfolioAsset(1);
      asset1.quantity = 100;
      asset1.averageCost = Money.usd(50);
      
      const asset2 = createPortfolioAsset(2);
      asset2.quantity = 50;
      asset2.averageCost = Money.usd(200);
      
      const total = calculateCostBasis(asset1, exchangeRates, '$') +
                    calculateCostBasis(asset2, exchangeRates, '$');
      
      expect(total).toBe(15000); // 5000 + 10000
    });

    test('should calculate total market value for multiple assets', () => {
      const asset1 = createPortfolioAsset(1);
      asset1.quantity = 100;
      asset1.currentPrice = Money.usd(75);
      
      const asset2 = createPortfolioAsset(2);
      asset2.quantity = 50;
      asset2.currentPrice = Money.usd(250);
      
      const total = calculateMarketValue(asset1, exchangeRates, '$') +
                    calculateMarketValue(asset2, exchangeRates, '$');
      
      expect(total).toBe(20000); // 7500 + 12500
    });

    test('should calculate mixed currency portfolio total', () => {
      const asset1 = createPortfolioAsset(1);
      asset1.quantity = 100;
      asset1.currentPrice = Money.usd(100);
      
      const asset2 = createPortfolioAsset(2);
      asset2.quantity = 100;
      asset2.currentPrice = Money.ils(360);
      
      const total = calculateMarketValue(asset1, exchangeRates, '$') +
                    calculateMarketValue(asset2, exchangeRates, '$');
      
      expect(total).toBeCloseTo(20000, 1); // 10000 + (36000 / 3.6)
    });
  });

  describe('Precision and Rounding', () => {
    test('should handle high-precision calculations', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100.123456;
      asset.currentPrice = Money.usd(50.987654);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBeCloseTo(5105.06, 1); // 100.123456 * 50.987654
    });

    test('should maintain precision through currency conversion', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 100.5;
      asset.currentPrice = Money.usd(99.99);
      
      const marketValueUSD = calculateMarketValue(asset, exchangeRates, '$');
      const marketValueILS = calculateMarketValue(asset, exchangeRates, '₪');
      
      expect(marketValueUSD).toBeCloseTo(10048.995, 1); // 100.5 * 99.99
      expect(marketValueILS).toBeCloseTo(36176.382, 1); // 10048.995 * 3.6
    });

    test('should handle very small quantities', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 0.001;
      asset.currentPrice = Money.usd(1000);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBeCloseTo(1.0, 1); // 0.001 * 1000
    });

    test('should handle very large values', () => {
      const asset = createPortfolioAsset();
      asset.quantity = 1000000;
      asset.currentPrice = Money.usd(500);
      
      const marketValue = calculateMarketValue(asset, exchangeRates, '$');
      
      expect(marketValue).toBe(500000000);
    });
  });
});
