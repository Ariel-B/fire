using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.ValueObjects;

public class MoneyTests
{
    [Fact]
    public void Usd_CreatesMoneyWithUsdCurrency()
    {
        // Act
        var money = Money.Usd(100);

        // Assert
        money.Amount.Should().Be(100);
        money.Currency.Should().Be("USD");
    }

    [Fact]
    public void Ils_CreatesMoneyWithIlsCurrency()
    {
        // Act
        var money = Money.Ils(360);

        // Assert
        money.Amount.Should().Be(360);
        money.Currency.Should().Be("ILS");
    }

    [Fact]
    public void Zero_CreatesMoneyWithZeroAmount()
    {
        // Act
        var money = Money.Zero("USD");

        // Assert
        money.Amount.Should().Be(0);
        money.Currency.Should().Be("USD");
    }

    [Fact]
    public void Create_WithUnsupportedCurrency_ThrowsArgumentException()
    {
        // Act & Assert
        var act = () => Money.Create(100, "GBP");
        act.Should().Throw<ArgumentException>()
            .WithMessage("*Unsupported currency: GBP*");
    }

    [Fact]
    public void Create_WithSymbol_NormalizesToIsoCode()
    {
        // Act
        var usd = Money.Create(100, "$");
        var ils = Money.Create(360, "₪");

        // Assert
        usd.Currency.Should().Be("USD");
        ils.Currency.Should().Be("ILS");
    }

    [Theory]
    [InlineData("")]
    [InlineData(null)]
    public void Create_WithNullOrEmptyCurrency_ThrowsArgumentException(string? currency)
    {
        // Act & Assert
        var act = () => Money.Create(100, currency!);
        act.Should().Throw<ArgumentException>()
            .WithMessage("*Currency cannot be null or empty*");
    }

    [Fact]
    public void Addition_SameCurrency_ReturnsSum()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(50);

        // Act
        var result = money1 + money2;

        // Assert
        result.Should().Be(Money.Usd(150));
    }

    [Fact]
    public void Addition_DifferentCurrencies_ThrowsInvalidOperationException()
    {
        // Arrange
        var usd = Money.Usd(100);
        var ils = Money.Ils(360);

        // Act & Assert
        var act = () => usd + ils;
        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Cannot perform operation on different currencies*");
    }

    [Fact]
    public void Subtraction_SameCurrency_ReturnsDifference()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(30);

        // Act
        var result = money1 - money2;

        // Assert
        result.Should().Be(Money.Usd(70));
    }

    [Fact]
    public void Subtraction_DifferentCurrencies_ThrowsInvalidOperationException()
    {
        // Arrange
        var usd = Money.Usd(100);
        var ils = Money.Ils(360);

        // Act & Assert
        var act = () => usd - ils;
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Multiplication_ByScalar_ReturnsProduct()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act
        var result = money * 2.5m;

        // Assert
        result.Should().Be(Money.Usd(250));
    }

    [Fact]
    public void Division_ByScalar_ReturnsQuotient()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act
        var result = money / 4;

        // Assert
        result.Should().Be(Money.Usd(25));
    }

    [Fact]
    public void Division_ByZero_ThrowsDivideByZeroException()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act & Assert
        var act = () => money / 0;
        act.Should().Throw<DivideByZeroException>();
    }

    [Fact]
    public void UnaryMinus_ReturnsNegatedAmount()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act
        var result = -money;

        // Assert
        result.Should().Be(Money.Usd(-100));
    }

    [Fact]
    public void GreaterThan_SameCurrency_ComparesAmounts()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(50);

        // Act & Assert
        (money1 > money2).Should().BeTrue();
        (money2 > money1).Should().BeFalse();
    }

    [Fact]
    public void GreaterThan_DifferentCurrencies_ThrowsInvalidOperationException()
    {
        // Arrange
        var usd = Money.Usd(100);
        var ils = Money.Ils(360);

        // Act & Assert
        var act = () => usd > ils;
        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void LessThan_SameCurrency_ComparesAmounts()
    {
        // Arrange
        var money1 = Money.Usd(50);
        var money2 = Money.Usd(100);

        // Act & Assert
        (money1 < money2).Should().BeTrue();
        (money2 < money1).Should().BeFalse();
    }

    [Fact]
    public void GreaterThanOrEqual_SameCurrency_ComparesAmounts()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(100);
        var money3 = Money.Usd(50);

        // Act & Assert
        (money1 >= money2).Should().BeTrue();
        (money1 >= money3).Should().BeTrue();
        (money3 >= money1).Should().BeFalse();
    }

    [Fact]
    public void LessThanOrEqual_SameCurrency_ComparesAmounts()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(100);
        var money3 = Money.Usd(150);

        // Act & Assert
        (money1 <= money2).Should().BeTrue();
        (money1 <= money3).Should().BeTrue();
        (money3 <= money1).Should().BeFalse();
    }

    [Fact]
    public void Equals_SameAmountAndCurrency_ReturnsTrue()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(100);

        // Act & Assert
        money1.Equals(money2).Should().BeTrue();
        (money1 == money2).Should().BeTrue();
    }

    [Fact]
    public void Equals_DifferentAmount_ReturnsFalse()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(50);

        // Act & Assert
        money1.Equals(money2).Should().BeFalse();
        (money1 == money2).Should().BeFalse();
    }

    [Fact]
    public void Equals_DifferentCurrency_ReturnsFalse()
    {
        // Arrange
        var usd = Money.Usd(100);
        var ils = Money.Ils(100);

        // Act & Assert
        usd.Equals(ils).Should().BeFalse();
        (usd == ils).Should().BeFalse();
    }

    [Fact]
    public void NotEquals_DifferentAmount_ReturnsTrue()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(50);

        // Act & Assert
        (money1 != money2).Should().BeTrue();
    }

    [Fact]
    public void GetHashCode_SameAmountAndCurrency_ReturnsSameHash()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(100);

        // Act & Assert
        money1.GetHashCode().Should().Be(money2.GetHashCode());
    }

    [Fact]
    public void ToString_ReturnsFormattedString()
    {
        // Arrange
        var usd = Money.Usd(100.50m);
        var ils = Money.Ils(360.75m);

        // Act
        var usdString = usd.ToString();
        var ilsString = ils.ToString();

        // Assert
        usdString.Should().Contain("$");
        usdString.Should().Contain("100.50");
        ilsString.Should().Contain("₪");
        ilsString.Should().Contain("360.75");
    }

    [Fact]
    public void Deconstruct_ReturnsAmountAndCurrency()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act
        var (amount, currency) = money;

        // Assert
        amount.Should().Be(100);
        currency.Should().Be("USD");
    }

    [Fact]
    public void ConvertTo_SameCurrency_ReturnsOriginal()
    {
        // Arrange
        var money = Money.Usd(100);
        var converter = new CurrencyConverter();

        // Act
        var result = money.ConvertTo("USD", converter);

        // Assert
        result.Should().Be(money);
    }

    [Fact]
    public void ConvertTo_DifferentCurrency_ConvertsAmount()
    {
        // Arrange
        var usd = Money.Usd(100);
        var converter = new CurrencyConverter(3.6m);

        // Act
        var ils = usd.ConvertTo("ILS", converter);

        // Assert
        ils.Currency.Should().Be("ILS");
        ils.Amount.Should().Be(360); // 100 * 3.6
    }

    [Fact]
    public void ConvertTo_WithSymbol_ConvertsCorrectly()
    {
        // Arrange
        var usd = Money.Usd(100);
        var converter = new CurrencyConverter(3.6m);

        // Act
        var ils = usd.ConvertTo("₪", converter);

        // Assert
        ils.Currency.Should().Be("ILS");
        ils.Amount.Should().Be(360);
    }

    [Fact]
    public void ConvertTo_NullConverter_ThrowsArgumentNullException()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act & Assert
        var act = () => money.ConvertTo("ILS", null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void CompareTo_SameCurrency_ReturnsExpectedResult()
    {
        // Arrange
        var money1 = Money.Usd(100);
        var money2 = Money.Usd(50);
        var money3 = Money.Usd(100);

        // Act & Assert
        money1.CompareTo(money2).Should().BePositive();
        money2.CompareTo(money1).Should().BeNegative();
        money1.CompareTo(money3).Should().Be(0);
    }

    [Fact]
    public void CompareTo_DifferentCurrencies_ThrowsInvalidOperationException()
    {
        // Arrange
        var usd = Money.Usd(100);
        var ils = Money.Ils(360);

        // Act & Assert
        var act = () => usd.CompareTo(ils);
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(100)]
    [InlineData(-50)]
    [InlineData(1000000.99)]
    public void Create_VariousAmounts_WorksCorrectly(decimal amount)
    {
        // Act
        var money = Money.Usd(amount);

        // Assert
        money.Amount.Should().Be(amount);
        money.Currency.Should().Be("USD");
    }

    [Fact]
    public void RoundTrip_ConversionAndBack_MaintainsPrecision()
    {
        // Arrange
        var original = Money.Usd(100);
        var converter = new CurrencyConverter(3.6m);

        // Act
        var converted = original.ConvertTo("ILS", converter);
        var roundTrip = converted.ConvertTo("USD", converter);

        // Assert
        var difference = Math.Abs(roundTrip.Amount - original.Amount);
        difference.Should().BeLessThan(0.01m); // Within 1 cent tolerance
    }

    #region Decimal Precision Tests

    [Fact]
    public void Division_RepeatingDecimals_PreservesFullDecimalPrecision()
    {
        // Arrange
        var money = Money.Usd(10m);

        // Act - 10 / 3 = 3.333...
        var result = money / 3m;

        // Assert - decimal type preserves up to 28-29 significant digits
        // The result should be approximately 3.333... with high precision
        result.Amount.Should().BeApproximately(3.3333333333333333333333333333m, 0.0000000000000000000000000001m);
        result.Currency.Should().Be("USD");
    }

    [Fact]
    public void Multiplication_ComplexDecimals_PreservesPrecision()
    {
        // Arrange
        var money = Money.Usd(100.33m);

        // Act
        var result = money * 2.77m;

        // Assert - 100.33 * 2.77 = 277.9141
        result.Amount.Should().Be(277.9141m);
        result.Currency.Should().Be("USD");
    }

    [Fact]
    public void Division_ProducesMoreThanTwoDecimalPlaces_PreservesFullPrecision()
    {
        // Arrange
        var money = Money.Usd(100m);

        // Act - 100 / 7 = 14.285714...
        var result = money / 7m;

        // Assert - should preserve full decimal precision, not truncate to cents
        result.Amount.Should().BeApproximately(14.285714285714285714285714286m, 0.000000000000000000000000001m);
    }

    [Fact]
    public void SequentialArithmetic_AccumulatesWithoutPrecisionLoss()
    {
        // Arrange - simulate many small transactions
        var money = Money.Usd(1000m);

        // Act - divide into 3 parts and recombine (should lose nothing)
        var third = money / 3m;
        var result = third + third + third;

        // Assert - should be very close to original (decimal preserves precision)
        result.Amount.Should().BeApproximately(1000m, 0.0000000000000000000000000001m);
    }

    [Fact]
    public void Multiplication_VerySmallDecimals_PreservesPrecision()
    {
        // Arrange - money value less than 1 cent
        var money = Money.Usd(0.001m);

        // Act
        var result = money * 1000m;

        // Assert
        result.Amount.Should().Be(1m);
    }

    [Fact]
    public void Division_VerySmallResult_PreservesPrecision()
    {
        // Arrange
        var money = Money.Usd(1m);

        // Act
        var result = money / 10000m;

        // Assert - 0.0001 USD (sub-cent precision preserved)
        result.Amount.Should().Be(0.0001m);
    }

    [Fact]
    public void Division_OneThird_PreservesFullPrecision()
    {
        // Arrange
        var money = Money.Usd(1m);

        // Act
        var result = money / 3m;

        // Assert - verify the result is approximately 0.333...
        // C# decimal division of 1/3 yields 0.3333333333333333333333333333
        result.Amount.Should().BeApproximately(0.3333333333333333333333333333m, 0.0000000000000000000000000001m);
    }

    [Fact]
    public void Division_OneSeventh_PreservesFullPrecision()
    {
        // Arrange
        var money = Money.Usd(1m);

        // Act
        var result = money / 7m;

        // Assert
        result.Amount.Should().BeApproximately(0.1428571428571428571428571429m, 0.0000000000000000000000000001m);
    }

    [Fact]
    public void Division_TwoThirds_PreservesFullPrecision()
    {
        // Arrange
        var money = Money.Usd(2m);

        // Act
        var result = money / 3m;

        // Assert
        result.Amount.Should().BeApproximately(0.6666666666666666666666666667m, 0.0000000000000000000000000001m);
    }

    [Fact]
    public void Division_HundredByNine_PreservesFullPrecision()
    {
        // Arrange
        var money = Money.Usd(100m);

        // Act
        var result = money / 9m;

        // Assert
        result.Amount.Should().BeApproximately(11.111111111111111111111111111m, 0.000000000000000000000000001m);
    }

    #endregion

    #region Large Number Tests

    [Fact]
    public void Create_VeryLargeAmount_WorksCorrectly()
    {
        // Arrange - billion dollar portfolio
        var amount = 1_000_000_000m;

        // Act
        var money = Money.Usd(amount);

        // Assert
        money.Amount.Should().Be(1_000_000_000m);
    }

    [Fact]
    public void Addition_LargeAmounts_NoOverflow()
    {
        // Arrange
        var money1 = Money.Usd(1_000_000_000m); // 1 billion
        var money2 = Money.Usd(2_000_000_000m); // 2 billion

        // Act
        var result = money1 + money2;

        // Assert
        result.Amount.Should().Be(3_000_000_000m);
    }

    [Fact]
    public void Multiplication_LargeAmountByLargeMultiplier_WorksCorrectly()
    {
        // Arrange
        var money = Money.Usd(1_000_000m); // 1 million

        // Act - compound growth simulation: 1M * 1.07^40 ≈ 14.97M
        var multiplier = (decimal)Math.Pow(1.07, 40);
        var result = money * multiplier;

        // Assert - use slightly larger tolerance due to double->decimal conversion
        result.Amount.Should().BeApproximately(14_974_457.84m, 0.02m);
    }

    [Fact]
    public void Create_MaxReasonablePortfolioValue_WorksCorrectly()
    {
        // Arrange - trillion dollar value (extreme but valid)
        var amount = 1_000_000_000_000m;

        // Act
        var money = Money.Usd(amount);

        // Assert
        money.Amount.Should().Be(1_000_000_000_000m);
    }

    [Fact]
    public void Arithmetic_MixOfLargeAndSmall_PreservesPrecision()
    {
        // Arrange
        var largeMoney = Money.Usd(1_000_000_000m); // 1 billion
        var smallMoney = Money.Usd(0.01m); // 1 cent

        // Act
        var result = largeMoney + smallMoney;

        // Assert - should preserve the cent
        result.Amount.Should().Be(1_000_000_000.01m);
    }

    #endregion

    #region JSON Serialization Tests

    [Fact]
    public void JsonRoundTrip_UsdMoney_PreservesValue()
    {
        // Arrange
        var original = Money.Usd(1234.56m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonRoundTrip_IlsMoney_PreservesValue()
    {
        // Arrange
        var original = Money.Ils(4567.89m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonRoundTrip_ZeroAmount_PreservesValue()
    {
        // Arrange
        var original = Money.Zero("USD");
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonRoundTrip_NegativeAmount_PreservesValue()
    {
        // Arrange
        var original = Money.Usd(-500.25m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonRoundTrip_HighPrecisionAmount_PreservesValue()
    {
        // Arrange - amount with many decimal places
        var original = Money.Usd(123.456789012345678901234567m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonRoundTrip_LargeAmount_PreservesValue()
    {
        // Arrange
        var original = Money.Usd(999_999_999_999.99m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(original, options);
        var deserialized = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        deserialized.Should().Be(original);
    }

    [Fact]
    public void JsonDeserialize_WithSymbolCurrency_NormalizesToIsoCode()
    {
        // Arrange - JSON with symbol instead of ISO code
        var json = """{"amount": 100, "currency": "$"}""";
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var money = System.Text.Json.JsonSerializer.Deserialize<Money>(json, options);

        // Assert
        money.Amount.Should().Be(100);
        money.Currency.Should().Be("USD"); // Normalized to ISO code
    }

    [Fact]
    public void JsonSerialize_ProducesExpectedFormat()
    {
        // Arrange
        var money = Money.Usd(100.50m);
        var options = new System.Text.Json.JsonSerializerOptions();
        options.Converters.Add(new FirePlanningTool.Serialization.MoneyJsonConverter());

        // Act
        var json = System.Text.Json.JsonSerializer.Serialize(money, options);

        // Assert
        json.Should().Contain("\"amount\":");
        json.Should().Contain("100.5");
        json.Should().Contain("\"currency\":");
        json.Should().Contain("\"USD\"");
    }

    #endregion
}
