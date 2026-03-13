using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Strategies
{
    public class TotalGrowthReturnStrategyTests
    {
        private readonly TotalGrowthReturnStrategy _strategy;

        public TotalGrowthReturnStrategyTests()
        {
            _strategy = new TotalGrowthReturnStrategy();
        }

        [Fact]
        public void Name_IsHebrewTotalGrowth()
        {
            _strategy.Name.Should().Be("צמיחה כוללת");
        }

        [Fact]
        public void CalculateAnnualReturn_ReturnsValue1()
        {
            var asset = new PortfolioAsset
            {
                Method = "צמיחה כוללת",
                Value1 = 9.5m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, null);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(9.5m);
        }

        [Fact]
        public void CalculateAnnualReturn_IgnoresYearsToRetirement()
        {
            var asset = new PortfolioAsset
            {
                Method = "צמיחה כוללת",
                Value1 = 6.0m,
                CurrentPrice = Money.Usd(100),
                Quantity = 10
            };

            var result = _strategy.CalculateAnnualReturn(asset, 20);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(6.0m);
        }
    }
}
