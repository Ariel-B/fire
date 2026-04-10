using FirePlanningTool.Controllers;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace FirePlanningTool.Tests.API
{
    /// <summary>
    /// Tests for InflationController.
    /// Validates 200 OK and 503 responses for the Israel historical inflation endpoint.
    /// </summary>
    public class InflationControllerTests
    {
        private readonly Mock<IInflationDataService> _serviceMock;
        private readonly Mock<ILogger<InflationController>> _loggerMock;
        private readonly InflationController _controller;

        public InflationControllerTests()
        {
            _serviceMock = new Mock<IInflationDataService>();
            _loggerMock = new Mock<ILogger<InflationController>>();
            _controller = new InflationController(_serviceMock.Object, _loggerMock.Object);
        }

        [Fact]
        public async Task GetIsraelHistorical_ReturnsOkWithResponse_WhenServiceSucceeds()
        {
            // Arrange
            var expected = new InflationHistoryResponse
            {
                DataPoints = new List<InflationDataPoint>
                {
                    new() { Year = 2024, InflationRate = 3.2m, IndexValue = 106.0m }
                },
                Stats = new List<InflationStats>
                {
                    new() { PeriodYears = 1, AverageInflation = 0.032m, StartYear = 2023, EndYear = 2024 }
                },
                Source = "CBS"
            };
            _serviceMock.Setup(s => s.GetIsraelInflationHistoryAsync()).ReturnsAsync(expected);

            // Act
            var result = await _controller.GetIsraelHistorical();

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var ok = (OkObjectResult)result.Result!;
            ok.Value.Should().BeSameAs(expected);
        }

        [Fact]
        public async Task GetIsraelHistorical_Returns503_WhenServiceReturnsNull()
        {
            // Arrange
            _serviceMock.Setup(s => s.GetIsraelInflationHistoryAsync()).ReturnsAsync((InflationHistoryResponse?)null);

            // Act
            var result = await _controller.GetIsraelHistorical();

            // Assert
            result.Result.Should().BeOfType<ObjectResult>();
            var objectResult = (ObjectResult)result.Result!;
            objectResult.StatusCode.Should().Be(503);
            objectResult.Value.Should().BeOfType<ApiErrorResponse>();
            var error = (ApiErrorResponse)objectResult.Value!;
            error.Error.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public async Task GetIsraelHistorical_ReturnsDataWithCorrectStructure()
        {
            // Arrange
            var response = new InflationHistoryResponse
            {
                DataPoints = new List<InflationDataPoint>
                {
                    new() { Year = 2022, InflationRate = 5.3m },
                    new() { Year = 2023, InflationRate = 3.0m },
                    new() { Year = 2024, InflationRate = 3.2m }
                },
                Stats = new List<InflationStats>(),
                Source = "CBS"
            };
            _serviceMock.Setup(s => s.GetIsraelInflationHistoryAsync()).ReturnsAsync(response);

            // Act
            var result = await _controller.GetIsraelHistorical();

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
            var ok = (OkObjectResult)result.Result!;
            var data = (InflationHistoryResponse)ok.Value!;
            data.DataPoints.Should().HaveCount(3);
            data.Source.Should().Be("CBS");
        }
    }
}
