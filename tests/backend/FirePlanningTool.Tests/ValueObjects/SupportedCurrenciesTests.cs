using FirePlanningTool.ValueObjects;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.ValueObjects;

[Collection("Currency registry state")]
public class SupportedCurrenciesTests
{
    [Theory]
    [InlineData("USD")]
    [InlineData("usd")]
    [InlineData("ILS")]
    [InlineData("ils")]
    [InlineData("$")]
    [InlineData("₪")]
    public void IsSupported_SupportedCurrency_ReturnsTrue(string currency)
    {
        // Act
        var result = SupportedCurrencies.IsSupported(currency);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void IsSupported_EmptyOrNullCurrency_ReturnsFalse(string? currency)
    {
        // Act
        var result = SupportedCurrencies.IsSupported(currency!);

        // Assert
        result.Should().BeFalse();
    }

    [Theory]
    [InlineData("USD", "$")]
    [InlineData("ILS", "₪")]
    public void GetSymbol_IsoCode_ReturnsSymbol(string isoCode, string expectedSymbol)
    {
        // Act
        var result = SupportedCurrencies.GetSymbol(isoCode);

        // Assert
        result.Should().Be(expectedSymbol);
    }

    [Fact]
    public void GetSymbol_UnknownCode_ReturnsCode()
    {
        // Act
        var result = SupportedCurrencies.GetSymbol("XYZ");

        // Assert
        result.Should().Be("XYZ");
    }

    [Theory]
    [InlineData("$", "USD")]
    [InlineData("₪", "ILS")]
    [InlineData("USD", "USD")]
    [InlineData("usd", "USD")]
    [InlineData("ILS", "ILS")]
    [InlineData("ils", "ILS")]
    public void GetCode_SymbolOrCode_ReturnsIsoCode(string input, string expectedCode)
    {
        // Act
        var result = SupportedCurrencies.GetCode(input);

        // Assert
        result.Should().Be(expectedCode);
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void GetCode_NullOrEmpty_ThrowsArgumentException(string? input)
    {
        // Act & Assert
        var act = () => SupportedCurrencies.GetCode(input!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void All_ReturnsKnownCurrencies()
    {
        // Act
        var result = SupportedCurrencies.All;

        // Assert
        result.Should().Contain("USD");
        result.Should().Contain("ILS");
        result.Should().HaveCountGreaterThanOrEqualTo(2);
    }

    [Fact]
    public void Register_NewCurrency_MakesItSupported()
    {
        try
        {
            // Arrange
            SupportedCurrencies.IsSupported("EUR").Should().BeFalse();

            // Act
            SupportedCurrencies.Register("EUR", "€");

            // Assert
            SupportedCurrencies.IsSupported("EUR").Should().BeTrue();
            SupportedCurrencies.IsSupported("€").Should().BeTrue();
            SupportedCurrencies.GetSymbol("EUR").Should().Be("€");
            SupportedCurrencies.GetCode("€").Should().Be("EUR");
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("EUR");
        }
    }

    [Fact]
    public void Register_WithLowercaseCode_NormalizesToUppercase()
    {
        try
        {
            // Act
            SupportedCurrencies.Register("gbp", "£");

            // Assert
            SupportedCurrencies.IsSupported("GBP").Should().BeTrue();
            SupportedCurrencies.IsSupported("gbp").Should().BeTrue();
            SupportedCurrencies.GetCode("£").Should().Be("GBP");
        }
        finally
        {
            // Cleanup
            SupportedCurrencies.Unregister("GBP");
        }
    }

    [Theory]
    [InlineData("", "€")]
    [InlineData(null, "€")]
    [InlineData("EUR", "")]
    [InlineData("EUR", null)]
    public void Register_NullOrEmpty_ThrowsArgumentException(string? code, string? symbol)
    {
        // Act & Assert
        var act = () => SupportedCurrencies.Register(code!, symbol!);
        act.Should().Throw<ArgumentException>();
    }

    [Fact]
    public void Unregister_ExistingCurrency_RemovesIt()
    {
        try
        {
            // Arrange
            SupportedCurrencies.Register("JPY", "¥");
            SupportedCurrencies.IsSupported("JPY").Should().BeTrue();

            // Act
            SupportedCurrencies.Unregister("JPY");

            // Assert
            SupportedCurrencies.IsSupported("JPY").Should().BeFalse();
            SupportedCurrencies.IsSupported("¥").Should().BeFalse();
        }
        finally
        {
            // Ensure cleanup
            SupportedCurrencies.Unregister("JPY");
        }
    }

    [Fact]
    public void Unregister_NonexistentCurrency_DoesNotThrow()
    {
        // Act & Assert
        var act = () => SupportedCurrencies.Unregister("XYZ");
        act.Should().NotThrow();
    }
}
