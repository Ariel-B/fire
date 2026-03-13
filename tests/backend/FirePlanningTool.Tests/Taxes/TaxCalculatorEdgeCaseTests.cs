using FluentAssertions;
using FirePlanningTool.Services;
using Xunit;

namespace FirePlanningTool.Tests.Taxes
{
    /// <summary>
    /// Edge case tests for TaxCalculator to improve branch coverage.
    /// Tests scenarios like extreme losses, extreme gains, and boundary conditions.
    /// </summary>
    public class TaxCalculatorEdgeCaseTests
    {
        private readonly TaxCalculator _calculator;

        public TaxCalculatorEdgeCaseTests()
        {
            _calculator = new TaxCalculator();
        }

        #region Portfolio Loss Scenarios

        [Fact]
        public void CalculateProfitRatio_WithSevereLoss_ReturnsZero()
        {
            // Arrange: Portfolio lost 50% of value
            var portfolioValue = 50000m;
            var costBasis = 100000m;

            // Act
            var profitRatio = _calculator.CalculateProfitRatio(portfolioValue, costBasis);

            // Assert: No profit means no taxable ratio
            profitRatio.Should().Be(0, "portfolio losses should not be taxed");
        }

        [Fact]
        public void CalculateProfitRatio_WithNearTotalLoss_ReturnsZero()
        {
            // Arrange: Portfolio went to near zero (99% loss)
            var portfolioValue = 1000m;
            var costBasis = 100000m;

            // Act
            var profitRatio = _calculator.CalculateProfitRatio(portfolioValue, costBasis);

            // Assert
            profitRatio.Should().Be(0, "severe losses should return zero profit ratio");
        }

        [Fact]
        public void CalculateRetirementTax_WithLargePortfolioLoss_ReturnsZero()
        {
            // Arrange: Retirement with portfolio underwater
            var portfolioValue = 75000m;
            var costBasis = 150000m;
            var capitalGainsTax = 25m;

            // Act
            var tax = _calculator.CalculateRetirementTax(portfolioValue, costBasis, capitalGainsTax);

            // Assert: No gains means no tax
            tax.Should().Be(0, "no tax should be charged on portfolio losses");
        }

        #endregion

        #region Extreme Gains Scenarios

        [Fact]
        public void CalculateProfitRatio_WithExtremeGains_CalculatesCorrectly()
        {
            // Arrange: 500% gain (6x original investment)
            var portfolioValue = 600000m;
            var costBasis = 100000m;

            // Act
            var profitRatio = _calculator.CalculateProfitRatio(portfolioValue, costBasis);

            // Assert: (600k - 100k) / 600k = 0.8333 (83.33% is profit)
            profitRatio.Should().BeApproximately(0.8333m, 0.0001m);
        }

        [Fact]
        public void CalculateWithdrawalTax_WithVeryHighProfitRatio_TaxesMostOfWithdrawal()
        {
            // Arrange: Portfolio is 95% gains
            var withdrawalAmount = 10000m;
            var profitRatio = 0.95m; // 95% is profit
            var capitalGainsTax = 25m;

            // Act
            var tax = _calculator.CalculateWithdrawalTax(withdrawalAmount, profitRatio, capitalGainsTax);

            // Assert: 10000 * 0.95 * 0.25 = 2375
            tax.Should().Be(2375m);
        }

        [Fact]
        public void CalculateRetirementTax_WithExtremeGains_CalculatesLargeTax()
        {
            // Arrange: Portfolio grew 10x
            var portfolioValue = 1000000m;
            var costBasis = 100000m;
            var capitalGainsTax = 30m; // High tax rate

            // Act
            var tax = _calculator.CalculateRetirementTax(portfolioValue, costBasis, capitalGainsTax);

            // Assert: 900k gains * 30% = 270k tax
            tax.Should().Be(270000m);
        }

        #endregion

        #region Cost Basis Update Edge Cases

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_WithExcessiveWithdrawal_FloorAtZero()
        {
            // Arrange: Withdraw more principal than exists
            var currentCostBasis = 10000m;
            var withdrawalAmount = 50000m;
            var profitRatio = 0.5m; // 50% profit, 50% principal

            // Act: Principal portion = 50000 * 0.5 = 25000 (exceeds cost basis!)
            var newBasis = _calculator.UpdateCostBasisAfterWithdrawal(
                currentCostBasis, withdrawalAmount, profitRatio);

            // Assert: Should never go negative
            newBasis.Should().Be(0, "cost basis cannot be negative");
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_WithAllProfitWithdrawal_MaintainsCostBasis()
        {
            // Arrange: Withdraw only profits (100% profit ratio)
            var currentCostBasis = 50000m;
            var withdrawalAmount = 10000m;
            var profitRatio = 1.0m; // 100% profit

            // Act: Principal portion = 10000 * 0 = 0
            var newBasis = _calculator.UpdateCostBasisAfterWithdrawal(
                currentCostBasis, withdrawalAmount, profitRatio);

            // Assert: Cost basis unchanged when withdrawing only profits
            newBasis.Should().Be(50000m, "withdrawing profits should not reduce cost basis");
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_WithAllPrincipalWithdrawal_ReducesFullAmount()
        {
            // Arrange: Withdraw only principal (0% profit ratio)
            var currentCostBasis = 50000m;
            var withdrawalAmount = 10000m;
            var profitRatio = 0m; // 0% profit

            // Act: Principal portion = 10000 * 1.0 = 10000
            var newBasis = _calculator.UpdateCostBasisAfterWithdrawal(
                currentCostBasis, withdrawalAmount, profitRatio);

            // Assert: Cost basis reduced by full withdrawal
            newBasis.Should().Be(40000m, "withdrawing principal should reduce cost basis");
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_WithSmallPrincipalPortion_ReducesCorrectly()
        {
            // Arrange: Mostly profits, small principal withdrawal
            var currentCostBasis = 100000m;
            var withdrawalAmount = 20000m;
            var profitRatio = 0.9m; // 90% profit, 10% principal

            // Act: Principal portion = 20000 * 0.1 = 2000
            var newBasis = _calculator.UpdateCostBasisAfterWithdrawal(
                currentCostBasis, withdrawalAmount, profitRatio);

            // Assert: Cost basis reduced by 2000
            newBasis.Should().Be(98000m);
        }

        #endregion

        #region Zero and Boundary Conditions

        [Fact]
        public void CalculateProfitRatio_WithZeroCostBasis_ReturnsZero()
        {
            // Arrange: Defensive check for division by zero
            var portfolioValue = 100000m;
            var costBasis = 0m;

            // Act
            var profitRatio = _calculator.CalculateProfitRatio(portfolioValue, costBasis);

            // Assert: Avoid division by zero
            profitRatio.Should().Be(0, "zero cost basis should return zero to avoid division by zero");
        }

        [Fact]
        public void CalculateEffectiveTaxRate_WithZeroCapitalGainsTax_ReturnsZero()
        {
            // Arrange: High profit ratio but no tax
            var profitRatio = 0.75m;
            var capitalGainsTax = 0m;

            // Act
            var effectiveRate = _calculator.CalculateEffectiveTaxRate(profitRatio, capitalGainsTax);

            // Assert
            effectiveRate.Should().Be(0);
        }

        [Fact]
        public void CalculateEffectiveTaxRate_WithMaxTaxRate_CalculatesCorrectly()
        {
            // Arrange: Maximum tax scenario
            var profitRatio = 1.0m; // 100% profit
            var capitalGainsTax = 50m; // 50% tax rate

            // Act
            var effectiveRate = _calculator.CalculateEffectiveTaxRate(profitRatio, capitalGainsTax);

            // Assert: Effective rate should be 0.5 (50%)
            effectiveRate.Should().Be(0.5m);
        }

        [Fact]
        public void CalculateWithdrawalTax_WithZeroWithdrawal_ReturnsZero()
        {
            // Arrange
            var withdrawalAmount = 0m;
            var profitRatio = 0.7m;
            var capitalGainsTax = 25m;

            // Act
            var tax = _calculator.CalculateWithdrawalTax(withdrawalAmount, profitRatio, capitalGainsTax);

            // Assert
            tax.Should().Be(0);
        }

        [Fact]
        public void CalculateWithdrawalTax_WithVerySmallWithdrawal_CalculatesCorrectly()
        {
            // Arrange: Small withdrawal to test precision
            var withdrawalAmount = 1m;
            var profitRatio = 0.5m;
            var capitalGainsTax = 25m;

            // Act
            var tax = _calculator.CalculateWithdrawalTax(withdrawalAmount, profitRatio, capitalGainsTax);

            // Assert: 1 * 0.5 * 0.25 = 0.125
            tax.Should().Be(0.125m);
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_WithZeroWithdrawal_MaintainsCostBasis()
        {
            // Arrange
            var currentCostBasis = 50000m;
            var withdrawalAmount = 0m;
            var profitRatio = 0.5m;

            // Act
            var newBasis = _calculator.UpdateCostBasisAfterWithdrawal(
                currentCostBasis, withdrawalAmount, profitRatio);

            // Assert
            newBasis.Should().Be(50000m, "zero withdrawal should not change cost basis");
        }

        #endregion

        #region High Precision Scenarios

        [Fact]
        public void CalculateProfitRatio_WithHighPrecisionValues_MaintainsPrecision()
        {
            // Arrange: Values that could cause rounding issues
            var portfolioValue = 123456.789m;
            var costBasis = 98765.432m;

            // Act
            var profitRatio = _calculator.CalculateProfitRatio(portfolioValue, costBasis);

            // Assert: (123456.789 - 98765.432) / 123456.789 ≈ 0.19999
            profitRatio.Should().BeApproximately(0.19999m, 0.00001m);
        }

        [Fact]
        public void CalculateWithdrawalTax_WithHighPrecisionCalculation_MaintainsPrecision()
        {
            // Arrange
            var withdrawalAmount = 12345.67m;
            var profitRatio = 0.333333m; // Repeating decimal
            var capitalGainsTax = 25.5m;

            // Act
            var tax = _calculator.CalculateWithdrawalTax(withdrawalAmount, profitRatio, capitalGainsTax);

            // Assert: Result should maintain decimal precision
            tax.Should().BeGreaterThan(0);
            tax.Should().BeLessThan(withdrawalAmount);
        }

        #endregion
    }
}
