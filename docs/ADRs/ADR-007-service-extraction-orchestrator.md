# ADR-007: Service Extraction and Orchestrator Pattern

**Status**: Accepted

**Date**: 2025-12

**Deciders**: Development Team, Senior Architect

## Context

The original `FireCalculator` class had grown to 533 lines and violated the Single Responsibility Principle (SRP). It handled:
- Portfolio value calculations
- Tax calculations (profit ratio, capital gains)
- Expense planning and inflation adjustments
- Accumulation phase simulation
- Retirement phase simulation
- Weighted return calculations
- Age-based allocation generation

This monolithic structure made the code:
- Difficult to test in isolation
- Hard to maintain and modify
- Complex to understand and reason about
- Challenging to extend with new features
- Prone to bugs due to tight coupling

The refactoring needed to preserve backward compatibility while improving maintainability and testability.

## Decision

Refactor `FireCalculator` from a monolithic God class into an **Orchestrator Pattern** with focused, single-responsibility services.

### New Service Architecture:

1. **ExpenseCalculator** (77 lines)
   - Responsibility: Planned expense calculations and inflation adjustments
   - Methods: `GetExpensesForYear()`, `CalculateYearExpenses()`, `CalculateGrossExpense()`

2. **TaxCalculator** (68 lines)
   - Responsibility: All tax-related calculations
   - Methods: `CalculateProfitRatio()`, `CalculateEffectiveTaxRate()`, `CalculateWithdrawalTax()`, `CalculateRetirementTax()`, `UpdateCostBasisAfterWithdrawal()`

3. **PortfolioGrowthCalculator** (152 lines)
   - Responsibility: Portfolio growth, returns, and allocation calculations
   - Methods: `CalculateWeightedReturn()`, `CalculateAllocationWeightedReturn()`, `GenerateAgeBasedAllocation()`, `CalculatePortfolioValue()`, `CalculatePortfolioCostBasis()`, `CalculatePortfolioProfitRatio()`

4. **AccumulationPhaseCalculator** (129 lines)
   - Responsibility: Accumulation phase simulation
   - Delegates to: ExpenseCalculator

5. **RetirementPhaseCalculator** (184 lines)
   - Responsibility: Retirement phase simulation
   - Delegates to: ExpenseCalculator, TaxCalculator

6. **FireCalculator (Refactored)** (287 lines, down from 533)
   - Role: Orchestrator
   - Responsibilities: Coordinate calculations, setup/initialization, RSU timeline, result aggregation
   - Maintains public API for backward compatibility

## Consequences

### Positive
- **Single Responsibility Principle**: Each service has one clear purpose
- **46% Size Reduction**: FireCalculator reduced from 533 to 287 lines
- **Improved Testability**: Services can be tested in isolation with 36 new unit tests
- **Better Maintainability**: Changes isolated to specific domains
- **Easier to Understand**: Smaller, focused classes are easier to comprehend
- **Extensibility**: New features can be added to specific services
- **Backward Compatible**: Public API unchanged
- **Dependency Injection**: All services properly registered in DI container

### Negative
- **More Files**: 5 new service files to manage
- **Increased Indirection**: Method calls go through orchestrator
- **Initial Learning Curve**: Developers need to understand service boundaries

### Neutral
- **Interface-Based Design**: Can swap implementations if needed
- **Standard Pattern**: Well-known orchestrator pattern

## Alternatives Considered

### Alternative 1: Keep Monolithic Structure
**Description**: Leave FireCalculator as a single large class

**Pros**:
- No refactoring effort
- All logic in one place
- Simpler navigation

**Cons**:
- Continues to violate SRP
- Testing requires mocking entire calculator
- Hard to maintain and extend
- High complexity score
- Tight coupling

**Why not chosen**: Technical debt would continue to grow, making future changes increasingly difficult.

### Alternative 2: Split into Static Utility Classes
**Description**: Move methods to static utility classes

**Pros**:
- Simple to implement
- No dependency injection needed
- Easy to call from anywhere

**Cons**:
- Harder to test (static methods)
- No dependency injection benefits
- Less flexible
- Can't mock for testing
- Not object-oriented

**Why not chosen**: Static methods are harder to test and don't support dependency injection, which is core to the application architecture.

### Alternative 3: Microservices
**Description**: Split into separate service processes

**Pros**:
- Maximum isolation
- Independent deployment
- Can scale individually

**Cons**:
- Massive complexity increase
- Network latency between services
- Distributed system challenges
- Overkill for calculation logic
- Deployment complexity

**Why not chosen**: Far too complex for calculation logic that runs in-process. Microservices solve distribution problems we don't have.

### Alternative 4: Complete Domain-Driven Design Refactor
**Description**: Full DDD with aggregates, value objects, domain events

**Pros**:
- Maximum domain modeling
- Very testable
- Clear ubiquitous language

**Cons**:
- Significant refactoring effort
- More abstractions needed
- Potential over-engineering
- Breaking changes likely

**Why not chosen**: While DDD is excellent, the orchestrator pattern achieves the immediate goals (SRP, testability) with less disruption and maintains backward compatibility.

## Implementation Notes

Dependency injection registration in `src/Program.cs`:

```csharp
builder.Services.AddScoped<IExpenseCalculator, ExpenseCalculator>();
builder.Services.AddScoped<ITaxCalculator, TaxCalculator>();
builder.Services.AddScoped<IPortfolioGrowthCalculator, PortfolioGrowthCalculator>();
builder.Services.AddScoped<IAccumulationPhaseCalculator, AccumulationPhaseCalculator>();
builder.Services.AddScoped<IRetirementPhaseCalculator, RetirementPhaseCalculator>();
builder.Services.AddScoped<IFireCalculator, FireCalculator>();
```

FireCalculator orchestration example:

```csharp
public class FireCalculator : IFireCalculator
{
    private readonly IExpenseCalculator _expenseCalculator;
    private readonly ITaxCalculator _taxCalculator;
    private readonly IPortfolioGrowthCalculator _portfolioGrowthCalculator;
    private readonly IAccumulationPhaseCalculator _accumulationPhaseCalculator;
    private readonly IRetirementPhaseCalculator _retirementPhaseCalculator;

    public FireCalculationResult Calculate(FirePlanInput input)
    {
        // Orchestrate calculations across services
        var portfolioValue = _portfolioGrowthCalculator.CalculatePortfolioValue(...);
        var accumulationResult = _accumulationPhaseCalculator.Calculate(...);
        var retirementResult = _retirementPhaseCalculator.Calculate(...);
        
        return AggregateResults(...);
    }
}
```

Test coverage:
- ExpenseCalculatorTests: 9 tests
- TaxCalculatorTests: 14 tests
- PortfolioGrowthCalculatorTests: 13 tests
- Total: 36 new unit tests (all passing)

## References

- [Orchestrator Pattern](https://www.martinfowler.com/eaaCatalog/serviceLayer.html)
- [Single Responsibility Principle](https://en.wikipedia.org/wiki/Single-responsibility_principle)
- [DDD Guidelines](.github/instructions/dotnet-architecture-good-practices.instructions.md)
