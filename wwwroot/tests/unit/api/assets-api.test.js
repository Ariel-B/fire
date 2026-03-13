/**
 * Assets API Unit Tests
 * Tests all exported functions from wwwroot/ts/api/assets-api.ts
 * Uses global.fetch mocking (Node 18+ native fetch)
 */

import {
  fetchAssetPriceResponse,
  fetchAssetPrice,
  fetchBatchPrices,
  fetchAssetCAGR,
  fetchBatchCAGRs,
  fetchAssetProfile,
  fetchAssetName,
  fetchHistoricalCAGRs,
  validateSymbol,
  fetchUsdIlsRate,
  fetchExchangeRateDetails,
  fetchExchangeRate
} from '../../../js/api/assets-api.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function mockFetch(ok, jsonPayload) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 404,
    json: jest.fn().mockResolvedValue(jsonPayload)
  });
}

function mockFetchError(message = 'Network error') {
  global.fetch = jest.fn().mockRejectedValue(new Error(message));
}

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// ============================================================================
// fetchAssetPriceResponse
// ============================================================================

describe('fetchAssetPriceResponse', () => {
  test('returns parsed json on success', async () => {
    const payload = { symbol: 'AAPL', price: 195.5, currency: 'USD' };
    mockFetch(true, payload);
    const result = await fetchAssetPriceResponse('AAPL');
    expect(result).toEqual(payload);
    expect(global.fetch).toHaveBeenCalledWith('/api/AssetPrices/AAPL');
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const result = await fetchAssetPriceResponse('INVALID');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchAssetPriceResponse('AAPL');
    expect(result).toBeNull();
  });

  test('URL-encodes the symbol', async () => {
    mockFetch(true, { symbol: 'BRK.B', price: 400 });
    await fetchAssetPriceResponse('BRK.B');
    expect(global.fetch).toHaveBeenCalledWith('/api/AssetPrices/BRK.B');
  });
});

// ============================================================================
// fetchAssetPrice
// ============================================================================

describe('fetchAssetPrice', () => {
  test('returns price number on success', async () => {
    mockFetch(true, { symbol: 'VTI', price: 250.0 });
    const price = await fetchAssetPrice('VTI');
    expect(price).toBe(250.0);
  });

  test('returns null when response is null', async () => {
    mockFetch(false, {});
    const price = await fetchAssetPrice('INVALID');
    expect(price).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const price = await fetchAssetPrice('VTI');
    expect(price).toBeNull();
  });
});

// ============================================================================
// fetchBatchPrices
// ============================================================================

describe('fetchBatchPrices', () => {
  test('returns null for empty array', async () => {
    global.fetch = jest.fn();
    const result = await fetchBatchPrices([]);
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('returns null for null input', async () => {
    global.fetch = jest.fn();
    const result = await fetchBatchPrices(null);
    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('posts uppercase symbols and returns response', async () => {
    const payload = { prices: { VTI: 250, VXUS: 60 } };
    mockFetch(true, payload);
    const result = await fetchBatchPrices(['vti', 'vxus']);
    expect(result).toEqual(payload);
    const callArgs = global.fetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body);
    expect(body.symbols).toEqual(['VTI', 'VXUS']);
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const result = await fetchBatchPrices(['VTI']);
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchBatchPrices(['VTI']);
    expect(result).toBeNull();
  });
});

// ============================================================================
// fetchAssetCAGR
// ============================================================================

describe('fetchAssetCAGR', () => {
  test('returns CAGR response on success', async () => {
    const payload = { symbol: 'VTI', cagr: 8.5 };
    mockFetch(true, payload);
    const result = await fetchAssetCAGR('VTI');
    expect(result).toEqual(payload);
  });

  test('returns null on failure', async () => {
    mockFetch(false, {});
    const result = await fetchAssetCAGR('INVALID');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchAssetCAGR('VTI');
    expect(result).toBeNull();
  });
});

// ============================================================================
// fetchBatchCAGRs
// ============================================================================

describe('fetchBatchCAGRs', () => {
  test('returns empty object for empty array', async () => {
    const result = await fetchBatchCAGRs([]);
    expect(result).toEqual({});
  });

  test('aggregates successful CAGR responses keyed by symbol', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ cagr: 8.5 }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ cagr: 3.2 }) });

    const result = await fetchBatchCAGRs(['VTI', 'BND']);
    expect(result.VTI).toBe(8.5);
    expect(result.BND).toBe(3.2);
  });

  test('skips symbols where CAGR is undefined', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) }); // no cagr field

    const result = await fetchBatchCAGRs(['VTI']);
    expect(result.VTI).toBeUndefined();
  });

  test('handles mixed success/failure gracefully', async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 404, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ cagr: 7.0 }) });

    const result = await fetchBatchCAGRs(['INVALID', 'VTI']);
    expect(result.INVALID).toBeUndefined();
    expect(result.VTI).toBe(7.0);
  });
});

// ============================================================================
// fetchAssetProfile
// ============================================================================

describe('fetchAssetProfile', () => {
  test('returns null for empty symbol', async () => {
    const result = await fetchAssetProfile('');
    expect(result).toBeNull();
  });

  test('returns null for whitespace-only symbol', async () => {
    const result = await fetchAssetProfile('   ');
    expect(result).toBeNull();
  });

  test('returns mapped profile on success', async () => {
    const apiData = { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', marketCapUsd: 1e12, marketCapCurrency: 'USD' };
    mockFetch(true, apiData);
    const result = await fetchAssetProfile('VTI');
    expect(result.symbol).toBe('VTI');
    expect(result.name).toBe('Vanguard Total Stock Market ETF');
    expect(result.marketCapUsd).toBe(1e12);
    expect(result.marketCapCurrency).toBe('USD');
  });

  test('defaults symbol to uppercase when missing in response', async () => {
    mockFetch(true, { name: 'Some ETF' });
    const result = await fetchAssetProfile('vti');
    expect(result.symbol).toBe('VTI');
  });

  test('defaults name to null when missing', async () => {
    mockFetch(true, { symbol: 'XYZ' });
    const result = await fetchAssetProfile('XYZ');
    expect(result.name).toBeNull();
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const result = await fetchAssetProfile('INVALID');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchAssetProfile('VTI');
    expect(result).toBeNull();
  });
});

// ============================================================================
// fetchAssetName
// ============================================================================

describe('fetchAssetName', () => {
  test('returns name string on success', async () => {
    mockFetch(true, { symbol: 'VTI', name: 'Vanguard Total Market' });
    const name = await fetchAssetName('VTI');
    expect(name).toBe('Vanguard Total Market');
  });

  test('returns null when profile has no name', async () => {
    mockFetch(true, { symbol: 'VTI' });
    const name = await fetchAssetName('VTI');
    expect(name).toBeNull();
  });

  test('returns null when profile fetch fails', async () => {
    mockFetch(false, {});
    const name = await fetchAssetName('INVALID');
    expect(name).toBeNull();
  });
});

// ============================================================================
// fetchHistoricalCAGRs
// ============================================================================

describe('fetchHistoricalCAGRs', () => {
  test('returns null for empty symbol', async () => {
    const result = await fetchHistoricalCAGRs('');
    expect(result).toBeNull();
  });

  test('returns null for whitespace symbol', async () => {
    const result = await fetchHistoricalCAGRs('   ');
    expect(result).toBeNull();
  });

  test('maps cagRs array (default .NET camelCase property) to object', async () => {
    const payload = { cagRs: [{ years: 3, value: 7.5 }, { years: 5, value: 8.2 }, { years: 10, value: 9.1 }] };
    mockFetch(true, payload);
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result[3]).toBe(7.5);
    expect(result[5]).toBe(8.2);
    expect(result[10]).toBe(9.1);
  });

  test('falls back to caGRs property name variant', async () => {
    const payload = { caGRs: [{ years: 5, value: 8.0 }] };
    mockFetch(true, payload);
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result[5]).toBe(8.0);
  });

  test('falls back to cagrs (lowercase) property name', async () => {
    const payload = { cagrs: [{ years: 10, value: 9.5 }] };
    mockFetch(true, payload);
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result[10]).toBe(9.5);
  });

  test('returns empty object when cagr array is empty', async () => {
    mockFetch(true, { cagRs: [] });
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result).toEqual({});
  });

  test('returns empty object when cagr array is missing', async () => {
    mockFetch(true, {});
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result).toEqual({});
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchHistoricalCAGRs('VTI');
    expect(result).toBeNull();
  });
});

// ============================================================================
// validateSymbol
// ============================================================================

describe('validateSymbol', () => {
  test('returns true when response is ok', async () => {
    mockFetch(true, {});
    const result = await validateSymbol('VTI');
    expect(result).toBe(true);
  });

  test('returns false when response is not ok', async () => {
    mockFetch(false, {});
    const result = await validateSymbol('INVALID');
    expect(result).toBe(false);
  });

  test('returns false on network error', async () => {
    mockFetchError();
    const result = await validateSymbol('VTI');
    expect(result).toBe(false);
  });
});

// ============================================================================
// fetchUsdIlsRate
// ============================================================================

describe('fetchUsdIlsRate', () => {
  test('returns rate from API on success', async () => {
    mockFetch(true, { baseCurrency: 'USD', targetCurrency: 'ILS', rate: 3.72, timestamp: '', source: 'test' });
    const rate = await fetchUsdIlsRate();
    expect(rate).toBe(3.72);
  });

  test('returns default rate (3.6) on non-ok response', async () => {
    mockFetch(false, {});
    const rate = await fetchUsdIlsRate();
    expect(rate).toBe(3.6);
  });

  test('returns default rate (3.6) on network error', async () => {
    mockFetchError();
    const rate = await fetchUsdIlsRate();
    expect(rate).toBe(3.6);
  });

  test('returns default rate when rate field is missing', async () => {
    mockFetch(true, { baseCurrency: 'USD', targetCurrency: 'ILS' }); // no rate field
    const rate = await fetchUsdIlsRate();
    expect(rate).toBe(3.6);
  });
});

// ============================================================================
// fetchExchangeRateDetails
// ============================================================================

describe('fetchExchangeRateDetails', () => {
  test('returns full response object on success', async () => {
    const payload = { baseCurrency: 'USD', targetCurrency: 'ILS', rate: 3.72, timestamp: '2026-01-01', source: 'api' };
    mockFetch(true, payload);
    const result = await fetchExchangeRateDetails();
    expect(result).toEqual(payload);
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const result = await fetchExchangeRateDetails();
    expect(result).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const result = await fetchExchangeRateDetails();
    expect(result).toBeNull();
  });
});

// ============================================================================
// fetchExchangeRate
// ============================================================================

describe('fetchExchangeRate', () => {
  test('returns rate for given currency pair', async () => {
    mockFetch(true, { baseCurrency: 'USD', targetCurrency: 'EUR', rate: 0.92, timestamp: '', source: 'test' });
    const rate = await fetchExchangeRate('USD', 'EUR');
    expect(rate).toBe(0.92);
    expect(global.fetch).toHaveBeenCalledWith('/api/ExchangeRate/USD/EUR');
  });

  test('returns null on non-ok response', async () => {
    mockFetch(false, {});
    const rate = await fetchExchangeRate('USD', 'EUR');
    expect(rate).toBeNull();
  });

  test('returns null on network error', async () => {
    mockFetchError();
    const rate = await fetchExchangeRate('USD', 'EUR');
    expect(rate).toBeNull();
  });

  test('returns null when rate field is missing', async () => {
    mockFetch(true, { baseCurrency: 'USD', targetCurrency: 'EUR' }); // no rate
    const rate = await fetchExchangeRate('USD', 'EUR');
    expect(rate).toBeNull();
  });
});
