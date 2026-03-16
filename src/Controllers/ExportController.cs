using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.Extensions;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using System.Text;
using System.Text.Json;

namespace FirePlanningTool.Controllers
{
    /// <summary>
    /// Controller for exporting FIRE calculation results to various formats.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class ExportController : ControllerBase
    {
        private readonly IExcelExportService _excelExportService;
        private readonly IFireCalculator _fireCalculator;
        private readonly IValidator<FirePlanInput> _inputValidator;
        private readonly ILogger<ExportController> _logger;

        /// <summary>
        /// Initializes a new instance of the ExportController.
        /// </summary>
        /// <param name="excelExportService">Service for generating Excel export files</param>
        /// <param name="fireCalculator">Calculator service for server-side FIRE plan calculation</param>
        /// <param name="inputValidator">Validator for FirePlanInput used on both export endpoints</param>
        /// <param name="logger">Logger for diagnostic and error information</param>
        public ExportController(
            IExcelExportService excelExportService,
            IFireCalculator fireCalculator,
            IValidator<FirePlanInput> inputValidator,
            ILogger<ExportController> logger)
        {
            _excelExportService = excelExportService;
            _fireCalculator = fireCalculator;
            _inputValidator = inputValidator;
            _logger = logger;
        }

        /// <summary>
        /// Exports FIRE calculation results to Excel (.xlsx format).
        /// Server calculates fresh results from input to ensure data integrity.
        /// </summary>
        /// <param name="request">Export request with input parameters and options.</param>
        /// <returns>Excel file download.</returns>
        /// <response code="200">Excel file generated successfully.</response>
        /// <response code="400">Invalid request data.</response>
        /// <response code="500">Internal server error during export generation.</response>
        [HttpPost("excel")]
        [RequestSizeLimit(10_000_000)] // 10 MB limit to prevent DoS
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(typeof(ApiErrorResponse), 400)]
        [ProducesResponseType(typeof(ApiErrorResponse), 500)]
        public IActionResult ExportToExcel([FromBody] ExportRequest? request)
        {
            try
            {
                // Validate request exists
                if (request == null)
                {
                    _logger.LogWarning("Export request was null");
                    return BadRequest(new ApiErrorResponse("Export request is required"));
                }

                _logger.LogInformation("Starting Excel export for scenario: {ScenarioName}",
                    request.ScenarioName ?? "Unnamed");

                // Validate input exists
                if (request.Input == null)
                {
                    _logger.LogWarning("Export request Input was null");
                    return BadRequest(new ApiErrorResponse("Input is required"));
                }

                // Validate FIRE plan input using FluentValidation
                var validationResult = _inputValidator.Validate(request.Input);
                if (!validationResult.IsValid)
                {
                    var errors = string.Join("; ", validationResult.Errors.Select(e => e.ErrorMessage));
                    _logger.LogWarning("Export input validation failed: {Errors}", errors);
                    return BadRequest(new ApiErrorResponse(errors));
                }

                // Calculate fresh results server-side to avoid round-trip transformation issues
                _logger.LogInformation("Calculating fresh FIRE plan for export");
                var calculationResult = _fireCalculator.Calculate(request.Input);

                // Prepare export options
                var options = new ExcelExportOptions
                {
                    ScenarioName = request.ScenarioName,
                    ScenarioNotes = request.ScenarioNotes,
                    UsdIlsRate = request.UsdIlsRate ?? request.Input.UsdIlsRate,
                    Input = request.Input,
                    AppVersion = GetAppVersion()
                };

                // Generate Excel file
                var startTime = DateTime.UtcNow;
                var excelBytes = _excelExportService.GenerateExcel(calculationResult, options);
                var duration = (DateTime.UtcNow - startTime).TotalMilliseconds;

                _logger.LogInformation("Excel export completed in {Duration}ms, file size: {Size} bytes",
                    duration, excelBytes.Length);

                // Generate filename
                var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
                var scenarioPrefix = string.IsNullOrWhiteSpace(request.ScenarioName)
                    ? "FIRE_Plan"
                    : SanitizeFilename(request.ScenarioName);
                var filename = $"{scenarioPrefix}_{timestamp}.xlsx";

                // Return file
                return File(
                    excelBytes,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    filename
                );
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "JSON deserialization error during Excel export: {Message}", ex.Message);
                return BadRequest(new ApiErrorResponse("Invalid request format"));
            }
            catch (ArgumentException ex)
            {
                // Calculation validation errors
                _logger.LogWarning(ex, "Invalid input for FIRE calculation during export");
                return BadRequest(new ApiErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Excel export");
                return StatusCode(500, new ApiErrorResponse("An error occurred while generating the export."));
            }
        }

        /// <summary>
        /// Exports FIRE calculation results to CSV format (fallback for compatibility).
        /// Server calculates fresh results from input.
        /// Returns yearly projections as CSV for basic spreadsheet compatibility.
        /// </summary>
        /// <param name="request">Export request with input parameters.</param>
        /// <returns>CSV file download.</returns>
        /// <response code="200">CSV file generated successfully.</response>
        /// <response code="400">Invalid request data.</response>
        [HttpPost("csv")]
        [RequestSizeLimit(10_000_000)] // 10 MB limit to prevent DoS
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(typeof(ApiErrorResponse), 400)]
        public IActionResult ExportToCsv([FromBody] ExportRequest request)
        {
            try
            {
                _logger.LogInformation("Starting CSV export for scenario: {ScenarioName}",
                    request.ScenarioName ?? "Unnamed");

                // Validate input exists
                if (request.Input == null)
                {
                    return BadRequest(new ApiErrorResponse("Input is required"));
                }

                // Validate FIRE plan input using FluentValidation
                var csvValidationResult = _inputValidator.Validate(request.Input);
                if (!csvValidationResult.IsValid)
                {
                    var errors = string.Join("; ", csvValidationResult.Errors.Select(e => e.ErrorMessage));
                    _logger.LogWarning("CSV export input validation failed: {Errors}", errors);
                    return BadRequest(new ApiErrorResponse(errors));
                }

                // Calculate fresh results server-side
                _logger.LogInformation("Calculating fresh FIRE plan for CSV export");
                var calculationResult = _fireCalculator.Calculate(request.Input);

                var currency = request.Input.Currency;
                var csv = new StringBuilder();

                // Add UTF-8 BOM for Excel compatibility
                csv.Append('\uFEFF');

                // CSV Header
                csv.AppendLine("Year,Age,Phase,Portfolio Value,Currency,Total Contributions,Currency,Annual Withdrawal,Currency");

                // CSV Data rows - with proper escaping
                foreach (var yearly in calculationResult.YearlyData)
                {
                    var age = yearly.Year - request.Input.BirthYear;
                    csv.AppendLine(
                        $"{yearly.Year},{age},{EscapeCsvField(yearly.Phase)}," +
                        $"{yearly.PortfolioValue:F2},{EscapeCsvField(currency)}," +
                        $"{yearly.TotalContributions:F2},{EscapeCsvField(currency)}," +
                        $"{yearly.AnnualWithdrawal ?? 0:F2},{EscapeCsvField(currency)}"
                    );
                }

                var csvBytes = Encoding.UTF8.GetBytes(csv.ToString());

                // Generate filename
                var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
                var scenarioPrefix = string.IsNullOrWhiteSpace(request.ScenarioName)
                    ? "FIRE_Plan"
                    : SanitizeFilename(request.ScenarioName);
                var filename = $"{scenarioPrefix}_{timestamp}.csv";

                _logger.LogInformation("CSV export completed, file size: {Size} bytes", csvBytes.Length);

                return File(csvBytes, "text/csv", filename);
            }
            catch (ArgumentException ex)
            {
                // Calculation validation errors
                _logger.LogWarning(ex, "Invalid input for FIRE calculation during CSV export");
                return BadRequest(new ApiErrorResponse(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating CSV export");
                return StatusCode(500, new ApiErrorResponse("An error occurred while generating the CSV export."));
            }
        }

        /// <summary>
        /// Gets the application version from assembly or configuration.
        /// </summary>
        private string GetAppVersion()
        {
            // Try to get from assembly version
            var version = typeof(ExportController).Assembly.GetName().Version;
            return version != null ? $"{version.Major}.{version.Minor}.{version.Build}" : "1.0.0";
        }

        /// <summary>
        /// Sanitizes filename to remove invalid characters.
        /// </summary>
        private string SanitizeFilename(string filename)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var sanitized = string.Join("_", filename.Split(invalid, StringSplitOptions.RemoveEmptyEntries));
            return sanitized.Length > 50 ? sanitized.Substring(0, 50) : sanitized;
        }

        /// <summary>
        /// Escapes a CSV field value to prevent injection and handle special characters.
        /// Quotes the field if it contains comma, quote, newline, or starts with dangerous characters.
        /// Doubles any quotes inside the field.
        /// Prefixes dangerous leading characters (=, +, -, @) with apostrophe to prevent formula injection.
        /// </summary>
        private static string EscapeCsvField(string? value)
        {
            if (string.IsNullOrEmpty(value))
                return string.Empty;

            // Prevent CSV/Excel formula injection by prefixing dangerous characters
            if (value.StartsWith('=') || value.StartsWith('+') ||
                value.StartsWith('-') || value.StartsWith('@'))
            {
                value = "'" + value;
            }

            // Quote field if it contains special characters
            if (value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r'))
            {
                // Double any quotes in the value
                value = value.Replace("\"", "\"\"");
                // Wrap in quotes
                return $"\"{value}\"";
            }

            return value;
        }
    }
}
