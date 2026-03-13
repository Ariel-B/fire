using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FirePlanningTool.Services;
using FirePlanningTool.Models;

namespace FirePlanningTool.Controllers
{
    /// <summary>
    /// API controller for retrieving real-time exchange rates from external providers.
    /// Rate limited to prevent abuse.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    public class ExchangeRateController : ControllerBase
    {
        private readonly IExchangeRateService _exchangeRateService;
        private readonly ILogger<ExchangeRateController> _logger;

        /// <summary>
        /// Initializes a new instance of the ExchangeRateController.
        /// </summary>
        /// <param name="exchangeRateService">Service for fetching exchange rates</param>
        /// <param name="logger">Logger for diagnostic information</param>
        public ExchangeRateController(
            IExchangeRateService exchangeRateService,
            ILogger<ExchangeRateController> logger)
        {
            _exchangeRateService = exchangeRateService;
            _logger = logger;
        }

        /// <summary>
        /// Gets the current USD to ILS exchange rate from an external API.
        /// </summary>
        /// <returns>Exchange rate information including rate, timestamp, and source</returns>
        /// <response code="200">Successfully retrieved the exchange rate</response>
        /// <response code="500">Internal server error occurred while fetching rate</response>
        [HttpGet("usd-ils")]
        public async Task<ActionResult<ExchangeRateResponse>> GetUsdIlsRate()
        {
            try
            {
                _logger.LogDebug("Fetching USD/ILS exchange rate");
                var result = await _exchangeRateService.GetUsdIlsRateAsync();

                if (result == null)
                {
                    _logger.LogWarning("Failed to get exchange rate, returning default");
                    return Ok(new ExchangeRateResponse
                    {
                        BaseCurrency = "USD",
                        TargetCurrency = "ILS",
                        Rate = 3.6m,
                        Timestamp = DateTime.UtcNow,
                        Source = "default"
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching USD/ILS exchange rate");
                return StatusCode(500, new ApiErrorResponse("Failed to fetch exchange rate"));
            }
        }

        /// <summary>
        /// Gets the current exchange rate between two currencies.
        /// </summary>
        /// <param name="from">Base currency code (e.g., USD)</param>
        /// <param name="to">Target currency code (e.g., ILS)</param>
        /// <returns>Exchange rate information</returns>
        /// <response code="200">Successfully retrieved the exchange rate</response>
        /// <response code="400">Invalid currency code provided</response>
        /// <response code="500">Internal server error occurred while fetching rate</response>
        [HttpGet("{from}/{to}")]
        public async Task<ActionResult<ExchangeRateResponse>> GetExchangeRate(string from, string to)
        {
            if (string.IsNullOrWhiteSpace(from) || string.IsNullOrWhiteSpace(to))
            {
                return BadRequest(new ApiErrorResponse("Currency codes cannot be empty"));
            }

            if (from.Length > 10 || to.Length > 10)
            {
                return BadRequest(new ApiErrorResponse("Invalid currency code"));
            }

            try
            {
                _logger.LogDebug("Fetching {From}/{To} exchange rate", from.ToUpper(), to.ToUpper());
                var result = await _exchangeRateService.GetExchangeRateAsync(from, to);

                if (result == null)
                {
                    _logger.LogWarning("Failed to get {From}/{To} exchange rate", from.ToUpper(), to.ToUpper());
                    return NotFound(new ApiErrorResponse($"Exchange rate not found for {from}/{to}"));
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching {From}/{To} exchange rate", from.ToUpper(), to.ToUpper());
                return StatusCode(500, new ApiErrorResponse("Failed to fetch exchange rate"));
            }
        }
    }
}
