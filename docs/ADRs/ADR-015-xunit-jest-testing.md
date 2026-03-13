# ADR-015: xUnit and Jest for Testing

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: Test framework selection for backend and frontend

## Context

The FIRE Planning Tool required comprehensive testing for:
- Complex financial calculations (portfolio growth, tax calculations)
- API endpoints and controllers
- Service layer business logic
- Frontend TypeScript modules
- Integration with external APIs

The testing strategy needed to support:
- Unit testing for isolated components
- Integration testing for API endpoints
- Frontend component testing
- High code coverage (target: 80%+)
- Fast test execution for rapid feedback
- CI/CD integration for automated testing

## Decision

Adopt **xUnit** for backend C# testing and **Jest** for frontend JavaScript/TypeScript testing.

### Backend: xUnit + FluentAssertions

**Framework**: xUnit.net (latest version)
**Assertion Library**: FluentAssertions
**Test Project**: FirePlanningTool.Tests

**Key Features**:
- `[Fact]` for simple test methods
- `[Theory]` with `[InlineData]` for parameterized tests
- `IClassFixture<T>` for shared test context
- Parallel test execution by default
- Constructor/Dispose for setup/teardown

**Test Organization**:
```
FirePlanningTool.Tests/
├── API/                    # Controller integration tests
├── Calculations/           # Calculation logic tests
├── Services/               # Service method tests
├── Portfolio/              # Portfolio calculation tests
├── Taxes/                  # Tax calculation tests
├── Expenses/               # Expense calculation tests
└── Fixtures/               # Test data builders
```

### Frontend: Jest

**Framework**: Jest (with ts-jest for TypeScript)
**Configuration**: jest.config.json
**Coverage**: Built-in coverage reporting

**Key Features**:
- TypeScript support via ts-jest
- Snapshot testing for component output
- Mock functions and modules
- Coverage reports
- Fast execution

## Consequences

### Positive
- **Backend (xUnit)**:
  - Modern, actively maintained framework
  - Excellent .NET integration
  - Parallel execution speeds up tests
  - FluentAssertions provides readable assertions
  - Strong community and documentation
  - Built into .NET CLI (`dotnet test`)

- **Frontend (Jest)**:
  - Industry standard for JavaScript testing
  - Excellent TypeScript support
  - Built-in mocking and coverage
  - Fast test execution
  - Snapshot testing for output validation
  - Good developer experience

- **Overall**:
  - High test coverage achieved (82.99% line, 69.84% branch)
  - 357 tests passing consistently
  - Fast feedback loop
  - CI/CD integration works smoothly

### Negative
- **Learning Curve**: Two different frameworks to learn
- **Different Syntax**: xUnit vs Jest syntax differences
- **Maintenance**: Must maintain test infrastructure for both

### Neutral
- **Standard Tools**: Both are industry-standard choices
- **Good Ecosystem**: Extensive plugins and extensions available

## Alternatives Considered

### Backend Alternatives

#### Alternative 1: NUnit
**Description**: Popular .NET testing framework

**Pros**:
- Large user base
- Mature framework
- Good tooling support

**Cons**:
- Less modern than xUnit
- Older design patterns
- Not parallel by default
- More verbose syntax

**Why not chosen**: xUnit has better modern .NET integration and simpler syntax.

#### Alternative 2: MSTest
**Description**: Microsoft's testing framework

**Pros**:
- Microsoft official
- Built into Visual Studio
- Good integration

**Cons**:
- Less flexible than xUnit
- Smaller community
- Fewer features
- Less extensible

**Why not chosen**: xUnit provides more features and better developer experience.

### Frontend Alternatives

#### Alternative 1: Mocha + Chai
**Description**: Mocha test framework with Chai assertions

**Pros**:
- Flexible
- Well-established
- Many plugins

**Cons**:
- More setup required
- Separate assertion library
- Slower than Jest
- More configuration

**Why not chosen**: Jest provides better out-of-box experience with less configuration.

#### Alternative 2: Jasmine
**Description**: Behavior-driven testing framework

**Pros**:
- No dependencies
- All-in-one framework
- Good documentation

**Cons**:
- Less popular than Jest
- Slower execution
- Fewer features
- Less TypeScript support

**Why not chosen**: Jest has better TypeScript support and performance.

#### Alternative 3: Vitest
**Description**: Next-generation testing framework

**Pros**:
- Very fast (Vite-powered)
- Jest-compatible API
- Modern architecture

**Cons**:
- Relatively new
- Smaller ecosystem
- May have stability issues

**Why not chosen**: While promising, Jest is more mature and stable for production use.

## Implementation Notes

### Backend Test Example (xUnit + FluentAssertions):

```csharp
public class FireCalculatorTests
{
    private readonly IFireCalculator _calculator;
    
    public FireCalculatorTests()
    {
        _calculator = new FireCalculator(/* inject dependencies */);
    }

    [Fact]
    public void Calculate_WithValidInput_ReturnsExpectedResult()
    {
        // Arrange
        var input = new FirePlanInput { /* ... */ };

        // Act
        var result = _calculator.Calculate(input);

        // Assert
        result.Should().NotBeNull();
        result.PeakValue.Should().BeGreaterThan(0);
    }

    [Theory]
    [InlineData(100000, 10000, 1000000)]
    [InlineData(50000, 5000, 500000)]
    public void Calculate_WithVariousInputs_ProducesExpectedRange(
        decimal initial, decimal monthly, decimal expected)
    {
        // Test implementation
    }
}
```

### Frontend Test Example (Jest):

```typescript
import { calculatePortfolioValue } from './calculator';

describe('Portfolio Calculator', () => {
  test('calculates total portfolio value correctly', () => {
    const assets = [
      { quantity: 10, currentPrice: 100 },
      { quantity: 5, currentPrice: 200 }
    ];

    const total = calculatePortfolioValue(assets);

    expect(total).toBe(2000);
  });

  test('handles empty portfolio', () => {
    expect(calculatePortfolioValue([])).toBe(0);
  });
});
```

### Test Naming Convention:

Backend: `MethodName_Condition_ExpectedResult()`
```csharp
Calculate_WithNegativeContribution_ThrowsValidationException()
GetStockPrice_WhenCached_ReturnsCachedValue()
```

Frontend: Descriptive test names in plain English
```typescript
test('calculates portfolio value correctly')
test('handles empty portfolio gracefully')
```

### Running Tests:

```bash
# Backend tests
dotnet test fire.sln
dotnet test fire.sln /p:CollectCoverage=true

# Frontend tests
npm test
npm run test:coverage

# All tests (via Makefile)
make test
make test-coverage
```

### CI/CD Integration:

Tests run automatically on:
- Every push to any branch
- Pull request creation/update
- Pre-merge validation

Coverage reports uploaded to Codecov for tracking trends.

## References

- [xUnit Documentation](https://xunit.net/)
- [FluentAssertions Documentation](https://fluentassertions.com/)
- [Jest Documentation](https://jestjs.io/)
- [TESTING.md](../TESTING.md)
- [Test Coverage Report](../TEST_COVERAGE_REPORT.md)
- [jest.config.json](../../jest.config.json)
