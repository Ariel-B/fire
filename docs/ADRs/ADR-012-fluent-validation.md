# ADR-012: FluentValidation for Input Validation

**Status**: Accepted

**Date**: 2024-11

**Deciders**: Development Team

**Technical Story**: API input validation and error handling

## Context

The API endpoints needed robust input validation for:
- Financial calculation parameters
- Portfolio assets and allocations
- Planned expenses
- User configuration
- External API symbols

Requirements:
- Validate complex business rules
- Clear, user-friendly error messages
- Maintainable validation code
- Integration with ASP.NET Core
- Testable validation logic

Data annotations alone were insufficient for:
- Cross-property validation
- Complex business rules
- Custom validation messages
- Conditional validation

## Decision

Adopt **FluentValidation** library integrated with ASP.NET Core for declarative, maintainable input validation.

### Configuration:

```csharp
// src/Program.cs
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

builder.Services.AddControllers()
    .ConfigureApiBehaviorOptions(options =>
    {
        options.InvalidModelStateResponseFactory = context =>
        {
            var errors = string.Join("; ", context.ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage));
            
            return new BadRequestObjectResult(new ApiErrorResponse(errors));
        };
    });
```

### Example Validator:

```csharp
public class FirePlanInputValidator : AbstractValidator<FirePlanInput>
{
    public FirePlanInputValidator()
    {
        RuleFor(x => x.BirthYear)
            .InclusiveBetween(1900, DateTime.Now.Year)
            .WithMessage("Birth year must be between 1900 and current year");

        RuleFor(x => x.EarlyRetirementYear)
            .GreaterThan(x => x.BirthYear + 18)
            .WithMessage("Retirement year must be at least 18 years after birth year");

        RuleFor(x => x.MonthlyContribution)
            .GreaterThanOrEqualTo(0)
            .WithMessage("Monthly contribution cannot be negative");

        RuleFor(x => x.WithdrawalRate)
            .InclusiveBetween(0, 100)
            .WithMessage("Withdrawal rate must be between 0 and 100");
    }
}
```

## Consequences

### Positive
- **Clear Validation Rules**: Declarative, easy to read
- **Reusable**: Validators can be unit tested independently
- **Complex Rules**: Supports cross-property and conditional validation
- **Better Error Messages**: Custom, user-friendly messages
- **Separation of Concerns**: Validation logic separate from controllers
- **Testable**: Can test validators in isolation
- **Integration**: Works seamlessly with ASP.NET Core

### Negative
- **Additional Dependency**: NuGet package required
- **Learning Curve**: Team needs to learn FluentValidation syntax

### Neutral
- **Industry Standard**: Widely used in .NET ecosystem

## Alternatives Considered

### Alternative 1: Data Annotations Only
**Description**: Use built-in [Required], [Range], etc.

**Pros**:
- Built into .NET
- Simple for basic validation
- No additional dependencies

**Cons**:
- Limited to property-level validation
- Complex rules require custom attributes
- Hard to test
- Validation mixed with models

**Why not chosen**: Insufficient for complex financial validation rules.

### Alternative 2: Manual Validation in Controllers
**Description**: Validate in each controller action

**Pros**:
- Full control
- No framework needed

**Cons**:
- Code duplication
- Hard to maintain
- Inconsistent validation
- Mixed responsibilities

**Why not chosen**: Violates DRY and SRP principles.

### Alternative 3: Custom Validation Framework
**Description**: Build custom validation library

**Pros**:
- Complete control
- Tailored to needs

**Cons**:
- Significant development effort
- Maintenance burden
- Reinventing the wheel

**Why not chosen**: FluentValidation already solves the problem well.

## Implementation Notes

Validator registration is automatic:

```csharp
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
```

Complex validation example:

```csharp
public class PortfolioAssetValidator : AbstractValidator<PortfolioAsset>
{
    public PortfolioAssetValidator()
    {
        RuleFor(x => x.Symbol)
            .NotEmpty()
            .Matches(@"^[A-Za-z0-9.\-]+$")
            .WithMessage("Symbol must contain only letters, numbers, dots, and hyphens");

        RuleFor(x => x.Quantity)
            .GreaterThan(0)
            .WithMessage("Quantity must be greater than zero");

        RuleFor(x => x.CurrentPrice)
            .GreaterThan(0)
            .WithMessage("Current price must be greater than zero");

        // Conditional validation
        When(x => x.Method == "Target Price", () =>
        {
            RuleFor(x => x.Value1)
                .GreaterThan(0)
                .WithMessage("Target price must be specified");
        });

        // Cross-property validation
        RuleFor(x => x.AverageCostPerShare)
            .LessThanOrEqualTo(x => x.CurrentPrice)
            .When(x => x.AverageCostPerShare > 0)
            .WithMessage("Average cost should not exceed current price");
    }
}
```

Testing validators:

```csharp
[Fact]
public void Validate_InvalidBirthYear_ReturnsError()
{
    var validator = new FirePlanInputValidator();
    var input = new FirePlanInput { BirthYear = 1800 };

    var result = validator.Validate(input);

    result.IsValid.Should().BeFalse();
    result.Errors.Should().Contain(e => 
        e.PropertyName == nameof(FirePlanInput.BirthYear));
}
```

## References

- [FluentValidation Documentation](https://docs.fluentvalidation.net/)
- [Program.cs](../../src/Program.cs)
- [Validators](../../src/Validators/)
