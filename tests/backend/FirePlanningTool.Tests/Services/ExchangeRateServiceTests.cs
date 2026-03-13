using FirePlanningTool.Services;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Net;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    /// <summary>
    /// Tests for ExchangeRateService functionality.
    /// Validates exchange rate fetching, caching, and fallback behavior.
    /// </summary>
    public class ExchangeRateServiceTests
    {
        private readonly Mock<ILogger<ExchangeRateService>> _loggerMock;
        private readonly IMemoryCache _cache;
        private readonly IOptions<ExchangeRateConfiguration> _config;

        public ExchangeRateServiceTests()
        {
            _loggerMock = new Mock<ILogger<ExchangeRateService>>();
            _cache = new MemoryCache(new MemoryCacheOptions());
            _config = Options.Create(new ExchangeRateConfiguration
            {
                BaseUrl = "https://api.exchangerate.host",
                ApiKey = "",
                CacheMinutes = 60
            });
        }

        private ExchangeRateService CreateServiceWithMockedHttp(HttpResponseMessage response)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(response)
                .Verifiable();

            var httpClient = new HttpClient(handlerMock.Object)
            {
                BaseAddress = new Uri("https://api.exchangerate.host")
            };

            return new ExchangeRateService(httpClient, _cache, _config, _loggerMock.Object);
        }

        [Fact]
        public async Task GetUsdIlsRateAsync_ReturnsDefaultRate_WhenAllApisFail()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            var service = CreateServiceWithMockedHttp(response);

            // Act
            var result = await service.GetUsdIlsRateAsync();

            // Assert
            result.Should().NotBeNull();
            result!.Rate.Should().Be(3.6m);
            result.Source.Should().Be("default");
            result.BaseCurrency.Should().Be("USD");
            result.TargetCurrency.Should().Be("ILS");
        }

        [Fact]
        public async Task GetExchangeRateAsync_ReturnsCachedValue_WhenAvailable()
        {
            // Arrange
            var cachedResponse = new ExchangeRateResponse
            {
                BaseCurrency = "USD",
                TargetCurrency = "ILS",
                Rate = 4.0m,
                Timestamp = DateTime.UtcNow,
                Source = "cached"
            };
            _cache.Set("exchange_rate_USD_ILS", cachedResponse, TimeSpan.FromMinutes(60));

            var response = new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            var service = CreateServiceWithMockedHttp(response);

            // Act
            var result = await service.GetExchangeRateAsync("USD", "ILS");

            // Assert
            result.Should().NotBeNull();
            result!.Rate.Should().Be(4.0m);
            result.Source.Should().Be("cached");
        }

        [Fact]
        public async Task GetExchangeRateAsync_NormalizesCurrencyCodes()
        {
            // Arrange - test that lowercase currency codes are normalized
            var cachedResponse = new ExchangeRateResponse
            {
                BaseCurrency = "USD",
                TargetCurrency = "ILS",
                Rate = 3.65m,
                Timestamp = DateTime.UtcNow,
                Source = "test"
            };
            _cache.Set("exchange_rate_USD_ILS", cachedResponse, TimeSpan.FromMinutes(60));

            var response = new HttpResponseMessage(HttpStatusCode.ServiceUnavailable);
            var service = CreateServiceWithMockedHttp(response);

            // Act - use lowercase
            var result = await service.GetExchangeRateAsync("usd", "ils");

            // Assert - should still find cached value
            result.Should().NotBeNull();
            result!.Rate.Should().Be(3.65m);
        }

        [Fact]
        public async Task GetUsdIlsRateAsync_ParsesExchangeRateHostResponse_WhenSuccessful()
        {
            // Arrange
            var jsonResponse = @"{
                ""success"": true,
                ""quotes"": {
                    ""USDILS"": 3.72
                }
            }";
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            };
            var service = CreateServiceWithMockedHttp(response);

            // Act
            var result = await service.GetUsdIlsRateAsync();

            // Assert
            result.Should().NotBeNull();
            result!.Rate.Should().Be(3.72m);
            result.Source.Should().Be("exchangerate.host");
        }

        [Fact]
        public async Task GetExchangeRateAsync_HandlesInvalidJsonGracefully()
        {
            // Arrange
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("invalid json", System.Text.Encoding.UTF8, "application/json")
            };
            var service = CreateServiceWithMockedHttp(response);

            // Act
            var result = await service.GetExchangeRateAsync("USD", "ILS");

            // Assert - should fall back to default
            result.Should().NotBeNull();
            result!.Rate.Should().Be(3.6m);
            result.Source.Should().Be("default");
        }

        [Fact]
        public async Task GetExchangeRateAsync_HandlesApiErrorResponse()
        {
            // Arrange - API returns success=false
            var jsonResponse = @"{
                ""success"": false,
                ""error"": {
                    ""code"": 104,
                    ""info"": ""API rate limit exceeded""
                }
            }";
            var response = new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(jsonResponse, System.Text.Encoding.UTF8, "application/json")
            };
            var service = CreateServiceWithMockedHttp(response);

            // Act
            var result = await service.GetExchangeRateAsync("USD", "ILS");

            // Assert - should fall back to default
            result.Should().NotBeNull();
            result!.Rate.Should().Be(3.6m);
            result.Source.Should().Be("default");
        }

        [Fact]
        public void ExchangeRateResponse_HasCorrectDefaultValues()
        {
            // Arrange & Act
            var response = new ExchangeRateResponse();

            // Assert
            response.BaseCurrency.Should().Be("USD");
            response.TargetCurrency.Should().Be("ILS");
            response.Source.Should().Be("exchangerate.host");
        }

        [Fact]
        public void ExchangeRateConfiguration_HasCorrectDefaultValues()
        {
            // Arrange & Act
            var config = new ExchangeRateConfiguration();

            // Assert
            config.BaseUrl.Should().Be("https://api.exchangerate.host");
            config.ApiKey.Should().BeEmpty();
            config.CacheMinutes.Should().Be(60);
        }
    }
}
