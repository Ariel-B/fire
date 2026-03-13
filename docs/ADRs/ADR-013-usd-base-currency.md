# ADR-013: USD as Base Currency with Display Conversion

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Currency handling and conversion strategy

## Context

The FIRE Planning Tool needed to support multiple currencies (USD and ILS) while maintaining:
- Precision in financial calculations
- Consistency across calculations
- Simple conversion logic
- User choice of display currency
- Reliable exchange rate handling

Challenges:
- Financial calculations require decimal precision
- Exchange rates change over time
- Users want to input/view in their preferred currency
- Backend calculations need consistent base currency
- Round-trip conversions must be accurate

## Decision

Adopt **USD as the internal base currency** for all calculations, with **display-time conversion** to user's preferred currency (USD or ILS).

### Architecture:

1. **Internal Calculations**: Always in USD
   - All backend services use USD
   - Portfolio values stored in USD
   - Monthly contributions converted to USD
   - Tax calculations in USD

2. **Display Conversion**: At UI layer
   - User selects display currency ($ or ₪)
   - Frontend converts for display only
   - Exchange rate: default 3.6 USD/ILS (user-configurable)

3. **Input Handling**:
   - User inputs include currency indicator
   - Convert to USD before sending to backend
   - Backend validates and processes in USD

4. **CurrencyConverter Service**:
   - Centralized conversion logic
   - `ConvertToUsd()` and `ConvertFromUsd()` methods
   - Configurable exchange rate

## Consequences

### Positive
- **Calculation Consistency**: All internal calculations use single currency
- **Precision Maintained**: Decimal type ensures accuracy
- **Simple Logic**: Single conversion point
- **Easy Testing**: Tests use USD, no conversion complexity
- **Flexible Display**: Users choose their preferred currency
- **Clear Separation**: Business logic in USD, display in user currency

### Negative
- **Exchange Rate Management**: Must handle rate updates
- **Conversion Overhead**: Additional conversion step at UI
- **Fixed Rate Limitation**: Uses single exchange rate (not historical rates)

### Neutral
- **USD-Centric**: Reflects common financial application pattern

## Alternatives Considered

### Alternative 1: Multi-Currency Throughout
**Description**: Support multiple currencies in calculations

**Pros**:
- No conversion needed
- Native currency support
- Historical exchange rates

**Cons**:
- Much more complex
- Currency-specific calculations
- Exchange rate history required
- Hard to test
- Inconsistent results

**Why not chosen**: Complexity far outweighs benefits for two-currency support.

### Alternative 2: ILS as Base Currency
**Description**: Use ILS internally instead of USD

**Pros**:
- Local currency for Hebrew users
- Aligned with target market

**Cons**:
- Stock prices typically in USD
- International standards use USD
- More conversions from external APIs
- Less common in financial software

**Why not chosen**: USD is more standard for financial calculations and stock prices.

### Alternative 3: Store Both USD and ILS
**Description**: Duplicate data in both currencies

**Pros**:
- Fast display (no conversion)
- No conversion errors

**Cons**:
- Data duplication
- Sync issues
- Storage overhead
- Inconsistency risk

**Why not chosen**: Violates DRY principle and risks data inconsistency.

## Implementation Notes

CurrencyConverter Service:

```csharp
public class CurrencyConverter : ICurrencyConverter
{
    private decimal _usdIlsRate = 3.6m;

    public decimal ConvertToUsd(decimal amount, string currency)
    {
        return currency.ToUpper() switch
        {
            "USD" or "$" => amount,
            "ILS" or "₪" => amount / _usdIlsRate,
            _ => throw new ArgumentException($"Unsupported currency: {currency}")
        };
    }

    public decimal ConvertFromUsd(decimal amountInUsd, string targetCurrency)
    {
        return targetCurrency.ToUpper() switch
        {
            "USD" or "$" => amountInUsd,
            "ILS" or "₪" => amountInUsd * _usdIlsRate,
            _ => throw new ArgumentException($"Unsupported currency: {targetCurrency}")
        };
    }

    public void UpdateExchangeRate(decimal newRate)
    {
        _usdIlsRate = newRate;
    }
}
```

Frontend Conversion:

```typescript
// State management
const state = {
    exchangeRates: { 
        usdToIls: 3.6, 
        ilsToUsd: 1/3.6 
    },
    displayCurrency: '$'
};

// Display conversion
function formatCurrency(amountInUsd: number): string {
    const amount = state.displayCurrency === '₪' 
        ? amountInUsd * state.exchangeRates.usdToIls 
        : amountInUsd;
    const symbol = state.displayCurrency;
    return `${symbol}${amount.toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
    })}`;
}
```

## References

- [CurrencyConverter.cs](../../src/Services/CurrencyConverter.cs)
- [CONTRIBUTING.md - Financial Calculations](../CONTRIBUTING.md)
