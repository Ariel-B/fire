using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FirePlanningTool.Services;
using FirePlanningTool.Models;

namespace FirePlanningTool.Controllers
{
    /// <summary>
    /// API controller for retrieving historical Israel CPI inflation data.
    /// Rate limited to prevent abuse.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    public class InflationController : ControllerBase
    {
        private readonly IInflationDataService _inflationService;
        private readonly ILogger<InflationController> _logger;

        /// <summary>
        /// Initializes a new instance of the InflationController.
        /// </summary>
        /// <param name="inflationService">Service for fetching inflation data</param>
        /// <param name="logger">Logger for diagnostic information</param>
        public InflationController(IInflationDataService inflationService, ILogger<InflationController> logger)
        {
            _inflationService = inflationService;
            _logger = logger;
        }

        /// <summary>
        /// Gets historical Israel CPI inflation data and period CAGR statistics.
        /// Data is sourced from the CBS (Israel Central Bureau of Statistics) and cached for 24 hours.
        /// </summary>
        /// <returns>Inflation history with yearly data points and CAGR statistics</returns>
        /// <response code="200">Successfully retrieved inflation history</response>
        /// <response code="500">Internal server error occurred</response>
        /// <response code="503">CBS data source is temporarily unavailable</response>
        [HttpGet("israel/historical")]
        public async Task<ActionResult<InflationHistoryResponse>> GetIsraelHistorical()
        {
            try
            {
                var result = await _inflationService.GetIsraelInflationHistoryAsync();
                if (result == null)
                {
                    _logger.LogWarning("Israel inflation data unavailable; returning 503");
                    return StatusCode(503, new ApiErrorResponse("Failed to fetch Israel inflation data from CBS"));
                }

                _logger.LogInformation("Returning Israel inflation history with {Count} data points", result.DataPoints.Count);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving Israel inflation history");
                return StatusCode(500, new ApiErrorResponse("Failed to retrieve inflation data"));
            }
        }
    }
}
