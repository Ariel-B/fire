using FirePlanningTool.Extensions;
using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.ValueObjects;

/// <summary>
/// Tests demonstrating how easy it is to add new currencies to the system.
/// These tests verify the extensibility design by adding EUR and GBP.
/// </summary>
[Collection("Currency registry state")]
public class CurrencyExtensibilityTests
{
    [Fact]
    public void AddNewCurrency_EUR_WorksEndToEnd()
    {
        try
        {
            // Step 1: Register EUR
            SupportedCurrencies.Register("EUR", "€");
            SupportedCurrencies.IsSupported("EUR").Should().BeTrue();

            // Step 2: Add exchange rates
            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);  // 1 USD = 0.92 EUR
            converter.UpdateExchangeRate("EUR", "ILS", 3.91m);  // 1 EUR = 3.91 ILS

            // Step 3: Create Money in EUR
            var euroAmount = Money.Create(100, "EUR");
            euroAmount.Currency.Should().Be("EUR");
            euroAmount.Amount.Should().Be(100);

            // Step 4: Convert EUR to USD
            var usdAmount = euroAmount.ConvertTo("USD", converter);
            usdAmount.Currency.Should().Be("USD");
            usdAmount.Amount.Should().BeApproximately(108.70m, 0.01m);  // 100 / 0.92 ≈ 108.70

            // Step 5: Convert EUR to ILS
            var ilsAmount = euroAmount.ConvertTo("ILS", converter);
            ilsAmount.Currency.Should().Be("ILS");
            ilsAmount.Amount.Should().Be(391m);  // 100 * 3.91 = 391

            // Step 6: Arithmetic in EUR
            var euro1 = Money.Create(50, "EUR");
            var euro2 = Money.Create(30, "EUR");
            var total = euro1 + euro2;
            total.Should().Be(Money.Create(80, "EUR"));

            // Step 7: Use with symbol
            var euroWithSymbol = Money.Create(200, "€");
            euroWithSymbol.Currency.Should().Be("EUR");
            euroWithSymbol.Amount.Should().Be(200);

            // SUCCESS: Added EUR without changing any Money Type code!
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }

    [Fact]
    public void AddMultipleCurrencies_EUR_GBP_JPY_WorksCorrectly()
    {
        try
        {
            // Register multiple currencies
            SupportedCurrencies.Register("EUR", "€");
            SupportedCurrencies.Register("GBP", "£");
            SupportedCurrencies.Register("JPY", "¥");

            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);
            converter.UpdateExchangeRate("USD", "GBP", 0.79m);
            converter.UpdateExchangeRate("USD", "JPY", 149.50m);

            // Create money in different currencies
            var usd = Money.Usd(100);
            var eur = Money.Create(92, "EUR");
            var gbp = Money.Create(79, "GBP");
            var jpy = Money.Create(14950, "JPY");

            // All should convert to approximately same USD value
            usd.Amount.Should().Be(100);
            eur.ConvertTo("USD", converter).Amount.Should().BeApproximately(100, 0.01m);
            gbp.ConvertTo("USD", converter).Amount.Should().BeApproximately(100, 0.01m);
            jpy.ConvertTo("USD", converter).Amount.Should().BeApproximately(100, 0.01m);

            // Cross-currency conversions (via USD)
            var eurToGbp = eur.ConvertTo("GBP", converter);
            eurToGbp.Amount.Should().BeApproximately(79, 0.01m);

            var gbpToJpy = gbp.ConvertTo("JPY", converter);
            gbpToJpy.Amount.Should().BeApproximately(14950, 1m);
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
            SupportedCurrencies.Unregister("GBP");
            SupportedCurrencies.Unregister("JPY");
        }
    }

    [Fact]
    public void MixedCurrencyPortfolio_WithExtensionMethods_CalculatesCorrectly()
    {
        try
        {
            // Register EUR
            SupportedCurrencies.Register("EUR", "€");

            var converter = new CurrencyConverter(3.6m);
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);

            // Portfolio with mixed currencies (USD, ILS, EUR)
            var moneys = new[]
            {
                Money.Usd(100),           // $100
                Money.Ils(360),           // ₪360 = $100 @ 3.6 rate
                Money.Create(92, "EUR")   // €92 = $100 @ 0.92 rate
            };

            // Sum in USD
            var totalUsd = moneys.SumInCurrency("USD", converter);
            totalUsd.Amount.Should().BeApproximately(300, 0.01m);
            totalUsd.Currency.Should().Be("USD");

            // Sum in EUR
            var totalEur = moneys.SumInCurrency("EUR", converter);
            totalEur.Amount.Should().BeApproximately(276, 0.01m); // 300 * 0.92
            totalEur.Currency.Should().Be("EUR");

            // Sum in ILS
            var totalIls = moneys.SumInCurrency("ILS", converter);
            totalIls.Amount.Should().BeApproximately(1080, 0.01m); // 300 * 3.6
            totalIls.Currency.Should().Be("ILS");
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }

    [Fact]
    public void WeightedSum_MixedCurrencies_CalculatesCorrectly()
    {
        try
        {
            // Register EUR
            SupportedCurrencies.Register("EUR", "€");

            var converter = new CurrencyConverter(3.6m);
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);

            // Weighted portfolio
            var weightedMoneys = new[]
            {
                (Money.Usd(100), 0.50m),         // 50% weight
                (Money.Ils(360), 0.30m),         // 30% weight
                (Money.Create(92, "EUR"), 0.20m) // 20% weight
            };

            // Weighted sum in USD
            var result = weightedMoneys.WeightedSum("USD", converter);

            // Expected: (100 * 0.5) + (100 * 0.3) + (100 * 0.2) = 100
            result.Amount.Should().BeApproximately(100, 0.01m);
            result.Currency.Should().Be("USD");
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }

    [Fact]
    public void RoundTripConversion_ThroughMultipleCurrencies_MaintainsPrecision()
    {
        try
        {
            // Register EUR and GBP
            SupportedCurrencies.Register("EUR", "€");
            SupportedCurrencies.Register("GBP", "£");

            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);
            converter.UpdateExchangeRate("USD", "GBP", 0.79m);

            // Start with USD
            var original = Money.Usd(100);

            // Convert: USD -> EUR -> GBP -> ILS -> USD
            var eur = original.ConvertTo("EUR", converter);
            var gbp = eur.ConvertTo("GBP", converter);
            var ils = gbp.ConvertTo("ILS", converter);
            var backToUsd = ils.ConvertTo("USD", converter);

            // Should be approximately same (within 1 cent due to rounding)
            var difference = Math.Abs(backToUsd.Amount - original.Amount);
            difference.Should().BeLessThan(0.10m);  // Within 10 cents after 4 conversions
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
            SupportedCurrencies.Unregister("GBP");
        }
    }

    [Fact]
    public void NewCurrency_MixingWithUnsupportedCurrency_ThrowsException()
    {
        try
        {
            // Register only EUR
            SupportedCurrencies.Register("EUR", "€");

            // Try to create GBP (not registered)
            var act = () => Money.Create(100, "GBP");

            // Should throw because GBP not supported
            act.Should().Throw<ArgumentException>()
                .WithMessage("*Unsupported currency: GBP*");
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }

    [Fact]
    public void DynamicExchangeRateUpdate_UpdatesConversions()
    {
        try
        {
            // Register EUR
            SupportedCurrencies.Register("EUR", "€");

            var converter = new CurrencyConverter();
            converter.UpdateExchangeRate("USD", "EUR", 0.92m);

            var usd = Money.Usd(100);

            // First conversion
            var eur1 = usd.ConvertTo("EUR", converter);
            eur1.Amount.Should().Be(92); // 100 * 0.92

            // Update exchange rate
            converter.UpdateExchangeRate("USD", "EUR", 0.85m);

            // Second conversion with new rate
            var eur2 = usd.ConvertTo("EUR", converter);
            eur2.Amount.Should().Be(85); // 100 * 0.85
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }
}
