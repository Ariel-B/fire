namespace FirePlanningTool.Tests.API
{
    using FirePlanningTool.Controllers;
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.Extensions.Logging;
    using Moq;

    /// <summary>
    /// Tests for AssetPricesController
    /// Validates API endpoints for single and batch asset price retrieval
    /// </summary>
    public class AssetPricesControllerTests
    {
        private readonly Mock<IFinnhubService> _mockFinnhubService;
        private readonly Mock<ILogger<AssetPricesController>> _mockLogger;
        private readonly AssetPricesController _controller;

        public AssetPricesControllerTests()
        {
            _mockFinnhubService = new Mock<IFinnhubService>();
            _mockLogger = new Mock<ILogger<AssetPricesController>>();
            _controller = new AssetPricesController(_mockFinnhubService.Object, _mockLogger.Object);
        }

        #region GetAssetPrice Tests

        [Fact]
        public async Task GetAssetPrice_WithValidSymbol_ReturnsOkWithPrice()
        {
            // Arrange
            var symbol = "VTI";
            var expectedPrice = 250.75m;
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(expectedPrice);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult!.Value.Should().BeOfType<AssetPriceResponse>();
            var response = okResult.Value as AssetPriceResponse;
            response!.Price.Should().Be(expectedPrice);
        }

        [Fact]
        public async Task GetAssetPrice_WithInvalidSymbol_ReturnsNotFound()
        {
            // Arrange
            var symbol = "INVALID";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync((decimal?)null);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task GetAssetPrice_WithHighPrice_ReturnsCorrectValue()
        {
            // Arrange
            var symbol = "BRK.B";
            var highPrice = 600000m;
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(highPrice);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as AssetPriceResponse;
            response!.Price.Should().Be(highPrice);
        }

        [Fact]
        public async Task GetAssetPrice_WithLowPrice_ReturnsCorrectValue()
        {
            // Arrange
            var symbol = "PENNY";
            var lowPrice = 0.01m;
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(lowPrice);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetAssetPrice_WithServiceException_ReturnsInternalServerError()
        {
            // Arrange
            var symbol = "VTI";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("Service error"));

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objResult = result.Result as ObjectResult;
            objResult!.StatusCode.Should().Be(500);
        }

        [Fact]
        public async Task GetAssetPrice_ConvertsSymbolToUppercase()
        {
            // Arrange
            var symbol = "vti";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(250m);

            // Act
            await _controller.GetAssetPrice(symbol);

            // Assert
            _mockFinnhubService.Verify(
                s => s.GetCurrentPriceAsync(It.Is<string>(x => x == "VTI")),
                Times.Once);
        }

        [Fact]
        public async Task GetAssetPrice_ResponseIncludesSymbol()
        {
            // Arrange
            var symbol = "VTI";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(250m);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as AssetPriceResponse;
            response!.Symbol.Should().Be("VTI");
            response.Currency.Should().Be("USD");
        }

        [Fact]
        public async Task GetAssetPrice_ResponseIncludesTimestamp()
        {
            // Arrange
            var symbol = "VTI";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(250m);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as AssetPriceResponse;
            response!.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
        }

        #endregion

        #region GetMultipleAssetPrices Tests

        [Fact]
        public async Task GetMultipleAssetPrices_WithValidSymbols_ReturnsOkWithPrices()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VTI", "BND", "VXUS" }
            };
            var expectedPrices = new Dictionary<string, decimal>
            {
                { "VTI", 250 },
                { "BND", 100 },
                { "VXUS", 200 }
            };
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(expectedPrices);

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as BatchPriceResponse;
            response.Should().NotBeNull();
            response!.Prices.Should().HaveCount(3);
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithEmptySymbols_ReturnsBadRequest()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string>()
            };

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithPartialResults_ReturnsAvailablePrices()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VTI", "INVALID", "BND" }
            };
            var expectedPrices = new Dictionary<string, decimal>
            {
                { "VTI", 250 },
                { "BND", 100 }
            };
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(expectedPrices);

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as BatchPriceResponse;
            response!.FoundCount.Should().Be(2);
            response.RequestedCount.Should().Be(3);
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithServiceError_ReturnsInternalServerError()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VTI" }
            };
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ThrowsAsync(new Exception("Service error"));

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objResult = result.Result as ObjectResult;
            objResult!.StatusCode.Should().Be(500);
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithLargeSymbolSet_HandlesPerformance()
        {
            // Arrange
            var symbols = Enumerable.Range(0, 100)
                .Select(i => $"SYM{i}")
                .ToList();
            var request = new BatchPriceRequest { Symbols = symbols };
            var expectedPrices = symbols.ToDictionary(s => s, s => 100m);
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(expectedPrices);

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as BatchPriceResponse;
            response!.FoundCount.Should().Be(100);
        }

        [Fact]
        public async Task GetMultipleAssetPrices_ConvertsSymbolsToUppercase()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "vti", "bnd" }
            };
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(new Dictionary<string, decimal>
                {
                    { "VTI", 250 },
                    { "BND", 100 }
                });

            // Act
            await _controller.GetMultipleAssetPrices(request);

            // Assert
            _mockFinnhubService.Verify(
                s => s.GetMultiplePricesAsync(It.Is<IEnumerable<string>>(symbols =>
                    symbols.Contains("VTI") && symbols.Contains("BND"))),
                Times.Once);
        }

        #endregion

        #region Edge Cases

        [Fact]
        public async Task GetAssetPrice_WithZeroPrice_ReturnsValidResponse()
        {
            // Arrange
            var symbol = "ZERO";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(0m);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetAssetPrice_WithSpecialCharacters_ProcessesCorrectly()
        {
            // Arrange
            var symbol = "BRK.B";
            _mockFinnhubService
                .Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync(450m);

            // Act
            var result = await _controller.GetAssetPrice(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public async Task GetMultipleAssetPrices_WithDuplicates_HandlesDuplicates()
        {
            // Arrange
            var request = new BatchPriceRequest
            {
                Symbols = new List<string> { "VTI", "VTI", "BND" }
            };
            var expectedPrices = new Dictionary<string, decimal>
            {
                { "VTI", 250 },
                { "BND", 100 }
            };
            _mockFinnhubService
                .Setup(s => s.GetMultiplePricesAsync(It.IsAny<IEnumerable<string>>()))
                .ReturnsAsync(expectedPrices);

            // Act
            var result = await _controller.GetMultipleAssetPrices(request);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as BatchPriceResponse;
            response!.FoundCount.Should().Be(2);
        }

        #endregion

        #region GetAssetName Tests

        [Fact]
        public async Task GetAssetName_WithValidSymbol_ReturnsOkWithName()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedName = "Apple Inc";
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ReturnsAsync(new FinnhubCompanyProfile
                {
                    Name = expectedName,
                    Ticker = symbol,
                    MarketCapitalization = 2500 // billions USD
                });

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult!.Value.Should().BeOfType<AssetNameResponse>();
            var response = okResult.Value as AssetNameResponse;
            response!.Name.Should().Be(expectedName);
            response.Symbol.Should().Be(symbol.ToUpper());
            response.MarketCapUsd.Should().Be(2500m * 1_000_000m);
        }

        [Fact]
        public async Task GetAssetName_WhenMarketCapIsReportedInThousands_NormalizesValue()
        {
            // Arrange
            var symbol = "TSLA";
            var rawThousandsValue = 1_395_000_000; // Represents ~1.395T when scaled correctly
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ReturnsAsync(new FinnhubCompanyProfile
                {
                    Name = "Tesla Inc",
                    Ticker = symbol,
                    MarketCapitalization = rawThousandsValue
                });

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as AssetNameResponse;
            response!.MarketCapUsd.Should().Be(rawThousandsValue * 1_000m);
        }

        [Fact]
        public async Task GetAssetName_WithInvalidSymbol_ReturnsOkWithEmptyName()
        {
            // Arrange
            var symbol = "INVALID";
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ReturnsAsync((FinnhubCompanyProfile?)null);

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            var response = okResult?.Value as AssetNameResponse;
            response.Should().NotBeNull();
            response!.Symbol.Should().Be(symbol);
            response.Name.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAssetName_WithEmptySymbol_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.GetAssetName("");

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetAssetName_WithTooLongSymbol_ReturnsBadRequest()
        {
            // Arrange
            var symbol = new string('A', 105); // More than 100 characters

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetAssetName_ConvertsSymbolToUppercase()
        {
            // Arrange
            var symbol = "aapl";
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ReturnsAsync(new FinnhubCompanyProfile { Name = "Apple Inc", Ticker = symbol.ToUpper() });

            // Act
            await _controller.GetAssetName(symbol);

            // Assert
            _mockFinnhubService.Verify(
                s => s.GetCompanyProfileAsync(It.Is<string>(x => x == "AAPL")),
                Times.Once);
        }

        [Fact]
        public async Task GetAssetName_WithServiceException_ReturnsInternalServerError()
        {
            // Arrange
            var symbol = "AAPL";
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("Service error"));

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objResult = result.Result as ObjectResult;
            objResult!.StatusCode.Should().Be(500);
        }

        [Fact]
        public async Task GetAssetName_ResponseIncludesTimestamp()
        {
            // Arrange
            var symbol = "AAPL";
            _mockFinnhubService
                .Setup(s => s.GetCompanyProfileAsync(It.IsAny<string>()))
                .ReturnsAsync(new FinnhubCompanyProfile { Name = "Apple Inc", Ticker = symbol });

            // Act
            var result = await _controller.GetAssetName(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as AssetNameResponse;
            response!.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
        }

        #endregion

        #region GetHistoricalCAGRs Tests

        [Fact]
        public async Task GetHistoricalCAGRs_WithValidSymbol_ReturnsOkWithCAGRs()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedCAGRs = new Dictionary<int, decimal?>
            {
                { 1, 10.5m },
                { 3, 12.3m },
                { 5, 15.0m },
                { 10, 18.2m },
                { 15, null },
                { 20, null }
            };
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ReturnsAsync(expectedCAGRs);

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var okResult = result.Result as OkObjectResult;
            okResult!.Value.Should().BeOfType<HistoricalCAGRResponse>();
            var response = okResult.Value as HistoricalCAGRResponse;
            response!.Symbol.Should().Be(symbol.ToUpper());
            response.CAGRs.Should().HaveCount(6);
        }

        [Fact]
        public async Task GetHistoricalCAGRs_WithEmptySymbol_ReturnsBadRequest()
        {
            // Act
            var result = await _controller.GetHistoricalCAGRs("");

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetHistoricalCAGRs_WithTooLongSymbol_ReturnsBadRequest()
        {
            // Arrange
            var symbol = new string('A', 105); // More than 100 characters

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        [Fact]
        public async Task GetHistoricalCAGRs_ConvertsSymbolToUppercase()
        {
            // Arrange
            var symbol = "aapl";
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ReturnsAsync(new Dictionary<int, decimal?>());

            // Act
            await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            _mockFinnhubService.Verify(
                s => s.GetHistoricalCAGRsAsync(It.Is<string>(x => x == "AAPL")),
                Times.Once);
        }

        [Fact]
        public async Task GetHistoricalCAGRs_WithServiceException_ReturnsInternalServerError()
        {
            // Arrange
            var symbol = "AAPL";
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("Service error"));

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objResult = result.Result as ObjectResult;
            objResult!.StatusCode.Should().Be(500);
        }

        [Fact]
        public async Task GetHistoricalCAGRs_ResponseIncludesTimestamp()
        {
            // Arrange
            var symbol = "AAPL";
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ReturnsAsync(new Dictionary<int, decimal?>());

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as HistoricalCAGRResponse;
            response!.Timestamp.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(2));
        }

        [Fact]
        public async Task GetHistoricalCAGRs_CAGRsAreOrderedByYears()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedCAGRs = new Dictionary<int, decimal?>
            {
                { 20, 20.0m },
                { 1, 10.5m },
                { 10, 18.2m },
                { 5, 15.0m },
                { 3, 12.3m },
                { 15, null }
            };
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ReturnsAsync(expectedCAGRs);

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as HistoricalCAGRResponse;
            var years = response!.CAGRs.Select(c => c.Years).ToList();
            years.Should().BeInAscendingOrder();
        }

        [Fact]
        public async Task GetHistoricalCAGRs_HandlesNullValues()
        {
            // Arrange
            var symbol = "NEWSTOCK";
            var expectedCAGRs = new Dictionary<int, decimal?>
            {
                { 1, 10.5m },
                { 3, null },
                { 5, null },
                { 10, null },
                { 15, null },
                { 20, null }
            };
            _mockFinnhubService
                .Setup(s => s.GetHistoricalCAGRsAsync(It.IsAny<string>()))
                .ReturnsAsync(expectedCAGRs);

            // Act
            var result = await _controller.GetHistoricalCAGRs(symbol);

            // Assert
            var okResult = result.Result as OkObjectResult;
            var response = okResult!.Value as HistoricalCAGRResponse;

            // 1Y should have a value
            response!.CAGRs.First(c => c.Years == 1).Value.Should().Be(10.5m);

            // Others should be null
            response.CAGRs.First(c => c.Years == 3).Value.Should().BeNull();
            response.CAGRs.First(c => c.Years == 5).Value.Should().BeNull();
        }

        #endregion
    }
}
