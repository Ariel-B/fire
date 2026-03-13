/**
 * CAGR Fetching Unit Tests
 * Tests for historical CAGR (Compound Annual Growth Rate) fetching functionality
 * 
 * Test Organization:
 * - API response parsing with different property name cases
 * - CAGR data transformation from array to object
 * - Error handling for failed API requests
 * - Integration with portfolio assets
 */

// Mock fetch function
global.fetch = jest.fn();

// The fetchHistoricalCAGRs function extracted from index.html
async function fetchHistoricalCAGRs(symbol) {
    if (!symbol || !symbol.trim()) {
        return null;
    }

    try {
        const response = await fetch(`/api/AssetPrices/${encodeURIComponent(symbol.trim())}/cagr`);
        
        if (response.ok) {
            const data = await response.json();
            // Convert array to object for easier access
            // Handle various case variants: cagRs (default .NET camelCase), caGRs, CAGRs, cagrs
            const cagrs = {};
            const cagrArray = data.cagRs || data.caGRs || data.CAGRs || data.cagrs;
            if (cagrArray) {
                cagrArray.forEach(item => {
                    cagrs[item.years] = item.value;
                });
            }
            return cagrs;
        } else {
            console.warn(`Failed to fetch CAGRs for ${symbol}: ${response.status}`);
            return null;
        }
    } catch (error) {
        console.warn(`Error fetching CAGRs for ${symbol}:`, error);
        return null;
    }
}

// Helper function to create mock response
function createMockResponse(data, ok = true, status = 200) {
    return {
        ok,
        status,
        json: () => Promise.resolve(data)
    };
}

describe('CAGR Fetching', () => {
    beforeEach(() => {
        fetch.mockClear();
        console.warn = jest.fn(); // Suppress console warnings in tests
    });

    describe('Input Validation', () => {
        test('returns null for empty symbol', async () => {
            const result = await fetchHistoricalCAGRs('');
            expect(result).toBeNull();
            expect(fetch).not.toHaveBeenCalled();
        });

        test('returns null for null symbol', async () => {
            const result = await fetchHistoricalCAGRs(null);
            expect(result).toBeNull();
            expect(fetch).not.toHaveBeenCalled();
        });

        test('returns null for undefined symbol', async () => {
            const result = await fetchHistoricalCAGRs(undefined);
            expect(result).toBeNull();
            expect(fetch).not.toHaveBeenCalled();
        });

        test('returns null for whitespace-only symbol', async () => {
            const result = await fetchHistoricalCAGRs('   ');
            expect(result).toBeNull();
            expect(fetch).not.toHaveBeenCalled();
        });

        test('trims symbol before sending request', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                cagRs: []
            }));
            
            await fetchHistoricalCAGRs('  AAPL  ');
            expect(fetch).toHaveBeenCalledWith('/api/AssetPrices/AAPL/cagr');
        });
    });

    describe('API Response Parsing - Property Name Variants', () => {
        const expectedCagrs = {
            1: 14.53,
            3: 23.40,
            5: 17.96,
            10: 27.62,
            15: 22.87,
            20: 26.68
        };

        const cagrArray = [
            { years: 1, value: 14.53 },
            { years: 3, value: 23.40 },
            { years: 5, value: 17.96 },
            { years: 10, value: 27.62 },
            { years: 15, value: 22.87 },
            { years: 20, value: 26.68 }
        ];

        test('parses cagRs property (default .NET camelCase)', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                cagRs: cagrArray,
                timestamp: '2025-11-25T21:19:10.828626Z'
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual(expectedCagrs);
        });

        test('parses caGRs property (alternative case)', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                caGRs: cagrArray,
                timestamp: '2025-11-25T21:19:10.828626Z'
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual(expectedCagrs);
        });

        test('parses CAGRs property (uppercase)', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                CAGRs: cagrArray,
                timestamp: '2025-11-25T21:19:10.828626Z'
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual(expectedCagrs);
        });

        test('parses cagrs property (lowercase)', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                cagrs: cagrArray,
                timestamp: '2025-11-25T21:19:10.828626Z'
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual(expectedCagrs);
        });

        test('prioritizes cagRs over other property names', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                cagRs: [{ years: 1, value: 10 }],
                caGRs: [{ years: 1, value: 20 }],
                CAGRs: [{ years: 1, value: 30 }],
                cagrs: [{ years: 1, value: 40 }]
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual({ 1: 10 });
        });
    });

    describe('Data Transformation', () => {
        test('converts array to object keyed by years', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'MSFT',
                cagRs: [
                    { years: 1, value: 20.15 },
                    { years: 5, value: 15.47 }
                ]
            }));

            const result = await fetchHistoricalCAGRs('MSFT');
            expect(result[1]).toBe(20.15);
            expect(result[5]).toBe(15.47);
            expect(result[3]).toBeUndefined();
        });

        test('handles null values in CAGR array', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                cagRs: [
                    { years: 1, value: 14.53 },
                    { years: 3, value: null },
                    { years: 5, value: 17.96 }
                ]
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result[1]).toBe(14.53);
            expect(result[3]).toBeNull();
            expect(result[5]).toBe(17.96);
        });

        test('returns empty object when cagRs array is empty', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'UNKNOWN',
                cagRs: []
            }));

            const result = await fetchHistoricalCAGRs('UNKNOWN');
            expect(result).toEqual({});
        });

        test('returns empty object when cagRs property is missing', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'AAPL',
                timestamp: '2025-11-25T21:19:10.828626Z'
            }));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toEqual({});
        });
    });

    describe('Error Handling', () => {
        test('returns null for non-OK response', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({}, false, 404));

            const result = await fetchHistoricalCAGRs('INVALID');
            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Failed to fetch CAGRs for INVALID: 404')
            );
        });

        test('returns null for 500 server error', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({}, false, 500));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toBeNull();
        });

        test('returns null when fetch throws network error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalledWith(
                expect.stringContaining('Error fetching CAGRs for AAPL:'),
                expect.any(Error)
            );
        });

        test('returns null when JSON parsing fails', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const result = await fetchHistoricalCAGRs('AAPL');
            expect(result).toBeNull();
        });
    });

    describe('URL Encoding', () => {
        test('properly encodes symbol with special characters', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'BRK.B',
                cagRs: [{ years: 1, value: 10 }]
            }));

            await fetchHistoricalCAGRs('BRK.B');
            expect(fetch).toHaveBeenCalledWith('/api/AssetPrices/BRK.B/cagr');
        });

        test('encodes symbol with spaces', async () => {
            fetch.mockResolvedValueOnce(createMockResponse({
                symbol: 'TEST SYMBOL',
                cagRs: []
            }));

            await fetchHistoricalCAGRs('TEST SYMBOL');
            expect(fetch).toHaveBeenCalledWith('/api/AssetPrices/TEST%20SYMBOL/cagr');
        });
    });
});

describe('CAGR Integration with Portfolio Assets', () => {
    // Helper function to simulate portfolio asset update
    function updateAssetWithCAGRs(asset, cagrs) {
        if (cagrs !== null) {
            asset.historicalCAGRs = cagrs;
            asset.cagrSource = 'manual';
        } else {
            asset.historicalCAGRs = {};
        }
        asset.loadingCAGR = false;
        return asset;
    }

    test('stores fetched CAGRs in asset', () => {
        const asset = {
            id: 1,
            symbol: 'AAPL',
            loadingCAGR: true
        };

        const cagrs = {
            1: 14.53,
            3: 23.40,
            5: 17.96
        };

        const updated = updateAssetWithCAGRs(asset, cagrs);
        
        expect(updated.historicalCAGRs).toEqual(cagrs);
        expect(updated.cagrSource).toBe('manual');
        expect(updated.loadingCAGR).toBe(false);
    });

    test('sets empty object when CAGRs are null', () => {
        const asset = {
            id: 1,
            symbol: 'INVALID',
            loadingCAGR: true
        };

        const updated = updateAssetWithCAGRs(asset, null);
        
        expect(updated.historicalCAGRs).toEqual({});
        expect(updated.loadingCAGR).toBe(false);
    });

    test('CAGR dropdown options generation', () => {
        const historicalCAGRs = {
            1: 14.53,
            3: 23.40,
            5: null,
            10: 27.62
        };

        // Simulate dropdown generation logic
        const yearOptions = [1, 3, 5, 10, 15, 20];
        const availableOptions = yearOptions.filter(years => {
            const cagrValue = historicalCAGRs[years];
            return cagrValue !== undefined && cagrValue !== null;
        });

        expect(availableOptions).toEqual([1, 3, 10]);
        expect(availableOptions).not.toContain(5); // null value
        expect(availableOptions).not.toContain(15); // undefined
        expect(availableOptions).not.toContain(20); // undefined
    });
});

describe('fetchCAGRsForAllAssets - Loading Plan', () => {
    beforeEach(() => {
        fetch.mockClear();
        console.log = jest.fn();
        console.warn = jest.fn();
    });

    // Simulate the fetchCAGRsForAllAssets function
    async function fetchCAGRsForAllAssets(accumulationPortfolio, retirementPortfolio, fetchHistoricalCAGRsFn) {
        const allAssets = [...accumulationPortfolio, ...retirementPortfolio];
        const assetsWithSymbols = allAssets.filter(a => a.symbol && a.symbol.trim());
        
        if (assetsWithSymbols.length === 0) return;
        
        const fetchPromises = assetsWithSymbols.map(async (asset) => {
            try {
                const cagrs = await fetchHistoricalCAGRsFn(asset.symbol);
                if (cagrs !== null) {
                    asset.historicalCAGRs = cagrs;
                    if (!asset.cagrSource) {
                        asset.cagrSource = 'manual';
                    }
                } else {
                    asset.historicalCAGRs = {};
                }
            } catch (error) {
                asset.historicalCAGRs = {};
            }
        });
        
        await Promise.all(fetchPromises);
    }

    test('fetches CAGRs for all assets with symbols after loading plan', async () => {
        const mockFetchCAGRs = jest.fn()
            .mockResolvedValueOnce({ 1: 14.53, 3: 23.40 })  // AAPL
            .mockResolvedValueOnce({ 1: 20.15, 3: 24.13 }); // MSFT

        const accumulationPortfolio = [
            { id: 1, symbol: 'AAPL', quantity: 10 },
            { id: 2, symbol: 'MSFT', quantity: 5 }
        ];
        const retirementPortfolio = [];

        await fetchCAGRsForAllAssets(accumulationPortfolio, retirementPortfolio, mockFetchCAGRs);

        expect(mockFetchCAGRs).toHaveBeenCalledTimes(2);
        expect(mockFetchCAGRs).toHaveBeenCalledWith('AAPL');
        expect(mockFetchCAGRs).toHaveBeenCalledWith('MSFT');
        
        expect(accumulationPortfolio[0].historicalCAGRs).toEqual({ 1: 14.53, 3: 23.40 });
        expect(accumulationPortfolio[1].historicalCAGRs).toEqual({ 1: 20.15, 3: 24.13 });
    });

    test('skips assets without symbols', async () => {
        const mockFetchCAGRs = jest.fn().mockResolvedValue({ 1: 10 });

        const accumulationPortfolio = [
            { id: 1, symbol: '', quantity: 10 },
            { id: 2, symbol: 'AAPL', quantity: 5 },
            { id: 3, symbol: '   ', quantity: 3 }
        ];

        await fetchCAGRsForAllAssets(accumulationPortfolio, [], mockFetchCAGRs);

        expect(mockFetchCAGRs).toHaveBeenCalledTimes(1);
        expect(mockFetchCAGRs).toHaveBeenCalledWith('AAPL');
    });

    test('handles mixed success and failure', async () => {
        const mockFetchCAGRs = jest.fn()
            .mockResolvedValueOnce({ 1: 14.53 })  // AAPL succeeds
            .mockResolvedValueOnce(null);          // INVALID fails

        const accumulationPortfolio = [
            { id: 1, symbol: 'AAPL', quantity: 10 },
            { id: 2, symbol: 'INVALID', quantity: 5 }
        ];

        await fetchCAGRsForAllAssets(accumulationPortfolio, [], mockFetchCAGRs);

        expect(accumulationPortfolio[0].historicalCAGRs).toEqual({ 1: 14.53 });
        expect(accumulationPortfolio[1].historicalCAGRs).toEqual({});
    });

    test('preserves existing cagrSource when fetching', async () => {
        const mockFetchCAGRs = jest.fn().mockResolvedValue({ 1: 14.53 });

        const accumulationPortfolio = [
            { id: 1, symbol: 'AAPL', quantity: 10, cagrSource: '3' } // User had selected 3-year CAGR
        ];

        await fetchCAGRsForAllAssets(accumulationPortfolio, [], mockFetchCAGRs);

        // Should preserve the user's selection
        expect(accumulationPortfolio[0].cagrSource).toBe('3');
    });

    test('sets cagrSource to manual if not already set', async () => {
        const mockFetchCAGRs = jest.fn().mockResolvedValue({ 1: 14.53 });

        const accumulationPortfolio = [
            { id: 1, symbol: 'AAPL', quantity: 10 } // No cagrSource set
        ];

        await fetchCAGRsForAllAssets(accumulationPortfolio, [], mockFetchCAGRs);

        expect(accumulationPortfolio[0].cagrSource).toBe('manual');
    });

    test('fetches CAGRs for both accumulation and retirement portfolios', async () => {
        const mockFetchCAGRs = jest.fn()
            .mockResolvedValueOnce({ 1: 14.53 })  // AAPL
            .mockResolvedValueOnce({ 1: 20.15 }); // VTI

        const accumulationPortfolio = [{ id: 1, symbol: 'AAPL', quantity: 10 }];
        const retirementPortfolio = [{ id: 2, symbol: 'VTI', quantity: 100 }];

        await fetchCAGRsForAllAssets(accumulationPortfolio, retirementPortfolio, mockFetchCAGRs);

        expect(mockFetchCAGRs).toHaveBeenCalledTimes(2);
        expect(accumulationPortfolio[0].historicalCAGRs).toEqual({ 1: 14.53 });
        expect(retirementPortfolio[0].historicalCAGRs).toEqual({ 1: 20.15 });
    });

    test('does nothing when portfolios are empty', async () => {
        const mockFetchCAGRs = jest.fn();

        await fetchCAGRsForAllAssets([], [], mockFetchCAGRs);

        expect(mockFetchCAGRs).not.toHaveBeenCalled();
    });
});
