namespace FirePlanningTool.Tests.CurrencyConversion
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Tests for CurrencyConverter service functionality
    /// Validates currency conversion, exchange rates, and multi-currency handling
    /// </summary>
    public class CurrencyConverterTests
    {
        #region USD to ILS Conversion Tests

        [Fact]
        public void ConvertToDisplayCurrency_FromUsdToIls_ConvertedCorrectly()
        {
            var converter = new CurrencyConverter(3.6m);
            var usdAmount = 1000m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().Be(3600m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_ZeroAmount_ReturnsZero()
        {
            var converter = new CurrencyConverter(3.6m);
            var usdAmount = 0m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().Be(0m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_SameCurrency_ReturnsOriginalAmount()
        {
            var converter = new CurrencyConverter(3.6m);
            var usdAmount = 1000m;

            var result = converter.ConvertToDisplayCurrency(usdAmount, "$", "$");

            result.Should().Be(1000m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithDifferentRate_ProducesDifferentResult()
        {
            var converterLow = new CurrencyConverter(3.0m);
            var converterHigh = new CurrencyConverter(4.0m);
            var usdAmount = 1000m;

            var lowConversion = converterLow.ConvertToDisplayCurrency(usdAmount, "$", "₪");
            var highConversion = converterHigh.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            highConversion.Should().BeGreaterThan(lowConversion);
        }

        [Fact]
        public void ConvertToDisplayCurrency_FractionalAmount_CalculatesAccurately()
        {
            var converter = new CurrencyConverter(3.75m);
            var usdAmount = 1234.56m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().BeApproximately(4629.6m, 0.1m);
        }

        #endregion

        #region ILS to USD Conversion Tests

        [Fact]
        public void ConvertToDisplayCurrency_FromIlsToUsd_ConvertedCorrectly()
        {
            var converter = new CurrencyConverter(3.6m);
            var ilsAmount = 3600m;

            var usdAmount = converter.ConvertToDisplayCurrency(ilsAmount, "₪", "$");

            usdAmount.Should().BeApproximately(1000m, 0.01m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_IlsToUsd_ZeroAmount_ReturnsZero()
        {
            var converter = new CurrencyConverter(3.6m);
            var ilsAmount = 0m;

            var usdAmount = converter.ConvertToDisplayCurrency(ilsAmount, "₪", "$");

            usdAmount.Should().Be(0m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_IlsToUsd_HighRate_ProducesLowerConversion()
        {
            var converterLow = new CurrencyConverter(3.0m);
            var converterHigh = new CurrencyConverter(4.0m);
            var ilsAmount = 10000m;

            var lowConversion = converterLow.ConvertToDisplayCurrency(ilsAmount, "₪", "$");
            var highConversion = converterHigh.ConvertToDisplayCurrency(ilsAmount, "₪", "$");

            highConversion.Should().BeLessThan(lowConversion);
        }

        #endregion

        #region Round-Trip Conversion Tests

        [Fact]
        public void RoundTripConversion_UsdToIlsAndBack_ReturnsOriginalAmount()
        {
            var converter = new CurrencyConverter(3.6m);
            var originalUsd = 1000m;

            var ils = converter.ConvertToDisplayCurrency(originalUsd, "$", "₪");
            var convertedBack = converter.ConvertToDisplayCurrency(ils, "₪", "$");

            convertedBack.Should().BeApproximately(originalUsd, 0.01m);
        }

        [Fact]
        public void RoundTripConversion_IlsToUsdAndBack_ReturnsOriginalAmount()
        {
            var converter = new CurrencyConverter(3.75m);
            var originalIls = 5000m;

            var usd = converter.ConvertToDisplayCurrency(originalIls, "₪", "$");
            var convertedBack = converter.ConvertToDisplayCurrency(usd, "$", "₪");

            convertedBack.Should().BeApproximately(originalIls, 0.01m);
        }

        #endregion

        #region Batch Conversion Tests

        [Fact]
        public void ConvertPortfolioAssets_WithDifferentCurrencies_ConvertsAppropriately()
        {
            var converter = new CurrencyConverter(3.6m);
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) },
                new() { Symbol = "TASE", Quantity = 100, CurrentPrice = Money.Ils(360), AverageCost = Money.Ils(300) }
            };

            // Test logic for portfolio conversion to USD
            var totalUsd = 0m;
            foreach (var asset in portfolio)
            {
                totalUsd += converter.ConvertToDisplayCurrency(asset.CurrentPrice.Amount, asset.CurrentPrice.Currency, "USD");
            }

            totalUsd.Should().BeGreaterThan(0);
        }

        [Fact]
        public void ConvertExpenses_WithDifferentCurrencies_SumsCorrectly()
        {
            var converter = new CurrencyConverter(3.6m);
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(1000) },
                new() { NetAmount = Money.Ils(3600) }  // 3600 ILS = 1000 USD at rate 3.6
            };

            var totalUsd = 0m;
            foreach (var expense in expenses)
            {
                totalUsd += converter.ConvertToDisplayCurrency(expense.NetAmount.Amount, expense.NetAmount.Currency, "USD");
            }

            totalUsd.Should().BeApproximately(2000m, 0.1m);
        }

        #endregion

        #region Edge Cases

        [Fact]
        public void ConvertCurrency_WithVerySmallAmount_CalculatesAccurately()
        {
            var converter = new CurrencyConverter(3.6m);
            var usdAmount = 0.01m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().BeApproximately(0.036m, 0.001m);
        }

        [Fact]
        public void ConvertCurrency_WithVeryLargeAmount_HandlesWithoutOverflow()
        {
            var converter = new CurrencyConverter(3.6m);
            var usdAmount = 1000000000m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().Be(3600000000m);
        }

        [Fact]
        public void ConvertCurrency_WithDecimalRate_ConvertsPrecisely()
        {
            var converter = new CurrencyConverter(3.576m);
            var usdAmount = 1000m;

            var ilsAmount = converter.ConvertToDisplayCurrency(usdAmount, "$", "₪");

            ilsAmount.Should().BeApproximately(3576m, 0.01m);
        }

        [Fact]
        public void ConvertCurrency_WithUnsupportedCurrency_ThrowsException()
        {
            var converter = new CurrencyConverter(3.6m);
            var amount = 1000m;

            Action act = () => converter.ConvertToDisplayCurrency(amount, "EUR", "$");
            act.Should().Throw<ArgumentException>();
        }

        #endregion
    }
}
