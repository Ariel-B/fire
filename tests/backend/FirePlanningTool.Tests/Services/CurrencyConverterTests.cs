using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class CurrencyConverterTests
    {
        [Fact]
        public void ConvertToDisplayCurrency_SameCurrency_ReturnsAmount()
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToDisplayCurrency(100, "$", "$");
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToDisplayCurrency_UsdToIls_ReturnsConvertedAmount()
        {
            var rate = 3.5m;
            var converter = new CurrencyConverter(rate);
            var result = converter.ConvertToDisplayCurrency(100, "$", "₪");
            result.Should().Be(350);
        }

        [Fact]
        public void ConvertToDisplayCurrency_IlsToUsd_ReturnsConvertedAmount()
        {
            var rate = 4.0m;
            var converter = new CurrencyConverter(rate);
            var result = converter.ConvertToDisplayCurrency(400, "₪", "$");
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToDisplayCurrency_UnsupportedFromCurrency_ThrowsArgumentException()
        {
            var converter = new CurrencyConverter();
            Action act = () => converter.ConvertToDisplayCurrency(100, "ZZZ", "$");
            act.Should().Throw<ArgumentException>().WithMessage("*Unsupported currency*");
        }

        [Fact]
        public void ConvertToDisplayCurrency_UnsupportedDisplayCurrency_ThrowsArgumentException()
        {
            var converter = new CurrencyConverter();
            Action act = () => converter.ConvertToDisplayCurrency(100, "$", "ZZZ");
            act.Should().Throw<ArgumentException>().WithMessage("*Unsupported display currency*");
        }

        [Fact]
        public void UpdateUsdIlsRate_UpdatesRateCorrectly()
        {
            var converter = new CurrencyConverter(3.5m);
            converter.UpdateUsdIlsRate(4.0m);
            var result = converter.ConvertToDisplayCurrency(100, "$", "₪");
            result.Should().Be(400);
        }

        [Fact]
        public void ConvertToDisplayCurrency_ZeroAmount_ReturnsZero()
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToDisplayCurrency(0, "$", "₪");
            result.Should().Be(0);
        }

        [Fact]
        public void ConvertToDisplayCurrency_ToUsd_ReturnsAmountInUsd()
        {
            var converter = new CurrencyConverter(3.5m);
            var result = converter.ConvertToDisplayCurrency(350, "₪", "$");
            result.Should().Be(100);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        public void ConvertToUsd_NullOrEmptyCurrency_ReturnsAmount(string? currency)
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToUsd(100, currency!);
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToUsd_UsdCurrency_ReturnsAmount()
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToUsd(100, "$");
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToUsd_IlsCurrency_ConvertsCorrectly()
        {
            var converter = new CurrencyConverter(4.0m);
            var result = converter.ConvertToUsd(400, "₪");
            result.Should().Be(100);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        public void ConvertToIls_NullOrEmptyCurrency_ReturnsAmount(string? currency)
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToIls(100, currency!);
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToIls_IlsCurrency_ReturnsAmount()
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertToIls(100, "₪");
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertToIls_UsdCurrency_ConvertsCorrectly()
        {
            var converter = new CurrencyConverter(3.5m);
            var result = converter.ConvertToIls(100, "$");
            result.Should().Be(350);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        public void ConvertFromIls_NullOrEmptyTargetCurrency_ReturnsAmount(string? targetCurrency)
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertFromIls(100, targetCurrency!);
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertFromIls_IlsTargetCurrency_ReturnsAmount()
        {
            var converter = new CurrencyConverter();
            var result = converter.ConvertFromIls(100, "₪");
            result.Should().Be(100);
        }

        [Fact]
        public void ConvertFromIls_UsdTargetCurrency_ConvertsCorrectly()
        {
            var converter = new CurrencyConverter(4.0m);
            var result = converter.ConvertFromIls(400, "$");
            result.Should().Be(100);
        }

        [Fact]
        public void GetExchangeRate_SupportedCurrency_ReturnsRate()
        {
            var converter = new CurrencyConverter(3.6m);
            var rate = converter.GetExchangeRate("₪");
            rate.Should().Be(3.6m);
        }

        [Fact]
        public void GetExchangeRate_UnsupportedCurrency_ReturnsZero()
        {
            var converter = new CurrencyConverter();
            var rate = converter.GetExchangeRate("EUR");
            rate.Should().Be(0);
        }

        [Fact]
        public void GetUsdIlsRate_ReturnsCurrentRate()
        {
            var converter = new CurrencyConverter(3.7m);
            var rate = converter.GetUsdIlsRate();
            rate.Should().Be(3.7m);
        }

        [Fact]
        public void GetSupportedCurrencies_ReturnsAllCurrencies()
        {
            var converter = new CurrencyConverter();
            var currencies = converter.GetSupportedCurrencies();
            // Money type design uses ISO codes internally
            currencies.Should().Contain("USD");
            currencies.Should().Contain("ILS");
        }

        [Fact]
        public void ConvertToUsd_WithZeroRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(0m); // Zero rate
            var result = converter.ConvertToUsd(400, "₪");
            result.Should().Be(400); // Should return unchanged when rate is invalid
        }

        [Fact]
        public void ConvertToIls_WithZeroRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(0m); // Zero rate
            var result = converter.ConvertToIls(100, "$");
            result.Should().Be(100); // Should return unchanged when rate is invalid
        }

        [Fact]
        public void ConvertFromIls_WithZeroRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(0m); // Zero rate
            var result = converter.ConvertFromIls(400, "$");
            result.Should().Be(400); // Should return unchanged when rate is invalid
        }

        [Fact]
        public void ConvertToUsd_WithNegativeRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(-1m); // Negative rate
            var result = converter.ConvertToUsd(400, "₪");
            result.Should().Be(400); // Should return unchanged when rate is invalid
        }

        [Fact]
        public void ConvertToIls_WithNegativeRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(-1m); // Negative rate
            var result = converter.ConvertToIls(100, "$");
            result.Should().Be(100); // Should return unchanged when rate is invalid
        }

        [Fact]
        public void ConvertFromIls_WithNegativeRate_ReturnsAmount()
        {
            var converter = new CurrencyConverter(-1m); // Negative rate
            var result = converter.ConvertFromIls(400, "$");
            result.Should().Be(400); // Should return unchanged when rate is invalid
        }
    }
}
