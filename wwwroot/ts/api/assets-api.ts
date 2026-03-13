/**
 * Assets API Client
 * API calls for asset prices and CAGR data
 */

import type { AssetPriceResponse, AssetCAGRResponse, AssetProfileResponse, BatchPriceResponse } from '../types/index.js';

const API_BASE = '/api/AssetPrices';

/**
 * Fetch current price for a single asset (returns full response)
 */
export async function fetchAssetPriceResponse(symbol: string): Promise<AssetPriceResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      console.warn(`Failed to fetch price for ${symbol}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch current price for a single asset (returns just the price number)
 */
export async function fetchAssetPrice(symbol: string): Promise<number | null> {
  const response = await fetchAssetPriceResponse(symbol);
  return response?.price ?? null;
}

/**
 * Fetch prices for multiple assets in batch
 */
export async function fetchBatchPrices(symbols: string[]): Promise<BatchPriceResponse | null> {
  if (!symbols || symbols.length === 0) return null;

  try {
    const response = await fetch(`${API_BASE}/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbols: symbols.map(s => s.toUpperCase()) })
    });

    if (!response.ok) {
      console.warn(`Failed to fetch batch prices: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching batch prices:', error);
    return null;
  }
}

/**
 * Fetch historical CAGR for a single asset
 */
export async function fetchAssetCAGR(symbol: string): Promise<AssetCAGRResponse | null> {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(symbol)}/cagr`);
    if (!response.ok) {
      console.warn(`Failed to fetch CAGR for ${symbol}: ${response.status}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching CAGR for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch CAGRs for multiple assets
 */
export async function fetchBatchCAGRs(symbols: string[]): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  // Fetch all CAGRs in parallel
  const promises = symbols.map(async (symbol) => {
    const data = await fetchAssetCAGR(symbol);
    if (data && data.cagr !== undefined) {
      results[symbol] = data.cagr;
    }
  });

  await Promise.all(promises);
  return results;
}

/**
 * Fetch asset profile (name + market cap)
 */
export async function fetchAssetProfile(symbol: string): Promise<AssetProfileResponse | null> {
  if (!symbol || !symbol.trim()) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(symbol.trim())}/name`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch profile for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    return {
      symbol: data.symbol ?? symbol.toUpperCase(),
      name: data.name ?? null,
      marketCapUsd: data.marketCapUsd ?? undefined,
      marketCapCurrency: data.marketCapCurrency ?? 'USD'
    };
  } catch (error) {
    console.warn(`Error fetching profile for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch asset name (backwards compatibility helper)
 */
export async function fetchAssetName(symbol: string): Promise<string | null> {
  const profile = await fetchAssetProfile(symbol);
  return profile?.name ?? null;
}

/**
 * Fetch historical CAGRs for multiple timeframes (returns object format)
 */
export async function fetchHistoricalCAGRs(symbol: string): Promise<Record<number, number> | null> {
  if (!symbol || !symbol.trim()) {
    return null;
  }

  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(symbol.trim())}/cagr`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch CAGRs for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    // Convert array to object for easier access
    // Handle various case variants: cagRs (default .NET camelCase), caGRs, CAGRs, cagrs
    const cagrs: Record<number, number> = {};
    const cagrArray = data.cagRs || data.caGRs || data.CAGRs || data.cagrs || [];
    
    if (Array.isArray(cagrArray)) {
      cagrArray.forEach((item: { years: number; value: number }) => {
        cagrs[item.years] = item.value;
      });
    }
    
    return cagrs;
  } catch (error) {
    console.warn(`Error fetching CAGRs for ${symbol}:`, error);
    return null;
  }
}

/**
 * Validate if a symbol exists
 */
export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/${encodeURIComponent(symbol)}`);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// Exchange Rate API
// ============================================================================

const EXCHANGE_RATE_API_BASE = '/api/ExchangeRate';
const DEFAULT_USD_ILS_RATE = 3.6;

/**
 * Response type for exchange rate API
 */
export interface ExchangeRateApiResponse {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  timestamp: string;
  source: string;
}

/**
 * Fetch the current USD/ILS exchange rate from the API.
 * Returns the rate, or the default rate (3.6) if the API call fails.
 */
export async function fetchUsdIlsRate(): Promise<number> {
  try {
    const response = await fetch(`${EXCHANGE_RATE_API_BASE}/usd-ils`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch USD/ILS rate: ${response.status}`);
      return DEFAULT_USD_ILS_RATE;
    }
    
    const data: ExchangeRateApiResponse = await response.json();
    return data.rate ?? DEFAULT_USD_ILS_RATE;
  } catch (error) {
    console.error('Error fetching USD/ILS exchange rate:', error);
    return DEFAULT_USD_ILS_RATE;
  }
}

/**
 * Fetch the full exchange rate response (includes metadata like source and timestamp).
 */
export async function fetchExchangeRateDetails(): Promise<ExchangeRateApiResponse | null> {
  try {
    const response = await fetch(`${EXCHANGE_RATE_API_BASE}/usd-ils`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch exchange rate details: ${response.status}`);
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching exchange rate details:', error);
    return null;
  }
}

/**
 * Fetch exchange rate between any two currencies.
 * @param from Base currency code (e.g., 'USD')
 * @param to Target currency code (e.g., 'ILS')
 * @returns Exchange rate, or null if not available
 */
export async function fetchExchangeRate(from: string, to: string): Promise<number | null> {
  try {
    const response = await fetch(`${EXCHANGE_RATE_API_BASE}/${encodeURIComponent(from)}/${encodeURIComponent(to)}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch ${from}/${to} rate: ${response.status}`);
      return null;
    }
    
    const data: ExchangeRateApiResponse = await response.json();
    return data.rate ?? null;
  } catch (error) {
    console.error(`Error fetching ${from}/${to} exchange rate:`, error);
    return null;
  }
}
