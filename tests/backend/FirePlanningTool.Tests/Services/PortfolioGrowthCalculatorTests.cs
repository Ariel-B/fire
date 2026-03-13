using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class PortfolioGrowthCalculatorTests
    {
        private readonly PortfolioGrowthCalculator _calculator;
        private readonly ICurrencyConverter _currencyConverter;

        public PortfolioGrowthCalculatorTests()
        {
            var strategies = new List<FirePlanningTool.Services.Strategies.IReturnCalculationStrategy>
            {
                new FirePlanningTool.Services.Strategies.CagrReturnStrategy(),
                new FirePlanningTool.Services.Strategies.TotalGrowthReturnStrategy(),
                new FirePlanningTool.Services.Strategies.TargetPriceReturnStrategy(),
                new FirePlanningTool.Services.Strategies.FixedReturnStrategy()
            };
            var factory = new FirePlanningTool.Services.Strategies.ReturnCalculationStrategyFactory(strategies);
            _calculator = new PortfolioGrowthCalculator(factory);
            _currencyConverter = new CurrencyConverter();
        }

        [Fact]
        public void CalculatePortfolioValue_EmptyPortfolio_ReturnsZero()
        {
            var result = _calculator.CalculatePortfolioValue(new List<PortfolioAsset>(), _currencyConverter);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculatePortfolioValue_SingleAsset_CalculatesCorrectly()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset { Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) }
            };

            var result = _calculator.CalculatePortfolioValue(portfolio, _currencyConverter);
            result.Should().Be(1000);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_SingleAsset_CalculatesCorrectly()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset { Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) }
            };

            var result = _calculator.CalculatePortfolioCostBasis(portfolio, _currencyConverter);
            result.Should().Be(800);
        }

        [Fact]
        public void CalculatePortfolioProfitRatio_WithProfit_CalculatesCorrectly()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset 
                { 
                    Quantity = 10, 
                    CurrentPrice = Money.Usd(100), 
                    AverageCost = Money.Usd(60),
                }
            };

            // Value = 1000, Cost = 600, Profit = 400, Ratio = 0.4
            var result = _calculator.CalculatePortfolioProfitRatio(portfolio, _currencyConverter);
            result.Should().Be(0.4m);
        }

        [Fact]
        public void CalculateWeightedReturn_EmptyPortfolio_ReturnsZero()
        {
            var result = _calculator.CalculateWeightedReturn(new List<PortfolioAsset>(), null, _currencyConverter);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateWeightedReturn_SingleAssetCAGR_ReturnsCAGR()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset 
                { 
                    Quantity = 10, 
                    CurrentPrice = Money.Usd(100), 
                    Method = "CAGR",
                    Value1 = 7.5m
                }
            };

            var result = _calculator.CalculateWeightedReturn(portfolio, null, _currencyConverter);
            result.Should().Be(7.5m);
        }

        [Fact]
        public void CalculateWeightedReturn_MultipleAssets_CalculatesWeightedAverage()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset 
                { 
                    Quantity = 10, 
                    CurrentPrice = Money.Usd(100), 
                    Method = "CAGR",
                    Value1 = 10m  // 70% of portfolio (1000/1400)
                },
                new PortfolioAsset 
                { 
                    Quantity = 4, 
                    CurrentPrice = Money.Usd(100), 
                    Method = "CAGR",
                    Value1 = 5m  // 30% of portfolio (400/1400)
                }
            };

            // Weighted return = 0.714 * 10 + 0.286 * 5 = 8.57
            var result = _calculator.CalculateWeightedReturn(portfolio, null, _currencyConverter);
            result.Should().BeApproximately(8.57m, 0.1m);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_EmptyAllocations_ReturnsZero()
        {
            var result = _calculator.CalculateAllocationWeightedReturn(new List<PortfolioAllocation>());
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_SingleAllocation_ReturnsReturn()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new PortfolioAllocation { TargetPercentage = 100, ExpectedAnnualReturn = 7.5m }
            };

            var result = _calculator.CalculateAllocationWeightedReturn(allocations);
            result.Should().Be(7.5m);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_MultipleAllocations_CalculatesWeighted()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new PortfolioAllocation { TargetPercentage = 70, ExpectedAnnualReturn = 8m },
                new PortfolioAllocation { TargetPercentage = 30, ExpectedAnnualReturn = 3m }
            };

            // 0.7 * 8 + 0.3 * 3 = 6.5
            var result = _calculator.CalculateAllocationWeightedReturn(allocations);
            result.Should().Be(6.5m);
        }

        [Fact]
        public void GenerateAgeBasedAllocation_YoungAge_HighStockPercentage()
        {
            var result = _calculator.GenerateAgeBasedAllocation(30, false);
            
            result.Should().HaveCount(2);
            var stocks = result.First(a => a.AssetType == "מניות");
            stocks.TargetPercentage.Should().Be(70); // 100 - 30 = 70
        }

        [Fact]
        public void GenerateAgeBasedAllocation_OlderAge_LowerStockPercentage()
        {
            var result = _calculator.GenerateAgeBasedAllocation(60, false);
            
            var stocks = result.First(a => a.AssetType == "מניות");
            stocks.TargetPercentage.Should().Be(40); // 100 - 60 = 40
        }

        [Fact]
        public void GenerateAgeBasedAllocation_RetirementMode_MinimumStock()
        {
            var result = _calculator.GenerateAgeBasedAllocation(80, true);
            
            var stocks = result.First(a => a.AssetType == "מניות");
            stocks.TargetPercentage.Should().Be(30); // Minimum 30% for retirement
        }
    }
}
