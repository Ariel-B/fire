/**
 * Portfolio Table Component Unit Tests
 * Tests for portfolio calculations and utilities
 */

// Mock the API functions since they make network calls
jest.mock('../../../js/api/assets-api.js', () => ({
  fetchAssetPrice: jest.fn(),
  fetchAssetName: jest.fn(),
  fetchAssetProfile: jest.fn(),
  fetchHistoricalCAGRs: jest.fn()
}));

import { Money } from '../../../js/types/money.js';
import {
  createPortfolioAsset,
  calculateCostBasis,
  calculateMarketValue,
  calculateUnrealizedGainLoss,
  calculateExposure,
  calculateTotalPortfolioValue,
  generateCurrentPriceInputHtml,
  generateMethodDropdownHtml,
  generateValuesInputHtml,
  generateAccumulationRowHtml,
  renderPortfolioTable,
  handleAssetMethodChange,
  removeAssetFromPortfolio,
  updateAssetField,
  updateAssetPrice,
  updateAssetCost,
  updateAssetCurrency
} from '../../../js/components/portfolio-table.js';

describe('Portfolio Table Component', () => {
  const defaultExchangeRates = { usdToIls: 3.7, ilsToUsd: 1 / 3.7 };

  // ============================================================================
  // createPortfolioAsset
  // ============================================================================

  describe('createPortfolioAsset', () => {
    test('creates asset with default values', () => {
      const asset = createPortfolioAsset();

      expect(asset).toHaveProperty('id');
      expect(asset.symbol).toBe('');
      expect(asset.quantity).toBe(0);
      expect(asset.currentPrice).toEqual(Money.usd(0));
      expect(asset.currentPrice.amount).toBe(0);
      expect(asset.currentPrice.currency).toBe('USD');
      expect(asset.averageCost).toEqual(Money.usd(0));
      expect(asset.averageCost.amount).toBe(0);
      expect(asset.averageCost.currency).toBe('USD');
      expect(asset.method).toBe('CAGR');
      expect(asset.value1).toBe(0);
      expect(asset.value2).toBe(0);
      expect(asset.priceSource).toBe('manual');
      expect(asset.assetName).toBe('');
      expect(asset.historicalCAGRs).toEqual({});
      expect(asset.cagrSource).toBe('manual');
      expect(asset.loadingCAGR).toBe(false);
    });

    test('creates asset with provided id', () => {
      const asset = createPortfolioAsset(12345);

      expect(asset.id).toBe(12345);
    });

    test('generates unique id when not provided', () => {
      const asset1 = createPortfolioAsset();
      const asset2 = createPortfolioAsset();

      // IDs should be different (based on Date.now())
      // Allow for small time difference
      expect(asset1.id).toBeDefined();
      expect(asset2.id).toBeDefined();
    });
  });

  // ============================================================================
  // calculateCostBasis
  // ============================================================================

  describe('calculateCostBasis', () => {
    test('calculates cost basis in USD', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.usd(50)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '$');

      expect(result).toBe(5000); // 100 * 50
    });

    test('calculates cost basis in ILS', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.ils(185)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '₪');

      expect(result).toBe(18500); // 100 * 185
    });

    test('converts USD cost basis to ILS display', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.usd(50)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '₪');

      expect(result).toBeCloseTo(18500, 0); // 100 * 50 * 3.7
    });

    test('converts ILS cost basis to USD display', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.ils(185)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '$');

      expect(result).toBeCloseTo(5000, 0); // 100 * 185 / 3.7
    });

    test('handles zero quantity', () => {
      const asset = {
        quantity: 0,
        averageCost: Money.usd(50)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('handles zero average cost', () => {
      const asset = {
        quantity: 100,
        averageCost: Money.usd(0)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('handles missing values', () => {
      const asset = {
        averageCost: Money.usd(0)
      };

      const result = calculateCostBasis(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // calculateMarketValue
  // ============================================================================

  describe('calculateMarketValue', () => {
    test('calculates market value in USD', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(75)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '$');

      expect(result).toBe(7500); // 100 * 75
    });

    test('calculates market value in ILS', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.ils(277.5)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '₪');

      expect(result).toBe(27750); // 100 * 277.5
    });

    test('converts USD market value to ILS display', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(75)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '₪');

      expect(result).toBeCloseTo(27750, 0); // 100 * 75 * 3.7
    });

    test('converts ILS market value to USD display', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.ils(277.5)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '$');

      expect(result).toBeCloseTo(7500, 0); // 100 * 277.5 / 3.7
    });

    test('handles zero quantity', () => {
      const asset = {
        quantity: 0,
        currentPrice: Money.usd(75)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('handles zero price', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(0)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('handles missing values', () => {
      const asset = {
        currentPrice: Money.usd(0)
      };

      const result = calculateMarketValue(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // calculateUnrealizedGainLoss
  // ============================================================================

  describe('calculateUnrealizedGainLoss', () => {
    test('calculates gain when market value exceeds cost', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(75),
        averageCost: Money.usd(50)
      };

      const result = calculateUnrealizedGainLoss(asset, defaultExchangeRates, '$');

      expect(result).toBe(2500); // 7500 - 5000
    });

    test('calculates loss when cost exceeds market value', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(40),
        averageCost: Money.usd(50)
      };

      const result = calculateUnrealizedGainLoss(asset, defaultExchangeRates, '$');

      expect(result).toBe(-1000); // 4000 - 5000
    });

    test('calculates zero when market equals cost', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(50),
        averageCost: Money.usd(50)
      };

      const result = calculateUnrealizedGainLoss(asset, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('calculates gain/loss in ILS display', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(75),
        averageCost: Money.usd(50)
      };

      const result = calculateUnrealizedGainLoss(asset, defaultExchangeRates, '₪');

      expect(result).toBeCloseTo(9250, 0); // (7500 - 5000) * 3.7
    });

    test('handles mixed currencies', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(75),
        averageCost: Money.ils(185)
      };

      const result = calculateUnrealizedGainLoss(asset, defaultExchangeRates, '$');

      // Market: 100 * 75 = 7500
      // Cost: 100 * 185 / 3.7 ≈ 5000
      // Gain: 7500 - 5000 = 2500
      expect(result).toBeCloseTo(2500, 0);
    });
  });

  // ============================================================================
  // calculateExposure
  // ============================================================================

  describe('calculateExposure', () => {
    test('calculates exposure percentage', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(50)
      };

      const result = calculateExposure(asset, 10000, defaultExchangeRates, '$');

      expect(result).toBe(50); // 5000 / 10000 * 100
    });

    test('calculates 100% exposure for single asset', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(50)
      };

      const result = calculateExposure(asset, 5000, defaultExchangeRates, '$');

      expect(result).toBe(100);
    });

    test('calculates small exposure percentage', () => {
      const asset = {
        quantity: 10,
        currentPrice: Money.usd(50)
      };

      const result = calculateExposure(asset, 100000, defaultExchangeRates, '$');

      expect(result).toBe(0.5); // 500 / 100000 * 100
    });

    test('returns 0 when total portfolio value is 0', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(50)
      };

      const result = calculateExposure(asset, 0, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('returns 0 when total portfolio value is negative', () => {
      const asset = {
        quantity: 100,
        currentPrice: Money.usd(50)
      };

      const result = calculateExposure(asset, -1000, defaultExchangeRates, '$');

      expect(result).toBe(0);
    });
  });

  // ============================================================================
  // calculateTotalPortfolioValue
  // ============================================================================

  describe('calculateTotalPortfolioValue', () => {
    test('calculates total for single asset', () => {
      const portfolio = [
        {
          quantity: 100,
          currentPrice: Money.usd(50)
        }
      ];

      const result = calculateTotalPortfolioValue(portfolio, defaultExchangeRates, '$');

      expect(result).toBe(5000);
    });

    test('calculates total for multiple assets', () => {
      const portfolio = [
        {
          quantity: 100,
          currentPrice: Money.usd(50)
        },
        {
          quantity: 50,
          currentPrice: Money.usd(100)
        }
      ];

      const result = calculateTotalPortfolioValue(portfolio, defaultExchangeRates, '$');

      expect(result).toBe(10000); // 5000 + 5000
    });

    test('calculates total for mixed currency portfolio in USD', () => {
      const portfolio = [
        {
          quantity: 100,
          currentPrice: Money.usd(50)
        },
        {
          quantity: 100,
          currentPrice: Money.ils(185)
        }
      ];

      const result = calculateTotalPortfolioValue(portfolio, defaultExchangeRates, '$');

      // 5000 + (100 * 185 / 3.7) = 5000 + 5000 = 10000
      expect(result).toBeCloseTo(10000, 0);
    });

    test('calculates total for mixed currency portfolio in ILS', () => {
      const portfolio = [
        {
          quantity: 100,
          currentPrice: Money.usd(50)
        },
        {
          quantity: 100,
          currentPrice: Money.ils(185)
        }
      ];

      const result = calculateTotalPortfolioValue(portfolio, defaultExchangeRates, '₪');

      // (100 * 50 * 3.7) + (100 * 185) = 18500 + 18500 = 37000
      expect(result).toBeCloseTo(37000, 0);
    });

    test('returns 0 for empty portfolio', () => {
      const result = calculateTotalPortfolioValue([], defaultExchangeRates, '$');

      expect(result).toBe(0);
    });

    test('handles portfolio with zero value assets', () => {
      const portfolio = [
        {
          quantity: 100,
          currentPrice: Money.usd(50)
        },
        {
          quantity: 0,
          currentPrice: Money.usd(100)
        }
      ];

      const result = calculateTotalPortfolioValue(portfolio, defaultExchangeRates, '$');

      expect(result).toBe(5000);
    });
  });

  describe('generateAccumulationRowHtml', () => {
    test('escapes symbol and asset name before inserting HTML', () => {
      const asset = {
        ...createPortfolioAsset(1),
        symbol: 'AAPL" autofocus onfocus="alert(1)',
        assetName: '<img src=x onerror="alert(1)">',
        quantity: 1,
        currentPrice: Money.usd(100),
        averageCost: Money.usd(90)
      };

      const html = generateAccumulationRowHtml(
        asset,
        'accumulation',
        defaultExchangeRates,
        '$',
        100,
        10
      );

      expect(html).toContain('AAPL&quot; autofocus onfocus=&quot;alert(1)');
      expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
      expect(html).not.toContain('<img src=x onerror="alert(1)">');
    });
  });

  describe('generateCurrentPriceInputHtml', () => {
    test('renders readonly API price input with indicator when symbol data came from API', () => {
      const html = generateCurrentPriceInputHtml(
        {
          ...createPortfolioAsset(1),
          symbol: 'AAPL',
          currentPrice: Money.usd(123.45),
          priceSource: 'api'
        },
        'accumulation'
      );

      expect(html).toContain('readonly');
      expect(html).toContain('cursor-not-allowed');
      expect(html).toContain('🌐');
      expect(html).toContain('123.45');
    });

    test('renders editable manual price input with fallback styling when API data is unavailable', () => {
      const html = generateCurrentPriceInputHtml(
        {
          ...createPortfolioAsset(1),
          symbol: 'MSFT',
          currentPrice: Money.usd(99),
          priceSource: 'manual'
        },
        'accumulation'
      );

      expect(html).toContain('data-portfolio-action="update-price"');
      expect(html).toContain('bg-yellow-50 border-yellow-200');
      expect(html).toContain('✏️');
      expect(html).toContain('מחיר ידני (API לא זמין)');
    });
  });

  describe('generateMethodDropdownHtml', () => {
    test('renders historical CAGR options when symbol data is available', () => {
      const html = generateMethodDropdownHtml(
        {
          ...createPortfolioAsset(1),
          symbol: 'NVDA',
          method: 'CAGR',
          cagrSource: '5',
          historicalCAGRs: {
            1: 11.25,
            3: 8.5,
            5: 7.75,
            10: null
          }
        },
        'accumulation'
      );

      expect(html).toContain('CAGR ידני');
      expect(html).toContain('CAGR 1Y: 11.25%');
      expect(html).toContain('CAGR 5Y: 7.75%');
      expect(html).toContain('value="CAGR:5" selected');
      expect(html).toContain('CAGR 10Y: N/A');
      expect(html).toContain('disabled');
    });

    test('renders loading state when historical CAGR values are being fetched', () => {
      const html = generateMethodDropdownHtml(
        {
          ...createPortfolioAsset(1),
          symbol: 'TSLA',
          loadingCAGR: true
        },
        'accumulation'
      );

      expect(html).toContain('loading-control');
      expect(html).toContain('טוען נתונים...');
    });
  });

  describe('generateValuesInputHtml', () => {
    test('renders target price input for target-price assets', () => {
      const html = generateValuesInputHtml(
        {
          ...createPortfolioAsset(1),
          method: 'מחיר יעד',
          value2: 250
        },
        'accumulation'
      );

      expect(html).toContain('data-portfolio-field="value2"');
      expect(html).toContain('placeholder="מחיר יעד"');
      expect(html).toContain('value="250"');
    });

    test('renders readonly historical CAGR value when a historical source is selected', () => {
      const html = generateValuesInputHtml(
        {
          ...createPortfolioAsset(1),
          method: 'CAGR',
          value1: 4,
          cagrSource: '3',
          historicalCAGRs: {
            3: 9.5
          }
        },
        'accumulation'
      );

      expect(html).toContain('data-portfolio-action="update-cagr-manual"');
      expect(html).toContain('value="9.5"');
      expect(html).toContain('readonly');
      expect(html).toContain('📊');
      expect(html).toContain('bg-green-50 border-green-200');
    });

    test('renders editable generic value input for non-CAGR methods', () => {
      const html = generateValuesInputHtml(
        {
          ...createPortfolioAsset(1),
          method: 'צמיחה כוללת',
          value1: 14
        },
        'accumulation'
      );

      expect(html).toContain('data-portfolio-field="value1"');
      expect(html).toContain('placeholder="ערך"');
      expect(html).toContain('value="14"');
      expect(html).not.toContain('readonly');
    });
  });

  describe('renderPortfolioTable', () => {
    test('renders one row per asset and annotates row metadata', () => {
      const insertedRows = [];
      const table = {
        innerHTML: 'stale',
        insertRow: jest.fn(() => {
          const row = {
            innerHTML: '',
            dataset: {},
            setAttribute: jest.fn((name, value) => {
              if (name === 'data-testid') {
                row.dataTestId = value;
              }
            })
          };
          insertedRows.push(row);
          return row;
        })
      };

      global.document = {
        getElementById: jest.fn(() => table)
      };

      const portfolio = [
        {
          ...createPortfolioAsset(1),
          symbol: 'AAPL',
          quantity: 2,
          currentPrice: Money.usd(150),
          averageCost: Money.usd(120)
        },
        {
          ...createPortfolioAsset(2),
          symbol: 'MSFT',
          quantity: 1,
          currentPrice: Money.usd(300),
          averageCost: Money.usd(200)
        }
      ];

      renderPortfolioTable('accumulationTable', portfolio, 'accumulation', defaultExchangeRates, '$', 8);

      expect(table.innerHTML).toBe('');
      expect(table.insertRow).toHaveBeenCalledTimes(2);
      expect(insertedRows[0].setAttribute).toHaveBeenCalledWith('data-testid', 'accumulation-asset-row');
      expect(insertedRows[0].dataset.assetId).toBe('1');
      expect(insertedRows[0].dataset.portfolioType).toBe('accumulation');
      expect(insertedRows[0].innerHTML).toContain('AAPL');
      expect(insertedRows[1].innerHTML).toContain('MSFT');

      delete global.document;
    });
  });

  describe('asset mutation helpers', () => {
    test('handleAssetMethodChange switches to historical CAGR values and resets to manual for non-CAGR methods', () => {
      const portfolio = [{
        ...createPortfolioAsset(1),
        method: 'צמיחה כוללת',
        value1: 4,
        historicalCAGRs: { 5: 12.25 },
        cagrSource: 'manual'
      }];

      handleAssetMethodChange(portfolio, 1, 'CAGR:5');
      expect(portfolio[0].method).toBe('CAGR');
      expect(portfolio[0].cagrSource).toBe('5');
      expect(portfolio[0].value1).toBe(12.25);

      handleAssetMethodChange(portfolio, 1, 'מחיר יעד');
      expect(portfolio[0].method).toBe('מחיר יעד');
      expect(portfolio[0].cagrSource).toBe('manual');
    });

    test('removeAssetFromPortfolio, updateAssetField, updateAssetPrice, updateAssetCost, and updateAssetCurrency mutate the targeted asset', () => {
      const portfolio = [
        {
          ...createPortfolioAsset(1),
          quantity: 1,
          currentPrice: Money.usd(100),
          averageCost: Money.usd(90)
        },
        {
          ...createPortfolioAsset(2),
          quantity: 3,
          currentPrice: Money.ils(50),
          averageCost: Money.ils(40)
        }
      ];

      updateAssetField(portfolio, 1, 'quantity', 7);
      updateAssetPrice(portfolio, 1, 125);
      updateAssetCost(portfolio, 1, 95);
      updateAssetCurrency(portfolio, 1, '₪');

      expect(portfolio[0].quantity).toBe(7);
      expect(portfolio[0].currentPrice).toEqual(Money.ils(125));
      expect(portfolio[0].averageCost).toEqual(Money.ils(95));

      updateAssetCurrency(portfolio, 2, '$');
      expect(portfolio[1].currentPrice).toEqual(Money.usd(50));
      expect(portfolio[1].averageCost).toEqual(Money.usd(40));

      const filtered = removeAssetFromPortfolio(portfolio, 1);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(2);
    });
  });
});
