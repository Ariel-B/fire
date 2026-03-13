using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using System;
using System.Collections.Generic;
using System.Linq;

namespace FirePlanningTool.Extensions;

/// <summary>
/// Extension methods for Money type operations.
/// </summary>
public static class MoneyExtensions
{
    /// <summary>
    /// Sums a collection of Money values (all must be in the same currency).
    /// </summary>
    /// <exception cref="InvalidOperationException">Thrown when collection is empty or contains mixed currencies</exception>
    public static Money Sum(this IEnumerable<Money> moneys)
    {
        var list = moneys.ToList();
        if (!list.Any())
            throw new InvalidOperationException("Cannot sum empty collection");

        var currency = list.First().Currency;
        return list.Aggregate(Money.Zero(currency), (acc, m) => acc + m);
    }

    /// <summary>
    /// Sums a collection of Money values after converting all to target currency.
    /// Ensures consistent conversion path by converting each value independently before summing.
    /// </summary>
    public static Money SumInCurrency(
        this IEnumerable<Money> moneys,
        string targetCurrency,
        ICurrencyConverter converter)
    {
        if (converter == null)
            throw new ArgumentNullException(nameof(converter));

        if (string.IsNullOrEmpty(targetCurrency))
            throw new ArgumentException("Target currency cannot be null or empty", nameof(targetCurrency));

        var list = moneys.ToList();
        if (!list.Any())
            return Money.Zero(targetCurrency);

        // Convert each money value to target currency first, then sum
        var converted = list.Select(m => m.ConvertTo(targetCurrency, converter));
        return converted.Aggregate(Money.Zero(targetCurrency), (acc, m) => acc + m);
    }

    /// <summary>
    /// Calculates weighted sum of Money values.
    /// Useful for portfolio calculations where each amount has a weight.
    /// </summary>
    /// <param name="weightedMoneys">Collection of (money, weight) tuples</param>
    /// <param name="targetCurrency">Currency for the result</param>
    /// <param name="converter">Currency converter</param>
    /// <returns>Weighted sum in target currency</returns>
    public static Money WeightedSum(
        this IEnumerable<(Money value, decimal weight)> weightedMoneys,
        string targetCurrency,
        ICurrencyConverter converter)
    {
        if (converter == null)
            throw new ArgumentNullException(nameof(converter));

        if (string.IsNullOrEmpty(targetCurrency))
            throw new ArgumentException("Target currency cannot be null or empty", nameof(targetCurrency));

        var list = weightedMoneys.ToList();
        if (!list.Any())
            return Money.Zero(targetCurrency);

        var result = Money.Zero(targetCurrency);

        foreach (var (money, weight) in list)
        {
            var converted = money.ConvertTo(targetCurrency, converter);
            result = result + (converted * weight);
        }

        return result;
    }

    /// <summary>
    /// Tries to sum Money values. Returns true if successful, false if collection is empty.
    /// </summary>
    public static bool TrySum(this IEnumerable<Money> moneys, out Money result)
    {
        var list = moneys.ToList();
        if (!list.Any())
        {
            result = default;
            return false;
        }

        result = list.Sum();
        return true;
    }

    /// <summary>
    /// Averages a collection of Money values (all must be in the same currency).
    /// </summary>
    public static Money Average(this IEnumerable<Money> moneys)
    {
        var list = moneys.ToList();
        if (!list.Any())
            throw new InvalidOperationException("Cannot average empty collection");

        var sum = list.Sum();
        return sum / list.Count;
    }

    /// <summary>
    /// Finds the maximum Money value (all must be in the same currency).
    /// </summary>
    public static Money Max(this IEnumerable<Money> moneys)
    {
        var list = moneys.ToList();
        if (!list.Any())
            throw new InvalidOperationException("Cannot find max of empty collection");

        return list.Aggregate((max, m) => m > max ? m : max);
    }

    /// <summary>
    /// Finds the minimum Money value (all must be in the same currency).
    /// </summary>
    public static Money Min(this IEnumerable<Money> moneys)
    {
        var list = moneys.ToList();
        if (!list.Any())
            throw new InvalidOperationException("Cannot find min of empty collection");

        return list.Aggregate((min, m) => m < min ? m : min);
    }

    /// <summary>
    /// Determines if all Money values in the collection are in the same currency.
    /// </summary>
    public static bool AllSameCurrency(this IEnumerable<Money> moneys)
    {
        var list = moneys.ToList();
        if (!list.Any())
            return true;

        var firstCurrency = list.First().Currency;
        return list.All(m => m.Currency == firstCurrency);
    }
}
