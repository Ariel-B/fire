using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    public class TargetPriceReturnStrategyTests
    {
        private readonly TargetPriceReturnStrategy _strategy;

        public TargetPriceReturnStrategyTests()
        {
            _strategy = new TargetPriceReturnStrategy();
        }

        [Fact]
        public void Name_IsHebrewTargetPrice()
        {
            _strategy.Name.Should().Be("מחיר יעד");
        }

        [Fact]
        public void CalculateAnnualReturn_CalculatesCAGRToTargetPrice()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m, // Target price
                Quantity = 10
            };

            // Should double in 10 years (default), which is ~7.18% CAGR
            var result = _strategy.CalculateAnnualReturn(asset, 10);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeApproximately(7.177m, 0.01m);
        }

        [Fact]
        public void CalculateAnnualReturn_UsesYearsToRetirement()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 200m,
                Quantity = 10
            };

            // Should double in 5 years, which is ~14.87% CAGR
            var result = _strategy.CalculateAnnualReturn(asset, 5);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeApproximately(14.87m, 0.01m);
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenYearsToRetirementIsNull()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 150m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("must be a positive value");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenYearsToRetirementIsZero()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 150m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 0);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("must be a positive value");
        }

        [Fact]
        public void CalculateAnnualReturn_HandlesTargetLessThanCurrent()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 80m, // Target lower than current
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 5);

            // Should be negative
            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeLessThan(0);
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenCurrentPriceIsZero()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(0m),
                Value2 = 200m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 10);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Current price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenCurrentPriceIsNegative()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(-10m),
                Value2 = 200m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 10);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Current price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenTargetPriceIsZero()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 0m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 10);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Target price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenTargetPriceIsNegative()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = -50m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 10);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Target price must be greater than zero");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenAssetIsNull()
        {
            var result = _strategy.CalculateAnnualReturn(null, 10);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("Asset cannot be null");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsError_WhenYearsToRetirementIsNegative()
        {
            var asset = new PortfolioAsset
            {
                Method = "מחיר יעד",
                CurrentPrice = Money.Usd(100m),
                Value2 = 150m,
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, -5);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("must be a positive value");
        }
    }
}
