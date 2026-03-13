using System.Text.Json;
using FirePlanningTool.Models;
using FirePlanningTool.Serialization;
using FirePlanningTool.ValueObjects;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Serialization;

/// <summary>
/// Tests for MoneyJsonConverter handling of various input formats.
/// Reproduces the issue where legacy file formats cause "Expected start of object for Money type" error.
/// </summary>
public class MoneyJsonConverterLegacyFormatTests
{
    private readonly JsonSerializerOptions _options;

    public MoneyJsonConverterLegacyFormatTests()
    {
        _options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            Converters = { new MoneyJsonConverter(), new CurrencyCodeConverter() }
        };
    }

    [Fact]
    public void Deserialize_MoneyAsObject_Succeeds()
    {
        // Arrange - proper Money object format
        var json = @"{""amount"": 100, ""currency"": ""USD""}";

        // Act
        var money = JsonSerializer.Deserialize<Money>(json, _options);

        // Assert
        money.Should().NotBeNull();
        money!.Amount.Should().Be(100);
        money.Currency.Should().Be("USD");
    }

    [Fact]
    public void Deserialize_MoneyWithILSSymbol_Succeeds()
    {
        // Arrange - Money with symbol instead of code
        var json = @"{""amount"": 100, ""currency"": ""₪""}";

        // Act
        var money = JsonSerializer.Deserialize<Money>(json, _options);

        // Assert
        money.Should().NotBeNull();
        money!.Amount.Should().Be(100);
        money.Currency.Should().Be("ILS");
    }

    [Fact]
    public void Deserialize_MoneyWithUSDSymbol_Succeeds()
    {
        // Arrange - Money with symbol instead of code
        var json = @"{""amount"": 100, ""currency"": ""$""}";

        // Act
        var money = JsonSerializer.Deserialize<Money>(json, _options);

        // Assert
        money.Should().NotBeNull();
        money!.Amount.Should().Be(100);
        money.Currency.Should().Be("USD");
    }

    [Fact]
    public void Deserialize_PlannedExpenseWithMoneyObject_Succeeds()
    {
        // Arrange - expense with proper Money object
        var json = @"{
            ""id"": 1,
            ""type"": ""Test"",
            ""netAmount"": {""amount"": 120000, ""currency"": ""ILS""},
            ""year"": 2041,
            ""frequencyYears"": 1,
            ""repetitionCount"": 3
        }";

        // Act
        var expense = JsonSerializer.Deserialize<PlannedExpense>(json, _options);

        // Assert
        expense.Should().NotBeNull();
        expense!.NetAmount.Amount.Should().Be(120000);
        expense.NetAmount.Currency.Should().Be("ILS");
    }

    [Fact]
    public void Deserialize_PlannedExpenseWithMoneySymbolCurrency_Succeeds()
    {
        // Arrange - expense with Money object using symbol currency
        var json = @"{
            ""id"": 1,
            ""type"": ""לימודים של נועה"",
            ""netAmount"": {""amount"": 120000, ""currency"": ""₪""},
            ""year"": 2041,
            ""frequencyYears"": 1,
            ""repetitionCount"": 3
        }";

        // Act
        var expense = JsonSerializer.Deserialize<PlannedExpense>(json, _options);

        // Assert
        expense.Should().NotBeNull();
        expense!.NetAmount.Amount.Should().Be(120000);
        expense.NetAmount.Currency.Should().Be("ILS");
    }

    [Fact]
    public void Deserialize_PortfolioAssetWithMoneyObjects_Succeeds()
    {
        // Arrange - portfolio asset with Money objects
        var json = @"{
            ""id"": 1,
            ""symbol"": ""TSLA"",
            ""quantity"": 100,
            ""currentPrice"": {""amount"": 449.06, ""currency"": ""USD""},
            ""averageCost"": {""amount"": 62.56, ""currency"": ""USD""},
            ""method"": ""CAGR"",
            ""value1"": 30,
            ""value2"": 0
        }";

        // Act
        var asset = JsonSerializer.Deserialize<PortfolioAsset>(json, _options);

        // Assert
        asset.Should().NotBeNull();
        asset!.CurrentPrice.Amount.Should().Be(449.06m);
        asset.CurrentPrice.Currency.Should().Be("USD");
        asset.AverageCost.Amount.Should().Be(62.56m);
    }

    [Fact]
    public void Deserialize_FirePlanInputWithCompleteData_Succeeds()
    {
        // Arrange - complete input like frontend sends
        var json = @"{
            ""birthYear"": 1979,
            ""earlyRetirementYear"": 2030,
            ""fullRetirementAge"": 60,
            ""monthlyContribution"": {""amount"": 20000, ""currency"": ""ILS""},
            ""pensionNetMonthly"": {""amount"": 14000, ""currency"": ""ILS""},
            ""withdrawalRate"": 4,
            ""inflationRate"": 3,
            ""capitalGainsTax"": 25,
            ""usdIlsRate"": 3.23,
            ""expenses"": [
                {
                    ""id"": 1763301897043,
                    ""type"": ""לימודים של נועה"",
                    ""netAmount"": {""amount"": 120000, ""currency"": ""ILS""},
                    ""year"": 2041,
                    ""frequencyYears"": 1,
                    ""repetitionCount"": 3
                }
            ],
            ""accumulationPortfolio"": [
                {
                    ""id"": 1763300027149,
                    ""symbol"": ""TSLA"",
                    ""quantity"": 2262,
                    ""currentPrice"": {""amount"": 449.06, ""currency"": ""USD""},
                    ""averageCost"": {""amount"": 62.56, ""currency"": ""USD""},
                    ""method"": ""CAGR"",
                    ""value1"": 30,
                    ""value2"": 0
                }
            ],
            ""retirementAllocation"": [],
            ""retirementPortfolio"": [],
            ""accumulationAllocation"": []
        }";

        // Act
        var input = JsonSerializer.Deserialize<FirePlanInput>(json, _options);

        // Assert
        input.Should().NotBeNull();
        input!.MonthlyContribution.Amount.Should().Be(20000);
        input.MonthlyContribution.Currency.Should().Be("ILS");
        input.PensionNetMonthly.Amount.Should().Be(14000);
        input.Expenses.Should().HaveCount(1);
        input.Expenses[0].NetAmount.Amount.Should().Be(120000);
        input.Expenses[0].NetAmount.Currency.Should().Be("ILS");
        input.AccumulationPortfolio.Should().HaveCount(1);
        input.AccumulationPortfolio[0].CurrentPrice.Amount.Should().Be(449.06m);
    }

    [Fact]
    public void Deserialize_MoneyAsNumber_ThrowsException()
    {
        // Arrange - legacy format: Money as plain number (this should fail)
        var json = @"120000";

        // Act & Assert
        var act = () => JsonSerializer.Deserialize<Money>(json, _options);
        act.Should().Throw<JsonException>().WithMessage("*Expected start of object for Money type*");
    }

    [Fact]
    public void Deserialize_PlannedExpenseWithNetAmountAsNumber_ThrowsException()
    {
        // Arrange - legacy format: netAmount as plain number (this is the bug!)
        var json = @"{
            ""id"": 1763301897043,
            ""type"": ""לימודים של נועה"",
            ""netAmount"": 120000,
            ""currency"": ""₪"",
            ""year"": 2041,
            ""frequencyYears"": 1,
            ""repetitionCount"": 3
        }";

        // Act & Assert - This SHOULD throw because backend expects Money object
        var act = () => JsonSerializer.Deserialize<PlannedExpense>(json, _options);
        act.Should().Throw<JsonException>().WithMessage("*Expected start of object for Money type*");
    }

    [Fact]
    public void Deserialize_EmptyInput_ThrowsException()
    {
        // Arrange - null or empty input
        var json = @"null";

        // Act & Assert
        var result = JsonSerializer.Deserialize<FirePlanInput>(json, _options);
        result.Should().BeNull();
    }

    [Fact]
    public void Serialize_MoneyToJson_ProducesCorrectFormat()
    {
        // Arrange
        var money = Money.Usd(100);

        // Act
        var json = JsonSerializer.Serialize(money, _options);

        // Assert
        json.Should().Contain(@"""amount"":100");
        json.Should().Contain(@"""currency"":""USD""");
    }

    [Fact]
    public void Serialize_PlannedExpenseToJson_ProducesCorrectMoneyFormat()
    {
        // Arrange
        var expense = new PlannedExpense
        {
            Id = 1,
            Type = "Test",
            NetAmount = Money.Ils(120000),
            Year = 2041,
            FrequencyYears = 1,
            RepetitionCount = 3
        };

        // Act
        var json = JsonSerializer.Serialize(expense, _options);

        // Assert - JSON serializer uses PascalCase (NetAmount, not netAmount)
        json.Should().Contain(@"""NetAmount"":{""amount"":120000,""currency"":""ILS""}");
    }
}
