using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    public class CagrReturnStrategyTests
    {
        private readonly CagrReturnStrategy _strategy;

        public CagrReturnStrategyTests()
        {
            _strategy = new CagrReturnStrategy();
        }

        [Fact]
        public void Name_IsCagr()
        {
            _strategy.Name.Should().Be("CAGR");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsValue1()
        {
            var asset = new PortfolioAsset
            {
                Method = "CAGR",
                Value1 = 7.5m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(7.5m);
        }

        [Fact]
        public void CalculateAnnualReturn_IgnoresYearsToRetirement()
        {
            var asset = new PortfolioAsset
            {
                Method = "CAGR",
                Value1 = 8.0m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 15);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(8.0m);
        }

        [Fact]
        public void CalculateAnnualReturn_HandlesZeroValue()
        {
            var asset = new PortfolioAsset
            {
                Method = "CAGR",
                Value1 = 0m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(0m);
        }

        [Fact]
        public void CalculateAnnualReturn_HandlesNegativeValue()
        {
            var asset = new PortfolioAsset
            {
                Method = "CAGR",
                Value1 = -5.0m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(-5.0m);
        }
    }
}
