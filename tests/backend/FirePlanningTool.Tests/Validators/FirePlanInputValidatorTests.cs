using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace FirePlanningTool.Tests.Validators
{
    public class FirePlanInputValidatorTests
    {
        private readonly FirePlanInputValidator _validator;

        public FirePlanInputValidatorTests()
        {
            _validator = new FirePlanInputValidator();
        }

        #region Birth Date Validation Tests

        [Fact]
        public void BirthDate_Default_HasValidationError()
        {
            var input = new FirePlanInput { BirthDate = default };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.BirthDate)
                .WithErrorMessage("Birth date is required");
        }

        [Fact]
        public void BirthDate_YearBelowMinimum_HasValidationError()
        {
            var input = new FirePlanInput { BirthDate = new DateTime(CalculationConstants.MinBirthYear - 1, 1, 1) };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.BirthDate)
                .WithErrorMessage($"Birth date year must be at least {CalculationConstants.MinBirthYear}");
        }

        [Fact]
        public void BirthDate_YearAtMinimum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { BirthDate = new DateTime(CalculationConstants.MinBirthYear, 1, 1) };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.BirthDate);
        }

        [Fact]
        public void BirthDate_YearAboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                BirthDate = new DateTime(DateTime.Now.Year + CalculationConstants.MaxFutureBirthYears + 1, 1, 1)
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.BirthDate)
                .WithErrorMessage($"Birth date year cannot be more than {CalculationConstants.MaxFutureBirthYears} years in the future");
        }

        [Fact]
        public void BirthDate_YearAtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                BirthDate = new DateTime(DateTime.Now.Year + CalculationConstants.MaxFutureBirthYears, 1, 1)
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.BirthDate);
        }

        [Fact]
        public void BirthDate_CurrentYear_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { BirthDate = new DateTime(DateTime.Now.Year, 6, 15) };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.BirthDate);
        }

        #endregion

        #region Early Retirement Year Validation Tests

        [Fact]
        public void EarlyRetirementYear_Zero_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { EarlyRetirementYear = 0 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.EarlyRetirementYear);
        }

        [Fact]
        public void EarlyRetirementYear_BelowMinimum_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                EarlyRetirementYear = CalculationConstants.MinRetirementYear - 1 
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.EarlyRetirementYear)
                .WithErrorMessage("Invalid early retirement year");
        }

        [Fact]
        public void EarlyRetirementYear_AtMinimum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                EarlyRetirementYear = CalculationConstants.MinRetirementYear 
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.EarlyRetirementYear);
        }

        [Fact]
        public void EarlyRetirementYear_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                EarlyRetirementYear = DateTime.Now.Year + CalculationConstants.MaxFutureRetirementYears + 1 
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.EarlyRetirementYear)
                .WithErrorMessage("Invalid early retirement year");
        }

        [Fact]
        public void EarlyRetirementYear_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                EarlyRetirementYear = DateTime.Now.Year + CalculationConstants.MaxFutureRetirementYears 
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.EarlyRetirementYear);
        }

        #endregion

        #region Full Retirement Age Validation Tests

        [Fact]
        public void FullRetirementAge_Zero_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { FullRetirementAge = 0 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.FullRetirementAge);
        }

        [Fact]
        public void FullRetirementAge_Negative_HasValidationError()
        {
            var input = new FirePlanInput { FullRetirementAge = -1 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.FullRetirementAge)
                .WithErrorMessage("Invalid full retirement age");
        }

        [Fact]
        public void FullRetirementAge_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                FullRetirementAge = CalculationConstants.MaxRetirementAge + 1 
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.FullRetirementAge)
                .WithErrorMessage("Invalid full retirement age");
        }

        [Fact]
        public void FullRetirementAge_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                FullRetirementAge = CalculationConstants.MaxRetirementAge 
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.FullRetirementAge);
        }

        [Fact]
        public void FullRetirementAge_Typical_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { FullRetirementAge = 67 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.FullRetirementAge);
        }

        #endregion

        #region Percentage Validation Tests

        [Fact]
        public void WithdrawalRate_Negative_HasValidationError()
        {
            var input = new FirePlanInput { WithdrawalRate = -1 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.WithdrawalRate)
                .WithErrorMessage("Withdrawal rate must be between 0 and 100");
        }

        [Fact]
        public void WithdrawalRate_Zero_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { WithdrawalRate = 0 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.WithdrawalRate);
        }

        [Fact]
        public void WithdrawalRate_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput { WithdrawalRate = 101 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.WithdrawalRate)
                .WithErrorMessage("Withdrawal rate must be between 0 and 100");
        }

        [Fact]
        public void WithdrawalRate_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { WithdrawalRate = 100 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.WithdrawalRate);
        }

        [Fact]
        public void InflationRate_BelowMinimum_HasValidationError()
        {
            var input = new FirePlanInput { InflationRate = -51 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.InflationRate)
                .WithErrorMessage("Inflation rate must be between -50 and 100");
        }

        [Fact]
        public void InflationRate_AtMinimum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { InflationRate = -50 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.InflationRate);
        }

        [Fact]
        public void InflationRate_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput { InflationRate = 101 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.InflationRate)
                .WithErrorMessage("Inflation rate must be between -50 and 100");
        }

        [Fact]
        public void InflationRate_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { InflationRate = 100 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.InflationRate);
        }

        [Fact]
        public void CapitalGainsTax_Negative_HasValidationError()
        {
            var input = new FirePlanInput { CapitalGainsTax = -1 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.CapitalGainsTax)
                .WithErrorMessage("Capital gains tax must be between 0 and 100");
        }

        [Fact]
        public void CapitalGainsTax_Zero_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { CapitalGainsTax = 0 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.CapitalGainsTax);
        }

        [Fact]
        public void CapitalGainsTax_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput { CapitalGainsTax = 101 };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.CapitalGainsTax)
                .WithErrorMessage("Capital gains tax must be between 0 and 100");
        }

        [Fact]
        public void CapitalGainsTax_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { CapitalGainsTax = 100 };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.CapitalGainsTax);
        }

        #endregion

        #region Monetary Value Validation Tests

        [Fact]
        public void MonthlyContribution_Negative_HasValidationError()
        {
            var input = new FirePlanInput { MonthlyContribution = Money.Usd(-1) };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.MonthlyContribution.Amount)
                .WithErrorMessage("Invalid monthly contribution");
        }

        [Fact]
        public void MonthlyContribution_Zero_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { MonthlyContribution = Money.Usd(0) };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution.Amount);
        }

        [Fact]
        public void MonthlyContribution_AboveMaximum_HasValidationError()
        {
            var input = new FirePlanInput { MonthlyContribution = Money.Usd(1_000_000_001) };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.MonthlyContribution.Amount)
                .WithErrorMessage("Invalid monthly contribution");
        }

        [Fact]
        public void MonthlyContribution_AtMaximum_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { MonthlyContribution = Money.Usd(1_000_000_000) };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.MonthlyContribution.Amount);
        }

        #endregion

        #region Collection Size Limit Tests

        [Fact]
        public void AccumulationPortfolio_WithinLimit_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                AccumulationPortfolio = Enumerable.Range(1, 1000)
                    .Select(i => new PortfolioAsset { Symbol = $"SYM{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.AccumulationPortfolio);
        }

        [Fact]
        public void AccumulationPortfolio_AboveLimit_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                AccumulationPortfolio = Enumerable.Range(1, 1001)
                    .Select(i => new PortfolioAsset { Symbol = $"SYM{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.AccumulationPortfolio)
                .WithErrorMessage("Maximum 1000 portfolio items allowed");
        }

        [Fact]
        public void RetirementPortfolio_WithinLimit_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                RetirementPortfolio = Enumerable.Range(1, 1000)
                    .Select(i => new PortfolioAsset { Symbol = $"SYM{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.RetirementPortfolio);
        }

        [Fact]
        public void RetirementPortfolio_AboveLimit_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                RetirementPortfolio = Enumerable.Range(1, 1001)
                    .Select(i => new PortfolioAsset { Symbol = $"SYM{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.RetirementPortfolio)
                .WithErrorMessage("Maximum 1000 portfolio items allowed");
        }

        [Fact]
        public void Expenses_WithinLimit_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput 
            { 
                Expenses = Enumerable.Range(1, 1000)
                    .Select(i => new PlannedExpense { Type = $"Expense{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.Expenses);
        }

        [Fact]
        public void Expenses_AboveLimit_HasValidationError()
        {
            var input = new FirePlanInput 
            { 
                Expenses = Enumerable.Range(1, 1001)
                    .Select(i => new PlannedExpense { Type = $"Expense{i}" })
                    .ToList()
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor(x => x.Expenses)
                .WithErrorMessage("Maximum 1000 expenses allowed");
        }

        [Fact]
        public void AccumulationPortfolio_Null_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { AccumulationPortfolio = null! };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.AccumulationPortfolio);
        }

        [Fact]
        public void RetirementPortfolio_Null_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { RetirementPortfolio = null! };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.RetirementPortfolio);
        }

        [Fact]
        public void Expenses_Null_DoesNotHaveValidationError()
        {
            var input = new FirePlanInput { Expenses = null! };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.Expenses);
        }

        #endregion

        #region RSU Configuration Validation Tests

        [Fact]
        public void RsuConfiguration_Null_DoesNotTriggerValidation()
        {
            var input = new FirePlanInput 
            { 
                BirthYear = 1990,
                RsuConfiguration = null 
            };
            var result = _validator.TestValidate(input);
            result.ShouldNotHaveValidationErrorFor(x => x.RsuConfiguration);
        }

        [Fact]
        public void RsuConfiguration_Invalid_HasValidationError()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                RsuConfiguration = new RsuConfiguration
                {
                    StockSymbol = "", // Invalid empty symbol
                    CurrentPricePerShare = Money.Usd(0) // Invalid zero price
                }
            };
            var result = _validator.TestValidate(input);
            result.ShouldHaveValidationErrorFor("RsuConfiguration.StockSymbol");
            result.ShouldHaveValidationErrorFor("RsuConfiguration.CurrentPricePerShare.Amount");
        }

        #endregion

        #region Valid Input Tests

        [Fact]
        public void ValidInput_DoesNotHaveAnyValidationErrors()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 67,
                MonthlyContribution = Money.Usd(5000),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 25m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var result = _validator.TestValidate(input);
            result.ShouldNotHaveAnyValidationErrors();
        }

        #endregion
    }
}
