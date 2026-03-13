# ADR-008: Strategy Pattern for Portfolio Calculations

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Multiple calculation methods for portfolio returns

## Context

The portfolio management feature needed to support multiple methods for calculating expected returns:

1. **CAGR (Compound Annual Growth Rate)**: Historical performance-based
2. **Total Growth**: User-specified total growth over period
3. **Target Price**: User-specified target price for asset
4. **Fixed Return**: Simple fixed percentage return

Each method requires different:
- Input parameters
- Calculation logic
- Validation rules
- Error handling

Initially, this was handled with switch statements throughout the code, leading to:
- Duplicated conditional logic
- Hard to add new methods
- Difficult to test in isolation
- Violation of Open/Closed Principle

## Decision

Implement the **Strategy Pattern** with dedicated strategy classes for each calculation method, managed by a factory.

### Architecture:

1. **IReturnCalculationStrategy** Interface:
   ```csharp
   public interface IReturnCalculationStrategy
   {
       string MethodName { get; }
       decimal CalculateAnnualReturn(PortfolioAsset asset, int years);
       bool CanHandle(string method);
   }
   ```

2. **Concrete Strategies**:
   - `CagrReturnStrategy` - Historical CAGR calculation
   - `TotalGrowthReturnStrategy` - Total growth percentage
   - `TargetPriceReturnStrategy` - Target price calculation
   - `FixedReturnStrategy` - Fixed percentage return

3. **IReturnCalculationStrategyFactory**:
   - Returns appropriate strategy for method
   - Registered strategies from DI container

4. **Registration** (src/Program.cs):
   ```csharp
   foreach (var strategyType in CalculationConstants.GetReturnCalculationStrategyTypes())
   {
       builder.Services.AddSingleton(typeof(IReturnCalculationStrategy), strategyType);
   }
   builder.Services.AddSingleton<IReturnCalculationStrategyFactory, ReturnCalculationStrategyFactory>();
   ```

## Consequences

### Positive
- **Open/Closed Principle**: Can add new strategies without modifying existing code
- **Single Responsibility**: Each strategy handles one calculation method
- **Testability**: Each strategy can be tested in isolation
- **Maintainability**: Changes to one method don't affect others
- **Flexibility**: Easy to add new calculation methods
- **Clean Code**: No large switch statements

### Negative
- **More Classes**: One class per strategy
- **Indirection**: Factory layer adds complexity

### Neutral
- **Standard Pattern**: Well-known Gang of Four pattern

## Alternatives Considered

### Alternative 1: Switch Statement
**Description**: Single method with switch on calculation type

**Pros**:
- All logic in one place
- Simple to understand initially
- Fewer files

**Cons**:
- Violates Open/Closed Principle
- Hard to test specific methods
- Duplicated conditional logic
- Gets unwieldy with more methods

**Why not chosen**: Doesn't scale as new methods are added. Violates SOLID principles.

### Alternative 2: Separate Methods
**Description**: Different methods for each calculation type

**Pros**:
- Clear method names
- No switch statement

**Cons**:
- Caller needs to know which method to call
- Still conditional logic at call site
- Hard to extend

**Why not chosen**: Pushes complexity to callers. Strategy pattern is cleaner.

### Alternative 3: Inheritance Hierarchy
**Description**: Base calculator class with overrides

**Pros**:
- Polymorphism
- Share common code

**Cons**:
- Tight coupling via inheritance
- "Is-a" relationship not appropriate
- Hard to compose

**Why not chosen**: Composition (Strategy) is more flexible than inheritance.

## Implementation Notes

Strategy interface:

```csharp
public interface IReturnCalculationStrategy
{
    string MethodName { get; }
    decimal CalculateAnnualReturn(PortfolioAsset asset, int years);
    bool CanHandle(string method);
}
```

Example strategy:

```csharp
public class CagrReturnStrategy : IReturnCalculationStrategy
{
    public string MethodName => "CAGR";

    public decimal CalculateAnnualReturn(PortfolioAsset asset, int years)
    {
        if (asset.Value1 == 0 || years <= 0)
            return 0;

        return (decimal)(Math.Pow((double)asset.Value1, 1.0 / years) - 1) * 100;
    }

    public bool CanHandle(string method)
    {
        return method?.Equals("CAGR", StringComparison.OrdinalIgnoreCase) == true;
    }
}
```

Factory usage:

```csharp
public class PortfolioGrowthCalculator
{
    private readonly IReturnCalculationStrategyFactory _strategyFactory;

    public decimal CalculateWeightedReturn(List<PortfolioAsset> portfolio, int years)
    {
        decimal totalValue = 0;
        decimal weightedReturn = 0;

        foreach (var asset in portfolio)
        {
            var strategy = _strategyFactory.GetStrategy(asset.Method);
            var assetReturn = strategy.CalculateAnnualReturn(asset, years);
            
            decimal assetValue = asset.Quantity * asset.CurrentPrice;
            totalValue += assetValue;
            weightedReturn += assetValue * assetReturn;
        }

        return totalValue > 0 ? weightedReturn / totalValue : 0;
    }
}
```

Adding new strategy:

```csharp
// 1. Create new strategy class
public class NewCalculationStrategy : IReturnCalculationStrategy
{
    public string MethodName => "NewMethod";
    public decimal CalculateAnnualReturn(PortfolioAsset asset, int years) { /* ... */ }
    public bool CanHandle(string method) { /* ... */ }
}

// 2. Register in CalculationConstants
public static Type[] GetReturnCalculationStrategyTypes() => new[]
{
    typeof(CagrReturnStrategy),
    typeof(TotalGrowthReturnStrategy),
    typeof(TargetPriceReturnStrategy),
    typeof(FixedReturnStrategy),
    typeof(NewCalculationStrategy)  // Add here
};

// That's it! No changes to existing code required.
```

## References

- [Strategy Pattern (Gang of Four)](https://en.wikipedia.org/wiki/Strategy_pattern)
- [IReturnCalculationStrategy.cs](../../src/Services/Strategies/IReturnCalculationStrategy.cs)
- [ReturnCalculationStrategyFactory.cs](../../src/Services/Strategies/ReturnCalculationStrategyFactory.cs)
- [CalculationConstants.cs](../../src/Services/CalculationConstants.cs)
- [Program.cs](../../src/Program.cs)
