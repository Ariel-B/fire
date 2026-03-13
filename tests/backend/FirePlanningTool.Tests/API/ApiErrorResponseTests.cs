using FirePlanningTool.Controllers;
using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace FirePlanningTool.Tests.API
{
    /// <summary>
    /// Tests validating that all API error responses use the standardized ApiErrorResponse format.
    /// </summary>
    public class ApiErrorResponseTests
    {
        #region FirePlanController Error Response Format Tests

        [Fact]
        public void FirePlanController_InvalidBirthYear_ReturnsApiErrorResponse()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<FirePlanController>>();
            var calculatorMock = new Mock<IFireCalculator>();
            var inputValidator = new FirePlanInputValidator();
            var planDataValidator = new FirePlanDataValidator();
            var jsonLoadValidator = new JsonLoadRequestValidator();
            var controller = new FirePlanController(
                loggerMock.Object,
                calculatorMock.Object,
                inputValidator,
                planDataValidator,
                jsonLoadValidator,
                Options.Create(new AssetNamesConfiguration()));
            var input = new FirePlanInput { BirthYear = 1800 }; // Invalid birth year

            // Act
            var result = controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().NotBeNullOrEmpty();
        }

        [Fact]
        public void FirePlanController_NullInput_ReturnsApiErrorResponse()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<FirePlanController>>();
            var calculatorMock = new Mock<IFireCalculator>();
            var inputValidator = new FirePlanInputValidator();
            var planDataValidator = new FirePlanDataValidator();
            var jsonLoadValidator = new JsonLoadRequestValidator();
            var controller = new FirePlanController(
                loggerMock.Object,
                calculatorMock.Object,
                inputValidator,
                planDataValidator,
                jsonLoadValidator,
                Options.Create(new AssetNamesConfiguration()));

            // Act
            var result = controller.CalculateFirePlan(null!);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Be("Input data is required");
        }

        [Fact]
        public void FirePlanController_InvalidWithdrawalRate_ReturnsApiErrorResponse()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<FirePlanController>>();
            var calculatorMock = new Mock<IFireCalculator>();
            var inputValidator = new FirePlanInputValidator();
            var planDataValidator = new FirePlanDataValidator();
            var jsonLoadValidator = new JsonLoadRequestValidator();
            var controller = new FirePlanController(
                loggerMock.Object,
                calculatorMock.Object,
                inputValidator,
                planDataValidator,
                jsonLoadValidator,
                Options.Create(new AssetNamesConfiguration()));
            var input = new FirePlanInput { BirthYear = 1990, WithdrawalRate = 150 }; // Invalid rate

            // Act
            var result = controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Withdrawal rate");
        }

        [Fact]
        public void FirePlanController_LoadInvalidJson_ReturnsApiErrorResponse()
        {
            // Arrange
            var loggerMock = new Mock<ILogger<FirePlanController>>();
            var calculatorMock = new Mock<IFireCalculator>();
            var inputValidator = new FirePlanInputValidator();
            var planDataValidator = new FirePlanDataValidator();
            var jsonLoadValidator = new JsonLoadRequestValidator();
            var controller = new FirePlanController(
                loggerMock.Object,
                calculatorMock.Object,
                inputValidator,
                planDataValidator,
                jsonLoadValidator,
                Options.Create(new AssetNamesConfiguration()));

            // Act
            var request = new JsonLoadRequest { JsonData = "invalid json {{{" };
            var result = controller.LoadPlan(request);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Be("Invalid JSON format");
        }

        #endregion

        #region AssetPricesController Error Response Format Tests

        [Fact]
        public async Task AssetPricesController_EmptySymbol_ReturnsApiErrorResponse()
        {
            // Arrange
            var finnhubServiceMock = new Mock<IFinnhubService>();
            var loggerMock = new Mock<ILogger<AssetPricesController>>();
            var controller = new AssetPricesController(finnhubServiceMock.Object, loggerMock.Object);

            // Act
            var result = await controller.GetAssetPrice("");

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Be("Symbol cannot be empty");
        }

        [Fact]
        public async Task AssetPricesController_SymbolTooLong_ReturnsApiErrorResponse()
        {
            // Arrange
            var finnhubServiceMock = new Mock<IFinnhubService>();
            var loggerMock = new Mock<ILogger<AssetPricesController>>();
            var controller = new AssetPricesController(finnhubServiceMock.Object, loggerMock.Object);
            var longSymbol = new string('A', 101);

            // Act
            var result = await controller.GetAssetPrice(longSymbol);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Be("Symbol too long");
        }

        [Fact]
        public async Task AssetPricesController_SymbolNotFound_ReturnsApiErrorResponse()
        {
            // Arrange
            var finnhubServiceMock = new Mock<IFinnhubService>();
            finnhubServiceMock.Setup(s => s.GetCurrentPriceAsync(It.IsAny<string>()))
                .ReturnsAsync((decimal?)null);
            var loggerMock = new Mock<ILogger<AssetPricesController>>();
            var controller = new AssetPricesController(finnhubServiceMock.Object, loggerMock.Object);

            // Act
            var result = await controller.GetAssetPrice("INVALID");

            // Assert
            var notFoundResult = result.Result.Should().BeOfType<NotFoundObjectResult>().Subject;
            var errorResponse = notFoundResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Price not found");
        }

        [Fact]
        public async Task AssetPricesController_BatchEmptySymbols_ReturnsApiErrorResponse()
        {
            // Arrange
            var finnhubServiceMock = new Mock<IFinnhubService>();
            var loggerMock = new Mock<ILogger<AssetPricesController>>();
            var controller = new AssetPricesController(finnhubServiceMock.Object, loggerMock.Object);
            var request = new BatchPriceRequest { Symbols = new List<string>() };

            // Act
            var result = await controller.GetMultipleAssetPrices(request);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Be("No symbols provided");
        }

        #endregion
    }
}
