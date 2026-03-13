using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    /// <summary>
    /// Tests for Result-based TargetPriceReturnStrategy prototype.
    /// Demonstrates testing advantages of Result pattern over exceptions.
    /// </summary>
    public class TargetPriceReturnStrategyWithResultTests
    {
        private readonly TargetPriceReturnStrategyWithResult _strategy;

        public TargetPriceReturnStrategyWithResultTests()
        {
            _strategy = new TargetPriceReturnStrategyWithResult();
        }

        #region Success Cases

        [Fact]
        public void CalculateAnnualReturn_ValidInputs_ReturnsSuccess()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 5);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeGreaterThan(0);
        }

        [Fact]
        public void CalculateAnnualReturn_DoublePrice_CalculatesCorrectCAGR()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 1);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeApproximately(100m, 0.1m);
        }

        [Fact]
        public void CalculateAnnualReturn_LongerTimeframe_YieldsLowerCAGR()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var shortTermResult = _strategy.CalculateAnnualReturn(asset, 1);
            var longTermResult = _strategy.CalculateAnnualReturn(asset, 10);

            shortTermResult.IsSuccess.Should().BeTrue();
            longTermResult.IsSuccess.Should().BeTrue();
            longTermResult.Value.Should().BeLessThan(shortTermResult.Value);
        }

        #endregion

        #region Failure Cases - No Exceptions Thrown

        [Fact]
        public void CalculateAnnualReturn_NullAsset_ReturnsValidationError()
        {
            var result = _strategy.CalculateAnnualReturn(null, 5);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Asset cannot be null");
        }

        [Fact]
        public void CalculateAnnualReturn_ZeroCurrentPrice_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(0m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 5);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Current price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_NegativeCurrentPrice_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(-100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 5);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
        }

        [Fact]
        public void CalculateAnnualReturn_ZeroTargetPrice_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 0m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 5);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Target price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_NullYearsToRetirement_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Years to retirement must be a positive value");
        }

        [Fact]
        public void CalculateAnnualReturn_ZeroYearsToRetirement_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 0);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
        }

        #endregion

        #region Functional API Tests

        [Fact]
        public void CalculateAnnualReturn_CanChainOnSuccess()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };
            var actionExecuted = false;

            _strategy.CalculateAnnualReturn(asset, 5)
                .OnSuccess(value => actionExecuted = true);

            actionExecuted.Should().BeTrue();
        }

        [Fact]
        public void CalculateAnnualReturn_CanChainOnFailure()
        {
            var actionExecuted = false;
            string? errorMessage = null;

            _strategy.CalculateAnnualReturn(null, 5)
                .OnFailure(error =>
                {
                    actionExecuted = true;
                    errorMessage = error.Message;
                });

            actionExecuted.Should().BeTrue();
            errorMessage.Should().Contain("Asset cannot be null");
        }

        [Fact]
        public void CalculateAnnualReturn_CanMapSuccess()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var result = _strategy.CalculateAnnualReturn(asset, 1)
                .Map(annualReturn => $"Expected return: {annualReturn}%");

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Contain("Expected return:");
        }

        [Fact]
        public void CalculateAnnualReturn_CanUseMatch()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "TEST",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m
            };

            var message = _strategy.CalculateAnnualReturn(asset, 5)
                .Match(
                    onSuccess: value => $"Calculated: {value}%",
                    onFailure: error => $"Error: {error.Message}");

            message.Should().StartWith("Calculated:");
        }

        #endregion
    }
}
