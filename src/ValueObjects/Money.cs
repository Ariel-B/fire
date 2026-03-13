using FirePlanningTool.Services;
using FirePlanningTool.Serialization;
using System;
using System.Text.Json.Serialization;

namespace FirePlanningTool.ValueObjects;

/// <summary>
/// Immutable value object representing a monetary amount with explicit currency.
/// Prevents mixing currencies and ensures all conversions are explicit.
/// </summary>
[JsonConverter(typeof(MoneyJsonConverter))]
public readonly struct Money : IEquatable<Money>, IComparable<Money>
{
    /// <summary>
    /// Gets the numeric amount in the current currency.
    /// </summary>
    public decimal Amount { get; }

    /// <summary>
    /// Gets the ISO currency code for this monetary value.
    /// </summary>
    public string Currency { get; } // ISO code: "USD", "ILS", "EUR", etc.

    private Money(decimal amount, string currency)
    {
        if (string.IsNullOrEmpty(currency))
            throw new ArgumentException("Currency cannot be null or empty", nameof(currency));

        // Validate currency is supported (checks both symbols and ISO codes)
        if (!SupportedCurrencies.IsSupported(currency))
            throw new ArgumentException($"Unsupported currency: {currency}", nameof(currency));

        // Normalize to ISO code (converts symbols like "$" to "USD", "₪" to "ILS")
        currency = SupportedCurrencies.GetCode(currency);

        Amount = amount;
        Currency = currency;
    }

    // Factory methods for common currencies
    /// <summary>
    /// Creates a money value denominated in U.S. dollars.
    /// </summary>
    public static Money Usd(decimal amount) => new Money(amount, "USD");

    /// <summary>
    /// Creates a money value denominated in Israeli shekels.
    /// </summary>
    public static Money Ils(decimal amount) => new Money(amount, "ILS");

    /// <summary>
    /// Creates a zero-valued money instance in the specified currency.
    /// </summary>
    public static Money Zero(string currency) => new Money(0, currency);

    // Generic factory for any supported currency
    /// <summary>
    /// Creates a money value in any supported currency.
    /// </summary>
    public static Money Create(decimal amount, string currencyCode) => new Money(amount, currencyCode);

    /// <summary>
    /// Explicitly converts this Money to another currency using the provided converter.
    /// </summary>
    public Money ConvertTo(string targetCurrency, ICurrencyConverter converter)
    {
        if (converter == null)
            throw new ArgumentNullException(nameof(converter));

        // Normalize target currency
        targetCurrency = SupportedCurrencies.GetCode(targetCurrency).ToUpperInvariant();

        if (Currency == targetCurrency)
            return this;

        var converted = converter.ConvertToDisplayCurrency(Amount, Currency, targetCurrency);
        return new Money(converted, targetCurrency);
    }

    // Arithmetic operations - only allowed within same currency
    /// <summary>
    /// Adds two money values with the same currency.
    /// </summary>
    public static Money operator +(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(a.Amount + b.Amount, a.Currency);
    }

    /// <summary>
    /// Subtracts one money value from another when both use the same currency.
    /// </summary>
    public static Money operator -(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return new Money(a.Amount - b.Amount, a.Currency);
    }

    /// <summary>
    /// Multiplies a money value by a scalar.
    /// </summary>
    public static Money operator *(Money money, decimal multiplier)
        => new Money(money.Amount * multiplier, money.Currency);

    /// <summary>
    /// Divides a money value by a scalar.
    /// </summary>
    public static Money operator /(Money money, decimal divisor)
    {
        if (divisor == 0)
            throw new DivideByZeroException("Cannot divide money by zero");
        return new Money(money.Amount / divisor, money.Currency);
    }

    // Unary minus operator
    /// <summary>
    /// Negates a money value while preserving its currency.
    /// </summary>
    public static Money operator -(Money money)
        => new Money(-money.Amount, money.Currency);

    // Comparison operations - only allowed within same currency
    /// <summary>
    /// Compares this instance to another money value with the same currency.
    /// </summary>
    public int CompareTo(Money other)
    {
        EnsureSameCurrency(this, other);
        return Amount.CompareTo(other.Amount);
    }

    /// <summary>
    /// Determines whether the left value is greater than the right value.
    /// </summary>
    public static bool operator >(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount > b.Amount;
    }

    /// <summary>
    /// Determines whether the left value is less than the right value.
    /// </summary>
    public static bool operator <(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount < b.Amount;
    }

    /// <summary>
    /// Determines whether the left value is greater than or equal to the right value.
    /// </summary>
    public static bool operator >=(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount >= b.Amount;
    }

    /// <summary>
    /// Determines whether the left value is less than or equal to the right value.
    /// </summary>
    public static bool operator <=(Money a, Money b)
    {
        EnsureSameCurrency(a, b);
        return a.Amount <= b.Amount;
    }

    // Equality
    /// <summary>
    /// Determines whether this value is equal to another <see cref="Money"/> instance.
    /// </summary>
    public bool Equals(Money other)
        => Amount == other.Amount && Currency == other.Currency;

    /// <summary>
    /// Determines whether this value is equal to the specified object.
    /// </summary>
    public override bool Equals(object? obj)
        => obj is Money other && Equals(other);

    /// <summary>
    /// Returns a hash code for this monetary value.
    /// </summary>
    public override int GetHashCode()
        => HashCode.Combine(Amount, Currency);

    /// <summary>
    /// Determines whether two money values are equal.
    /// </summary>
    public static bool operator ==(Money left, Money right)
        => left.Equals(right);

    /// <summary>
    /// Determines whether two money values are not equal.
    /// </summary>
    public static bool operator !=(Money left, Money right)
        => !left.Equals(right);

    // Helper for currency validation
    private static void EnsureSameCurrency(Money a, Money b)
    {
        if (a.Currency != b.Currency)
            throw new InvalidOperationException(
                $"Cannot perform operation on different currencies: {a.Currency} and {b.Currency}. " +
                "Use ConvertTo() to explicitly convert currencies first.");
    }

    /// <summary>
    /// Returns a culture-invariant string representation using the currency symbol and formatted amount.
    /// </summary>
    public override string ToString()
    {
        var symbol = SupportedCurrencies.GetSymbol(Currency);
        return $"{symbol}{Amount:N2}";
    }

    // Deconstruction for pattern matching
    /// <summary>
    /// Deconstructs this value into amount and currency components.
    /// </summary>
    public void Deconstruct(out decimal amount, out string currency)
    {
        amount = Amount;
        currency = Currency;
    }
}
