/**
 * Portfolio Table Component
 * Manages portfolio table rendering and interactions
 */

import type { PortfolioAsset, Currency } from '../types/index.js';
import { getMoneySymbol } from '../types/index.js';
import { Money } from '../types/money.js';
import { safeFormatCurrency } from '../utils/formatter.js';
import { escapeHtml } from '../utils/dom.js';
import { fetchAssetPrice, fetchAssetPriceResponse, fetchAssetProfile, fetchHistoricalCAGRs } from '../api/assets-api.js';

// Re-export types for convenience
export type { PortfolioAsset };
export type PortfolioType = 'accumulation' | 'retirement';

/**
 * Create a new empty portfolio asset
 */
export function createPortfolioAsset(id?: number): PortfolioAsset {
  const asset: PortfolioAsset = {
    id: id ?? Date.now(),
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
  return asset;
}

/**
 * Get currency symbol from Money type
 */
function getAssetCurrencySymbol(money: Money): Currency {
  return getMoneySymbol(money);
}

/**
 * Convert amount between currencies
 */
function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates: { usdToIls: number; ilsToUsd: number }
): number {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  if (fromCurrency === '$' && toCurrency === '₪') {
    return amount * exchangeRates.usdToIls;
  }

  if (fromCurrency === '₪' && toCurrency === '$') {
    return amount * exchangeRates.ilsToUsd;
  }

  return amount;
}

/**
 * Calculate cost basis for an asset in display currency
 */
export function calculateCostBasis(
  asset: PortfolioAsset,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  targetCurrency: Currency
): number {
  const quantity = asset.quantity || 0;
  const avgCost = asset.averageCost.amount;
  const costCurrency = getAssetCurrencySymbol(asset.averageCost);
  const costBasis = quantity * avgCost;
  return convertCurrency(costBasis, costCurrency, targetCurrency, exchangeRates);
}

/**
 * Calculate market value for an asset in display currency
 */
export function calculateMarketValue(
  asset: PortfolioAsset,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  targetCurrency: Currency
): number {
  const quantity = asset.quantity || 0;
  const price = asset.currentPrice.amount;
  const sourceCurrency = getAssetCurrencySymbol(asset.currentPrice);
  const marketValue = quantity * price;
  return convertCurrency(marketValue, sourceCurrency, targetCurrency, exchangeRates);
}

/**
 * Calculate unrealized gain/loss for an asset
 */
export function calculateUnrealizedGainLoss(
  asset: PortfolioAsset,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  targetCurrency: Currency
): number {
  const marketValue = calculateMarketValue(asset, exchangeRates, targetCurrency);
  const costBasis = calculateCostBasis(asset, exchangeRates, targetCurrency);
  return marketValue - costBasis;
}

/**
 * Calculate exposure percentage for an asset
 */
export function calculateExposure(
  asset: PortfolioAsset,
  totalPortfolioValue: number,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): number {
  if (totalPortfolioValue <= 0) return 0;
  const marketValue = calculateMarketValue(asset, exchangeRates, displayCurrency);
  return (marketValue / totalPortfolioValue) * 100;
}

/**
 * Calculate total portfolio value in display currency
 */
export function calculateTotalPortfolioValue(
  portfolio: PortfolioAsset[],
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): number {
  return portfolio.reduce((total, asset) => {
    return total + calculateMarketValue(asset, exchangeRates, displayCurrency);
  }, 0);
}

function convertMarketCapToDisplay(
  valueUsd: number | null,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): number | null {
  if (valueUsd === null || valueUsd === undefined || valueUsd <= 0) {
    return null;
  }

  if (displayCurrency === '₪') {
    return valueUsd * exchangeRates.usdToIls;
  }

  return valueUsd;
}

function normalizeMarketCapValue(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function calculateAssetAnnualReturn(asset: PortfolioAsset, yearsToRetirement: number): number {
  const method = asset.method || 'CAGR';
  const safeYears = Math.max(1, yearsToRetirement || 1);

  switch (method) {
    case 'מחיר יעד': {
      const currentPrice = asset.currentPrice.amount;
      const targetPrice = asset.value2 || currentPrice;
      if (currentPrice <= 0 || targetPrice <= 0) {
        return 0;
      }
      const growth = Math.pow(targetPrice / currentPrice, 1 / safeYears) - 1;
      return growth * 100;
    }
    case 'CAGR':
    case 'צמיחה כוללת':
    case 'ידני':
    default:
      return asset.value1 || 0;
  }
}

function calculateProjectedMarketCap(asset: PortfolioAsset, yearsToRetirement: number): number | null {
  const baseMarketCap = normalizeMarketCapValue(asset.marketCapUsd);
  if (baseMarketCap === null) {
    return null;
  }

  if (yearsToRetirement <= 0) {
    return baseMarketCap;
  }

  const annualReturn = calculateAssetAnnualReturn(asset, yearsToRetirement);
  const growthFactor = Math.pow(1 + annualReturn / 100, yearsToRetirement);

  if (!Number.isFinite(growthFactor) || growthFactor <= 0) {
    return baseMarketCap;
  }

  return baseMarketCap * growthFactor;
}

function calculateAssetValueMultiplier(asset: PortfolioAsset, yearsToRetirement: number): number | null {
  const safeYears = Math.max(0, yearsToRetirement || 0);

  if (asset.method === 'מחיר יעד') {
    const currentPrice = asset.currentPrice.amount;
    const targetPrice = asset.value2 || 0;
    if (currentPrice <= 0 || targetPrice <= 0) {
      return null;
    }
    return targetPrice / currentPrice;
  }

  const annualReturn = calculateAssetAnnualReturn(asset, safeYears || 1);
  const growthFactor = Math.pow(1 + annualReturn / 100, safeYears);
  if (!Number.isFinite(growthFactor) || growthFactor <= 0) {
    return null;
  }
  return growthFactor;
}

function renderMultiplierValue(multiplier: number | null): string {
  if (multiplier === null) {
    return '<span class="text-xs text-gray-400">N/A</span>';
  }

  const formatMultiplier = (value: number): string => {
    if (!Number.isFinite(value) || value <= 0) {
      return 'N/A';
    }
    if (value >= 100) {
      return value.toFixed(0);
    }
    if (value >= 10) {
      return value.toFixed(1);
    }
    return value.toFixed(2);
  };

  const formatted = formatMultiplier(multiplier);
  if (formatted === 'N/A') {
    return '<span class="text-xs text-gray-400">N/A</span>';
  }
  return `<span class="text-sm font-medium text-gray-900">${formatted}×</span>`;
}

function renderMarketCapValue(
  valueUsd: number | null,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency
): string {
  const normalized = normalizeMarketCapValue(valueUsd);
  const converted = convertMarketCapToDisplay(normalized, exchangeRates, displayCurrency);
  if (converted === null) {
    return '<span class="text-xs text-gray-400">N/A</span>';
  }
  const absValue = Math.abs(converted);
  const symbol = displayCurrency === '₪' ? '₪' : '$';
  const formattedValue = absValue >= 1_000_000_000_000
    ? `${(absValue / 1_000_000_000_000).toFixed(absValue >= 10_000_000_000_000 ? 1 : 2)}T`
    : `${(absValue / 1_000_000_000).toFixed(absValue >= 10_000_000_000 ? 1 : 2)}B`;
  const trimmed = formattedValue.replace(/\.0+([TB])$/, '$1').replace(/(\.\d*?[1-9])0+([TB])$/, '$1$2');
  const sign = converted < 0 ? '-' : '';
  return `<span class="text-sm font-medium text-gray-900">${sign}${symbol}${trimmed}</span>`;
}

/**
 * Generate HTML for the current price input field
 */
export function generateCurrentPriceInputHtml(
  asset: PortfolioAsset,
  type: PortfolioType
): string {
  const isFromAPI = asset.priceSource === 'api';
  const hasSymbol = asset.symbol && asset.symbol.trim();
  const priceAmount = asset.currentPrice.amount;

  if (isFromAPI && hasSymbol) {
    // Price from API - read-only with visual indication
    return `
      <div class="relative">
        <input type="number" value="${priceAmount}"
               aria-label="מחיר נוכחי"
               class="w-full min-w-[70px] border-2 border-green-200 bg-green-50 rounded-lg px-2 py-2 text-sm text-gray-800 cursor-not-allowed"
               placeholder="מחיר אוטומטי"
               readonly
               title="מחיר עודכן אוטומטי מ-API - לא ניתן לעריכה">
        <span class="absolute left-1 top-1 text-xs text-green-600 font-bold" title="מחיר מ-API">🌐</span>
      </div>
    `;
  } else {
    // Manual price input
    const placeholder = hasSymbol ? "מחיר ידני (API לא זמין)" : "מחיר נוכחי";
    const bgClass = hasSymbol && !isFromAPI ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-300";

    return `
      <div class="relative">
        <input type="number" value="${priceAmount}"
               aria-label="מחיר נוכחי"
               data-portfolio-action="update-price"
               data-portfolio-type="${type}"
               data-asset-id="${asset.id}"
               class="w-full min-w-[70px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${bgClass}"
               placeholder="${placeholder}"
               min="0" step="0.01"
               title="${hasSymbol ? 'מחיר ידני - API לא הצליח למצוא נתונים' : 'הזן מחיר ידנית'}">
        ${hasSymbol && !isFromAPI ? '<span class="absolute left-1 top-1 text-xs text-yellow-600 font-bold" title="מחיר ידני">✏️</span>' : ''}
      </div>
    `;
  }
}

/**
 * Generate HTML for method dropdown with integrated historical CAGR options
 */
export function generateMethodDropdownHtml(
  asset: PortfolioAsset,
  type: PortfolioType
): string {
  const historicalCAGRs = asset.historicalCAGRs || {};
  const hasSymbol = asset.symbol && asset.symbol.trim();
  const isLoadingCAGR = asset.loadingCAGR === true;
  const cagrTimeframes = [1, 3, 5, 10, 15, 20];

  // Determine current selection
  const currentMethod = asset.method || 'CAGR';
  const cagrSource = asset.cagrSource || 'manual';

  // Build options for the dropdown
  let optionsHtml = '';

  // Option group for CAGR
  optionsHtml += '<optgroup label="CAGR שנתי">';
  optionsHtml += `<option value="CAGR:manual" ${currentMethod === 'CAGR' && cagrSource === 'manual' ? 'selected' : ''}>CAGR ידני</option>`;

  // Add historical CAGR options if symbol exists
  if (hasSymbol && !isLoadingCAGR) {
    cagrTimeframes.forEach(years => {
      const cagrValue = historicalCAGRs[years];
      const isAvailable = cagrValue !== null && cagrValue !== undefined;
      const displayValue = isAvailable ? `${cagrValue.toFixed(2)}%` : 'N/A';
      const optionText = `CAGR ${years}Y: ${displayValue}`;
      const isSelected = currentMethod === 'CAGR' && cagrSource === years.toString();

      optionsHtml += `<option value="CAGR:${years}" ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}>${optionText}</option>`;
    });
  } else if (isLoadingCAGR) {
    optionsHtml += '<option disabled>טוען נתונים...</option>';
  }
  optionsHtml += '</optgroup>';

  // Other methods
  optionsHtml += `<option value="צמיחה כוללת" ${currentMethod === 'צמיחה כוללת' ? 'selected' : ''}>צמיחה כוללת</option>`;
  optionsHtml += `<option value="מחיר יעד" ${currentMethod === 'מחיר יעד' ? 'selected' : ''}>מחיר יעד</option>`;

  return `
    <select aria-label="שיטת חישוב תשואה" class="w-full min-w-[130px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isLoadingCAGR ? 'loading-control' : ''}"
            data-portfolio-action="method-change"
            data-portfolio-type="${type}"
            data-asset-id="${asset.id}">
      ${optionsHtml}
    </select>
  `;
}

/**
 * Generate HTML for values input based on method
 */
export function generateValuesInputHtml(
  asset: PortfolioAsset,
  type: PortfolioType
): string {
  if (asset.method === 'מחיר יעד') {
    return `
      <input type="number" value="${asset.value2}" aria-label="מחיר יעד" placeholder="מחיר יעד"
             data-portfolio-action="update-field"
             data-portfolio-type="${type}"
             data-asset-id="${asset.id}"
             data-portfolio-field="value2"
             class="w-full min-w-[120px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
    `;
  } else if (asset.method === 'CAGR') {
    const selectedCAGRSource = asset.cagrSource || 'manual';
    const historicalCAGRs = asset.historicalCAGRs || {};

    // Calculate what value to show in the input
    let displayValue: number = asset.value1 || 0;
    const parsedSource = parseInt(selectedCAGRSource);
    if (selectedCAGRSource !== 'manual' && !isNaN(parsedSource) && historicalCAGRs[parsedSource]) {
      displayValue = historicalCAGRs[parsedSource];
    }

    const isFromHistorical = selectedCAGRSource !== 'manual';
    const inputBgClass = isFromHistorical ? 'bg-green-50 border-green-200' : 'bg-white border-gray-300';

    return `
      <div class="relative">
        <input type="number" value="${displayValue}" aria-label="ערך CAGR"
           data-portfolio-action="update-cagr-manual"
           data-portfolio-type="${type}"
           data-asset-id="${asset.id}"
               placeholder="אחוז שנתי (%)"
               class="w-full min-w-[120px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${inputBgClass}"
               ${isFromHistorical ? 'readonly' : ''}
               title="${isFromHistorical ? 'ערך CAGR היסטורי - לשינוי בחר CAGR ידני בשיטת החישוב' : 'הזן ערך CAGR ידנית'}">
        ${isFromHistorical ? '<span class="absolute left-1 top-1 text-xs text-green-600 font-bold" title="CAGR היסטורי">📊</span>' : ''}
      </div>
    `;
  } else {
    // For צמיחה כוללת or ידני methods
    return `
      <input type="number" value="${asset.value1}" aria-label="ערך צמיחה"
             data-portfolio-action="update-field"
             data-portfolio-type="${type}"
             data-asset-id="${asset.id}"
             data-portfolio-field="value1"
             placeholder="ערך"
             class="w-full min-w-[120px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             >
    `;
  }
}

/**
 * Generate a single accumulation table row HTML
 */
export function generateAccumulationRowHtml(
  asset: PortfolioAsset,
  type: PortfolioType,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency,
  totalPortfolioValue: number,
  yearsToRetirement: number
): string {
  const rowCurrency = getAssetCurrencySymbol(asset.currentPrice);
  const costBasis = calculateCostBasis(asset, exchangeRates, rowCurrency);
  const marketValue = calculateMarketValue(asset, exchangeRates, rowCurrency);
  const unrealizedGainLoss = calculateUnrealizedGainLoss(asset, exchangeRates, rowCurrency);
  const exposure = calculateExposure(asset, totalPortfolioValue, exchangeRates, displayCurrency);
  const currentMarketCapUsd = normalizeMarketCapValue(asset.marketCapUsd);
  const projectedMarketCapUsd = calculateProjectedMarketCap(asset, yearsToRetirement);
  const currentMarketCapCell = renderMarketCapValue(currentMarketCapUsd, exchangeRates, rowCurrency);
  const projectedMarketCapCell = renderMarketCapValue(projectedMarketCapUsd, exchangeRates, rowCurrency);
  const projectedMultiplier = calculateAssetValueMultiplier(asset, yearsToRetirement);
  const projectedMultiplierCell = renderMultiplierValue(projectedMultiplier);

  const gainLossColor = unrealizedGainLoss >= 0 ? 'text-green-600' : 'text-red-600';
  const gainLossSign = unrealizedGainLoss >= 0 ? '+' : '';

  const valuesHtml = generateValuesInputHtml(asset, type);
  const methodDropdownHtml = generateMethodDropdownHtml(asset, type);
  const priceInputHtml = generateCurrentPriceInputHtml(asset, type);
  const safeSymbol = escapeHtml(asset.symbol);
  const safeAssetName = escapeHtml(asset.assetName);

  // Get currency symbol for dropdown
  const currencySymbol = getAssetCurrencySymbol(asset.currentPrice);

  return `
    <td class="frozen-column px-3 py-4">
            <input type="text" value="${safeSymbol}" aria-label="סמל נכס" data-portfolio-action="update-symbol" data-portfolio-type="${type}" data-asset-id="${asset.id}" class="w-full min-w-[120px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="סמל נכס (AAPL, MSFT...)"
              >
      ${asset.assetName ? `<div class="text-xs text-gray-500 mt-1">${safeAssetName}</div>` : ''}
    </td>
    <td class="px-2 py-4">
      <input type="number" value="${asset.quantity}" aria-label="כמות נכס" data-portfolio-action="update-field" data-portfolio-type="${type}" data-asset-id="${asset.id}" data-portfolio-field="quantity" class="w-full min-w-[80px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="כמות יחידות"
             min="0" step="0.01"
             >
    </td>
    <td class="px-2 py-4">
      <select aria-label="מטבע נכס" class="w-full border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-portfolio-action="update-currency" data-portfolio-type="${type}" data-asset-id="${asset.id}">
        <option value="$" ${currencySymbol === '$' ? 'selected' : ''}>$</option>
        <option value="₪" ${currencySymbol === '₪' ? 'selected' : ''}>₪</option>
      </select>
    </td>
    <td class="px-2 py-4">
      ${priceInputHtml}
    </td>
    <td class="px-2 py-4">
            <input type="number" value="${asset.averageCost.amount}" aria-label="מחיר עלות ממוצע" data-portfolio-action="update-cost" data-portfolio-type="${type}" data-asset-id="${asset.id}" class="w-full min-w-[80px] border rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
             placeholder="מחיר עלות ממוצע"
             min="0" step="0.01"
              >
    </td>
    <td class="px-2 py-4 text-right" data-cost-basis="${costBasis}">
      <span class="text-sm font-medium text-gray-700">${safeFormatCurrency(costBasis, rowCurrency)}</span>
    </td>
    <td class="px-2 py-4 text-right" data-market-value="${marketValue}">
      <span class="text-sm font-medium text-gray-900">${safeFormatCurrency(marketValue, rowCurrency)}</span>
    </td>
    <td class="px-2 py-4 text-right" data-market-cap="${currentMarketCapUsd ?? ''}">
      ${currentMarketCapCell}
    </td>
    <td class="px-2 py-4 text-right" data-market-cap-projected="${projectedMarketCapUsd ?? ''}">
      ${projectedMarketCapCell}
    </td>
    <td class="px-2 py-4 text-right" data-gain-loss="${unrealizedGainLoss}">
      <span class="text-sm font-medium ${gainLossColor}">${gainLossSign}${safeFormatCurrency(Math.abs(unrealizedGainLoss), rowCurrency)}</span>
    </td>
    <td class="px-2 py-4 text-right" data-exposure="${exposure}">
      <span class="text-sm font-medium text-blue-600">${isNaN(exposure) ? '0.0' : exposure.toFixed(1)}%</span>
    </td>
    <td class="px-2 py-4 text-right" data-asset-multiplier="${projectedMultiplier ?? ''}">
      ${projectedMultiplierCell}
    </td>
    <td class="px-3 py-4">
      ${methodDropdownHtml}
    </td>
    <td class="px-3 py-4">
      ${valuesHtml}
    </td>
    <td class="px-2 py-4 text-center">
      <button type="button" aria-label="הסר נכס" data-portfolio-action="remove" data-portfolio-type="${type}" data-asset-id="${asset.id}"
              data-testid="portfolio-remove-asset"
              class="text-red-600 hover:text-red-800 hover:bg-red-50 rounded p-2 transition-colors">
        🗑️
      </button>
    </td>
  `;
}

/**
 * Render the portfolio table
 */
export function renderPortfolioTable(
  tableId: string,
  portfolio: PortfolioAsset[],
  type: PortfolioType,
  exchangeRates: { usdToIls: number; ilsToUsd: number },
  displayCurrency: Currency,
  yearsToRetirement = 0
): void {
  const table = document.getElementById(tableId) as HTMLTableSectionElement | null;
  if (!table) {
    console.error('Table not found:', tableId);
    return;
  }
  table.innerHTML = '';

  const totalPortfolioValue = calculateTotalPortfolioValue(portfolio, exchangeRates, displayCurrency);

  portfolio.forEach(asset => {
    const row = table.insertRow();
    row.setAttribute('data-testid', 'accumulation-asset-row');
    row.dataset.assetId = String(asset.id);
    row.dataset.portfolioType = type;
    const html = generateAccumulationRowHtml(
      asset,
      type,
      exchangeRates,
      displayCurrency,
      totalPortfolioValue,
      yearsToRetirement
    );
    row.innerHTML = html;
  });
}

/**
 * Update asset symbol with automatic price and CAGR fetching
 */
export async function updateAssetSymbol(
  portfolio: PortfolioAsset[],
  id: number,
  symbol: string,
  onUpdate: () => void
): Promise<void> {
  const asset = portfolio.find(a => a.id === id);
  if (!asset || !symbol || !symbol.trim()) return;

  const oldSymbol = asset.symbol;
  asset.symbol = symbol.trim().toUpperCase();

  // Only fetch if symbol actually changed
  if (oldSymbol === asset.symbol) return;

  // Clear old asset name to prevent stale data when symbol changes
  asset.assetName = '';

  // Mark as loading
  asset.loadingCAGR = true;
  onUpdate();

  try {
    // Fetch price, company profile, and CAGRs in parallel
    const [price, profile, cagrs] = await Promise.all([
      fetchAssetPrice(asset.symbol),
      fetchAssetProfile(asset.symbol),
      fetchHistoricalCAGRs(asset.symbol)
    ]);

    if (price !== null) {
      // Create Money object with the price (API returns USD)
      asset.currentPrice = Money.usd(price);
      asset.priceSource = 'api';
    } else {
      asset.priceSource = 'manual';
    }

    if (profile !== null) {
      asset.assetName = profile.name || '';
      asset.marketCapUsd = typeof profile.marketCapUsd === 'number' ? profile.marketCapUsd : null;
    } else {
      // No profile data from backend
      asset.assetName = '';
      asset.marketCapUsd = null;
    }

    if (cagrs !== null) {
      asset.historicalCAGRs = cagrs;
      asset.cagrSource = 'manual';
    } else {
      asset.historicalCAGRs = {};
    }

    asset.loadingCAGR = false;
  } catch (error) {
    console.warn(`Failed to fetch data for ${asset.symbol}:`, error);
    asset.priceSource = 'manual';
    asset.loadingCAGR = false;
    asset.historicalCAGRs = {};
  }

  onUpdate();
}

/**
 * Handle method change including CAGR source selection
 */
export function handleAssetMethodChange(
  portfolio: PortfolioAsset[],
  id: number,
  value: string
): void {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  if (value.startsWith('CAGR:')) {
    const source = value.split(':')[1];
    asset.method = 'CAGR';
    asset.cagrSource = source;

    // If selecting a historical CAGR, use its value
    if (source !== 'manual' && asset.historicalCAGRs) {
      const years = parseInt(source);
      const historicalValue = asset.historicalCAGRs[years];
      if (historicalValue !== null && historicalValue !== undefined) {
        asset.value1 = historicalValue;
      }
    }
  } else {
    // Cast to CalculationMethod - these are the valid values from the dropdown
    asset.method = value as import('../types/index.js').CalculationMethod;
    asset.cagrSource = 'manual';
  }
}

/**
 * Remove an asset from portfolio
 */
export function removeAssetFromPortfolio(
  portfolio: PortfolioAsset[],
  id: number
): PortfolioAsset[] {
  return portfolio.filter(a => a.id !== id);
}

/**
 * Update a single field on an asset (for non-Money fields)
 */
export function updateAssetField(
  portfolio: PortfolioAsset[],
  id: number,
  field: keyof PortfolioAsset,
  value: unknown
): void {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  // TypeScript-safe dynamic field update
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (asset as any)[field] = value;
}

/**
 * Update asset current price (creates new Money object)
 */
export function updateAssetPrice(
  portfolio: PortfolioAsset[],
  id: number,
  amount: number
): void {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  // Preserve the currency, update the amount
  const currency = asset.currentPrice.currency;
  asset.currentPrice = currency === 'USD' ? Money.usd(amount) : Money.ils(amount);
  asset.priceSource = 'manual';
}

/**
 * Update asset average cost (creates new Money object)
 */
export function updateAssetCost(
  portfolio: PortfolioAsset[],
  id: number,
  amount: number
): void {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  // Preserve the currency, update the amount
  const currency = asset.averageCost.currency;
  asset.averageCost = currency === 'USD' ? Money.usd(amount) : Money.ils(amount);
}

/**
 * Update asset currency (updates both currentPrice and averageCost Money objects)
 */
export function updateAssetCurrency(
  portfolio: PortfolioAsset[],
  id: number,
  symbol: '$' | '₪'
): void {
  const asset = portfolio.find(a => a.id === id);
  if (!asset) return;

  // Create new Money objects with the same amounts but new currency
  const priceAmount = asset.currentPrice.amount;
  const costAmount = asset.averageCost.amount;

  if (symbol === '$') {
    asset.currentPrice = Money.usd(priceAmount);
    asset.averageCost = Money.usd(costAmount);
  } else {
    asset.currentPrice = Money.ils(priceAmount);
    asset.averageCost = Money.ils(costAmount);
  }
}

/**
 * Fetch historical CAGRs for all assets in a portfolio
 */
export async function fetchCAGRsForPortfolio(
  portfolio: PortfolioAsset[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const assetsWithSymbols = portfolio.filter(a => a.symbol && a.symbol.trim());

  if (assetsWithSymbols.length === 0) return;

  const fetchPromises = assetsWithSymbols.map(async (asset, index) => {
    try {
      const cagrs = await fetchHistoricalCAGRs(asset.symbol);
      if (cagrs !== null) {
        asset.historicalCAGRs = cagrs;
        if (!asset.cagrSource) {
          asset.cagrSource = 'manual';
        }
      } else {
        asset.historicalCAGRs = {};
      }

      onProgress?.(index + 1, assetsWithSymbols.length);
    } catch (error) {
      console.warn(`Error fetching CAGRs for ${asset.symbol}:`, error);
      asset.historicalCAGRs = {};
    }
  });

  await Promise.all(fetchPromises);
}

interface MarketCapOptions {
  force?: boolean;
  onProgress?: (current: number, total: number) => void;
}

export async function fetchMarketCapsForPortfolio(
  portfolio: PortfolioAsset[],
  options?: MarketCapOptions
): Promise<void> {
  const assetsWithSymbols = portfolio.filter(a => a.symbol && a.symbol.trim());
  if (assetsWithSymbols.length === 0) return;

  const candidates = options?.force
    ? assetsWithSymbols
    : assetsWithSymbols.filter(asset => !asset.marketCapUsd);

  if (candidates.length === 0) return;

  let completed = 0;
  for (const asset of candidates) {
    try {
      const profile = await fetchAssetProfile(asset.symbol);
      if (profile) {
        if (typeof profile.marketCapUsd === 'number' && profile.marketCapUsd > 0) {
          asset.marketCapUsd = profile.marketCapUsd;
        }
        if (profile.name && !asset.assetName) {
          asset.assetName = profile.name;
        }
      }
    } catch (error) {
      console.warn(`Error fetching market cap for ${asset.symbol}:`, error);
    } finally {
      completed += 1;
      options?.onProgress?.(completed, candidates.length);
    }
  }
}

/**
 * Fetch current prices for all assets in portfolio from Finnhub API
 * This updates the currentPrice field with live data
 */
export async function fetchPricesForPortfolio(
  portfolio: PortfolioAsset[],
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  const assetsWithSymbols = portfolio.filter(a => a.symbol && a.symbol.trim());

  if (assetsWithSymbols.length === 0) return;

  const fetchPromises = assetsWithSymbols.map(async (asset, index) => {
    try {
      const response = await fetchAssetPriceResponse(asset.symbol);
      if (response !== null && response.price !== undefined) {
        // Create Money object based on API response currency
        const currency = response.currency === 'ILS' ? 'ILS' : 'USD';
        asset.currentPrice = currency === 'USD'
          ? Money.usd(response.price)
          : Money.ils(response.price);
        asset.priceSource = 'api';
      }
      // If price fetch fails, keep the existing price from the file

      onProgress?.(index + 1, assetsWithSymbols.length);
    } catch (error) {
      console.warn(`Error fetching price for ${asset.symbol}:`, error);
      // Keep existing price on error
    }
  });

  await Promise.all(fetchPromises);
}
