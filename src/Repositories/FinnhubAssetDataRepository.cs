using System.Text.Json;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using Microsoft.Extensions.Options;

namespace FirePlanningTool.Repositories
{
    /// <summary>
    /// Repository implementation that fetches asset market data from Finnhub API.
    /// Supports ETFs, stocks, bonds, and other tradeable securities.
    /// Handles all HTTP communication with external data providers.
    /// </summary>
    public class FinnhubAssetDataRepository : IAssetDataRepository
    {
        private readonly HttpClient _httpClient;
        private readonly FinnhubConfiguration _configuration;
        private readonly ILogger<FinnhubAssetDataRepository> _logger;
        private readonly IReadOnlyDictionary<string, string> _assetNameLookup;

        /// <summary>
        /// Initializes a new instance of the FinnhubAssetDataRepository.
        /// </summary>
        /// <param name="httpClient">HTTP client for making API requests</param>
        /// <param name="configuration">Finnhub configuration including API key</param>
        /// <param name="assetNamesConfig">Asset names configuration for static lookup fallback</param>
        /// <param name="logger">Logger for diagnostic and error information</param>
        public FinnhubAssetDataRepository(
            HttpClient httpClient,
            IOptions<FinnhubConfiguration> configuration,
            IOptions<AssetNamesConfiguration> assetNamesConfig,
            ILogger<FinnhubAssetDataRepository> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration.Value;
            _logger = logger;
            _assetNameLookup = assetNamesConfig.Value.GetFlattenedLookup();
        }

        /// <inheritdoc />
        public async Task<decimal?> FetchCurrentPriceAsync(string symbol)
        {
            try
            {
                var encodedSymbol = Uri.EscapeDataString(symbol);
                var url = $"{_configuration.BaseUrl}/quote?symbol={encodedSymbol}&token={_configuration.ApiKey}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get price for {Symbol}. Status: {StatusCode}", symbol, response.StatusCode);
                    return null;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var quoteData = JsonSerializer.Deserialize<FinnhubQuoteResponse>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (quoteData?.CurrentPrice > 0)
                {
                    return (decimal)quoteData.CurrentPrice;
                }

                _logger.LogWarning("Invalid price data received for {Symbol}", symbol);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching price for symbol {Symbol}", symbol);
                return null;
            }
        }

        /// <inheritdoc />
        public async Task<FinnhubCompanyProfile?> FetchCompanyProfileAsync(string symbol)
        {
            try
            {
                // Try Finnhub first
                var encodedSymbol = Uri.EscapeDataString(symbol);
                var url = $"{_configuration.BaseUrl}/stock/profile2?symbol={encodedSymbol}&token={_configuration.ApiKey}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get company profile for {Symbol}. Status: {StatusCode}", symbol, response.StatusCode);
                    return null;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var profileData = JsonSerializer.Deserialize<FinnhubCompanyProfile>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                // If Finnhub has data, return it
                if (profileData != null && !string.IsNullOrWhiteSpace(profileData.Name))
                {
                    return profileData;
                }

                // Finnhub doesn't have profile data (common for ETFs), check static lookup table
                if (_assetNameLookup.TryGetValue(symbol, out var assetName))
                {
                    _logger.LogDebug("Static lookup (from config) provided name for {Symbol}: {Name}", symbol, assetName);
                    return new FinnhubCompanyProfile
                    {
                        Ticker = symbol.ToUpperInvariant(),
                        Name = assetName,
                        MarketCapitalization = 0,
                        Currency = "USD"
                    };
                }

                _logger.LogWarning("No profile found for {Symbol} in Finnhub or static lookup", symbol);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching company profile for symbol {Symbol}", symbol);
                return null;
            }
        }

        /// <inheritdoc />
        public async Task<FinnhubCandleResponse?> FetchCandleDataAsync(string symbol, long fromTimestamp, long toTimestamp)
        {
            try
            {
                var encodedSymbol = Uri.EscapeDataString(symbol);
                var url = $"{_configuration.BaseUrl}/stock/candle?symbol={encodedSymbol}&resolution=M&from={fromTimestamp}&to={toTimestamp}&token={_configuration.ApiKey}";
                var response = await _httpClient.GetAsync(url);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to get candle data for {Symbol}. Status: {StatusCode}", symbol, response.StatusCode);
                    return null;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                var candleData = JsonSerializer.Deserialize<FinnhubCandleResponse>(jsonContent, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (candleData?.Status == "no_data" || candleData?.ClosePrices == null || candleData.ClosePrices.Length == 0)
                {
                    _logger.LogDebug("No candle data available for {Symbol}", symbol);
                    return null;
                }

                return candleData;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching candle data for symbol {Symbol}", symbol);
                return null;
            }
        }

        /// <inheritdoc />
        public async Task<(long[] timestamps, double?[] closePrices)?> FetchYahooHistoricalDataAsync(string symbol, int maxYears)
        {
            try
            {
                var encodedSymbol = Uri.EscapeDataString(symbol);
                var range = maxYears <= 5 ? "5y" : (maxYears <= 10 ? "10y" : "max");
                var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{encodedSymbol}?interval=1mo&range={range}";

                var request = new HttpRequestMessage(HttpMethod.Get, url);
                request.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

                var response = await _httpClient.SendAsync(request);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Yahoo Finance API failed for {Symbol}. Status: {StatusCode}", symbol, response.StatusCode);
                    return null;
                }

                var jsonContent = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(jsonContent);
                var root = doc.RootElement;

                if (!root.TryGetProperty("chart", out var chart) ||
                    !chart.TryGetProperty("result", out var chartResult) ||
                    chartResult.GetArrayLength() == 0)
                {
                    _logger.LogWarning("No chart data in Yahoo response for {Symbol}", symbol);
                    return null;
                }

                var chartData = chartResult[0];

                if (!chartData.TryGetProperty("timestamp", out var timestamps) ||
                    !chartData.TryGetProperty("indicators", out var indicators) ||
                    !indicators.TryGetProperty("quote", out var quotes) ||
                    quotes.GetArrayLength() == 0)
                {
                    _logger.LogWarning("Missing timestamp or quote data for {Symbol}", symbol);
                    return null;
                }

                var quoteData = quotes[0];
                if (!quoteData.TryGetProperty("close", out var closePrices))
                {
                    _logger.LogWarning("No close prices in Yahoo response for {Symbol}", symbol);
                    return null;
                }

                var timestampArray = timestamps.EnumerateArray().Select(t => t.GetInt64()).ToArray();
                var closePriceArray = closePrices.EnumerateArray()
                    .Select(p => p.ValueKind == JsonValueKind.Null ? (double?)null : p.GetDouble())
                    .ToArray();

                return (timestampArray, closePriceArray);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching Yahoo historical data for symbol {Symbol}", symbol);
                return null;
            }
        }
    }
}
