using FirePlanningTool.Controllers;
using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace FirePlanningTool.Tests.Security
{
    /// <summary>
    /// Security validation tests to ensure input validation and security measures are working
    /// </summary>
    public class SecurityValidationTests
    {
        private readonly Mock<ILogger<FirePlanController>> _loggerMock;
        private readonly Mock<IFireCalculator> _calculatorMock;
        private readonly FirePlanController _controller;

        public SecurityValidationTests()
        {
            _loggerMock = new Mock<ILogger<FirePlanController>>();
            _calculatorMock = new Mock<IFireCalculator>();

            // Create real validators for testing
            var inputValidator = new FirePlanInputValidator();
            var planDataValidator = new FirePlanDataValidator();
            var jsonLoadValidator = new JsonLoadRequestValidator();

            _controller = new FirePlanController(
                _loggerMock.Object,
                _calculatorMock.Object,
                inputValidator,
                planDataValidator,
                jsonLoadValidator,
                Options.Create(new AssetNamesConfiguration()));
        }

        [Fact]
        public void CalculateFirePlan_WithNullInput_ReturnsBadRequest()
        {
            // Act
            var result = _controller.CalculateFirePlan(null!);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Theory]
        [InlineData(1899)] // Too old
        [InlineData(2100)] // Too far in future
        public void CalculateFirePlan_WithInvalidBirthYear_ReturnsBadRequest(int birthYear)
        {
            // Arrange
            var input = new FirePlanInput { BirthYear = birthYear };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Theory]
        [InlineData(-1)] // Negative
        [InlineData(101)] // Over 100%
        public void CalculateFirePlan_WithInvalidWithdrawalRate_ReturnsBadRequest(decimal rate)
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                WithdrawalRate = rate
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Theory]
        [InlineData(-60)] // Too negative
        [InlineData(150)] // Too high
        public void CalculateFirePlan_WithInvalidInflationRate_ReturnsBadRequest(decimal rate)
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                InflationRate = rate
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Theory]
        [InlineData(-1)] // Negative
        [InlineData(101)] // Over 100%
        public void CalculateFirePlan_WithInvalidCapitalGainsTax_ReturnsBadRequest(decimal tax)
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                CapitalGainsTax = tax
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithNegativeMonthlyContribution_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                MonthlyContribution = Money.Usd(-1000)
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithExcessiveMonthlyContribution_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                MonthlyContribution = Money.Usd(1_000_000_001m) // Over limit
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithTooManyPortfolioItems_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                AccumulationPortfolio = Enumerable.Range(0, 1001)
                    .Select(i => new PortfolioAsset { Id = i, Symbol = $"STOCK{i}" })
                    .ToList()
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithTooManyExpenses_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                Expenses = Enumerable.Range(0, 1001)
                    .Select(i => new PlannedExpense { Id = i, Type = $"Expense{i}", NetAmount = Money.Usd(1000) })
                    .ToList()
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void LoadPlan_WithNullJson_ReturnsBadRequest()
        {
            // Act
            var request = new JsonLoadRequest { JsonData = null! };
            var result = _controller.LoadPlan(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void LoadPlan_WithEmptyJson_ReturnsBadRequest()
        {
            // Act
            var request = new JsonLoadRequest { JsonData = "" };
            var result = _controller.LoadPlan(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void LoadPlan_WithInvalidJson_ReturnsBadRequest()
        {
            // Act
            var request = new JsonLoadRequest { JsonData = "{ invalid json }" };
            var result = _controller.LoadPlan(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public void SavePlan_WithNullData_ReturnsBadRequest()
        {
            // Act
            var result = _controller.SavePlan(null!);

            // Assert
            result.Should().BeOfType<BadRequestObjectResult>();
        }
    }

    /// <summary>
    /// Security tests for AssetPricesController
    /// </summary>
    public class AssetPricesSecurityTests
    {
        private readonly Mock<IFinnhubService> _mockFinnhubService;
        private readonly Mock<ILogger<AssetPricesController>> _mockLogger;
        private readonly AssetPricesController _controller;

        public AssetPricesSecurityTests()
        {
            _mockFinnhubService = new Mock<IFinnhubService>();
            _mockLogger = new Mock<ILogger<AssetPricesController>>();
            _controller = new AssetPricesController(_mockFinnhubService.Object, _mockLogger.Object);
        }

        [Theory]
        [InlineData("")] // Empty
        [InlineData("   ")] // Whitespace
        public async Task GetAssetPrice_WithInvalidSymbol_ReturnsBadRequest(string symbol)
        {
            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetAssetPrice_WithTooLongSymbol_ReturnsBadRequest()
        {
            // Arrange
            var symbol = new string('A', 101); // 101 characters

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithNoSymbols_ReturnsBadRequest()
        {
            // Arrange
            var request = new BatchPriceRequest { Symbols = new List<string>() };

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithTooManySymbols_ReturnsBadRequest()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = Enumerable.Range(0, 101).Select(i => $"SYM{i}").ToList()
            };

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithInvalidSymbols_ReturnsBadRequest()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VALID", "", "ALSOVALID" } // Contains empty symbol
            };

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithTooLongSymbols_ReturnsBadRequest()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VALID", new string('A', 101) } // One symbol too long
            };

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }
    }

    /// <summary>
    /// Security tests for FinnhubService
    /// </summary>
    public class FinnhubServiceSecurityTests
    {
        [Theory]
        [InlineData("AAPL")] // Valid
        [InlineData("BRK.B")] // Valid with dot
        [InlineData("BRK-B")] // Valid with hyphen
        public async Task GetCurrentPriceAsync_WithValidSymbol_ProcessesCorrectly(string symbol)
        {
            // Arrange
            var mockLogger = new Mock<ILogger<FinnhubService>>();
            var mockHttpClient = new Mock<HttpClient>();
            var cache = new MemoryCache(new MemoryCacheOptions());
            var config = Microsoft.Extensions.Options.Options.Create(new FinnhubConfiguration
            {
                ApiKey = "test-key",
                BaseUrl = "https://finnhub.io/api/v1"
            });

            var mockRepository = new Mock<FirePlanningTool.Repositories.IAssetDataRepository>();
            mockRepository.Setup(r => r.FetchCurrentPriceAsync(It.IsAny<string>())).ReturnsAsync(150.0m);

            var service = new FinnhubService(mockRepository.Object, mockLogger.Object, cache);

            // Act & Assert - Should not throw exception
            // Note: This validates symbol validation logic
            var result = await service.GetCurrentPriceAsync(symbol);

            // The result might be null due to mock, but the point is no exception was thrown
            // during symbol validation
        }

        [Theory]
        [InlineData("")] // Empty
        [InlineData("   ")] // Whitespace
        [InlineData("AAP<script>")] // Contains invalid characters
        [InlineData("AAP;DROP TABLE")] // SQL injection attempt
        [InlineData("AAP&token=hack")] // URL manipulation attempt
        public async Task GetCurrentPriceAsync_WithInvalidSymbol_ReturnsNull(string symbol)
        {
            // Arrange
            var mockLogger = new Mock<ILogger<FinnhubService>>();
            var mockRepository = new Mock<FirePlanningTool.Repositories.IAssetDataRepository>();
            var cache = new MemoryCache(new MemoryCacheOptions());

            var service = new FinnhubService(mockRepository.Object, mockLogger.Object, cache);

            // Act
            var result = await service.GetCurrentPriceAsync(symbol);

            // Assert
            result.Should().BeNull();
        }
    }
}
