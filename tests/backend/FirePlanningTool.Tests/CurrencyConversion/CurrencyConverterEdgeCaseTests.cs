using FluentAssertions;
using FirePlanningTool.Services;
using System;
using Xunit;

namespace FirePlanningTool.Tests.CurrencyConversion
{
    /// <summary>
    /// Edge case tests for CurrencyConverter to improve branch coverage.
    /// Tests extreme values, precision, and boundary conditions.
    /// </summary>
    public class CurrencyConverterEdgeCaseTests
    {
        #region Extreme Value Scenarios

        [Fact]
        public void ConvertToDisplayCurrency_WithVeryLargeAmount_HandlesWithoutOverflow()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var veryLargeAmount = decimal.MaxValue / 100m; // Avoid overflow

            // Act
            var result = converter.ConvertToDisplayCurrency(veryLargeAmount, "USD", "ILS");

            // Assert: Should handle large numbers without throwing
            result.Should().BeGreaterThan(veryLargeAmount);
            result.Should().BeLessThan(decimal.MaxValue);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithVerySmallAmount_MaintainsPrecision()
        {
            // Arrange
            var converter = new CurrencyConverter(3.576m);
            var verySmallAmount = 0.0001m;

            // Act
            var result = converter.ConvertToDisplayCurrency(verySmallAmount, "USD", "ILS");

            // Assert: Should maintain precision for tiny amounts
            result.Should().BeApproximately(0.0003576m, 0.0000001m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithExtremeRate_HandlesCorrectly()
        {
            // Arrange: Very high exchange rate (like some hyperinflation currencies)
            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "ILS", 100000m);

            // Act
            var result = converter.ConvertToDisplayCurrency(1m, "USD", "ILS");

            // Assert: Should handle extreme rates
            result.Should().Be(100000m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithVeryLowRate_HandlesCorrectly()
        {
            // Arrange: Very low exchange rate (like some cryptocurrencies)
            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "ILS", 0.00001m);

            // Act
            var result = converter.ConvertToDisplayCurrency(100000m, "USD", "ILS");

            // Assert: Should handle very small rates
            result.Should().Be(1m);
        }

        #endregion

        #region Round-Trip Precision Scenarios

        [Fact]
        public void RoundTripConversion_WithStandardRate_MaintainsReasonablePrecision()
        {
            // Arrange
            var converter = new CurrencyConverter(3.576m);
            var originalAmount = 12345.67m;

            // Act: USD -> ILS -> USD
            var ils = converter.ConvertToIls(originalAmount, "USD");
            var roundTrip = converter.ConvertFromIls(ils, "USD");

            // Assert: Should be close to original (allowing for rounding)
            roundTrip.Should().BeApproximately(originalAmount, 0.01m);
        }

        [Fact]
        public void RoundTripConversion_WithHighRate_MaintainsReasonablePrecision()
        {
            // Arrange
            var converter = new CurrencyConverter(10.123m);
            var originalAmount = 12345.67m;

            // Act: USD -> ILS -> USD
            var ils = converter.ConvertToIls(originalAmount, "USD");
            var roundTrip = converter.ConvertFromIls(ils, "USD");

            // Assert: Should be close to original (allowing for rounding)
            roundTrip.Should().BeApproximately(originalAmount, 0.01m);
        }

        [Fact]
        public void RoundTripConversion_WithLowRate_MaintainsReasonablePrecision()
        {
            // Arrange
            var converter = new CurrencyConverter(0.5m);
            var originalAmount = 12345.67m;

            // Act: USD -> ILS -> USD
            var ils = converter.ConvertToIls(originalAmount, "USD");
            var roundTrip = converter.ConvertFromIls(ils, "USD");

            // Assert: Should be close to original (allowing for rounding)
            roundTrip.Should().BeApproximately(originalAmount, 0.01m);
        }

        [Fact]
        public void RoundTripConversion_WithRepeatingDecimalRate_HandlesCorrectly()
        {
            // Arrange: Rate that creates repeating decimals
            var converter = new CurrencyConverter(3.333333m);
            var originalAmount = 1000m;

            // Act: USD -> ILS -> USD
            var ils = converter.ConvertToIls(originalAmount, "USD");
            var roundTrip = converter.ConvertFromIls(ils, "USD");

            // Assert: Should handle repeating decimals
            roundTrip.Should().BeApproximately(originalAmount, 0.01m);
        }

        #endregion

        #region Zero and Boundary Conditions

        [Fact]
        public void ConvertToDisplayCurrency_WithZeroAmount_ReturnsZero()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);

            // Act
            var result = converter.ConvertToDisplayCurrency(0m, "USD", "ILS");

            // Assert
            result.Should().Be(0m);
        }

        [Fact]
        public void ConvertToUsd_WithZeroAmount_ReturnsZero()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);

            // Act
            var result = converter.ConvertToUsd(0m, "ILS");

            // Assert
            result.Should().Be(0m);
        }

        [Fact]
        public void ConvertToIls_WithZeroAmount_ReturnsZero()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);

            // Act
            var result = converter.ConvertToIls(0m, "USD");

            // Assert
            result.Should().Be(0m);
        }

        #endregion

        #region Same Currency Conversion

        [Fact]
        public void ConvertToDisplayCurrency_SameCurrency_ReturnsAmountUnchanged()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var amount = 12345.67m;

            // Act
            var result = converter.ConvertToDisplayCurrency(amount, "USD", "USD");

            // Assert: Same currency should return same amount
            result.Should().Be(amount);
        }

        [Fact]
        public void ConvertToDisplayCurrency_IlsToIls_ReturnsAmountUnchanged()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var amount = 44444.44m;

            // Act
            var result = converter.ConvertToDisplayCurrency(amount, "ILS", "ILS");

            // Assert
            result.Should().Be(amount);
        }

        #endregion

        #region Exchange Rate Updates

        [Fact]
        public void UpdateUsdIlsRate_ChangesConversionResults()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var amount = 1000m;
            var firstResult = converter.ConvertToDisplayCurrency(amount, "USD", "ILS");

            // Act: Update rate
            converter.UpdateUsdIlsRate(4.0m);
            var secondResult = converter.ConvertToDisplayCurrency(amount, "USD", "ILS");

            // Assert: Results should differ after rate change
            firstResult.Should().Be(3600m);
            secondResult.Should().Be(4000m);
            secondResult.Should().NotBe(firstResult);
        }

        [Fact]
        public void UpdateExchangeRate_WithNewRate_AffectsConversions()
        {
            // Arrange
            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "ILS", 3.5m);

            // Act
            var result = converter.ConvertToDisplayCurrency(100m, "USD", "ILS");

            // Assert
            result.Should().Be(350m);
        }

        [Fact]
        public void GetExchangeRate_ReturnsCorrectRate()
        {
            // Arrange
            var expectedRate = 3.678m;
            var converter = new CurrencyConverter(expectedRate);

            // Act
            var actualRate = converter.GetUsdIlsRate();

            // Assert
            actualRate.Should().Be(expectedRate);
        }

        #endregion

        #region Currency Normalization

        [Fact]
        public void ConvertToDisplayCurrency_WithSymbolCurrencies_HandlesCorrectly()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var amount = 1000m;

            // Act: Use currency symbols instead of codes
            var result = converter.ConvertToDisplayCurrency(amount, "$", "₪");

            // Assert: Should normalize symbols to codes
            result.Should().Be(3600m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithMixedCaseUSD_HandlesCorrectly()
        {
            // Arrange
            var converter = new CurrencyConverter(3.6m);
            var amount = 1000m;

            // Act: Use lowercase currency code
            var result = converter.ConvertToDisplayCurrency(amount, "usd", "ILS");

            // Assert: Should normalize case
            result.Should().Be(3600m);
        }

        #endregion

        #region Precision and Rounding

        [Fact]
        public void ConvertToDisplayCurrency_WithHighPrecisionAmount_MaintainsPrecision()
        {
            // Arrange
            var converter = new CurrencyConverter(3.576912m);
            var preciseAmount = 123.456789m;

            // Act
            var result = converter.ConvertToDisplayCurrency(preciseAmount, "USD", "ILS");

            // Assert: Should maintain decimal precision (actual: 441.594070055568)
            result.Should().BeApproximately(441.594m, 0.001m);
        }

        [Fact]
        public void ConvertToDisplayCurrency_WithRepeatingDecimal_HandlesCorrectly()
        {
            // Arrange: Rate that creates repeating decimals
            var converter = new CurrencyConverter(10m / 3m); // 3.333...
            var amount = 100m;

            // Act
            var result = converter.ConvertToDisplayCurrency(amount, "USD", "ILS");

            // Assert: Should handle repeating decimals
            result.Should().BeGreaterThan(333m);
            result.Should().BeLessThan(334m);
        }

        #endregion
    }
}
