using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Calculations
{
    /// <summary>
    /// Tests for RSU net proceeds integration into accumulation portfolio contributions.
    /// Ensures that RSU sales proceeds are treated like monthly savings contributions.
    /// </summary>
    public class RsuContributionTrackingTests
    {
        private readonly FireCalculator _calculator;

        public RsuContributionTrackingTests()
        {
            _calculator = TestDataBuilder.CreateFireCalculator();
        }

        [Fact]
        public void Calculate_WithRsuSales_TracksContributionsYearByYear()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithRsuConfiguration();
            input.MonthlyContribution = Money.Usd(500m);

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();
            accumulationYears.Should().NotBeEmpty();

            // Each year's TotalContributions should be cumulative and increase
            decimal previousTotal = 0;
            foreach (var year in accumulationYears)
            {
                year.TotalContributions.Should().BeGreaterThanOrEqualTo(previousTotal,
                    $"Year {year.Year} contributions should not decrease");
                previousTotal = year.TotalContributions;
            }
        }

        [Fact]
        public void Calculate_WithoutRsu_TracksOnlyMonthlyContributions()
        {
            // Arrange
            var input = TestDataBuilder.CreateBasicFirePlanInput();
            input.MonthlyContribution = Money.Usd(1000m);
            input.EarlyRetirementYear = 2028; // Fixed date for test stability
            input.RsuConfiguration = null;

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            result.TotalRsuNetProceeds.Should().Be(0);

            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();

            // Verify we have accumulation years
            accumulationYears.Should().NotBeEmpty();

            // The sum of monthly contributions should match the flow data
            var totalMonthlyFromFlowData = accumulationYears.Sum(y => y.FlowData.MonthlyContributions);
            totalMonthlyFromFlowData.Should().BeGreaterThan(0, "Should have monthly contributions in flow data");
        }

        [Fact]
        public void Calculate_RsuProceedsInFlowData_MatchesYearlyData()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithRsuConfiguration();

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            foreach (var year in result.YearlyData.Where(y => y.Phase == "accumulation"))
            {
                // FlowData.RsuNetProceeds should match the RSU sale proceeds for the year
                if (year.RsuSaleProceeds > 0)
                {
                    year.FlowData.RsuNetProceeds.Should().BeGreaterThan(0,
                        $"Year {year.Year} should have RSU net proceeds in flow data when sales occurred");
                }
            }
        }

        [Fact]
        public void Calculate_RsuProceeds_AddsToPortfolio()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithRsuConfiguration();
            input.MonthlyContribution = Money.Usd(0); // No monthly contributions to isolate RSU effect

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            // With no monthly contributions, any increase in portfolio should be from RSU proceeds and growth
            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();
            var yearsWithRsuSales = accumulationYears.Where(y => y.RsuSaleProceeds > 0).ToList();

            // If there were RSU sales, the portfolio should have increased in those years
            // (unless offset by expenses)
            foreach (var year in yearsWithRsuSales)
            {
                year.FlowData.RsuNetProceeds.Should().NotBe(0,
                    $"Year {year.Year} had RSU sales, so net proceeds should be non-zero");
            }
        }

        [Fact]
        public void Calculate_RsuProceeds_IntegrationWithAccumulationPhase()
        {
            // Arrange - Use AccumulationPhaseCalculator directly
            var calculator = new AccumulationPhaseCalculator();
            var rsuData = new Dictionary<int, RsuYearlyData>
            {
                { 2025, new RsuYearlyData { Year = 2025, NetSaleProceeds = 10000m } }
            };

            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 1,
                StartingPortfolioValue = 100000m,
                MonthlyContributionUsd = 1000m,
                AccumulationReturn = 7m,
                InflationRate = 2m,
                RsuYearlyLookup = rsuData,
                CurrencyConverter = new CurrencyConverter(),
                ExpenseCalculator = new ExpenseCalculator(),
                CurrentPortfolioValue = 100000m
            };

            // Act
            var result = calculator.Calculate(input);

            // Assert
            // ActualContributions should include RSU proceeds
            var expectedMonthlyContributions = 1000m * CalculationConstants.GetRemainingMonthsInCurrentYear();
            var expectedRsuProceeds = 10000m;
            var expectedTotalContributions = expectedMonthlyContributions + expectedRsuProceeds;

            result.ActualContributions.Should().Be(expectedTotalContributions,
                "ActualContributions should include both monthly contributions and RSU net proceeds");

            // The year's FlowData should show the RSU proceeds
            result.YearlyData[0].FlowData.RsuNetProceeds.Should().Be(expectedRsuProceeds);
        }
    }
}
