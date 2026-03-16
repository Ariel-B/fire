using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Configuration settings for Exchange Rate API integration.
    /// </summary>
    public class ExchangeRateConfiguration
    {
        /// <summary>
        /// Configuration section name in appsettings.json.
        /// </summary>
        public const string SectionName = "ExchangeRate";

        /// <summary>
        /// Base URL for Exchange Rate API endpoints.
        /// Default uses exchangerate.host which provides free exchange rates.
        /// </summary>
        public string BaseUrl { get; set; } = "https://api.exchangerate.host";

        /// <summary>
        /// Optional API key for premium tier access.
        /// </summary>
        public string ApiKey { get; set; } = string.Empty;

        /// <summary>
        /// Cache duration in minutes for exchange rates.
        /// </summary>
        public int CacheMinutes { get; set; } = 60;
    }

    /// <summary>
    /// Response model for exchange rate data
    /// </summary>
    public class ExchangeRateResponse
    {
        /// <summary>
        /// Base currency (e.g., "USD")
        /// </summary>
        public string BaseCurrency { get; set; } = "USD";

        /// <summary>
        /// Target currency (e.g., "ILS")
        /// </summary>
        public string TargetCurrency { get; set; } = "ILS";

        /// <summary>
        /// Exchange rate (1 base = X target)
        /// </summary>
        public decimal Rate { get; set; }

        /// <summary>
        /// Timestamp when the rate was fetched/cached
        /// </summary>
        public DateTime Timestamp { get; set; }

        /// <summary>
        /// Source of the exchange rate data
        /// </summary>
        public string Source { get; set; } = "exchangerate.host";
    }

    /// <summary>
    /// Interface for exchange rate service operations
    /// </summary>
    public interface IExchangeRateService
    {
        /// <summary>
        /// Gets the current exchange rate between two currencies.
        /// </summary>
        /// <param name="baseCurrency">Base currency code (e.g., "USD")</param>
        /// <param name="targetCurrency">Target currency code (e.g., "ILS")</param>
        /// <returns>Exchange rate response with current rate</returns>
        Task<ExchangeRateResponse?> GetExchangeRateAsync(string baseCurrency = "USD", string targetCurrency = "ILS");

        /// <summary>
        /// Gets the USD to ILS exchange rate (convenience method).
        /// </summary>
        /// <returns>Exchange rate response for USD/ILS</returns>
        Task<ExchangeRateResponse?> GetUsdIlsRateAsync();
    }

    /// <summary>
    /// Service for fetching real-time exchange rates from external API.
    /// Uses exchangerate.host API (free tier) with caching to reduce API calls.
    /// </summary>
    public class ExchangeRateService : IExchangeRateService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ExchangeRateConfiguration _config;
        private readonly ILogger<ExchangeRateService> _logger;
        private const string CACHE_KEY_PREFIX = "exchange_rate_";
        private const decimal DEFAULT_USD_ILS_RATE = 3.6m;

        /// <summary>
        /// Initializes a new instance of the ExchangeRateService.
        /// </summary>
        public ExchangeRateService(
            HttpClient httpClient,
            IMemoryCache cache,
            IOptions<ExchangeRateConfiguration> config,
            ILogger<ExchangeRateService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _config = config.Value;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<ExchangeRateResponse?> GetExchangeRateAsync(string baseCurrency = "USD", string targetCurrency = "ILS")
        {
            baseCurrency = baseCurrency.ToUpperInvariant();
            targetCurrency = targetCurrency.ToUpperInvariant();

            var cacheKey = $"{CACHE_KEY_PREFIX}{baseCurrency}_{targetCurrency}";

            // Try to get from cache first
            if (_cache.TryGetValue(cacheKey, out ExchangeRateResponse? cachedRate) && cachedRate != null)
            {
                _logger.LogDebug("Returning cached exchange rate for {Base}/{Target}: {Rate}",
                    baseCurrency, targetCurrency, cachedRate.Rate);
                return cachedRate;
            }

            try
            {
                var rate = await FetchExchangeRateFromApiAsync(baseCurrency, targetCurrency);
                if (rate != null)
                {
                    var response = new ExchangeRateResponse
                    {
                        BaseCurrency = baseCurrency,
                        TargetCurrency = targetCurrency,
                        Rate = rate.Value,
                        Timestamp = DateTime.UtcNow,
                        Source = "exchangerate.host"
                    };

                    // Cache the result
                    var cacheOptions = new MemoryCacheEntryOptions()
                        .SetAbsoluteExpiration(TimeSpan.FromMinutes(_config.CacheMinutes));
                    _cache.Set(cacheKey, response, cacheOptions);

                    _logger.LogInformation("Fetched exchange rate for {Base}/{Target}: {Rate}",
                        baseCurrency, targetCurrency, rate.Value);
                    return response;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching exchange rate for {Base}/{Target}", baseCurrency, targetCurrency);
            }

            // Return default rate as fallback
            _logger.LogWarning("Using default exchange rate for {Base}/{Target}: {Rate}",
                baseCurrency, targetCurrency, DEFAULT_USD_ILS_RATE);
            return new ExchangeRateResponse
            {
                BaseCurrency = baseCurrency,
                TargetCurrency = targetCurrency,
                Rate = DEFAULT_USD_ILS_RATE,
                Timestamp = DateTime.UtcNow,
                Source = "default"
            };
        }

        /// <inheritdoc />
        public async Task<ExchangeRateResponse?> GetUsdIlsRateAsync()
        {
            return await GetExchangeRateAsync("USD", "ILS");
        }

        /// <summary>
        /// Fetches the exchange rate from the external API.
        /// </summary>
        private async Task<decimal?> FetchExchangeRateFromApiAsync(string baseCurrency, string targetCurrency)
        {
            // Try multiple API endpoints for redundancy
            var rate = await TryExchangeRateHostAsync(baseCurrency, targetCurrency);
            if (rate.HasValue) return rate;

            // Fallback to Frankfurter API (free, no API key required)
            rate = await TryFrankfurterApiAsync(baseCurrency, targetCurrency);
            return rate;
        }

        /// <summary>
        /// Tries to fetch rate from exchangerate.host API
        /// </summary>
        private async Task<decimal?> TryExchangeRateHostAsync(string baseCurrency, string targetCurrency)
        {
            try
            {
                // exchangerate.host latest endpoint.
                // NOTE: This API only supports query-parameter authentication (access_key);
                // header-based auth is not documented or supported by the provider.
                // If the API key is not configured the free tier (no key) is used instead,
                // and the Frankfurter fallback requires no key at all.
                var url = $"https://api.exchangerate.host/live?source={baseCurrency}&currencies={targetCurrency}";
                if (!string.IsNullOrEmpty(_config.ApiKey))
                {
                    url += $"&access_key={_config.ApiKey}";
                }

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("exchangerate.host API returned {StatusCode}", response.StatusCode);
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // Check if the API call was successful
                if (root.TryGetProperty("success", out var successProp) && !successProp.GetBoolean())
                {
                    _logger.LogWarning("exchangerate.host API returned success=false");
                    return null;
                }

                // Try to get the rate from the quotes object
                if (root.TryGetProperty("quotes", out var quotes))
                {
                    var quoteKey = $"{baseCurrency}{targetCurrency}";
                    if (quotes.TryGetProperty(quoteKey, out var rateProp))
                    {
                        return rateProp.GetDecimal();
                    }
                }

                _logger.LogWarning("Could not find rate in exchangerate.host response");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch from exchangerate.host");
                return null;
            }
        }

        /// <summary>
        /// Tries to fetch rate from Frankfurter API (European Central Bank data)
        /// </summary>
        private async Task<decimal?> TryFrankfurterApiAsync(string baseCurrency, string targetCurrency)
        {
            try
            {
                // Frankfurter API - free, no API key required
                var url = $"https://api.frankfurter.app/latest?from={baseCurrency}&to={targetCurrency}";

                var response = await _httpClient.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Frankfurter API returned {StatusCode}", response.StatusCode);
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                // Response format: { "rates": { "ILS": 3.65 } }
                if (root.TryGetProperty("rates", out var rates) &&
                    rates.TryGetProperty(targetCurrency, out var rateProp))
                {
                    return rateProp.GetDecimal();
                }

                _logger.LogWarning("Could not find rate in Frankfurter response");
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch from Frankfurter API");
                return null;
            }
        }
    }
}
