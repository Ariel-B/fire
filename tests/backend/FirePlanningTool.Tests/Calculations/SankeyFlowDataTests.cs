using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Tests.Fixtures;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Calculations
{
    /// <summary>
    /// Tests for Sankey flow data population in FIRE calculations.
    /// Ensures that YearlyData.FlowData is correctly populated with money flow information
    /// for visualization purposes.
    /// </summary>
    public class SankeyFlowDataTests
    {
        private readonly FireCalculator _calculator;

        public SankeyFlowDataTests()
        {
            _calculator = TestDataBuilder.CreateFireCalculator();
        }

        [Fact]
        public void Calculate_PopulatesFlowDataForAccumulationPhase()
        {
            // Arrange - use an input with portfolio to ensure we have growth
            var input = TestDataBuilder.CreateFirePlanInputWithPortfolio();
            input.EarlyRetirementYear = DateTime.Now.Year + 5; // 5 years from now

            // Act
            var result = _calculator.Calculate(input);

            // Assert - Check that flow data exists for accumulation years
            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();
            accumulationYears.Should().NotBeEmpty();

            foreach (var year in accumulationYears)
            {
                year.FlowData.Should().NotBeNull();
                year.FlowData.Phase.Should().Be("accumulation");
                year.FlowData.IsRetirementYear.Should().BeFalse();

                // Accumulation phase should have contributions
                year.FlowData.MonthlyContributions.Should().BeGreaterThan(0);

                // Accumulation phase should not have retirement withdrawals
                year.FlowData.RetirementWithdrawals.Should().Be(0);
                year.FlowData.RetirementRebalancingTax.Should().Be(0);
            }

            // With portfolio, should have growth in most years
            var yearsWithGrowth = accumulationYears.Count(y => y.FlowData.PortfolioGrowth > 0);
            yearsWithGrowth.Should().BeGreaterThan(0, "Should have portfolio growth in at least some years");
        }

        [Fact]
        public void Calculate_PopulatesFlowDataForRetirementPhase()
        {
            // Arrange - use an input with portfolio to ensure we have growth
            var input = TestDataBuilder.CreateFirePlanInputWithPortfolio();
            input.BirthYear = 1970;
            input.EarlyRetirementYear = 2020;
            input.FullRetirementAge = 70;

            // Act
            var result = _calculator.Calculate(input);

            // Assert - Check that flow data exists for retirement years
            var retirementYears = result.YearlyData.Where(y => y.Phase == "retirement").ToList();
            retirementYears.Should().NotBeEmpty();

            foreach (var year in retirementYears)
            {
                year.FlowData.Should().NotBeNull();
                year.FlowData.Phase.Should().Be("retirement");

                // Retirement phase should not have monthly contributions
                year.FlowData.MonthlyContributions.Should().Be(0);

                // Should have retirement withdrawals (net amount)
                year.FlowData.RetirementWithdrawals.Should().BeGreaterThan(0);

                // Should have capital gains tax on withdrawals
                year.FlowData.CapitalGainsTax.Should().BeGreaterThanOrEqualTo(0);
            }

            // With portfolio, should have growth in early years (before exhaustion)
            var yearsWithGrowth = retirementYears.Count(y => y.FlowData.PortfolioGrowth > 0);
            yearsWithGrowth.Should().BeGreaterThan(0, "Should have portfolio growth in at least some years before exhaustion");
        }

        [Fact]
        public void Calculate_MarksFirstRetirementYearCorrectly()
        {
            // Arrange
            var input = TestDataBuilder.CreateBasicFirePlanInput();
            input.BirthYear = 1970;
            input.EarlyRetirementYear = 2020;
            input.FullRetirementAge = 70;

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            var retirementYears = result.YearlyData.Where(y => y.Phase == "retirement").ToList();
            retirementYears.Should().NotBeEmpty();

            // First retirement year should be marked
            var firstRetirementYear = retirementYears.First();
            firstRetirementYear.FlowData.IsRetirementYear.Should().BeTrue();

            // Subsequent retirement years should not be marked
            var subsequentYears = retirementYears.Skip(1);
            foreach (var year in subsequentYears)
            {
                year.FlowData.IsRetirementYear.Should().BeFalse();
            }
        }

        [Fact]
        public void Calculate_WithRetirementPortfolio_PopulatesRebalancingTax()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithAllocation();
            input.BirthYear = 1970;
            input.EarlyRetirementYear = 2020;
            input.FullRetirementAge = 70;
            input.UseRetirementPortfolio = true;

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            var firstRetirementYear = result.YearlyData.FirstOrDefault(y => y.Phase == "retirement");
            firstRetirementYear.Should().NotBeNull();
            firstRetirementYear!.FlowData.IsRetirementYear.Should().BeTrue();

            // Should have rebalancing tax if there are gains
            if (result.RetirementTaxToPay > 0)
            {
                firstRetirementYear.FlowData.RetirementRebalancingTax.Should().Be(result.RetirementTaxToPay);
            }
        }

        [Fact]
        public void Calculate_WithPlannedExpenses_PopulatesExpenseFlows()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithExpenses();
            input.BirthYear = 1970;
            input.EarlyRetirementYear = 2020;
            input.FullRetirementAge = 70;

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            var yearsWithExpenses = result.YearlyData.Where(y => y.FlowData.PlannedExpenses > 0).ToList();
            yearsWithExpenses.Should().NotBeEmpty("Some years should have planned expenses");
        }

        [Fact]
        public void Calculate_WithRsuConfiguration_PopulatesRsuFlows()
        {
            // Arrange - use input with RSU configuration
            var input = TestDataBuilder.CreateFirePlanInputWithRsuConfiguration();

            // Act
            var result = _calculator.Calculate(input);

            // Assert - RSU configuration should be included in results
            result.RsuTimeline.Should().NotBeEmpty("RSU timeline should be populated");
            result.RsuSummary.Should().NotBeNull();
            result.RsuSummary!.TotalSharesGranted.Should().BeGreaterThan(0);

            // Verify RSU proceeds appear in flow data for years with sales
            var yearsWithRsuProceeds = result.YearlyData
                .Where(y => y.FlowData.RsuNetProceeds > 0)
                .ToList();

            // With a 2-year-old grant using SellAfter2Years strategy, sales should occur
            yearsWithRsuProceeds.Should().NotBeEmpty(
                "Should have RSU proceeds in flow data when using SellAfter2Years strategy with eligible grants");

            // Verify FlowData.RsuNetProceeds matches YearlyData.RsuSaleProceeds
            foreach (var year in yearsWithRsuProceeds)
            {
                year.FlowData.RsuNetProceeds.Should().BeApproximately(year.RsuSaleProceeds, 0.01m,
                    $"Year {year.Year}: FlowData.RsuNetProceeds should match RsuSaleProceeds");
            }

            // Verify total RSU proceeds are tracked
            result.TotalRsuNetProceeds.Should().BeGreaterThan(0,
                "Total RSU net proceeds should be positive when sales occur");
            result.TotalRsuTaxesPaid.Should().BeGreaterThan(0,
                "RSU taxes should be paid when sales occur");
        }

        [Fact]
        public void Calculate_FlowData_ConservesValue()
        {
            // Arrange
            var input = TestDataBuilder.CreateBasicFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 5;

            // Act
            var result = _calculator.Calculate(input);

            // Assert - Check flow conservation for each year
            decimal previousPortfolioValue = result.CurrentValue;

            foreach (var year in result.YearlyData)
            {
                var flowData = year.FlowData;

                // Calculate net flow: inflows - outflows
                var inflows = flowData.MonthlyContributions + flowData.PortfolioGrowth + flowData.RsuNetProceeds;
                var outflows = flowData.CapitalGainsTax + flowData.PlannedExpenses +
                               flowData.RetirementWithdrawals + flowData.RetirementRebalancingTax;

                var expectedPortfolioValue = previousPortfolioValue + inflows - outflows;

                // If portfolio hits zero, it stays at zero (can't go negative)
                if (expectedPortfolioValue < 0)
                {
                    year.PortfolioValue.Should().Be(0, $"Portfolio should be zero when exhausted in year {year.Year}");
                }
                else
                {
                    // Allow for small rounding differences due to monthly calculations
                    year.PortfolioValue.Should().BeApproximately(expectedPortfolioValue, 100m,
                        $"Flow conservation failed for year {year.Year}");
                }

                previousPortfolioValue = year.PortfolioValue;
            }
        }

        [Fact]
        public void Calculate_AllYearlyData_HasFlowData()
        {
            // Arrange
            var input = TestDataBuilder.CreateBasicFirePlanInput();
            input.BirthYear = 1970;
            input.EarlyRetirementYear = 2020;
            input.FullRetirementAge = 70;

            // Act
            var result = _calculator.Calculate(input);

            // Assert - Every year should have flow data populated
            result.YearlyData.Should().NotBeEmpty();

            foreach (var year in result.YearlyData)
            {
                year.FlowData.Should().NotBeNull($"Year {year.Year} should have flow data");
                year.FlowData.Phase.Should().NotBeEmpty($"Year {year.Year} should have a phase");
                year.FlowData.Phase.Should().BeOneOf("accumulation", "retirement");
            }
        }
    }
}
