using System;
using System.Threading.Tasks;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Logging;

namespace FirePlanningTool.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    public class InflationController : ControllerBase
    {
        private readonly IInflationDataService _inflationService;
        private readonly ILogger<InflationController> _logger;

        public InflationController(IInflationDataService inflationService, ILogger<InflationController> logger)
        {
            _inflationService = inflationService;
            _logger = logger;
        }

        /// <summary>
        /// Get historical Israel CPI inflation data and period CAGR statistics.
        /// </summary>
        [HttpGet("israel/historical")]
        public async Task<ActionResult<InflationHistoryResponse>> GetIsraelHistorical()
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
    }
}
