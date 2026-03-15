using FirePlanningTool.Services;
using FirePlanningTool.Services.Strategies;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class CalculationConstantsTests
    {
        [Fact]
        public void GetBaseYear_ReturnsCurrentYear()
        {
            var result = CalculationConstants.GetBaseYear();
            result.Should().Be(DateTime.Now.Year);
        }

        [Fact]
        public void CalculateYearsFromBase_FutureYear_ReturnsPositiveDifference()
        {
            var currentYear = DateTime.Now.Year;
            var targetYear = currentYear + 5;
            var result = CalculationConstants.CalculateYearsFromBase(targetYear);
            result.Should().Be(5);
        }

        [Fact]
        public void CalculateYearsFromBase_PastYear_ReturnsNegativeDifference()
        {
            var currentYear = DateTime.Now.Year;
            var targetYear = currentYear - 3;
            var result = CalculationConstants.CalculateYearsFromBase(targetYear);
            result.Should().Be(-3);
        }

        [Fact]
        public void CalculateYearsFromBase_CurrentYear_ReturnsZero()
        {
            var currentYear = DateTime.Now.Year;
            var result = CalculationConstants.CalculateYearsFromBase(currentYear);
            result.Should().Be(0);
        }

        [Theory]
        [InlineData(1000, 0, 0.02, 1000)]        // Zero years = no change
        [InlineData(1000, 1, 0.02, 1020)]        // 1 year at 2%
        [InlineData(1000, 2, 0.03, 1060.9)]      // 2 years at 3%
        [InlineData(1000, 5, 0.05, 1276.28)]     // 5 years at 5%
        [InlineData(1000, -1, 0.02, 980.39)]     // Negative years (deflation)
        public void ApplyInflation_CalculatesCorrectAmount(decimal amount, int years, decimal inflationRate, decimal expected)
        {
            var result = CalculationConstants.ApplyInflation(amount, years, inflationRate);
            result.Should().BeApproximately(expected, 0.01m);
        }

        [Theory]
        [InlineData(0, 1000, 0)]           // Zero portfolio
        [InlineData(1000, 0, 0)]           // Zero cost basis
        [InlineData(-100, 1000, 0)]        // Negative portfolio
        [InlineData(1000, -100, 0)]        // Negative cost basis
        [InlineData(500, 1000, 0)]         // Portfolio less than cost basis
        [InlineData(1000, 1000, 0)]        // Portfolio equal to cost basis
        public void CalculateSafeProfitRatio_EdgeCases_ReturnsMinimum(decimal portfolioValue, decimal costBasis, decimal expected)
        {
            var result = CalculationConstants.CalculateSafeProfitRatio(portfolioValue, costBasis);
            result.Should().Be(expected);
        }

        [Theory]
        [InlineData(2000, 1000, 0.5)]      // 50% profit
        [InlineData(1500, 1000, 0.333)]    // 33.3% profit
        [InlineData(10000, 1000, 0.9)]     // 90% profit
        [InlineData(1100, 1000, 0.091)]    // 9.1% profit
        public void CalculateSafeProfitRatio_ValidValues_ReturnsCorrectRatio(decimal portfolioValue, decimal costBasis, decimal expected)
        {
            var result = CalculationConstants.CalculateSafeProfitRatio(portfolioValue, costBasis);
            result.Should().BeApproximately(expected, 0.001m);
        }

        [Fact]
        public void CalculateSafeProfitRatio_MaxBound_ClampsToOne()
        {
            // Extreme case: portfolio is 1000x cost basis
            var result = CalculationConstants.CalculateSafeProfitRatio(1000000, 1);
            result.Should().BeLessThanOrEqualTo(1.0m);
            result.Should().BeApproximately(0.999999m, 0.01m);
        }

        [Fact]
        public void GetReturnCalculationStrategyTypes_ReturnsExpectedStrategies()
        {
            var strategyTypes = CalculationConstants.GetReturnCalculationStrategyTypes();

            strategyTypes.Should().NotBeNull();
            strategyTypes.Should().HaveCount(4);
            strategyTypes.Should().Contain(typeof(CagrReturnStrategy));
            strategyTypes.Should().Contain(typeof(TotalGrowthReturnStrategy));
            strategyTypes.Should().Contain(typeof(TargetPriceReturnStrategy));
            strategyTypes.Should().Contain(typeof(FixedReturnStrategy));
        }

        [Fact]
        public void GetReturnCalculationStrategyTypes_AllTypesImplementIReturnCalculationStrategy()
        {
            var strategyTypes = CalculationConstants.GetReturnCalculationStrategyTypes();

            foreach (var strategyType in strategyTypes)
            {
                strategyType.Should().Implement<IReturnCalculationStrategy>();
            }
        }

        [Fact]
        public void GetReturnCalculationStrategyTypes_AllTypesAreInstantiable()
        {
            var strategyTypes = CalculationConstants.GetReturnCalculationStrategyTypes();

            var instances = strategyTypes.Select(Activator.CreateInstance).ToList();
            
            instances.Should().AllSatisfy(instance =>
            {
                instance.Should().NotBeNull();
                instance.Should().BeAssignableTo<IReturnCalculationStrategy>();
            });
        }

        [Fact]
        public void GetReturnCalculationStrategyTypes_ReturnsSameResultOnMultipleCalls()
        {
            var firstCall = CalculationConstants.GetReturnCalculationStrategyTypes();
            var secondCall = CalculationConstants.GetReturnCalculationStrategyTypes();

            firstCall.Should().BeEquivalentTo(secondCall);
        }
    }
}
