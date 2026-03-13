# ADR-020: Domain-Driven Design Principles

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Architecture Team

**Technical Story**: [DDD Guidelines](.github/instructions/dotnet-architecture-good-practices.instructions.md)

## Context

The FIRE Planning Tool required an approach to model complex financial domain concepts like:
- Portfolio management across multiple phases (accumulation, retirement)
- Tax calculations with varying rules
- Expense tracking with inflation
- Multi-currency handling
- RSU timeline projections

The domain complexity required:
- Clear business terminology throughout the codebase
- Separation of domain logic from infrastructure concerns
- Testable business rules
- Maintainable code that evolves with business requirements
- Consistency boundaries for financial calculations

## Decision

Apply **Domain-Driven Design (DDD) principles** and **SOLID principles** to structure the application, with particular focus on:

### DDD Principles Applied:

1. **Ubiquitous Language**
   - Use consistent financial terminology across code and documentation
   - Terms: Portfolio, Asset, Accumulation, Retirement, FIRE, CAGR, SWR
   - Avoid technical jargon in domain models

2. **Layered Architecture**
   - Domain Layer: Models (FirePlanInput, PortfolioAsset, PlannedExpense)
   - Application Layer: Services (FireCalculator, PortfolioCalculator)
   - Infrastructure Layer: Repositories (FinnhubAssetDataRepository)
   - Presentation Layer: Controllers, Frontend

3. **Service-Oriented Design**
   - Domain services for complex operations spanning multiple entities
   - Application services for use case orchestration
   - Infrastructure services for external integration

4. **Bounded Contexts**
   - Portfolio Management context
   - Tax Calculation context
   - Expense Planning context
   - External Data Integration context

### SOLID Principles Enforced:

1. **Single Responsibility Principle (SRP)**
   - Each service has one clear purpose
   - ExpenseCalculator only handles expenses
   - TaxCalculator only handles taxes

2. **Open/Closed Principle (OCP)**
   - Strategy pattern for return calculations
   - Can add new strategies without modifying existing code

3. **Liskov Substitution Principle (LSP)**
   - All IReturnCalculationStrategy implementations are substitutable

4. **Interface Segregation Principle (ISP)**
   - Focused interfaces (IExpenseCalculator, ITaxCalculator)
   - No client forced to depend on unused methods

5. **Dependency Inversion Principle (DIP)**
   - Depend on abstractions (interfaces) not concretions
   - All services injected via interfaces

### Mandatory Process (from instructions):

Before any implementation, developers must:
1. **Show Analysis**: Explain DDD patterns, SOLID principles, affected layers
2. **Review Against Guidelines**: Check aggregate boundaries, SRP adherence, domain rules encapsulation
3. **Validate Implementation Plan**: State which aggregates/entities modified, tests needed

## Consequences

### Positive
- **Clear Domain Model**: Business concepts clearly represented in code
- **Testability**: Domain logic isolated and easily tested
- **Maintainability**: Changes to domain rules localized to specific services
- **Extensibility**: New features fit into existing structure
- **Team Communication**: Shared language between developers and domain experts
- **Quality Enforcement**: Mandatory thinking process prevents shortcuts
- **Consistent Patterns**: SOLID principles applied uniformly

### Negative
- **Learning Curve**: Team needs to understand DDD and SOLID principles
- **More Abstractions**: More interfaces and indirection
- **Development Time**: Upfront design thinking required
- **Potential Over-Engineering**: Risk of too much abstraction for simple features

### Neutral
- **Opinionated Structure**: Clear patterns reduce decision paralysis
- **Documentation Required**: Domain decisions must be documented

## Alternatives Considered

### Alternative 1: Transaction Script Pattern
**Description**: Simple procedures that handle each request

**Pros**:
- Simpler to understand initially
- Less code
- Faster initial development

**Cons**:
- Domain logic scattered across procedures
- Hard to maintain as complexity grows
- Difficult to test business rules in isolation
- No clear domain model

**Why not chosen**: Financial applications grow complex quickly. Transaction scripts become unmaintainable as business rules accumulate.

### Alternative 2: Anemic Domain Model
**Description**: Domain objects as data containers, logic in services

**Pros**:
- Simpler than full DDD
- Easy to understand structure

**Cons**:
- Violates encapsulation
- Business logic scattered
- Hard to ensure invariants
- Not true domain modeling

**Why not chosen**: Loses benefits of rich domain models. Business rules should be close to the data they operate on.

### Alternative 3: Event Sourcing with CQRS
**Description**: Full event sourcing with command/query separation

**Pros**:
- Complete audit trail
- Time travel through history
- Optimized read/write models

**Cons**:
- Significant complexity
- Eventual consistency challenges
- More infrastructure required
- Overkill for this application

**Why not chosen**: While event sourcing has benefits, the complexity isn't justified. The current approach provides audit trails through yearlyData without the overhead.

### Alternative 4: Pure Functional Domain Model
**Description**: Immutable domain objects, pure functions

**Pros**:
- No side effects
- Easy to reason about
- Highly testable

**Cons**:
- Not idiomatic in C#
- Harder for team to adopt
- More verbose in C#
- Loses OOP benefits

**Why not chosen**: While functional programming has merits, C# and .NET are object-oriented. Working with the language strengths is more pragmatic.

## Implementation Notes

Domain models (from `FirePlanModels.cs`):

```csharp
// Rich domain model with business concepts
public class FirePlanInput
{
    public int BirthYear { get; set; }
    public int EarlyRetirementYear { get; set; }
    public decimal MonthlyContribution { get; set; }
    public decimal WithdrawalRate { get; set; }  // e.g., 4% rule
    public List<PortfolioAsset> AccumulationPortfolio { get; set; }
    public List<PlannedExpense> Expenses { get; set; }
}

public class PortfolioAsset
{
    public string Symbol { get; set; }
    public decimal Quantity { get; set; }
    public decimal CurrentPrice { get; set; }
    public decimal AverageCostPerShare { get; set; }
    // Domain method names match ubiquitous language
}
```

Service structure (following SRP):

```csharp
// Each service has single responsibility
public interface IExpenseCalculator
{
    List<PlannedExpense> GetExpensesForYear(int year, List<PlannedExpense> expenses);
    decimal CalculateYearExpenses(int year, List<PlannedExpense> expenses, decimal inflationRate);
}

public interface ITaxCalculator
{
    decimal CalculateProfitRatio(decimal portfolio, decimal taxBasis);
    decimal CalculateEffectiveTaxRate(decimal profitRatio, decimal capitalGainsTax);
}
```

Mandatory validation checklist (from instructions):
- [ ] Domain concepts clearly identified
- [ ] Aggregate boundaries defined
- [ ] Ubiquitous language used consistently
- [ ] SOLID principles followed
- [ ] Tests follow `MethodName_Condition_ExpectedResult()` pattern
- [ ] Security and compliance addressed
- [ ] Performance considered

## References

- [DDD Instructions](.github/instructions/dotnet-architecture-good-practices.instructions.md)
- [Domain-Driven Design (Eric Evans)](https://domainlanguage.com/ddd/)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [FirePlanModels.cs](../../src/Models/FirePlanModels.cs)
- [Service Extraction ADR](./ADR-007-service-extraction-orchestrator.md)
