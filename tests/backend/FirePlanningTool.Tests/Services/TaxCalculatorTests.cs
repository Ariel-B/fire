using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class TaxCalculatorTests
    {
        private readonly TaxCalculator _calculator;

        public TaxCalculatorTests()
        {
            _calculator = new TaxCalculator();
        }

        [Fact]
        public void CalculateProfitRatio_NoGains_ReturnsZero()
        {
            var result = _calculator.CalculateProfitRatio(10000, 10000);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateProfitRatio_WithGains_ReturnsRatio()
        {
            // 100k portfolio, 60k cost basis => 40k gains => 40% profit ratio
            var result = _calculator.CalculateProfitRatio(100000, 60000);
            result.Should().Be(0.4m);
        }

        [Fact]
        public void CalculateProfitRatio_ZeroPortfolio_ReturnsZero()
        {
            var result = _calculator.CalculateProfitRatio(0, 10000);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateProfitRatio_Underwater_ReturnsZero()
        {
            var result = _calculator.CalculateProfitRatio(8000, 10000);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateEffectiveTaxRate_NoTax_ReturnsZero()
        {
            var result = _calculator.CalculateEffectiveTaxRate(0.5m, 0);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateEffectiveTaxRate_WithTax_ReturnsRate()
        {
            // 50% profit ratio, 25% capital gains tax => 0.125 effective rate (12.5%)
            var result = _calculator.CalculateEffectiveTaxRate(0.5m, 25);
            result.Should().Be(0.125m);
        }

        [Fact]
        public void CalculateWithdrawalTax_NoTax_ReturnsZero()
        {
            var result = _calculator.CalculateWithdrawalTax(10000, 0.5m, 0);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateWithdrawalTax_WithTax_CalculatesCorrectly()
        {
            // 10k withdrawal, 50% profit ratio, 25% tax
            // Tax = 10000 * 0.5 * 0.25 = 1250
            var result = _calculator.CalculateWithdrawalTax(10000, 0.5m, 25);
            result.Should().Be(1250);
        }

        [Fact]
        public void CalculateRetirementTax_NoGains_ReturnsZero()
        {
            var result = _calculator.CalculateRetirementTax(100000, 100000, 25);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateRetirementTax_WithGains_CalculatesTax()
        {
            // 100k portfolio, 60k cost basis => 40k gains => 10k tax at 25%
            var result = _calculator.CalculateRetirementTax(100000, 60000, 25);
            result.Should().Be(10000);
        }

        [Fact]
        public void CalculateRetirementTax_Underwater_ReturnsZero()
        {
            var result = _calculator.CalculateRetirementTax(80000, 100000, 25);
            result.Should().Be(0);
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_ZeroProfitRatio_ReducesCostBasis()
        {
            // All principal, no gains: 10k cost basis - 5k withdrawal = 5k
            var result = _calculator.UpdateCostBasisAfterWithdrawal(10000, 5000, 0);
            result.Should().Be(5000);
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_HalfProfitRatio_ReducesHalf()
        {
            // 50% gains: 10k cost basis - (5k withdrawal * 50% principal) = 7500
            var result = _calculator.UpdateCostBasisAfterWithdrawal(10000, 5000, 0.5m);
            result.Should().Be(7500);
        }

        [Fact]
        public void UpdateCostBasisAfterWithdrawal_NeverGoesNegative()
        {
            var result = _calculator.UpdateCostBasisAfterWithdrawal(1000, 5000, 0);
            result.Should().Be(0);
        }
    }
}
