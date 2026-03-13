using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using FirePlanningTool.Repositories;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Configuration settings for Finnhub API integration.
    /// </summary>
    public class FinnhubConfiguration
    {
        /// <summary>
        /// Configuration section name in appsettings.json.
        /// </summary>
        public const string SectionName = "Finnhub";

        /// <summary>
        /// Finnhub API key for authentication.
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Base URL for Finnhub API endpoints.
        /// </summary>
        public string BaseUrl { get; set; } = "https://finnhub.io/api/v1";
    }

    /// <summary>
    /// Cache configuration for external API calls
    /// </summary>
    public static class FinnhubCacheSettings
    {
        /// <summary>
        /// Cache TTL for asset prices (5 minutes) - applies to stocks, ETFs, bonds, and other securities
        /// </summary>
        public static readonly TimeSpan PriceCacheDuration = TimeSpan.FromMinutes(5);

        /// <summary>
        /// Cache TTL for company/asset profiles and names (24 hours)
        /// </summary>
        public static readonly TimeSpan ProfileCacheDuration = TimeSpan.FromHours(24);

        /// <summary>
        /// Cache TTL for historical CAGR data (24 hours) - applies to all asset types
        /// </summary>
        public static readonly TimeSpan CAGRCacheDuration = TimeSpan.FromHours(24);
    }

    /// <summary>
    /// Interface for Finnhub asset market data service.
    /// Provides methods for fetching real-time prices, company/asset information, and historical CAGR data.
    /// Supports stocks, ETFs, bonds, and other tradeable securities available via Finnhub API.
    /// </summary>
    public interface IFinnhubService
    {
        /// <summary>
        /// Gets the current market price for an asset symbol.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (e.g., AAPL, VOO, TLT)</param>
        /// <returns>Current price, or null if not available</returns>
        Task<decimal?> GetCurrentPriceAsync(string symbol);

        /// <summary>
        /// Gets current market prices for multiple asset symbols.
        /// </summary>
        /// <param name="symbols">Collection of asset ticker symbols (ETFs, stocks, bonds, etc.)</param>
        /// <returns>Dictionary mapping symbols to their prices</returns>
        Task<Dictionary<string, decimal>> GetMultiplePricesAsync(IEnumerable<string> symbols);

        /// <summary>
        /// Gets the company/asset name for a symbol.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, bonds, etc.)</param>
        /// <returns>Company/asset name, or null if not available</returns>
        Task<string?> GetCompanyNameAsync(string symbol);

        /// <summary>
        /// Gets the complete company/asset profile for a symbol.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, bonds, etc.)</param>
        /// <returns>Company/asset profile, or null if not available</returns>
        Task<FinnhubCompanyProfile?> GetCompanyProfileAsync(string symbol);

        /// <summary>
        /// Gets historical Compound Annual Growth Rate (CAGR) data for an asset symbol.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, bonds, etc.)</param>
        /// <returns>Dictionary mapping years (1, 3, 5, 10, 15, 20) to CAGR values</returns>
        Task<Dictionary<int, decimal?>> GetHistoricalCAGRsAsync(string symbol);
    }

    /// <summary>
    /// Service for fetching asset prices, company/asset profiles, and historical CAGR data from Finnhub API.
    /// Supports ETFs, stocks, bonds, and other tradeable securities available via Finnhub.
    /// Implements caching to reduce API calls and improve performance.
    /// </summary>
    public class FinnhubService : IFinnhubService
    {
        private readonly IAssetDataRepository _repository;
        private readonly ILogger<FinnhubService> _logger;
        private readonly IMemoryCache _cache;

        // Cache key prefixes
        private const string PriceCachePrefix = "price_";
        private const string ProfileCachePrefix = "profile_";
        private const string CAGRCachePrefix = "cagr_";

        /// <summary>
        /// Initializes a new instance of the FinnhubService.
        /// </summary>
        /// <param name="repository">Repository for fetching asset market data from external providers (ETFs, stocks, bonds, etc.)</param>
        /// <param name="logger">Logger for diagnostic and error information</param>
        /// <param name="cache">Memory cache for storing API responses</param>
        public FinnhubService(
            IAssetDataRepository repository,
            ILogger<FinnhubService> logger,
            IMemoryCache cache)
        {
            _repository = repository;
            _logger = logger;
            _cache = cache;
        }

        /// <inheritdoc />
        public async Task<decimal?> GetCurrentPriceAsync(string symbol)
        {
            try
            {
                // Validate and sanitize symbol input to prevent URL injection
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    _logger.LogWarning("Empty or null symbol provided");
                    return null;
                }

                // Symbol validation: only allow alphanumeric characters, dots, and hyphens
                if (!System.Text.RegularExpressions.Regex.IsMatch(symbol, @"^[A-Za-z0-9.\-]+$"))
                {
                    _logger.LogWarning("Invalid symbol format: {Symbol}", symbol);
                    return null;
                }

                // Check cache first
                var cacheKey = $"{PriceCachePrefix}{symbol.ToUpperInvariant()}";
                if (_cache.TryGetValue(cacheKey, out decimal cachedPrice))
                {
                    _logger.LogDebug("Cache hit for price: {Symbol}", symbol);
                    return cachedPrice;
                }

                // Fetch from repository
                var price = await _repository.FetchCurrentPriceAsync(symbol);

                if (price.HasValue && price.Value > 0)
                {
                    // Cache the result
                    _cache.Set(cacheKey, price.Value, FinnhubCacheSettings.PriceCacheDuration);
                    _logger.LogDebug("Cached price for {Symbol}: {Price}", symbol, price.Value);

                    return price.Value;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching price for symbol {Symbol}", symbol);
                return null;
            }
        }

        /// <inheritdoc />
        public async Task<Dictionary<string, decimal>> GetMultiplePricesAsync(IEnumerable<string> symbols)
        {
            var results = new System.Collections.Concurrent.ConcurrentDictionary<string, decimal>();
            var tasks = symbols.Select(async symbol =>
            {
                var price = await GetCurrentPriceAsync(symbol);
                if (price.HasValue)
                {
                    results.TryAdd(symbol, price.Value);
                }
            });

            await Task.WhenAll(tasks);
            return results.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        }

        /// <inheritdoc />
        public async Task<string?> GetCompanyNameAsync(string symbol)
        {
            var profile = await GetCompanyProfileAsync(symbol);
            return profile?.Name;
        }

        /// <inheritdoc />
        public async Task<FinnhubCompanyProfile?> GetCompanyProfileAsync(string symbol)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    _logger.LogWarning("Empty or null symbol provided");
                    return null;
                }

                if (!System.Text.RegularExpressions.Regex.IsMatch(symbol, @"^[A-Za-z0-9.\-]+$"))
                {
                    _logger.LogWarning("Invalid symbol format: {Symbol}", symbol);
                    return null;
                }

                // Check cache first
                var cacheKey = $"{ProfileCachePrefix}{symbol.ToUpperInvariant()}";
                if (_cache.TryGetValue(cacheKey, out FinnhubCompanyProfile? cachedProfile) && cachedProfile != null)
                {
                    _logger.LogDebug("Cache hit for profile: {Symbol}", symbol);
                    return cachedProfile;
                }

                // Fetch from repository
                var profileData = await _repository.FetchCompanyProfileAsync(symbol);

                if (profileData != null)
                {
                    // Cache the result
                    _cache.Set(cacheKey, profileData, FinnhubCacheSettings.ProfileCacheDuration);
                    _logger.LogDebug("Cached profile for {Symbol}", symbol);
                    return profileData;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching company profile for symbol {Symbol}", symbol);
                return null;
            }
        }

        /// <inheritdoc />
        public async Task<Dictionary<int, decimal?>> GetHistoricalCAGRsAsync(string symbol)
        {
            var result = new Dictionary<int, decimal?>();
            var years = new[] { 1, 3, 5, 10, 15, 20 };

            foreach (var year in years)
            {
                result[year] = null; // Initialize with N/A
            }

            try
            {
                // Validate and sanitize symbol input
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    _logger.LogWarning("Empty or null symbol provided");
                    return result;
                }

                // Symbol validation: only allow alphanumeric characters, dots, and hyphens
                if (!System.Text.RegularExpressions.Regex.IsMatch(symbol, @"^[A-Za-z0-9.\-]+$"))
                {
                    _logger.LogWarning("Invalid symbol format: {Symbol}", symbol);
                    return result;
                }

                // Check cache first
                var cacheKey = $"{CAGRCachePrefix}{symbol.ToUpperInvariant()}";
                if (_cache.TryGetValue(cacheKey, out Dictionary<int, decimal?>? cachedCAGR) && cachedCAGR != null)
                {
                    _logger.LogDebug("Cache hit for CAGR: {Symbol}", symbol);
                    return cachedCAGR;
                }

                // Try Yahoo Finance first (free, no API key required)
                var yahooResult = await GetHistoricalCAGRsFromYahooAsync(symbol, years);
                if (yahooResult.Values.Any(v => v.HasValue))
                {
                    _logger.LogInformation("Successfully fetched CAGR data from Yahoo Finance for {Symbol}", symbol);

                    // Cache the result
                    _cache.Set(cacheKey, yahooResult, FinnhubCacheSettings.CAGRCacheDuration);
                    _logger.LogDebug("Cached CAGR data for {Symbol}", symbol);

                    return yahooResult;
                }

                // Fallback to Finnhub if Yahoo fails (requires premium for historical candles)
                _logger.LogInformation("Yahoo Finance failed for {Symbol}, falling back to Finnhub", symbol);
                var finnhubResult = await GetHistoricalCAGRsFromFinnhubAsync(symbol, years);

                // Cache the result if we got any data
                if (finnhubResult.Values.Any(v => v.HasValue))
                {
                    _cache.Set(cacheKey, finnhubResult, FinnhubCacheSettings.CAGRCacheDuration);
                    _logger.LogDebug("Cached CAGR data for {Symbol}", symbol);
                }

                return finnhubResult;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching historical CAGRs for symbol {Symbol}", symbol);
                return result;
            }
        }

        private async Task<Dictionary<int, decimal?>> GetHistoricalCAGRsFromYahooAsync(string symbol, int[] years)
        {
            var result = new Dictionary<int, decimal?>();
            foreach (var year in years)
            {
                result[year] = null;
            }

            try
            {
                var maxYears = years.Max();

                // Fetch data from repository
                var yahooData = await _repository.FetchYahooHistoricalDataAsync(symbol, maxYears);

                if (!yahooData.HasValue)
                {
                    return result;
                }

                var (timestampArray, closePricesArray) = yahooData.Value;

                // Get current price (most recent non-null close price)
                decimal? currentPrice = null;
                for (int i = closePricesArray.Length - 1; i >= 0; i--)
                {
                    if (closePricesArray[i].HasValue)
                    {
                        currentPrice = (decimal)closePricesArray[i]!.Value;
                        break;
                    }
                }

                if (!currentPrice.HasValue || currentPrice.Value <= 0)
                {
                    _logger.LogWarning("Could not get current price from Yahoo for {Symbol}", symbol);
                    return result;
                }

                var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

                // Calculate CAGR for each timeframe
                foreach (var year in years)
                {
                    try
                    {
                        var targetTimestamp = now - (long)(year * 365.25 * 24 * 60 * 60);

                        // Find the closest timestamp to our target date
                        int closestIndex = -1;
                        long closestDiff = long.MaxValue;

                        for (int i = 0; i < timestampArray.Length; i++)
                        {
                            var ts = timestampArray[i];
                            var diff = Math.Abs(ts - targetTimestamp);
                            if (diff < closestDiff)
                            {
                                closestDiff = diff;
                                closestIndex = i;
                            }
                        }

                        if (closestIndex < 0)
                        {
                            continue;
                        }

                        // Verify the timestamp is close enough (within 2 months)
                        if (closestDiff > CalculationConstants.TwoMonthsInSeconds)
                        {
                            _logger.LogDebug("Data for {Symbol} ({Year}Y) doesn't go back far enough", symbol, year);
                            continue;
                        }

                        // Get the historical price
                        double? priceValue = closePricesArray[closestIndex];
                        if (!priceValue.HasValue)
                        {
                            // Try to find nearest non-null value
                            for (int offset = 1; offset < 3; offset++)
                            {
                                if (closestIndex + offset < closePricesArray.Length)
                                {
                                    var altPrice = closePricesArray[closestIndex + offset];
                                    if (altPrice.HasValue)
                                    {
                                        priceValue = altPrice;
                                        break;
                                    }
                                }
                                if (closestIndex - offset >= 0)
                                {
                                    var altPrice = closePricesArray[closestIndex - offset];
                                    if (altPrice.HasValue)
                                    {
                                        priceValue = altPrice;
                                        break;
                                    }
                                }
                            }
                        }

                        if (!priceValue.HasValue)
                        {
                            continue;
                        }

                        var historicalPrice = (decimal)priceValue.Value;
                        if (historicalPrice <= 0)
                        {
                            continue;
                        }

                        // Calculate CAGR: ((EndValue / StartValue) ^ (1 / Years)) - 1
                        var cagr = (decimal)(Math.Pow((double)(currentPrice.Value / historicalPrice), 1.0 / year) - 1) * 100;
                        result[year] = Math.Round(cagr, 2);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Error calculating CAGR for {Symbol} ({Year}Y) from Yahoo", symbol, year);
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error fetching historical CAGRs from Yahoo for {Symbol}", symbol);
                return result;
            }
        }

        private async Task<Dictionary<int, decimal?>> GetHistoricalCAGRsFromFinnhubAsync(string symbol, int[] years)
        {
            var result = new Dictionary<int, decimal?>();
            foreach (var year in years)
            {
                result[year] = null;
            }

            try
            {
                // Get current price first
                var currentPrice = await GetCurrentPriceAsync(symbol);
                if (!currentPrice.HasValue || currentPrice.Value <= 0)
                {
                    _logger.LogWarning("Could not get current price for {Symbol}", symbol);
                    return result;
                }

                var now = DateTimeOffset.UtcNow;

                // Calculate CAGR for each timeframe
                foreach (var year in years)
                {
                    try
                    {
                        var fromDate = now.AddYears(-year);
                        var fromTimestamp = fromDate.ToUnixTimeSeconds();
                        var toTimestamp = now.ToUnixTimeSeconds();

                        // Fetch candle data from repository
                        var candleData = await _repository.FetchCandleDataAsync(symbol, fromTimestamp, toTimestamp);

                        if (candleData == null || candleData.ClosePrices == null || candleData.ClosePrices.Length == 0)
                        {
                            _logger.LogDebug("No candle data available for {Symbol} ({Year}Y)", symbol, year);
                            continue;
                        }

                        // Validate that the data actually goes back far enough
                        // Check if we have timestamps and they go back at least 90% of the requested period
                        if (candleData.Timestamps != null && candleData.Timestamps.Length > 0)
                        {
                            var earliestDataTimestamp = candleData.Timestamps[0];
                            var requestedStartTimestamp = fromTimestamp;

                            // Calculate how much of the requested period is actually covered
                            // Allow up to 10% margin for the start date (e.g., for monthly data)
                            var marginSeconds = (long)(year * 365.25 * 24 * 60 * 60 * 0.10); // 10% of period in seconds

                            if (earliestDataTimestamp > requestedStartTimestamp + marginSeconds)
                            {
                                // Data doesn't go back far enough
                                _logger.LogDebug("Data for {Symbol} ({Year}Y) doesn't go back far enough. Earliest: {EarliestDate}, Requested: {RequestedDate}",
                                    symbol, year, DateTimeOffset.FromUnixTimeSeconds(earliestDataTimestamp).ToString("yyyy-MM-dd"), fromDate.ToString("yyyy-MM-dd"));
                                continue;
                            }
                        }

                        // Get the earliest close price
                        var historicalPrice = (decimal)candleData.ClosePrices[0];
                        if (historicalPrice <= 0)
                        {
                            continue;
                        }

                        // Calculate CAGR: ((EndValue / StartValue) ^ (1 / Years)) - 1
                        // Note: Using double for Math.Pow as decimal doesn't support fractional exponents.
                        // The precision loss is acceptable for percentage-based CAGR calculations.
                        var cagr = (decimal)(Math.Pow((double)(currentPrice.Value / historicalPrice), 1.0 / year) - 1) * 100;
                        result[year] = Math.Round(cagr, 2);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error calculating CAGR for {Symbol} ({Year}Y)", symbol, year);
                    }
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching historical CAGRs from Finnhub for {Symbol}", symbol);
                return result;
            }
        }
    }

    /// <summary>
    /// Response from Finnhub candle (historical price) API endpoint.
    /// Contains arrays of OHLCV (Open, High, Low, Close, Volume) data.
    /// </summary>
    public class FinnhubCandleResponse
    {
        /// <summary>
        /// Status of the request: "ok" for success, "no_data" if no data available.
        /// </summary>
        [JsonPropertyName("s")]
        public string Status { get; set; } = string.Empty;

        /// <summary>
        /// Array of closing prices for each time period.
        /// </summary>
        [JsonPropertyName("c")]
        public double[]? ClosePrices { get; set; }

        /// <summary>
        /// Array of high prices for each time period.
        /// </summary>
        [JsonPropertyName("h")]
        public double[]? HighPrices { get; set; }

        /// <summary>
        /// Array of low prices for each time period.
        /// </summary>
        [JsonPropertyName("l")]
        public double[]? LowPrices { get; set; }

        /// <summary>
        /// Array of opening prices for each time period.
        /// </summary>
        [JsonPropertyName("o")]
        public double[]? OpenPrices { get; set; }

        /// <summary>
        /// Array of Unix timestamps for each time period.
        /// </summary>
        [JsonPropertyName("t")]
        public long[]? Timestamps { get; set; }

        /// <summary>
        /// Array of trading volumes for each time period.
        /// </summary>
        [JsonPropertyName("v")]
        public double[]? Volumes { get; set; }
    }

    /// <summary>
    /// Response from Finnhub quote (real-time price) API endpoint.
    /// Contains current price and daily trading statistics.
    /// </summary>
    public class FinnhubQuoteResponse
    {
        /// <summary>
        /// Current trading price.
        /// </summary>
        [JsonPropertyName("c")]
        public double CurrentPrice { get; set; }

        /// <summary>
        /// Dollar change from previous close.
        /// </summary>
        [JsonPropertyName("d")]
        public double Change { get; set; }

        /// <summary>
        /// Percent change from previous close.
        /// </summary>
        [JsonPropertyName("dp")]
        public double PercentChange { get; set; }

        /// <summary>
        /// High price of the trading day.
        /// </summary>
        [JsonPropertyName("h")]
        public double HighPrice { get; set; }

        /// <summary>
        /// Low price of the trading day.
        /// </summary>
        [JsonPropertyName("l")]
        public double LowPrice { get; set; }

        /// <summary>
        /// Opening price of the trading day.
        /// </summary>
        [JsonPropertyName("o")]
        public double OpenPrice { get; set; }

        /// <summary>
        /// Previous day's closing price.
        /// </summary>
        [JsonPropertyName("pc")]
        public double PreviousClose { get; set; }

        /// <summary>
        /// Unix timestamp of the quote.
        /// </summary>
        [JsonPropertyName("t")]
        public long Timestamp { get; set; }
    }

    /// <summary>
    /// Response from Finnhub company/asset profile API endpoint.
    /// Contains asset information, market data, and branding.
    /// Applies to stocks, ETFs, and other tradeable securities.
    /// </summary>
    public class FinnhubCompanyProfile
    {
        /// <summary>
        /// Company/asset name (e.g., "Apple Inc.", "Vanguard S&amp;P 500 ETF").
        /// </summary>
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Asset ticker symbol (e.g., "AAPL", "VOO").
        /// </summary>
        [JsonPropertyName("ticker")]
        public string Ticker { get; set; } = string.Empty;

        /// <summary>
        /// Exchange where the asset is listed (e.g., "NASDAQ", "NYSE Arca").
        /// </summary>
        [JsonPropertyName("exchange")]
        public string Exchange { get; set; } = string.Empty;

        /// <summary>
        /// Country where the company is headquartered or asset is domiciled (e.g., "US").
        /// </summary>
        [JsonPropertyName("country")]
        public string Country { get; set; } = string.Empty;

        /// <summary>
        /// Currency in which the asset is traded (e.g., "USD").
        /// </summary>
        [JsonPropertyName("currency")]
        public string Currency { get; set; } = string.Empty;

        /// <summary>
        /// Initial Public Offering (IPO) date.
        /// </summary>
        [JsonPropertyName("ipo")]
        public string IpoDate { get; set; } = string.Empty;

        /// <summary>
        /// Market capitalization (company value). Units depend on API response.
        /// </summary>
        [JsonPropertyName("marketCapitalization")]
        public double MarketCapitalization { get; set; }

        /// <summary>
        /// Total number of outstanding shares.
        /// </summary>
        [JsonPropertyName("shareOutstanding")]
        public double ShareOutstanding { get; set; }

        /// <summary>
        /// URL to the company logo image.
        /// </summary>
        [JsonPropertyName("logo")]
        public string Logo { get; set; } = string.Empty;

        /// <summary>
        /// Company website URL.
        /// </summary>
        [JsonPropertyName("weburl")]
        public string WebUrl { get; set; } = string.Empty;
    }
}