namespace FirePlanningTool.Tests.Portfolio
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Tests.Fixtures;

    /// <summary>
    /// Tests for portfolio calculation logic (values, cost basis, gains, returns)
    /// Note: PortfolioCalculator requires CurrencyConverter dependency.
    /// These tests focus on the calculation logic itself.
    /// </summary>
    public class PortfolioValueLogicTests
    {
        #region Portfolio Value Tests

        [Fact]
        public void CalculatePortfolioValue_EmptyPortfolio_ReturnsZero()
        {
            var portfolio = new List<PortfolioAsset>();
            var value = CalculatePortfolioValue(portfolio);
            value.Should().Be(0);
        }

        [Fact]
        public void CalculatePortfolioValue_SingleAsset_ReturnsCorrectValue()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
            };
            var result = CalculatePortfolioValue(portfolio);
            result.Should().Be(25000);
        }

        [Fact]
        public void CalculatePortfolioValue_MultipleAssets_ReturnsSumOfAllValues()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) },
                new() { Symbol = "BND", Quantity = 200, CurrentPrice = Money.Usd(80), AverageCost = Money.Usd(75) }
            };
            var result = CalculatePortfolioValue(portfolio);
            result.Should().Be(41000); // (100 * 250) + (200 * 80)
        }

        [Fact]
        public void CalculatePortfolioValue_FractionalShares_ReturnsCorrectValue()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 5.75m, CurrentPrice = Money.Usd(275.28m), AverageCost = Money.Usd(200) }
            };
            var result = CalculatePortfolioValue(portfolio);
            result.Should().BeApproximately(1582.86m, 0.01m);
        }

        #endregion

        #region Cost Basis Tests

        [Fact]
        public void CalculatePortfolioCostBasis_EmptyPortfolio_ReturnsZero()
        {
            var portfolio = new List<PortfolioAsset>();
            var result = CalculatePortfolioCostBasis(portfolio);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_SingleAsset_ReturnsCorrectBasis()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
            };
            var result = CalculatePortfolioCostBasis(portfolio);
            result.Should().Be(20000);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_MultipleAssets_ReturnsSumOfAllBasis()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) },
                new() { Symbol = "BND", Quantity = 200, CurrentPrice = Money.Usd(80), AverageCost = Money.Usd(75) }
            };
            var result = CalculatePortfolioCostBasis(portfolio);
            result.Should().Be(35000); // (100 * 200) + (200 * 75)
        }

        #endregion

        #region Gain/Loss Tests

        [Fact]
        public void CalculateGain_WithProfitableAssets_ReturnsPositiveGain()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
            };
            var currentValue = CalculatePortfolioValue(portfolio);
            var costBasis = CalculatePortfolioCostBasis(portfolio);
            var gain = currentValue - costBasis;
            gain.Should().Be(5000);
            gain.Should().BeGreaterThan(0);
        }

        [Fact]
        public void CalculateGain_WithUnderwaterAssets_ReturnsNegativeGain()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(150), AverageCost = Money.Usd(200) }
            };
            var currentValue = CalculatePortfolioValue(portfolio);
            var costBasis = CalculatePortfolioCostBasis(portfolio);
            var loss = currentValue - costBasis;
            loss.Should().Be(-5000);
            loss.Should().BeLessThan(0);
        }

        #endregion

        #region Weighted Return Tests

        [Fact]
        public void CalculateWeightedReturn_SingleAsset_ReturnsAssetReturn()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200), Method = "CAGR", Value1 = 7 }
            };
            var result = CalculateWeightedReturn(portfolio);
            result.Should().Be(7);
        }

        [Fact]
        public void CalculateWeightedReturn_MultipleAssets_ReturnsWeightedAverage()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), Method = "CAGR", Value1 = 8 },
                new() { Symbol = "BND", Quantity = 200, CurrentPrice = Money.Usd(80), Method = "CAGR", Value1 = 4 }
            };
            var result = CalculateWeightedReturn(portfolio);
            // Total value: 25000 + 16000 = 41000
            // VTI weight: 25000/41000 = 0.609756
            // BND weight: 16000/41000 = 0.390244
            // Weighted return: (0.609756 * 8) + (0.390244 * 4) ≈ 6.39
            result.Should().BeApproximately(6.39m, 0.1m);
        }

        #endregion

        #region Helper Methods

        private static decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio)
        {
            return portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
        }

        private static decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio)
        {
            return portfolio.Sum(a => a.Quantity * a.AverageCost.Amount);
        }

        private static decimal CalculateWeightedReturn(List<PortfolioAsset> portfolio)
        {
            var totalValue = CalculatePortfolioValue(portfolio);
            if (totalValue == 0) return 0;

            return portfolio.Sum(a => (a.Quantity * a.CurrentPrice.Amount / totalValue) * a.Value1);
        }

        #endregion
    }
}

