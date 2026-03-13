using FirePlanningTool.ValueObjects;
using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace FirePlanningTool.Serialization;

/// <summary>
/// JSON converter for Money type. Serializes as {"amount": 100, "currency": "USD"}.
/// </summary>
public class MoneyJsonConverter : JsonConverter<Money>
{
    /// <summary>
    /// Reads a JSON object and deserializes it into a <see cref="Money"/> value.
    /// </summary>
    public override Money Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartObject)
            throw new JsonException("Expected start of object for Money type");

        decimal amount = 0;
        string currency = "USD"; // Default

        while (reader.Read())
        {
            if (reader.TokenType == JsonTokenType.EndObject)
                break;

            if (reader.TokenType == JsonTokenType.PropertyName)
            {
                var propertyName = reader.GetString();
                reader.Read(); // Move to value

                switch (propertyName?.ToLowerInvariant())
                {
                    case "amount":
                        amount = reader.GetDecimal();
                        break;
                    case "currency":
                        currency = reader.GetString() ?? "USD";
                        break;
                }
            }
        }

        // Use SupportedCurrencies to normalize the currency code
        currency = SupportedCurrencies.GetCode(currency);

        return Money.Create(amount, currency);
    }

    /// <summary>
    /// Writes a <see cref="Money"/> value as a JSON object with amount and currency fields.
    /// </summary>
    public override void Write(Utf8JsonWriter writer, Money value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();
        writer.WriteNumber("amount", value.Amount);
        writer.WriteString("currency", value.Currency);
        writer.WriteEndObject();
    }
}
