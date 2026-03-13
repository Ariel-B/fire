using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    public class FixedReturnStrategyTests
    {
        private readonly FixedReturnStrategy _strategy;

        public FixedReturnStrategyTests()
        {
            _strategy = new FixedReturnStrategy();
        }

        [Fact]
        public void Name_IsFixed()
        {
            _strategy.Name.Should().Be("Fixed");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsValue1()
        {
            var asset = new PortfolioAsset
            {
                Method = "Fixed",
                Value1 = 6.5m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(6.5m);
        }

        [Fact]
        public void CalculateAnnualReturn_IgnoresYearsToRetirement()
        {
            var asset = new PortfolioAsset
            {
                Method = "Fixed",
                Value1 = 5.0m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 25);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(5.0m);
        }
    }
}
