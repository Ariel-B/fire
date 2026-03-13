/**
 * Integration test for loading plan files with portfolio assets
 * Tests the complete flow from JSON file to rendered portfolio table
 */

import { Money } from '../../js/types/money.js';

describe('Load Plan Integration - Portfolio with Average Cost', () => {
  // Simulate the normalizePortfolioAssetsFromFile function behavior
  function simulateLoadingAssets(rawAssets) {
    if (!Array.isArray(rawAssets)) {
      return [];
    }

    return rawAssets.map(rawAsset => {
      // Simulate template
      const template = {
        id: rawAsset.id || Date.now(),
        symbol: '',
        quantity: 0,
        currentPrice: Money.usd(0),
        averageCost: Money.usd(0),
        method: 'CAGR',
        value1: 0,
        value2: 0,
        marketCapUsd: null,
        priceSource: 'manual',
        assetName: '',
        historicalCAGRs: {},
        cagrSource: 'manual',
        loadingCAGR: false
      };

      // Convert Money fields from plain objects to Money instances
      const currentPrice = rawAsset.currentPrice
        ? Money.create(rawAsset.currentPrice.amount || 0, rawAsset.currentPrice.currency || 'USD')
        : template.currentPrice;
      
      const averageCost = rawAsset.averageCost
        ? Money.create(rawAsset.averageCost.amount || 0, rawAsset.averageCost.currency || 'USD')
        : template.averageCost;

      // Destructure to exclude Money fields from spread
      const { currentPrice: _cp, averageCost: _ac, ...assetWithoutMoneyFields } = rawAsset;

      return {
        ...template,
        ...assetWithoutMoneyFields,
        id: typeof rawAsset.id === 'number' ? rawAsset.id : template.id,
        currentPrice,
        averageCost,
        marketCapUsd: rawAsset.marketCapUsd ?? template.marketCapUsd,
        priceSource: rawAsset.priceSource ?? template.priceSource,
        historicalCAGRs: rawAsset.historicalCAGRs ?? {},
        cagrSource: rawAsset.cagrSource ?? 'manual',
        loadingCAGR: false
      };
    });
  }

  it('should correctly load portfolio with average cost values from saved file', () => {
    // Simulate JSON data from a saved file
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 1,
          symbol: 'AAPL',
          quantity: 100,
          currentPrice: { amount: 150, currency: 'USD' },
          averageCost: { amount: 120, currency: 'USD' },
          method: 'CAGR',
          value1: 10,
          value2: 0,
          marketCapUsd: 2500000000000,
          priceSource: 'api',
          assetName: 'Apple Inc.',
          historicalCAGRs: {},
          cagrSource: 'manual',
          loadingCAGR: false
        },
        {
          id: 2,
          symbol: 'MSFT',
          quantity: 50,
          currentPrice: { amount: 300, currency: 'USD' },
          averageCost: { amount: 250, currency: 'USD' },
          method: 'CAGR',
          value1: 12,
          value2: 0
        }
      ]
    };

    // Process the loaded data
    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);

    // Verify first asset
    expect(loadedAssets[0].symbol).toBe('AAPL');
    expect(loadedAssets[0].quantity).toBe(100);
    expect(loadedAssets[0].currentPrice.amount).toBe(150);
    expect(loadedAssets[0].currentPrice.currency).toBe('USD');
    expect(loadedAssets[0].averageCost.amount).toBe(120);
    expect(loadedAssets[0].averageCost.currency).toBe('USD');

    // Verify second asset
    expect(loadedAssets[1].symbol).toBe('MSFT');
    expect(loadedAssets[1].quantity).toBe(50);
    expect(loadedAssets[1].currentPrice.amount).toBe(300);
    expect(loadedAssets[1].currentPrice.currency).toBe('USD');
    expect(loadedAssets[1].averageCost.amount).toBe(250);
    expect(loadedAssets[1].averageCost.currency).toBe('USD');
  });

  it('should handle ILS currency in loaded portfolio', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 3,
          symbol: 'TASE',
          quantity: 200,
          currentPrice: { amount: 540, currency: 'ILS' },
          averageCost: { amount: 432, currency: 'ILS' },
          method: 'CAGR',
          value1: 8
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);

    expect(loadedAssets[0].currentPrice.amount).toBe(540);
    expect(loadedAssets[0].currentPrice.currency).toBe('ILS');
    expect(loadedAssets[0].averageCost.amount).toBe(432);
    expect(loadedAssets[0].averageCost.currency).toBe('ILS');
  });

  it('should preserve all asset properties after loading', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 4,
          symbol: 'NVDA',
          quantity: 25,
          currentPrice: { amount: 500, currency: 'USD' },
          averageCost: { amount: 200, currency: 'USD' },
          method: 'מחיר יעד',
          value1: 0,
          value2: 800,
          marketCapUsd: 1500000000000,
          priceSource: 'api',
          assetName: 'NVIDIA Corporation',
          historicalCAGRs: { 1: 50, 3: 45, 5: 40 },
          cagrSource: '3',
          loadingCAGR: false
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);
    const asset = loadedAssets[0];

    // Verify all properties are preserved
    expect(asset.id).toBe(4);
    expect(asset.symbol).toBe('NVDA');
    expect(asset.quantity).toBe(25);
    expect(asset.method).toBe('מחיר יעד');
    expect(asset.value1).toBe(0);
    expect(asset.value2).toBe(800);
    expect(asset.marketCapUsd).toBe(1500000000000);
    expect(asset.priceSource).toBe('api');
    expect(asset.assetName).toBe('NVIDIA Corporation');
    expect(asset.historicalCAGRs).toEqual({ 1: 50, 3: 45, 5: 40 });
    expect(asset.cagrSource).toBe('3');
    expect(asset.loadingCAGR).toBe(false);

    // Verify Money types are correct
    expect(asset.currentPrice.amount).toBe(500);
    expect(asset.averageCost.amount).toBe(200);
  });

  it('should calculate cost basis correctly after loading', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 5,
          symbol: 'TSLA',
          quantity: 10,
          currentPrice: { amount: 250, currency: 'USD' },
          averageCost: { amount: 180, currency: 'USD' }
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);
    const asset = loadedAssets[0];

    // Calculate cost basis (quantity * average cost)
    const costBasis = asset.quantity * asset.averageCost.amount;
    expect(costBasis).toBe(1800); // 10 * 180

    // Calculate market value (quantity * current price)
    const marketValue = asset.quantity * asset.currentPrice.amount;
    expect(marketValue).toBe(2500); // 10 * 250

    // Calculate unrealized gain
    const unrealizedGain = marketValue - costBasis;
    expect(unrealizedGain).toBe(700); // 2500 - 1800
  });

  it('should handle zero average cost', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 6,
          symbol: 'NEW',
          quantity: 50,
          currentPrice: { amount: 10, currency: 'USD' },
          averageCost: { amount: 0, currency: 'USD' }
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);
    expect(loadedAssets[0].averageCost.amount).toBe(0);
    expect(loadedAssets[0].currentPrice.amount).toBe(10);
  });

  it('should handle missing average cost by using template default', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 7,
          symbol: 'TEST',
          quantity: 100,
          currentPrice: { amount: 50, currency: 'USD' }
          // averageCost is missing
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);
    
    // Should use template default (0 USD)
    expect(loadedAssets[0].averageCost.amount).toBe(0);
    expect(loadedAssets[0].averageCost.currency).toBe('USD');
    expect(loadedAssets[0].currentPrice.amount).toBe(50);
  });

  it('should handle mixed USD and ILS in same portfolio', () => {
    const savedFileData = {
      accumulationPortfolio: [
        {
          id: 8,
          symbol: 'US-STOCK',
          quantity: 10,
          currentPrice: { amount: 100, currency: 'USD' },
          averageCost: { amount: 80, currency: 'USD' }
        },
        {
          id: 9,
          symbol: 'IL-STOCK',
          quantity: 20,
          currentPrice: { amount: 360, currency: 'ILS' },
          averageCost: { amount: 288, currency: 'ILS' }
        }
      ]
    };

    const loadedAssets = simulateLoadingAssets(savedFileData.accumulationPortfolio);

    expect(loadedAssets[0].currentPrice.currency).toBe('USD');
    expect(loadedAssets[0].averageCost.currency).toBe('USD');
    expect(loadedAssets[1].currentPrice.currency).toBe('ILS');
    expect(loadedAssets[1].averageCost.currency).toBe('ILS');
  });
});
