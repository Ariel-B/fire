using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.Extensions;

namespace FirePlanningTool.Controllers
{
    /// <summary>
    /// API controller for retrieving real-time asset prices and company information from external market data providers.
    /// Rate limited to prevent abuse and protect external API quotas.
    /// Uses Result pattern for validation errors.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [EnableRateLimiting("ApiPolicy")]
    public class AssetPricesController : ControllerBase
    {
        private readonly IFinnhubService _finnhubService;
        private readonly ILogger<AssetPricesController> _logger;

        /// <summary>
        /// Initializes a new instance of the AssetPricesController.
        /// </summary>
        /// <param name="finnhubService">Service for fetching asset prices and data from Finnhub API (stocks, ETFs, bonds, etc.)</param>
        /// <param name="logger">Logger for diagnostic and error information</param>
        public AssetPricesController(IFinnhubService finnhubService, ILogger<AssetPricesController> logger)
        {
            _finnhubService = finnhubService;
            _logger = logger;
        }

        /// <summary>
        /// Validates an asset symbol using Result pattern.
        /// Applies to stocks, ETFs, bonds, and other tradeable securities.
        /// </summary>
        private Result<string> ValidateSymbol(string symbol)
        {
            if (string.IsNullOrWhiteSpace(symbol))
            {
                return Result<string>.Failure(Error.Validation("Symbol cannot be empty"));
            }

            if (symbol.Length > 100)
            {
                return Result<string>.Failure(Error.Validation("Symbol too long"));
            }

            return Result<string>.Success(symbol.ToUpper());
        }

        /// <summary>
        /// Gets the current market price for an asset symbol.
        /// Supports stocks, ETFs, bonds, and other tradeable securities via Finnhub API.
        /// Uses Result pattern for validation errors.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs)</param>
        /// <returns>Current price information including symbol, price, currency, and timestamp</returns>
        /// <response code="200">Successfully retrieved the asset price</response>
        /// <response code="400">Invalid or empty symbol provided</response>
        /// <response code="404">Price not found for the specified symbol</response>
        /// <response code="500">Internal server error occurred while fetching price</response>
        [HttpGet("{symbol}")]
        public async Task<ActionResult<AssetPriceResponse>> GetAssetPrice(string symbol)
        {
            try
            {
                // Validate symbol input using Result pattern
                var symbolResult = ValidateSymbol(symbol);
                if (symbolResult.IsFailure)
                {
                    return symbolResult.Map<AssetPriceResponse>(_ => null!).ToActionResult(this);
                }

                var upperSymbol = symbolResult.Value;
                var price = await _finnhubService.GetCurrentPriceAsync(upperSymbol);

                if (price.HasValue)
                {
                    // Try to get currency from company profile
                    string currency = "USD"; // Default to USD
                    var profile = await _finnhubService.GetCompanyProfileAsync(upperSymbol);
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.Currency))
                    {
                        currency = profile.Currency;
                    }

                    return Ok(new AssetPriceResponse
                    {
                        Symbol = upperSymbol,
                        Price = price.Value,
                        Currency = currency,
                        Timestamp = DateTime.UtcNow
                    });
                }

                return NotFound(new ApiErrorResponse($"Price not found for symbol {symbol}"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching price for symbol {symbol}");
                return StatusCode(500, new ApiErrorResponse("Internal server error"));
            }
        }

        /// <summary>
        /// Gets current market prices for multiple asset symbols in a single request.
        /// Supports stocks, ETFs, bonds, and other tradeable securities via Finnhub API.
        /// </summary>
        /// <param name="request">Request containing list of asset symbols to fetch (maximum 100 symbols)</param>
        /// <returns>Batch response with prices for all successfully retrieved symbols</returns>
        /// <response code="200">Successfully retrieved prices for requested symbols</response>
        /// <response code="400">Invalid request (no symbols provided, too many symbols, or invalid symbol format)</response>
        /// <response code="500">Internal server error occurred while fetching prices</response>
        [HttpPost("batch")]
        public async Task<ActionResult<BatchPriceResponse>> GetMultipleAssetPrices([FromBody] BatchPriceRequest request)
        {
            try
            {
                if (request.Symbols == null || !request.Symbols.Any())
                {
                    return BadRequest(new ApiErrorResponse("No symbols provided"));
                }

                // Limit the number of symbols to prevent DoS
                const int maxSymbols = 100;
                if (request.Symbols.Count() > maxSymbols)
                {
                    return BadRequest(new ApiErrorResponse($"Too many symbols. Maximum allowed is {maxSymbols}"));
                }

                // Validate each symbol
                var invalidSymbols = request.Symbols.Where(s =>
                    string.IsNullOrWhiteSpace(s) || s.Length > 100).ToList();

                if (invalidSymbols.Any())
                {
                    return BadRequest(new ApiErrorResponse("One or more symbols are invalid"));
                }

                var upperCaseSymbols = request.Symbols.Select(s => s.ToUpper()).ToList();
                var prices = await _finnhubService.GetMultiplePricesAsync(upperCaseSymbols);

                var priceResponses = prices.Select(kvp => new AssetPriceResponse
                {
                    Symbol = kvp.Key,
                    Price = kvp.Value,
                    Currency = "USD",
                    Timestamp = DateTime.UtcNow
                }).ToList();

                return Ok(new BatchPriceResponse
                {
                    Prices = priceResponses,
                    RequestedCount = request.Symbols.Count(),
                    FoundCount = priceResponses.Count
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching multiple asset prices");
                return StatusCode(500, new ApiErrorResponse("Internal server error"));
            }
        }

        /// <summary>
        /// Gets the company/asset name and market capitalization for an asset symbol.
        /// Supports stocks, ETFs, and other tradeable securities via Finnhub API.
        /// Returns success with empty name if profile data is not available (e.g., for newer assets).
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs)</param>
        /// <returns>Asset information including name, symbol, market cap, and timestamp</returns>
        /// <response code="200">Successfully retrieved asset information (name may be empty if not available)</response>
        /// <response code="400">Invalid or empty symbol provided</response>
        /// <response code="500">Internal server error occurred while fetching asset data</response>
        [HttpGet("{symbol}/name")]
        public async Task<ActionResult<AssetNameResponse>> GetAssetName(string symbol)
        {
            try
            {
                // Validate symbol input
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    return BadRequest(new ApiErrorResponse("Symbol cannot be empty"));
                }

                // Limit symbol length to prevent abuse
                if (symbol.Length > 100)
                {
                    return BadRequest(new ApiErrorResponse("Symbol too long"));
                }

                var profile = await _finnhubService.GetCompanyProfileAsync(symbol.ToUpper());

                if (profile != null && !string.IsNullOrWhiteSpace(profile.Name))
                {
                    decimal? marketCapUsd = null;
                    if (profile.MarketCapitalization > 0)
                    {
                        var rawMarketCap = (decimal)profile.MarketCapitalization;
                        const decimal millionsToDollars = 1_000_000m;
                        const decimal thousandsToDollars = 1_000m;
                        var usesThousandUnits = rawMarketCap >= 10_000_000m;
                        var scale = usesThousandUnits ? thousandsToDollars : millionsToDollars;
                        if (usesThousandUnits)
                        {
                            _logger.LogWarning("MarketCap scaling: Symbol {Symbol} rawMarketCap={RawMarketCap} assumed to be in thousands of USD. Scaled by {Scale}.", symbol.ToUpper(), rawMarketCap, scale);
                        }
                        else
                        {
                            _logger.LogInformation("MarketCap scaling: Symbol {Symbol} rawMarketCap={RawMarketCap} assumed to be in millions of USD. Scaled by {Scale}.", symbol.ToUpper(), rawMarketCap, scale);
                        }
                        marketCapUsd = rawMarketCap * scale;
                    }

                    return Ok(new AssetNameResponse
                    {
                        Symbol = symbol.ToUpper(),
                        Name = profile.Name,
                        MarketCapUsd = marketCapUsd,
                        Timestamp = DateTime.UtcNow
                    });
                }

                // Return success with empty name if profile not found - this allows assets with prices but no profile data
                _logger.LogInformation("No company profile found for symbol {Symbol}, returning empty name", symbol.ToUpper());
                return Ok(new AssetNameResponse
                {
                    Symbol = symbol.ToUpper(),
                    Name = string.Empty,
                    MarketCapUsd = null,
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching company name for symbol {symbol}");
                return StatusCode(500, new ApiErrorResponse("Internal server error"));
            }
        }

        /// <summary>
        /// Gets historical Compound Annual Growth Rate (CAGR) data for an asset symbol.
        /// Calculates CAGR for multiple timeframes: 1, 3, 5, 10, 15, and 20 years.
        /// Supports stocks, ETFs, bonds, and other tradeable securities via Finnhub API.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs)</param>
        /// <returns>Historical CAGR values for different timeframes</returns>
        /// <response code="200">Successfully retrieved historical CAGR data</response>
        /// <response code="400">Invalid or empty symbol provided</response>
        /// <response code="500">Internal server error occurred while calculating CAGR</response>
        [HttpGet("{symbol}/cagr")]
        public async Task<ActionResult<HistoricalCAGRResponse>> GetHistoricalCAGRs(string symbol)
        {
            try
            {
                // Validate symbol input
                if (string.IsNullOrWhiteSpace(symbol))
                {
                    return BadRequest(new ApiErrorResponse("Symbol cannot be empty"));
                }

                // Limit symbol length to prevent abuse
                if (symbol.Length > 100)
                {
                    return BadRequest(new ApiErrorResponse("Symbol too long"));
                }

                var cagrs = await _finnhubService.GetHistoricalCAGRsAsync(symbol.ToUpper());

                return Ok(new HistoricalCAGRResponse
                {
                    Symbol = symbol.ToUpper(),
                    CAGRs = cagrs.Select(kvp => new CAGRValue
                    {
                        Years = kvp.Key,
                        Value = kvp.Value
                    }).OrderBy(c => c.Years).ToList(),
                    Timestamp = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching historical CAGRs for symbol {symbol}");
                return StatusCode(500, new ApiErrorResponse("Internal server error"));
            }
        }
    }
}
