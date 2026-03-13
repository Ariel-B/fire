using FirePlanningTool.ValueObjects;
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FirePlanningTool.Serialization;

/// <summary>
/// JSON converter for currency codes. Normalizes symbols to ISO codes for backward compatibility.
/// "$" → "USD", "₪" → "ILS"
/// </summary>
public class CurrencyCodeConverter : JsonConverter<string>
{
    /// <summary>
    /// Reads a currency code or symbol from JSON and normalizes it to an ISO currency code.
    /// </summary>
    public override string Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetString();
        if (string.IsNullOrEmpty(value))
            return "USD"; // Default to USD

        // Normalize to ISO code (converts symbols to codes)
        return SupportedCurrencies.GetCode(value);
    }

    /// <summary>
    /// Writes the normalized ISO currency code to JSON.
    /// </summary>
    public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
    {
        // Write the ISO code
        writer.WriteStringValue(value);
    }
}
