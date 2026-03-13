# ADR-006: Dependency Injection for Service Management

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Service lifecycle and dependency management

## Context

The FIRE Planning Tool has multiple services with complex dependencies:
- FireCalculator depends on multiple specialized calculators
- Specialized calculators depend on each other
- Services need access to configuration
- Controllers depend on multiple services
- Testing requires ability to mock dependencies

Without proper dependency management:
- Hard to test (tight coupling)
- Difficult to swap implementations
- Manual object creation everywhere
- Lifecycle management challenges
- Configuration distribution problems

## Decision

Use **ASP.NET Core's built-in Dependency Injection (DI) container** with constructor injection pattern for all services.

### Configuration in src/Program.cs:

```csharp
// Service registration
builder.Services.AddScoped<ICurrencyConverter, CurrencyConverter>();
builder.Services.AddScoped<IPortfolioCalculator, PortfolioCalculator>();
builder.Services.AddScoped<IRsuCalculator, RsuCalculator>();
builder.Services.AddScoped<IPortfolioGrowthCalculator, PortfolioGrowthCalculator>();
builder.Services.AddScoped<ITaxCalculator, TaxCalculator>();
builder.Services.AddScoped<IExpenseCalculator, ExpenseCalculator>();
builder.Services.AddScoped<IAccumulationPhaseCalculator, AccumulationPhaseCalculator>();
builder.Services.AddScoped<IRetirementPhaseCalculator, RetirementPhaseCalculator>();
builder.Services.AddScoped<IFireCalculator, FireCalculator>();
builder.Services.AddHttpClient<IAssetDataRepository, FinnhubAssetDataRepository>();
builder.Services.AddScoped<IFinnhubService, FinnhubService>();
```

### Service Lifetimes:

- **Scoped**: Per HTTP request (most services)
- **Transient**: New instance each time (strategies)
- **Singleton**: Single instance for app lifetime (factories)

## Consequences

### Positive
- **Testability**: Easy to mock dependencies
- **Loose Coupling**: Depend on abstractions not concretions
- **Lifecycle Management**: DI container manages object lifetimes
- **Configuration**: Options pattern for configuration injection
- **Maintainability**: Change implementations without modifying consumers
- **Best Practice**: Standard .NET pattern

### Negative
- **Indirection**: More interfaces to navigate
- **Magic**: DI resolution not always obvious
- **Runtime Errors**: Missing registrations fail at runtime

### Neutral
- **Built-in**: No third-party library needed

## Alternatives Considered

### Alternative 1: Manual Object Creation (new)
**Description**: Create objects with `new` keyword

**Pros**:
- Simple and direct
- No magic
- Compile-time safety

**Cons**:
- Hard to test
- Tight coupling
- Manual lifecycle management
- Configuration distribution problems

**Why not chosen**: Makes testing impossible and couples code tightly.

### Alternative 2: Service Locator Pattern
**Description**: Central registry to get services

**Pros**:
- Centralized service access
- Dynamic service resolution

**Cons**:
- Anti-pattern
- Hidden dependencies
- Hard to test
- Runtime failures

**Why not chosen**: Considered an anti-pattern. DI is superior.

### Alternative 3: Third-Party DI (Autofac, etc.)
**Description**: Use external DI container

**Pros**:
- More features
- More flexibility
- Advanced scenarios

**Cons**:
- Additional dependency
- More complexity
- Built-in DI sufficient

**Why not chosen**: Built-in DI meets all needs. No reason for additional complexity.

## Implementation Notes

Constructor injection pattern:

```csharp
public class FireCalculator : IFireCalculator
{
    private readonly IExpenseCalculator _expenseCalculator;
    private readonly ITaxCalculator _taxCalculator;
    private readonly IPortfolioGrowthCalculator _portfolioGrowthCalculator;

    public FireCalculator(
        IExpenseCalculator expenseCalculator,
        ITaxCalculator taxCalculator,
        IPortfolioGrowthCalculator portfolioGrowthCalculator)
    {
        _expenseCalculator = expenseCalculator;
        _taxCalculator = taxCalculator;
        _portfolioGrowthCalculator = portfolioGrowthCalculator;
    }
}
```

Testing with mocks:

```csharp
var taxCalcMock = new Mock<ITaxCalculator>();
var expenseCalcMock = new Mock<IExpenseCalculator>();
var portfolioCalcMock = new Mock<IPortfolioGrowthCalculator>();

var calculator = new FireCalculator(
    expenseCalcMock.Object,
    taxCalcMock.Object,
    portfolioCalcMock.Object);
```

## References

- [Program.cs](../../src/Program.cs)
- [Microsoft DI Documentation](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/dependency-injection)
- [ADR-007: Service Extraction](./ADR-007-service-extraction-orchestrator.md)
