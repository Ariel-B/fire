using FluentValidation;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Validators
{
    /// <summary>
    /// Validator for FirePlanInput model used in FIRE plan calculations.
    /// Validates year ranges, percentages, monetary values, portfolio items, and RSU configuration.
    /// </summary>
    public class FirePlanInputValidator : AbstractValidator<FirePlanInput>
    {
        /// <summary>
        /// Initializes a new instance of the FirePlanInputValidator with validation rules.
        /// </summary>
        public FirePlanInputValidator()
        {
            // BirthDate validation - must be a valid date within reasonable range
            RuleFor(x => x.BirthDate)
                .Must(date => date != default)
                .WithMessage("Birth date is required")
                .Must(date => date.Year >= CalculationConstants.MinBirthYear)
                .WithMessage($"Birth date year must be at least {CalculationConstants.MinBirthYear}")
                .Must(date => date.Year <= DateTime.Now.Year + CalculationConstants.MaxFutureBirthYears)
                .WithMessage($"Birth date year cannot be more than {CalculationConstants.MaxFutureBirthYears} years in the future");

            RuleFor(x => x.EarlyRetirementYear)
                .Must((input, earlyRetirementYear) => earlyRetirementYear == 0 || 
                      (earlyRetirementYear >= CalculationConstants.MinRetirementYear && 
                       earlyRetirementYear <= DateTime.Now.Year + CalculationConstants.MaxFutureRetirementYears))
                .WithMessage("Invalid early retirement year");

            RuleFor(x => x.FullRetirementAge)
                .InclusiveBetween(0, CalculationConstants.MaxRetirementAge)
                .WithMessage("Invalid full retirement age");

            // Percentage validations
            RuleFor(x => x.WithdrawalRate)
                .InclusiveBetween(0, 100)
                .WithMessage("Withdrawal rate must be between 0 and 100");

            RuleFor(x => x.InflationRate)
                .InclusiveBetween(-50, 100)
                .WithMessage("Inflation rate must be between -50 and 100");

            RuleFor(x => x.CapitalGainsTax)
                .InclusiveBetween(0, 100)
                .WithMessage("Capital gains tax must be between 0 and 100");

            // Monetary value validation (Money types)
            RuleFor(x => x.MonthlyContribution.Amount)
                .InclusiveBetween(0, 1_000_000_000)
                .WithMessage("Invalid monthly contribution");

            RuleFor(x => x.MonthlyContribution.Currency)
                .Must(currency => SupportedCurrencies.IsSupported(currency))
                .WithMessage("Monthly contribution currency must be a supported currency (USD or ILS)");

            // Pension validation (Money type)
            RuleFor(x => x.PensionNetMonthly.Amount)
                .GreaterThanOrEqualTo(0)
                .WithMessage("Pension amount must be non-negative")
                .LessThanOrEqualTo(CalculationConstants.MaxPensionMonthlyAmount)
                .WithMessage($"Pension amount cannot exceed {CalculationConstants.MaxPensionMonthlyAmount:N0}");

            RuleFor(x => x.PensionNetMonthly.Currency)
                .Must(currency => SupportedCurrencies.IsSupported(currency))
                .WithMessage("Pension currency must be a supported currency (USD or ILS)");

            // Portfolio size limits (DoS prevention)
            RuleFor(x => x.AccumulationPortfolio)
                .Must(portfolio => portfolio == null || portfolio.Count <= 1000)
                .WithMessage("Maximum 1000 portfolio items allowed");

            RuleFor(x => x.RetirementPortfolio)
                .Must(portfolio => portfolio == null || portfolio.Count <= 1000)
                .WithMessage("Maximum 1000 portfolio items allowed");

            RuleFor(x => x.Expenses)
                .Must(expenses => expenses == null || expenses.Count <= 1000)
                .WithMessage("Maximum 1000 expenses allowed");

            // RSU Configuration validation (if provided)
            RuleFor(x => x.RsuConfiguration)
                .SetValidator(new RsuConfigurationValidator()!)
                .When(x => x.RsuConfiguration != null);
        }
    }

    /// <summary>
    /// Validator for RSU configuration within a FIRE plan.
    /// Validates stock symbol, prices, tax rates, expected returns, and grant details.
    /// </summary>
    public class RsuConfigurationValidator : AbstractValidator<RsuConfiguration>
    {
        /// <summary>
        /// Initializes a new instance of the RsuConfigurationValidator with validation rules.
        /// </summary>
        public RsuConfigurationValidator()
        {
            RuleFor(x => x.StockSymbol)
                .NotEmpty()
                .WithMessage("RSU stock symbol is required")
                .MaximumLength(10)
                .WithMessage("RSU stock symbol must be 10 characters or less");

            RuleFor(x => x.CurrentPricePerShare.Amount)
                .GreaterThan(0)
                .WithMessage("RSU current price must be greater than 0");

            RuleFor(x => x.CurrentPricePerShare.Currency)
                .Must(currency => SupportedCurrencies.IsSupported(currency))
                .WithMessage("RSU stock currency must be a supported currency (USD or ILS)");

            RuleFor(x => x.MarginalTaxRate)
                .InclusiveBetween(0, 100)
                .WithMessage("RSU marginal tax rate must be between 0 and 100");

            RuleFor(x => x.ExpectedAnnualReturn)
                .InclusiveBetween(-100, 100)
                .WithMessage("RSU expected annual return must be between -100 and 100");

            RuleFor(x => x.Grants)
                .Must(grants => grants == null || grants.Count <= CalculationConstants.MaxRsuGrants)
                .WithMessage($"Maximum {CalculationConstants.MaxRsuGrants} RSU grants allowed");

            RuleForEach(x => x.Grants)
                .SetValidator(new RsuGrantValidator())
                .When(x => x.Grants != null);
        }
    }

    /// <summary>
    /// Validator for individual RSU grants.
    /// Validates number of shares, grant price, vesting period, and grant date.
    /// </summary>
    public class RsuGrantValidator : AbstractValidator<RsuGrant>
    {
        /// <summary>
        /// Initializes a new instance of the RsuGrantValidator with validation rules.
        /// </summary>
        public RsuGrantValidator()
        {
            RuleFor(x => x.NumberOfShares)
                .GreaterThan(0)
                .WithMessage("RSU grant must have at least 1 share");

            RuleFor(x => x.PriceAtGrant.Amount)
                .GreaterThan(0)
                .WithMessage("RSU grant price must be greater than 0");

            RuleFor(x => x.VestingPeriodYears)
                .InclusiveBetween(CalculationConstants.MinVestingPeriodYears, CalculationConstants.MaxVestingPeriodYears)
                .WithMessage($"RSU vesting period must be between {CalculationConstants.MinVestingPeriodYears} and {CalculationConstants.MaxVestingPeriodYears} years");

            RuleFor(x => x.GrantDate)
                .LessThanOrEqualTo(DateTime.Now)
                .WithMessage("RSU grant date cannot be in the future");
        }
    }
}
