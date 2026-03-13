using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using System.Text.Json;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FirePlanningTool.Extensions;
using FluentValidation;

namespace FirePlanningTool.Controllers
{
    /// <summary>
    /// API controller for FIRE (Financial Independence, Retire Early) plan calculations, saving, and loading.
    /// Provides endpoints for calculating retirement projections, saving plans to JSON, and loading plans from JSON.
    /// Rate limited to prevent abuse and ensure fair access.
    /// Uses Result pattern for explicit, exception-free error handling.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    public class FirePlanController : ControllerBase
    {
        private readonly ILogger<FirePlanController> _logger;
        private readonly IFireCalculator _fireCalculator;
        private readonly IValidator<FirePlanInput> _inputValidator;
        private readonly IValidator<FirePlanData> _planDataValidator;
        private readonly IValidator<JsonLoadRequest> _jsonLoadValidator;
        private readonly IReadOnlyDictionary<string, string> _assetNameLookup;

        /// <summary>
        /// Initializes a new instance of the FirePlanController.
        /// </summary>
        /// <param name="logger">Logger for diagnostic and error information</param>
        /// <param name="fireCalculator">Calculator service for FIRE plan projections</param>
        /// <param name="inputValidator">Validator for FirePlanInput</param>
        /// <param name="planDataValidator">Validator for FirePlanData</param>
        /// <param name="jsonLoadValidator">Validator for JsonLoadRequest</param>
        /// <param name="assetNamesConfig">Asset name configuration for symbol-to-name lookup</param>
        public FirePlanController(
            ILogger<FirePlanController> logger,
            IFireCalculator fireCalculator,
            IValidator<FirePlanInput> inputValidator,
            IValidator<FirePlanData> planDataValidator,
            IValidator<JsonLoadRequest> jsonLoadValidator,
            IOptions<AssetNamesConfiguration> assetNamesConfig)
        {
            _logger = logger;
            _fireCalculator = fireCalculator;
            _inputValidator = inputValidator;
            _planDataValidator = planDataValidator;
            _jsonLoadValidator = jsonLoadValidator;
            _assetNameLookup = assetNamesConfig.Value.GetFlattenedLookup();
        }

        /// <summary>
        /// Calculates a complete FIRE plan with yearly projections based on the provided input parameters.
        /// Includes accumulation phase (until early retirement), retirement phase, tax calculations,
        /// portfolio growth projections, and RSU (Restricted Stock Unit) management.
        /// Uses Result pattern for validation, eliminating exception overhead for expected errors.
        /// </summary>
        /// <param name="input">FIRE plan input parameters including retirement years, portfolio allocation, expenses, and RSU configuration</param>
        /// <returns>Complete FIRE calculation results with yearly projections and portfolio values</returns>
        /// <response code="200">Successfully calculated FIRE plan</response>
        /// <response code="400">Invalid input parameters or validation failure</response>
        /// <response code="500">Internal server error occurred during calculation</response>
        [HttpPost("calculate")]
        [RequestSizeLimit(5_000_000)] // Limit request size to 5MB
        public ActionResult<FireCalculationResult> CalculateFirePlan([FromBody] FirePlanInput input)
        {
            try
            {
                // Validate null input using Result pattern
                if (input == null)
                {
                    return BadRequest(new ApiErrorResponse("Input data is required"));
                }

                // Validate input using FluentValidation, convert to Result pattern
                var validationResult = _inputValidator.Validate(input);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                    _logger.LogWarning("Validation failed: {Errors}", errors);
                    var result = Result<FireCalculationResult>.Failure(Error.Validation(errors));
                    return result.ToActionResult(this);
                }

                // Perform calculation (may still throw for infrastructure errors)
                var calculationResult = _fireCalculator.Calculate(input);

                // Populate asset display names from etf-names.json lookup
                PopulateAssetNames(calculationResult.AccumulationPortfolio);
                PopulateAssetNames(calculationResult.RetirementPortfolio);

                return Ok(calculationResult);
            }
            catch (ArgumentException ex)
            {
                // Handle remaining ArgumentExceptions as validation errors
                _logger.LogWarning(ex, "Invalid input for FIRE calculation");
                var result = Result<FireCalculationResult>.Failure(Error.Validation(ex.Message));
                return result.ToActionResult(this);
            }
            catch (Exception ex)
            {
                // Infrastructure errors still use exceptions (database, network, etc.)
                _logger.LogError(ex, "Error calculating FIRE plan");
                return StatusCode(500, new ApiErrorResponse("An error occurred while calculating the plan"));
            }
        }

        /// <summary>
        /// Saves a FIRE plan to JSON format for later retrieval.
        /// Serializes the plan data including inputs, expenses, and portfolio information.
        /// Uses Result pattern for validation errors.
        /// </summary>
        /// <param name="planData">Complete FIRE plan data to serialize</param>
        /// <returns>JSON representation of the plan data</returns>
        /// <response code="200">Successfully serialized plan to JSON</response>
        /// <response code="400">Plan data is missing or invalid</response>
        /// <response code="500">Internal server error occurred during serialization</response>
        [HttpPost("save")]
        [RequestSizeLimit(5_000_000)] // Limit request size to 5MB
        public IActionResult SavePlan([FromBody] FirePlanData planData)
        {
            try
            {
                // Validate null input
                if (planData == null)
                {
                    return BadRequest(new ApiErrorResponse("Plan data is required"));
                }

                // Validate plan data using FluentValidation
                var validationResult = _planDataValidator.Validate(planData);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                    _logger.LogWarning("Validation failed: {Errors}", errors);
                    return BadRequest(new ApiErrorResponse(errors));
                }

                var json = JsonSerializer.Serialize(planData, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });

                return Ok(new { success = true, data = json });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving FIRE plan");
                return StatusCode(500, new ApiErrorResponse("An error occurred while saving the plan"));
            }
        }

        /// <summary>
        /// Loads a FIRE plan from JSON format.
        /// Deserializes JSON data back into a FirePlanData object with validation.
        /// Uses Result pattern for validation and deserialization errors.
        /// </summary>
        /// <param name="request">Request containing JSON string with the serialized FIRE plan</param>
        /// <returns>Deserialized FIRE plan data</returns>
        /// <response code="200">Successfully loaded and deserialized plan from JSON</response>
        /// <response code="400">JSON data is missing, invalid, or too large</response>
        /// <response code="500">Internal server error occurred during deserialization</response>
        [HttpPost("load")]
        [RequestSizeLimit(5_000_000)] // Limit request size to 5MB
        public ActionResult<FirePlanData> LoadPlan([FromBody] JsonLoadRequest request)
        {
            try
            {
                // Validate request using FluentValidation, convert to Result pattern
                var validationResult = _jsonLoadValidator.Validate(request);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                    _logger.LogWarning("Validation failed: {Errors}", errors);
                    var result = Result<FirePlanData>.Failure(Error.Validation(errors));
                    return result.ToActionResult(this);
                }

                var planData = JsonSerializer.Deserialize<FirePlanData>(request.JsonData, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true,
                    MaxDepth = 32 // Prevent deeply nested JSON attacks
                });

                if (planData == null)
                {
                    return BadRequest(new ApiErrorResponse("Invalid JSON data"));
                }

                return Ok(planData);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Invalid JSON data provided");
                return BadRequest(new ApiErrorResponse("Invalid JSON format"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading FIRE plan");
                return StatusCode(500, new ApiErrorResponse("An error occurred while loading the plan"));
            }
        }

        /// <summary>
        /// Populates the Name property on each PortfolioAsset from the etf-names.json lookup.
        /// </summary>
        private void PopulateAssetNames(List<PortfolioAsset> portfolio)
        {
            foreach (var asset in portfolio)
            {
                if (string.IsNullOrEmpty(asset.Name) && !string.IsNullOrEmpty(asset.Symbol))
                {
                    if (_assetNameLookup.TryGetValue(asset.Symbol, out var name))
                    {
                        asset.Name = name;
                    }
                }
            }
        }
    }
}
