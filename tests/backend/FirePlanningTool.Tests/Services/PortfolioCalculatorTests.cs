using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class PortfolioCalculatorTests
    {
        private readonly PortfolioCalculator _calculator;
        private readonly CurrencyConverter _currencyConverter;

        public PortfolioCalculatorTests()
        {
            _currencyConverter = new CurrencyConverter(3.5m); // 1 USD = 3.5 ILS
            _calculator = new PortfolioCalculator(_currencyConverter);
        }

        [Fact]
        public void CalculateCostBasis_SameCurrency_ReturnsCorrectValue()
        {
            var asset = new PortfolioAsset
            {
                Quantity = 10,
                AverageCost = Money.Usd(100),
            };

            var result = _calculator.CalculateCostBasis(asset, "$");
            result.Should().Be(1000);
        }

        [Fact]
        public void CalculateCostBasis_DifferentCurrency_ReturnsConvertedValue()
        {
            var asset = new PortfolioAsset
            {
                Quantity = 10,
                AverageCost = Money.Usd(100),
            };

            // 10 * 100 * 3.5 = 3500
            var result = _calculator.CalculateCostBasis(asset, "₪");
            result.Should().Be(3500);
        }

        [Fact]
        public void CalculateMarketValue_SameCurrency_ReturnsCorrectValue()
        {
            var asset = new PortfolioAsset
            {
                Quantity = 10,
                CurrentPrice = Money.Usd(150),
            };

            var result = _calculator.CalculateMarketValue(asset, "$");
            result.Should().Be(1500);
        }

        [Fact]
        public void CalculateUnrealizedGainLoss_ReturnsDifference()
        {
            var asset = new PortfolioAsset
            {
                Quantity = 10,
                AverageCost = Money.Usd(100),
                CurrentPrice = Money.Usd(150),
            };

            // Market Value: 1500, Cost Basis: 1000, Gain: 500
            var result = _calculator.CalculateUnrealizedGainLoss(asset, "$");
            result.Should().Be(500);
        }

        [Fact]
        public void CalculatePortfolioValue_ReturnsSumOfMarketValues()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "A", Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) },
                new() { Symbol = "B", Quantity = 5, CurrentPrice = Money.Usd(200), AverageCost = Money.Usd(150) }
            };

            // (10*100) + (5*200) = 1000 + 1000 = 2000
            var result = _calculator.CalculatePortfolioValue(portfolio, "$");
            result.Should().Be(2000);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_ReturnsSumOfCostBases()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "A", Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) },
                new() { Symbol = "B", Quantity = 5, CurrentPrice = Money.Usd(200), AverageCost = Money.Usd(150) }
            };

            // (10*80) + (5*150) = 800 + 750 = 1550
            var result = _calculator.CalculatePortfolioCostBasis(portfolio, "$");
            result.Should().Be(1550);
        }

        [Fact]
        public void CalculateExposurePercentage_ZeroPortfolioValue_ReturnsZero()
        {
            var asset = new PortfolioAsset { Symbol = "VTI", Quantity = 0, CurrentPrice = Money.Usd(100) };
            var portfolio = new List<PortfolioAsset> { asset };

            var result = _calculator.CalculateExposurePercentage(asset, portfolio, "$");
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateExposurePercentage_NonZeroPortfolio_ReturnsCorrectPercentage()
        {
            var asset1 = new PortfolioAsset { Symbol = "VTI", Quantity = 10, CurrentPrice = Money.Usd(100) };
            var asset2 = new PortfolioAsset { Symbol = "VXF", Quantity = 10, CurrentPrice = Money.Usd(200) };
            var portfolio = new List<PortfolioAsset> { asset1, asset2 };

            // Asset1: 1000 / 3000 * 100 = 33.33%
            var result = _calculator.CalculateExposurePercentage(asset1, portfolio, "$");
            result.Should().BeApproximately(33.33m, 0.01m);
        }

        [Fact]
        public void CalculateTotalExpenses_ReturnsSum()
        {
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(1000) },
                new() { NetAmount = Money.Usd(500) }
            };

            var result = _calculator.CalculateTotalExpenses(expenses, "$");
            result.Should().Be(1500);
        }

        [Fact]
        public void CalculateTotalExpenses_WithCurrencyConversion_ReturnsConvertedSum()
        {
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(1000) },
                new() { NetAmount = Money.Ils(3500) }  // 3500 ILS at rate 3.5 = 1000 USD
            };

            // 1000 USD + 3500 ILS = 1000 + 1000 = 2000 USD
            var result = _calculator.CalculateTotalExpenses(expenses, "$");
            result.Should().Be(2000);
        }

        [Fact]
        public void CalculateTotalExpenses_EmptyList_ReturnsZero()
        {
            var expenses = new List<PlannedExpense>();
            var result = _calculator.CalculateTotalExpenses(expenses, "$");
            result.Should().Be(0);
        }

        [Fact]
        public void ConvertMonthlyContribution_SameCurrency_ReturnsAmount()
        {
            var result = _calculator.ConvertMonthlyContribution(1000, "$", "$");
            result.Should().Be(1000);
        }

        [Fact]
        public void ConvertMonthlyContribution_DifferentCurrency_ReturnsConvertedAmount()
        {
            var result = _calculator.ConvertMonthlyContribution(1000, "$", "₪");
            result.Should().Be(3500);
        }

        [Fact]
        public void CalculatePortfolioValue_EmptyPortfolio_ReturnsZero()
        {
            var portfolio = new List<PortfolioAsset>();
            var result = _calculator.CalculatePortfolioValue(portfolio, "$");
            result.Should().Be(0);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_EmptyPortfolio_ReturnsZero()
        {
            var portfolio = new List<PortfolioAsset>();
            var result = _calculator.CalculatePortfolioCostBasis(portfolio, "$");
            result.Should().Be(0);
        }
    }
}
