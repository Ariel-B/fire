using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    /// <summary>
    /// Tests for InflationDataService functionality.
    /// Validates CBS API parsing, caching, CAGR calculation, and error handling.
    /// </summary>
    public class InflationDataServiceTests
    {
        private readonly Mock<ILogger<InflationDataService>> _loggerMock;
        private readonly IMemoryCache _cache;

        public InflationDataServiceTests()
        {
            _loggerMock = new Mock<ILogger<InflationDataService>>();
            _cache = new MemoryCache(new MemoryCacheOptions());
        }

        private InflationDataService CreateServiceWithResponse(string json, HttpStatusCode statusCode = HttpStatusCode.OK)
        {
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(new HttpResponseMessage(statusCode)
                {
                    Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                });

            var httpClient = new HttpClient(handlerMock.Object);
            return new InflationDataService(httpClient, _cache, _loggerMock.Object);
        }

        private static string BuildCbsJson(IEnumerable<(int Year, int Month, double? IndexValue, double? PercentYear)> entries)
        {
            var dateItems = entries.Select(e =>
            {
                var parts = new List<string>
                {
                    $"\"year\": {e.Year}",
                    $"\"month\": {e.Month}"
                };
                if (e.PercentYear.HasValue) parts.Add($"\"percentYear\": {e.PercentYear.Value}");
                if (e.IndexValue.HasValue) parts.Add($"\"currBase\": {{ \"value\": {e.IndexValue.Value} }}");
                return "{" + string.Join(", ", parts) + "}";
            });

            return $$"""
                {
                  "month": [
                    {
                      "date": [
                        {{string.Join(",\n", dateItems)}}
                      ]
                    }
                  ]
                }
                """;
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ReturnsNull_WhenApiReturnsError()
        {
            var service = CreateServiceWithResponse("{}", HttpStatusCode.ServiceUnavailable);
            var result = await service.GetIsraelInflationHistoryAsync();
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ReturnsNull_WhenJsonMissingMonthArray()
        {
            var service = CreateServiceWithResponse("""{ "other": [] }""");
            var result = await service.GetIsraelInflationHistoryAsync();
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ReturnsNull_WhenNoDecemberEntries()
        {
            var json = BuildCbsJson(new[]
            {
                (2023, 6, (double?)100.0, (double?)3.0),
                (2023, 7, (double?)101.0, (double?)3.5)
            });
            var service = CreateServiceWithResponse(json);
            var result = await service.GetIsraelInflationHistoryAsync();
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ParsesDecemberEntries_Correctly()
        {
            var json = BuildCbsJson(new[]
            {
                (2022, 12, (double?)100.0, (double?)5.3),
                (2023, 12, (double?)103.0, (double?)3.0),
                (2024, 12, (double?)106.21, (double?)3.2),
                // Non-December entries should be ignored
                (2024, 6,  (double?)105.0, (double?)2.5)
            });
            var service = CreateServiceWithResponse(json);

            var result = await service.GetIsraelInflationHistoryAsync();

            result.Should().NotBeNull();
            result!.DataPoints.Should().HaveCount(3);
            result.DataPoints[0].Year.Should().Be(2022);
            result.DataPoints[0].InflationRate.Should().Be(5.3m);
            result.DataPoints[2].Year.Should().Be(2024);
            result.DataPoints[2].InflationRate.Should().Be(3.2m);
            result.Source.Should().Be("CBS");
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_CalculatesCAGR_ForAvailablePeriods()
        {
            // Use 5-year period: 2019–2024
            // Index 2019 = 100.0, Index 2024 = 116.0
            // CAGR = (116/100)^(1/5) - 1 ≈ 3.0%
            var entries = new List<(int, int, double?, double?)>
            {
                (2019, 12, 100.0, 2.0),
                (2020, 12, 101.0, 1.0),
                (2021, 12, 103.0, 2.0),
                (2022, 12, 108.5, 5.3),
                (2023, 12, 112.0, 3.2),
                (2024, 12, 116.0, 3.6)
            };
            var json = BuildCbsJson(entries);
            var service = CreateServiceWithResponse(json);

            var result = await service.GetIsraelInflationHistoryAsync();

            result.Should().NotBeNull();
            var fiveYearStat = result!.Stats.FirstOrDefault(s => s.PeriodYears == 5);
            fiveYearStat.Should().NotBeNull();
            fiveYearStat!.StartYear.Should().Be(2019);
            fiveYearStat.EndYear.Should().Be(2024);

            // CAGR = (116/100)^(1/5) - 1
            var expected = (decimal)(Math.Pow(116.0 / 100.0, 1.0 / 5.0) - 1.0);
            fiveYearStat.AverageInflation.Should().BeApproximately(expected, 0.0001m);
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_SkipsCAGRPeriod_WhenStartYearDataMissing()
        {
            // Only 2 years of data — 30-year period should be absent
            var json = BuildCbsJson(new[]
            {
                (2023, 12, (double?)100.0, (double?)3.0),
                (2024, 12, (double?)103.2, (double?)3.2)
            });
            var service = CreateServiceWithResponse(json);

            var result = await service.GetIsraelInflationHistoryAsync();

            result.Should().NotBeNull();
            result!.Stats.Should().NotContain(s => s.PeriodYears == 30);
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ReturnsCachedResult_OnSecondCall()
        {
            var json = BuildCbsJson(new[]
            {
                (2024, 12, (double?)106.0, (double?)3.2)
            });

            int callCount = 0;
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.IsAny<HttpRequestMessage>(),
                    ItExpr.IsAny<CancellationToken>())
                .ReturnsAsync(() =>
                {
                    callCount++;
                    return new HttpResponseMessage(HttpStatusCode.OK)
                    {
                        Content = new StringContent(json, System.Text.Encoding.UTF8, "application/json")
                    };
                });

            var httpClient = new HttpClient(handlerMock.Object);
            var service = new InflationDataService(httpClient, _cache, _loggerMock.Object);

            var first = await service.GetIsraelInflationHistoryAsync();
            var second = await service.GetIsraelInflationHistoryAsync();

            first.Should().NotBeNull();
            second.Should().BeSameAs(first);
            callCount.Should().Be(1, "second call should use cache");
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_ReturnsNull_WhenJsonIsInvalid()
        {
            var service = CreateServiceWithResponse("not-valid-json");
            var result = await service.GetIsraelInflationHistoryAsync();
            result.Should().BeNull();
        }

        [Fact]
        public async Task GetIsraelInflationHistoryAsync_SetsSourceToCBS()
        {
            var json = BuildCbsJson(new[]
            {
                (2024, 12, (double?)100.0, (double?)3.2)
            });
            var service = CreateServiceWithResponse(json);

            var result = await service.GetIsraelInflationHistoryAsync();

            result.Should().NotBeNull();
            result!.Source.Should().Be("CBS");
        }
    }
}
