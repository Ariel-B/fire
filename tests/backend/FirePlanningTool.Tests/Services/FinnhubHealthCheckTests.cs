using FirePlanningTool.Services;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;
using FluentAssertions;

namespace FirePlanningTool.Tests.Services
{
    public class FinnhubHealthCheckTests
    {
        private readonly Mock<IFinnhubService> _finnhubServiceMock;
        private readonly Mock<IOptions<FinnhubConfiguration>> _configMock;
        private readonly Mock<ILogger<FinnhubHealthCheck>> _loggerMock;
        private readonly FinnhubHealthCheck _healthCheck;

        public FinnhubHealthCheckTests()
        {
            _finnhubServiceMock = new Mock<IFinnhubService>();
            _configMock = new Mock<IOptions<FinnhubConfiguration>>();
            _loggerMock = new Mock<ILogger<FinnhubHealthCheck>>();

            _configMock.Setup(x => x.Value).Returns(new FinnhubConfiguration
            {
                ApiKey = "test-key",
                BaseUrl = "https://api.finnhub.io"
            });

            _healthCheck = new FinnhubHealthCheck(
                _finnhubServiceMock.Object,
                _configMock.Object,
                _loggerMock.Object
            );
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsHealthy_WhenApiRespondsWithValidPrice()
        {
            // Arrange
            _finnhubServiceMock
                .Setup(x => x.GetCurrentPriceAsync("SPY"))
                .ReturnsAsync(450.25m);

            // Act
            var result = await _healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Healthy);
            result.Description.Should().Contain("responding correctly");
            result.Data.Should().ContainKey("apiKeyConfigured");
            result.Data.Should().ContainKey("testSymbol");
            result.Data.Should().ContainKey("testPrice");
            result.Data["apiKeyConfigured"].Should().Be(true);
            result.Data["testSymbol"].Should().Be("SPY");
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsDegraded_WhenApiKeyNotConfigured()
        {
            // Arrange
            _configMock.Setup(x => x.Value).Returns(new FinnhubConfiguration
            {
                ApiKey = "",
                BaseUrl = "https://api.finnhub.io"
            });

            var healthCheck = new FinnhubHealthCheck(
                _finnhubServiceMock.Object,
                _configMock.Object,
                _loggerMock.Object
            );

            // Act
            var result = await healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Degraded);
            result.Description.Should().Contain("API key is not configured");
            result.Data.Should().ContainKey("apiKeyConfigured");
            result.Data["apiKeyConfigured"].Should().Be(false);
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsDegraded_WhenApiReturnsInvalidPrice()
        {
            // Arrange
            _finnhubServiceMock
                .Setup(x => x.GetCurrentPriceAsync("SPY"))
                .ReturnsAsync((decimal?)null);

            // Act
            var result = await _healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Degraded);
            result.Description.Should().Contain("invalid data");
            result.Data.Should().ContainKey("apiKeyConfigured");
            result.Data.Should().ContainKey("testSymbol");
            result.Data["apiKeyConfigured"].Should().Be(true);
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsUnhealthy_WhenApiThrowsException()
        {
            // Arrange
            var expectedException = new HttpRequestException("Connection timeout");
            _finnhubServiceMock
                .Setup(x => x.GetCurrentPriceAsync("SPY"))
                .ThrowsAsync(expectedException);

            // Act
            var result = await _healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Unhealthy);
            result.Description.Should().Contain("not responding");
            result.Exception.Should().Be(expectedException);
            result.Data.Should().ContainKey("apiKeyConfigured");
            result.Data.Should().ContainKey("errorMessage");
            result.Data["apiKeyConfigured"].Should().Be(true);
            result.Data["errorMessage"].Should().Be("Connection timeout");
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsDegraded_WhenApiReturnsZeroPrice()
        {
            // Arrange
            _finnhubServiceMock
                .Setup(x => x.GetCurrentPriceAsync("SPY"))
                .ReturnsAsync(0m);

            // Act
            var result = await _healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Degraded);
            result.Description.Should().Contain("invalid data");
        }

        [Fact]
        public async Task CheckHealthAsync_ReturnsDegraded_WhenApiReturnsNegativePrice()
        {
            // Arrange
            _finnhubServiceMock
                .Setup(x => x.GetCurrentPriceAsync("SPY"))
                .ReturnsAsync(-10m);

            // Act
            var result = await _healthCheck.CheckHealthAsync(new HealthCheckContext());

            // Assert
            result.Status.Should().Be(HealthStatus.Degraded);
            result.Description.Should().Contain("invalid data");
        }
    }
}
