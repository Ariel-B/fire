using System.Net;
using System.Text.Json;
using FirePlanningTool.Services;
using FirePlanningTool.Repositories;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;
using FluentAssertions;

namespace FirePlanningTool.Tests.Services
{
    public class FinnhubServiceTests
    {
        private readonly Mock<IAssetDataRepository> _repositoryMock;
        private readonly Mock<ILogger<FinnhubService>> _loggerMock;
        private readonly IMemoryCache _cache;
        private readonly FinnhubService _service;

        public FinnhubServiceTests()
        {
            _repositoryMock = new Mock<IAssetDataRepository>();
            _loggerMock = new Mock<ILogger<FinnhubService>>();
            _cache = new MemoryCache(new MemoryCacheOptions());

            _service = new FinnhubService(_repositoryMock.Object, _loggerMock.Object, _cache);
        }

        [Fact]
        public async Task GetCurrentPriceAsync_ReturnsPrice_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedPrice = 150.5m;

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync(symbol))
                .ReturnsAsync(expectedPrice);

            // Act
            var result = await _service.GetCurrentPriceAsync(symbol);

            // Assert
            result.Should().Be(expectedPrice);
        }

        [Fact]
        public async Task GetCurrentPriceAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "INVALID";

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync(symbol))
                .ReturnsAsync((decimal?)null);

            // Act
            var result = await _service.GetCurrentPriceAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetMultiplePricesAsync_ReturnsDictionary_WhenApiCallsAreSuccessful()
        {
            // Arrange
            var symbols = new[] { "AAPL", "MSFT" };
            var aaplPrice = 150.0m;
            var msftPrice = 300.0m;

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync("AAPL"))
                .ReturnsAsync(aaplPrice);

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync("MSFT"))
                .ReturnsAsync(msftPrice);

            // Act
            var result = await _service.GetMultiplePricesAsync(symbols);

            // Assert
            result.Should().ContainKey("AAPL").WhoseValue.Should().Be(aaplPrice);
            result.Should().ContainKey("MSFT").WhoseValue.Should().Be(msftPrice);
        }

        [Fact]
        public async Task GetCompanyNameAsync_ReturnsName_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedName = "Apple Inc";

            _repositoryMock
                .Setup(r => r.FetchCompanyProfileAsync(symbol))
                .ReturnsAsync(new FinnhubCompanyProfile { Name = expectedName, Ticker = symbol });

            // Act
            var result = await _service.GetCompanyNameAsync(symbol);

            // Assert
            result.Should().Be(expectedName);
        }

        [Fact]
        public async Task GetCompanyNameAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "INVALID";

            _repositoryMock
                .Setup(r => r.FetchCompanyProfileAsync(symbol))
                .ReturnsAsync((FinnhubCompanyProfile?)null);

            // Act
            var result = await _service.GetCompanyNameAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetCompanyNameAsync_ReturnsNull_WhenSymbolIsEmpty()
        {
            // Act
            var result = await _service.GetCompanyNameAsync("");

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetCompanyNameAsync_ReturnsNull_WhenSymbolIsInvalid()
        {
            // Arrange - symbol with invalid characters
            var symbol = "AAPL; DROP TABLE";

            // Act
            var result = await _service.GetCompanyNameAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetCompanyProfileAsync_ReturnsProfile_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "MSFT";
            var profile = new FinnhubCompanyProfile
            {
                Name = "Microsoft Corporation",
                Ticker = symbol,
                MarketCapitalization = 2500.5
            };

            _repositoryMock
                .Setup(r => r.FetchCompanyProfileAsync(symbol))
                .ReturnsAsync(profile);

            // Act
            var result = await _service.GetCompanyProfileAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            result!.Name.Should().Be("Microsoft Corporation");
            result.MarketCapitalization.Should().BeApproximately(2500.5, 0.001);
        }

        [Fact]
        public async Task GetCompanyProfileAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "UNKNOWN";

            _repositoryMock
                .Setup(r => r.FetchCompanyProfileAsync(symbol))
                .ReturnsAsync((FinnhubCompanyProfile?)null);

            // Act
            var result = await _service.GetCompanyProfileAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetHistoricalCAGRsAsync_ReturnsCAGRs_WhenApiCallsAreSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var currentPrice = 150.0;
            var historicalPrice = 100.0;

            // Create mock Yahoo data with proper timestamps and prices
            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var timestamps = new long[]
            {
                now - (long)(5 * 365.25 * 24 * 60 * 60),  // 5 years ago
                now  // now
            };
            var closePrices = new double?[] { historicalPrice, currentPrice };

            _repositoryMock
                .Setup(r => r.FetchYahooHistoricalDataAsync(symbol, 20))
                .ReturnsAsync((timestamps, closePrices));

            // Act
            var result = await _service.GetHistoricalCAGRsAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            result.Should().ContainKey(1);
            result.Should().ContainKey(3);
            result.Should().ContainKey(5);
            result.Should().ContainKey(10);
            result.Should().ContainKey(15);
            result.Should().ContainKey(20);
        }

        [Fact]
        public async Task GetHistoricalCAGRsAsync_ReturnsEmptyCAGRs_WhenSymbolIsEmpty()
        {
            // Act
            var result = await _service.GetHistoricalCAGRsAsync("");

            // Assert
            result.Should().NotBeNull();
            result[1].Should().BeNull();
            result[3].Should().BeNull();
            result[5].Should().BeNull();
            result[10].Should().BeNull();
            result[15].Should().BeNull();
            result[20].Should().BeNull();
        }

        [Fact]
        public async Task GetHistoricalCAGRsAsync_ReturnsEmptyCAGRs_WhenSymbolIsInvalid()
        {
            // Arrange - symbol with invalid characters
            var symbol = "AAPL; DROP TABLE";

            // Act
            var result = await _service.GetHistoricalCAGRsAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            result[1].Should().BeNull();
        }

        [Fact]
        public async Task GetHistoricalCAGRsAsync_CalculatesCAGRCorrectly()
        {
            // Arrange
            var symbol = "AAPL";
            var currentPrice = 200.0;
            var historicalPrice = 100.0;
            // Expected 1-year CAGR: ((200/100)^(1/1) - 1) * 100 = 100%

            var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            var timestamps = new long[]
            {
                now - (long)(1 * 365.25 * 24 * 60 * 60),  // 1 year ago
                now  // now
            };
            var closePrices = new double?[] { historicalPrice, currentPrice };

            _repositoryMock
                .Setup(r => r.FetchYahooHistoricalDataAsync(symbol, 20))
                .ReturnsAsync((timestamps, closePrices));

            // Act
            var result = await _service.GetHistoricalCAGRsAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            // All timeframes should have the same CAGR since we're using the same mock data
            result[1].Should().NotBeNull();
            result[1]!.Value.Should().Be(100.0m); // 1-year CAGR should be 100%
        }

        [Fact]
        public async Task GetHistoricalCAGRsAsync_ReturnsNullForUnavailableData()
        {
            // Arrange
            var symbol = "AAPL";

            // Mock Yahoo returning no data, then Finnhub also returning no data
            _repositoryMock
                .Setup(r => r.FetchYahooHistoricalDataAsync(symbol, 20))
                .ReturnsAsync((ValueTuple<long[], double?[]>?)null);

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync(symbol))
                .ReturnsAsync(150.0m);

            _repositoryMock
                .Setup(r => r.FetchCandleDataAsync(symbol, It.IsAny<long>(), It.IsAny<long>()))
                .ReturnsAsync((FinnhubCandleResponse?)null);

            // Act
            var result = await _service.GetHistoricalCAGRsAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            // All should be null since we return no_data
            result[1].Should().BeNull();
            result[5].Should().BeNull();
            result[10].Should().BeNull();
        }

        [Fact]
        public async Task GetCurrentPriceAsync_ReturnsCachedPrice_OnSecondCall()
        {
            // Arrange
            var symbol = "CACHED";
            var expectedPrice = 250.0m;
            var callCount = 0;

            _repositoryMock
                .Setup(r => r.FetchCurrentPriceAsync(symbol))
                .ReturnsAsync(() =>
                {
                    callCount++;
                    return expectedPrice;
                });

            // Act - First call should hit the repository
            var result1 = await _service.GetCurrentPriceAsync(symbol);

            // Act - Second call should use cache
            var result2 = await _service.GetCurrentPriceAsync(symbol);

            // Assert
            result1.Should().Be(expectedPrice);
            result2.Should().Be(expectedPrice);
            callCount.Should().Be(1, "Repository should only be called once, second call should use cache");
        }

        [Fact]
        public async Task GetCompanyProfileAsync_ReturnsCachedProfile_OnSecondCall()
        {
            // Arrange
            var symbol = "CACHEP";
            var expectedName = "Cached Company Inc";
            var callCount = 0;
            var profile = new FinnhubCompanyProfile { Name = expectedName, Ticker = symbol };

            _repositoryMock
                .Setup(r => r.FetchCompanyProfileAsync(symbol))
                .ReturnsAsync(() =>
                {
                    callCount++;
                    return profile;
                });

            // Act - First call should hit the repository
            var result1 = await _service.GetCompanyProfileAsync(symbol);

            // Act - Second call should use cache
            var result2 = await _service.GetCompanyProfileAsync(symbol);

            // Assert
            result1.Should().NotBeNull();
            result1!.Name.Should().Be(expectedName);
            result2.Should().NotBeNull();
            result2!.Name.Should().Be(expectedName);
            callCount.Should().Be(1, "Repository should only be called once, second call should use cache");
        }
    }
}
