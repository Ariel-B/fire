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
    public class FirePlanControllerTests
    {
        private readonly Mock<ILogger<FirePlanController>> _loggerMock;
        private readonly Mock<IFireCalculator> _calculatorMock;
        private readonly FirePlanController _controller;

        public FirePlanControllerTests()
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
        public void CalculateFirePlan_WithValidInput_ReturnsOkResult()
        {
            // Arrange
            var input = new FirePlanInput { BirthYear = 1990 };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };

            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().Be(expectedResult);
        }

        [Fact]
        public void CalculateFirePlan_WhenCalculatorThrows_ReturnsInternalServerError()
        {
            // Arrange - use valid input so validation passes but calculator throws
            var input = new FirePlanInput { BirthYear = 1990, EarlyRetirementYear = 2045 };
            var exceptionMessage = "Calculation error";

            _calculatorMock.Setup(x => x.Calculate(It.IsAny<FirePlanInput>())).Throws(new Exception(exceptionMessage));

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert - Controller returns 500 for unexpected exceptions
            var objectResult = result.Result.Should().BeOfType<ObjectResult>().Subject;
            objectResult.StatusCode.Should().Be(500);
            var value = objectResult.Value;
            value.Should().NotBeNull();
            value.Should().BeOfType<ApiErrorResponse>();
        }

        [Fact]
        public void SavePlan_WithValidData_ReturnsJson()
        {
            // Arrange
            var planData = new FirePlanData
            {
                Inputs = new FirePlanInputs { BirthYear = "1990" },
                IncludeRsuInCalculations = true,
                RsuConfiguration = new RsuConfiguration
                {
                    StockSymbol = "GOOGL",
                    CurrentPricePerShare = Money.Usd(150),
                    Grants = new List<RsuGrant>
                    {
                        new RsuGrant
                        {
                            Id = 1,
                            GrantDate = new DateTime(2024, 1, 1),
                            NumberOfShares = 100,
                            PriceAtGrant = Money.Usd(120)
                        }
                    }
                }
            };

            // Act
            var result = _controller.SavePlan(planData);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;

            // Use reflection to access anonymous type properties
            var value = okResult.Value;
            value.Should().NotBeNull();
            var successProperty = value!.GetType().GetProperty("success");
            var dataProperty = value.GetType().GetProperty("data");

            successProperty.Should().NotBeNull();
            dataProperty.Should().NotBeNull();
            var success = (bool)successProperty!.GetValue(value)!;
            var data = (string?)dataProperty!.GetValue(value);

            success.Should().BeTrue();
            data.Should().Contain("1990");
            data.Should().Contain("GOOGL");
        }

        [Fact]
        public void LoadPlan_WithValidJson_ReturnsPlanData()
        {
            // Arrange
            var request = new JsonLoadRequest
            {
                JsonData = "{\"Inputs\":{\"BirthYear\":\"1990\"},\"IncludeRsuInCalculations\":true,\"RsuConfiguration\":{\"StockSymbol\":\"AMZN\",\"CurrentPricePerShare\":{\"amount\":200,\"currency\":\"USD\"},\"Grants\":[{\"Id\":1,\"GrantDate\":\"2024-01-01T00:00:00\",\"NumberOfShares\":50,\"PriceAtGrant\":{\"amount\":180,\"currency\":\"USD\"}}]}}"
            };

            // Act
            var result = _controller.LoadPlan(request);

            // Assert
            var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
            var planData = okResult.Value.Should().BeOfType<FirePlanData>().Subject;
            planData.Inputs.BirthYear.Should().Be("1990");
            planData.IncludeRsuInCalculations.Should().BeTrue();
            planData.RsuConfiguration.Should().NotBeNull();
            planData.RsuConfiguration!.StockSymbol.Should().Be("AMZN");
            planData.RsuConfiguration.Grants.Should().ContainSingle();
        }

        [Fact]
        public void LoadPlan_WithInvalidJson_ReturnsBadRequest()
        {
            // Arrange
            var request = new JsonLoadRequest { JsonData = "invalid json" };

            // Act
            var result = _controller.LoadPlan(request);

            // Assert
            result.Result.Should().BeOfType<BadRequestObjectResult>();
        }

        #region Birth Year Validation Tests

        [Fact]
        public void CalculateFirePlan_WithBirthYearBelowMinimum_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput { BirthYear = CalculationConstants.MinBirthYear - 1 };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Birth date year must be at least");
        }

        [Fact]
        public void CalculateFirePlan_WithBirthYearAtMinimum_ReturnsOkResult()
        {
            // Arrange
            var input = new FirePlanInput { BirthYear = CalculationConstants.MinBirthYear };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithBirthYearExceedingFutureLimit_ReturnsBadRequest()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput { BirthYear = currentYear + CalculationConstants.MaxFutureBirthYears + 1 };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Birth date year cannot be more than");
        }

        [Fact]
        public void CalculateFirePlan_WithBirthYearAtFutureLimit_ReturnsOkResult()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput { BirthYear = currentYear + CalculationConstants.MaxFutureBirthYears };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        #endregion

        #region Early Retirement Year Validation Tests

        [Fact]
        public void CalculateFirePlan_WithEarlyRetirementYearBelowMinimum_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = CalculationConstants.MinRetirementYear - 1
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Invalid early retirement year");
        }

        [Fact]
        public void CalculateFirePlan_WithEarlyRetirementYearAtMinimum_ReturnsOkResult()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = CalculationConstants.MinRetirementYear
            };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithEarlyRetirementYearExceedingFutureLimit_ReturnsBadRequest()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = currentYear + CalculationConstants.MaxFutureRetirementYears + 1
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Invalid early retirement year");
        }

        [Fact]
        public void CalculateFirePlan_WithEarlyRetirementYearAtFutureLimit_ReturnsOkResult()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = currentYear + CalculationConstants.MaxFutureRetirementYears
            };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithEarlyRetirementYearZero_SkipsValidation()
        {
            // Arrange - EarlyRetirementYear = 0 means not set, should skip validation
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 0
            };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        #endregion

        #region Full Retirement Age Validation Tests

        [Fact]
        public void CalculateFirePlan_WithFullRetirementAgeExceedingMaximum_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                FullRetirementAge = CalculationConstants.MaxRetirementAge + 1
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Invalid full retirement age");
        }

        [Fact]
        public void CalculateFirePlan_WithFullRetirementAgeAtMaximum_ReturnsOkResult()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                FullRetirementAge = CalculationConstants.MaxRetirementAge
            };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        [Fact]
        public void CalculateFirePlan_WithNegativeFullRetirementAge_ReturnsBadRequest()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                FullRetirementAge = -1
            };

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            var badRequestResult = result.Result.Should().BeOfType<BadRequestObjectResult>().Subject;
            var errorResponse = badRequestResult.Value.Should().BeOfType<ApiErrorResponse>().Subject;
            errorResponse.Error.Should().Contain("Invalid full retirement age");
        }

        [Fact]
        public void CalculateFirePlan_WithZeroFullRetirementAge_ReturnsOkResult()
        {
            // Arrange - 0 is allowed (means not set or use default)
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                FullRetirementAge = 0
            };
            var expectedResult = new FireCalculationResult { TotalContributions = 1000 };
            _calculatorMock.Setup(x => x.Calculate(input)).Returns(expectedResult);

            // Act
            var result = _controller.CalculateFirePlan(input);

            // Assert
            result.Result.Should().BeOfType<OkObjectResult>();
        }

        #endregion
    }
}
