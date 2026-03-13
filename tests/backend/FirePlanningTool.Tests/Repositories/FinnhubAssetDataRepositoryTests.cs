using System.Net;
using System.Text.Json;
using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Repositories;
using FirePlanningTool.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using Xunit;
using FluentAssertions;

namespace FirePlanningTool.Tests.Repositories
{
    public class FinnhubAssetDataRepositoryTests
    {
        private readonly Mock<HttpMessageHandler> _handlerMock;
        private readonly Mock<IOptions<FinnhubConfiguration>> _configMock;
        private readonly Mock<IOptions<AssetNamesConfiguration>> _assetNamesConfigMock;
        private readonly Mock<ILogger<FinnhubAssetDataRepository>> _loggerMock;
        private readonly FinnhubAssetDataRepository _repository;

        public FinnhubAssetDataRepositoryTests()
        {
            _handlerMock = new Mock<HttpMessageHandler>();
            var httpClient = new HttpClient(_handlerMock.Object);

            _configMock = new Mock<IOptions<FinnhubConfiguration>>();
            _configMock.Setup(x => x.Value).Returns(new FinnhubConfiguration
            {
                ApiKey = "test-key",
                BaseUrl = "https://finnhub.io/api/v1"
            });

            _assetNamesConfigMock = new Mock<IOptions<AssetNamesConfiguration>>();
            _assetNamesConfigMock.Setup(x => x.Value).Returns(new AssetNamesConfiguration());

            _loggerMock = new Mock<ILogger<FinnhubAssetDataRepository>>();

            _repository = new FinnhubAssetDataRepository(httpClient, _configMock.Object, _assetNamesConfigMock.Object, _loggerMock.Object);
        }

        [Fact]
        public async Task FetchCurrentPriceAsync_ReturnsPrice_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var expectedPrice = 150.5m;
            var jsonResponse = JsonSerializer.Serialize(new { c = expectedPrice });

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req =>
                        req.Method == HttpMethod.Get &&
                        req.RequestUri != null &&
                        req.RequestUri.ToString().Contains(symbol) &&
                        req.RequestUri.ToString().Contains("/quote")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _repository.FetchCurrentPriceAsync(symbol);

            // Assert
            result.Should().Be(expectedPrice);
        }

        [Fact]
        public async Task FetchCurrentPriceAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "INVALID";

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.NotFound
                });

            // Act
            var result = await _repository.FetchCurrentPriceAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task FetchCompanyProfileAsync_ReturnsProfile_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "MSFT";
            var jsonResponse = JsonSerializer.Serialize(new
            {
                name = "Microsoft Corporation",
                ticker = symbol,
                currency = "USD",
                marketCapitalization = 2500.5
            });

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req =>
                        req.Method == HttpMethod.Get &&
                        req.RequestUri != null &&
                        req.RequestUri.ToString().Contains("stock/profile2")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _repository.FetchCompanyProfileAsync(symbol);

            // Assert
            result.Should().NotBeNull();
            result!.Name.Should().Be("Microsoft Corporation");
            result.Ticker.Should().Be(symbol);
            result.Currency.Should().Be("USD");
            result.MarketCapitalization.Should().BeApproximately(2500.5, 0.001);
        }

        [Fact]
        public async Task FetchCompanyProfileAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "UNKNOWN";

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.NotFound
                });

            // Act
            var result = await _repository.FetchCompanyProfileAsync(symbol);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task FetchCandleDataAsync_ReturnsCandleData_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var fromTimestamp = 1609459200L; // 2021-01-01
            var toTimestamp = 1640995200L;   // 2022-01-01
            var jsonResponse = JsonSerializer.Serialize(new
            {
                s = "ok",
                c = new[] { 100.0, 105.0, 110.0 },
                t = new[] { fromTimestamp, fromTimestamp + 86400, toTimestamp }
            });

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req =>
                        req.Method == HttpMethod.Get &&
                        req.RequestUri != null &&
                        req.RequestUri.ToString().Contains("/stock/candle")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _repository.FetchCandleDataAsync(symbol, fromTimestamp, toTimestamp);

            // Assert
            result.Should().NotBeNull();
            result!.Status.Should().Be("ok");
            result.ClosePrices.Should().HaveCount(3);
            result.ClosePrices![0].Should().BeApproximately(100.0, 0.001);
        }

        [Fact]
        public async Task FetchCandleDataAsync_ReturnsNull_WhenNoDataAvailable()
        {
            // Arrange
            var symbol = "AAPL";
            var fromTimestamp = 1609459200L;
            var toTimestamp = 1640995200L;
            var jsonResponse = JsonSerializer.Serialize(new { s = "no_data" });

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _repository.FetchCandleDataAsync(symbol, fromTimestamp, toTimestamp);

            // Assert
            result.Should().BeNull();
        }

        [Fact]
        public async Task FetchYahooHistoricalDataAsync_ReturnsData_WhenApiCallIsSuccessful()
        {
            // Arrange
            var symbol = "AAPL";
            var maxYears = 5;
            var jsonResponse = JsonSerializer.Serialize(new
            {
                chart = new
                {
                    result = new[]
                    {
                        new
                        {
                            timestamp = new[] { 1609459200L, 1612137600L, 1614556800L },
                            indicators = new
                            {
                                quote = new[]
                                {
                                    new
                                    {
                                        close = new double?[] { 100.0, 105.0, 110.0 }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req =>
                        req.Method == HttpMethod.Get &&
                        req.RequestUri != null &&
                        req.RequestUri.ToString().Contains("query1.finance.yahoo.com")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(jsonResponse)
                });

            // Act
            var result = await _repository.FetchYahooHistoricalDataAsync(symbol, maxYears);

            // Assert
            result.Should().NotBeNull();
            var (timestamps, closePrices) = result!.Value;
            timestamps.Should().HaveCount(3);
            closePrices.Should().HaveCount(3);
            closePrices[0].Should().BeApproximately(100.0, 0.001);
        }

        [Fact]
        public async Task FetchYahooHistoricalDataAsync_ReturnsNull_WhenApiCallFails()
        {
            // Arrange
            var symbol = "INVALID";
            var maxYears = 5;

            _handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.NotFound
                });

            // Act
            var result = await _repository.FetchYahooHistoricalDataAsync(symbol, maxYears);

            // Assert
            result.Should().BeNull();
        }
    }
}
