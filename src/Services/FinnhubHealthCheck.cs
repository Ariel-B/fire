using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Health check for Finnhub API service availability.
    /// Verifies that the Finnhub API is reachable and responding to requests.
    /// </summary>
    public class FinnhubHealthCheck : IHealthCheck
    {
        private readonly IFinnhubService _finnhubService;
        private readonly FinnhubConfiguration _configuration;
        private readonly ILogger<FinnhubHealthCheck> _logger;

        /// <summary>
        /// Initializes a new instance of the FinnhubHealthCheck.
        /// </summary>
        /// <param name="finnhubService">Finnhub service for checking API availability</param>
        /// <param name="configuration">Finnhub configuration including API key</param>
        /// <param name="logger">Logger for diagnostic information</param>
        public FinnhubHealthCheck(
            IFinnhubService finnhubService,
            IOptions<FinnhubConfiguration> configuration,
            ILogger<FinnhubHealthCheck> logger)
        {
            _finnhubService = finnhubService;
            _configuration = configuration.Value;
            _logger = logger;
        }

        /// <summary>
        /// Checks the health of the Finnhub API service.
        /// </summary>
        /// <param name="context">Health check context</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Health check result indicating service status</returns>
        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                // Check if API key is configured
                if (string.IsNullOrWhiteSpace(_configuration.ApiKey))
                {
                    _logger.LogWarning("Finnhub API key is not configured");
                    return HealthCheckResult.Degraded(
                        "Finnhub API key is not configured. Service will not be able to fetch real-time prices.",
                        data: new Dictionary<string, object>
                        {
                            { "apiKeyConfigured", false }
                        });
                }

                // Try to get a price for a well-known stock (SPY - S&P 500 ETF)
                // This is a lightweight check that verifies API connectivity
                var testSymbol = "SPY";
                var price = await _finnhubService.GetCurrentPriceAsync(testSymbol);

                if (price.HasValue && price.Value > 0)
                {
                    _logger.LogDebug("Finnhub API health check passed. Test symbol {Symbol} price: {Price}", testSymbol, price.Value);
                    return HealthCheckResult.Healthy(
                        "Finnhub API is responding correctly",
                        data: new Dictionary<string, object>
                        {
                            { "apiKeyConfigured", true },
                            { "testSymbol", testSymbol },
                            { "testPrice", price.Value }
                        });
                }

                _logger.LogWarning("Finnhub API returned invalid price for test symbol {Symbol}", testSymbol);
                return HealthCheckResult.Degraded(
                    $"Finnhub API is reachable but returned invalid data for test symbol {testSymbol}",
                    data: new Dictionary<string, object>
                    {
                        { "apiKeyConfigured", true },
                        { "testSymbol", testSymbol }
                    });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Finnhub API health check failed");
                return HealthCheckResult.Unhealthy(
                    "Finnhub API is not responding or encountered an error",
                    exception: ex,
                    data: new Dictionary<string, object>
                    {
                        { "apiKeyConfigured", !string.IsNullOrWhiteSpace(_configuration.ApiKey) },
                        { "errorMessage", ex.Message }
                    });
            }
        }
    }
}
