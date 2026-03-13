using System;
using System.Collections.Generic;

namespace FirePlanningTool.ValueObjects;

/// <summary>
/// Registry of supported currencies. Extensible to add new currencies.
/// </summary>
public static class SupportedCurrencies
{
    // Current supported currencies (USD and ILS)
    private static readonly HashSet<string> _currencies = new(StringComparer.OrdinalIgnoreCase)
    {
        "USD", // US Dollar
        "ILS"  // Israeli Shekel
    };

    // Symbol to ISO code mapping for backward compatibility
    private static readonly Dictionary<string, string> _symbolToCode = new()
    {
        { "$", "USD" },
        { "₪", "ILS" }
    };

    // ISO code to symbol mapping for display
    private static readonly Dictionary<string, string> _codeToSymbol = new()
    {
        { "USD", "$" },
        { "ILS", "₪" }
    };

    /// <summary>
    /// Checks if a currency is supported (ISO code or symbol).
    /// </summary>
    public static bool IsSupported(string currency)
    {
        if (string.IsNullOrEmpty(currency))
            return false;

        // Check if it's an ISO code
        if (_currencies.Contains(currency))
            return true;

        // Check if it's a symbol that maps to an ISO code
        if (_symbolToCode.ContainsKey(currency))
            return true;

        return false;
    }

    /// <summary>
    /// Gets the display symbol for a currency code.
    /// </summary>
    public static string GetSymbol(string currencyCode)
    {
        if (string.IsNullOrEmpty(currencyCode))
            return currencyCode;

        return _codeToSymbol.TryGetValue(currencyCode.ToUpperInvariant(), out var symbol)
            ? symbol
            : currencyCode;
    }

    /// <summary>
    /// Gets the ISO code for a symbol or code (normalizes input).
    /// </summary>
    public static string GetCode(string symbolOrCode)
    {
        if (string.IsNullOrEmpty(symbolOrCode))
            throw new ArgumentException("Currency symbol or code cannot be null or empty", nameof(symbolOrCode));

        // Check if it's a symbol first
        if (_symbolToCode.TryGetValue(symbolOrCode, out var code))
            return code;

        // Otherwise return normalized ISO code
        return symbolOrCode.ToUpperInvariant();
    }

    /// <summary>
    /// Gets all supported currency codes.
    /// </summary>
    public static IReadOnlySet<string> All => _currencies;

    /// <summary>
    /// Extension point: Register a new currency.
    /// </summary>
    /// <param name="currencyCode">ISO currency code (e.g., "EUR")</param>
    /// <param name="symbol">Currency symbol (e.g., "€")</param>
    public static void Register(string currencyCode, string symbol)
    {
        if (string.IsNullOrEmpty(currencyCode))
            throw new ArgumentException("Currency code cannot be null or empty", nameof(currencyCode));

        if (string.IsNullOrEmpty(symbol))
            throw new ArgumentException("Currency symbol cannot be null or empty", nameof(symbol));

        var normalizedCode = currencyCode.ToUpperInvariant();

        _currencies.Add(normalizedCode);
        _codeToSymbol[normalizedCode] = symbol;
        _symbolToCode[symbol] = normalizedCode;
    }

    /// <summary>
    /// Unregisters a currency (useful for testing).
    /// </summary>
    public static void Unregister(string currencyCode)
    {
        if (string.IsNullOrEmpty(currencyCode))
            return;

        var normalizedCode = currencyCode.ToUpperInvariant();

        if (_codeToSymbol.TryGetValue(normalizedCode, out var symbol))
        {
            _symbolToCode.Remove(symbol);
            _codeToSymbol.Remove(normalizedCode);
        }

        _currencies.Remove(normalizedCode);
    }
}
