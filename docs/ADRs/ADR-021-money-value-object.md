# ADR-021: Money Value Object for Type-Safe Currency Handling

**Status**: Accepted

**Date**: 2025-01-26

**Deciders**: Development Team

**Technical Story**: Currency handling review identified 7 potential currency mixing bugs

## Context

The FIRE Planning Tool handles monetary calculations in two currencies:
- **USD ($)** - Base currency for portfolio calculations and API
- **ILS (₪)** - Israeli Shekel for local expenses, taxes, and display

The original implementation used `decimal` (C#) / `number` (TypeScript) for monetary amounts with separate `string currency` fields. This approach had several risks:

1. **No compile-time safety** - Nothing prevents adding USD and ILS values directly
2. **Manual conversion burden** - Developers must remember to call `CurrencyConverter`
3. **Silent bugs** - Currency mixing produces incorrect results without errors
4. **Testing gaps** - Tests must verify both amount AND currency separately

A currency handling review identified 7 locations where currency mixing could occur:
- PortfolioGrowthCalculator (2 bugs)
- RsuCalculator (2 bugs)
- ExpenseCalculator (1 bug)
- RetirementPhaseCalculator (1 bug)
- AccumulationPhaseCalculator (1 bug)

## Decision

Implement the **Money Value Object pattern** across both backend and frontend:

### Backend (C#)

```csharp
public readonly struct Money : IEquatable<Money>, IComparable<Money>
{
    public decimal Amount { get; }
    public string Currency { get; }  // ISO 4217 code

    public static Money Usd(decimal amount) => new Money(amount, "USD");
    public static Money Ils(decimal amount) => new Money(amount, "ILS");

    public Money ConvertTo(string targetCurrency, ICurrencyConverter converter);

    // Arithmetic operators throw if currencies don't match
    public static Money operator +(Money a, Money b);
    public static Money operator -(Money a, Money b);
    public static Money operator *(Money money, decimal multiplier);
    public static Money operator /(Money money, decimal divisor);
}
```

### Frontend (TypeScript)

```typescript
interface Money {
    readonly amount: number;
    readonly currency: CurrencyCode;  // 'USD' | 'ILS'
}

const Money = {
    usd(amount: number): Money;
    ils(amount: number): Money;
    create(amount: number, currency: Currency): Money;
};

const MoneyMath = {
    add(a: Money, b: Money): Money;      // Throws if currencies differ
    subtract(a: Money, b: Money): Money;
    multiply(money: Money, multiplier: number): Money;
    divide(money: Money, divisor: number): Money;
};
```

### Key Design Decisions

1. **Immutable value object** - All operations return new instances
2. **Runtime enforcement** - Arithmetic throws `InvalidOperationException`/`Error` on currency mismatch
3. **ISO 4217 codes internally** - Normalized storage, symbols for display only
4. **Explicit conversion required** - `ConvertTo()` method with converter parameter
5. **Backward compatible** - Legacy decimal + currency fields preserved for JSON API
6. **Extensible currency registry** - New currencies via `SupportedCurrencies.Register()`

## Consequences

### Positive

- **Eliminates currency mixing bugs** - Runtime errors with clear messages
- **Self-documenting code** - `Money.Usd(100)` clearer than `100m` + `"USD"`
- **Extensible** - Adding EUR/GBP requires only registry update
- **Better domain modeling** - Follows DDD value object pattern
- **Improved testability** - Money comparisons are atomic
- **Catches bugs early** - Fails fast on currency mismatch

### Negative

- **More verbose** - `Money.Usd(100)` vs `100m`
- **Runtime vs compile-time** - TypeScript can't enforce at compile time
- **Learning curve** - Team must learn new pattern
- **Test migration effort** - All tests updated to use Money factories

### Neutral

- **JSON serialization unchanged** - API contracts use legacy format
- **Performance neutral** - Struct in C#, object in TypeScript
- **Dual fields in models** - Both legacy and Money fields coexist

## Alternatives Considered

### Alternative 1: Targeted Improvements Only

**Description**: Add currency constants, validation attributes, and helper methods without Money type.

**Pros**:
- Minimal code changes
- No breaking changes
- Quick to implement (2 days)

**Cons**:
- Doesn't prevent currency mixing
- No compile-time/runtime safety
- Bugs still possible

**Why not chosen**: Doesn't address the core problem of currency mixing.

### Alternative 2: Strongly-Typed Currency Classes

**Description**: Separate `Usd` and `Ils` classes with no mixing allowed.

```csharp
public class Usd { public decimal Amount { get; } }
public class Ils { public decimal Amount { get; } }
// No + operator between Usd and Ils
```

**Pros**:
- Compile-time enforcement in C#
- Cannot mix currencies at all

**Cons**:
- Very verbose for multi-currency operations
- Difficult to add new currencies
- Poor ergonomics for conversion logic

**Why not chosen**: Too rigid for a multi-currency application.

### Alternative 3: Units of Measure (F# style)

**Description**: Use units of measure annotations.

**Pros**:
- Compile-time safety
- Zero runtime overhead

**Cons**:
- Not available in C# or TypeScript
- Would require language change

**Why not chosen**: Not supported by our technology stack.

## Implementation Notes

### Migration Strategy

The migration was completed in 7 phases:

1. **Phase 1-3**: Backend foundation (Money struct, registry, service refactoring)
2. **Phase 4**: Test fixes for currency comparisons
3. **Phase 5**: Frontend Money type implementation
4. **Phase 6**: Component updates for Money field sync
5. **Phase 7**: Full migration with model updates

### Backward Compatibility

Models maintain dual fields:

```csharp
public class PortfolioAsset
{
    // Legacy (JSON serialization)
    public decimal CurrentPrice { get; set; }
    public string Currency { get; set; }

    // Money typed (internal use)
    [JsonIgnore]
    public Money CurrentPriceTyped { get; set; }
}
```

Sync functions keep both in sync automatically.

### Adding New Currencies

```csharp
// Backend
SupportedCurrencies.Register("EUR", "€");

// Frontend
// Update CurrencyCode type and SYMBOL_TO_CODE mapping
```

## References

- [Martin Fowler - Money Pattern](https://martinfowler.com/eaaCatalog/money.html)
- [ADR-013: USD as Base Currency](./ADR-013-usd-base-currency.md)
