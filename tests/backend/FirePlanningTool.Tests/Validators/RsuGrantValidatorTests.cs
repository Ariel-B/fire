using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace FirePlanningTool.Tests.Validators
{
    public class RsuGrantValidatorTests
    {
        private readonly RsuGrantValidator _validator;

        public RsuGrantValidatorTests()
        {
            _validator = new RsuGrantValidator();
        }

        #region Number of Shares Validation Tests

        [Fact]
        public void NumberOfShares_Zero_HasValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 0,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.NumberOfShares)
                .WithErrorMessage("RSU grant must have at least 1 share");
        }

        [Fact]
        public void NumberOfShares_Negative_HasValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = -10,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.NumberOfShares)
                .WithErrorMessage("RSU grant must have at least 1 share");
        }

        [Fact]
        public void NumberOfShares_Positive_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.NumberOfShares);
        }

        #endregion

        #region Price at Grant Validation Tests

        [Fact]
        public void PriceAtGrant_Zero_HasValidationError()
        {
            var grant = new RsuGrant
            {
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(0),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.PriceAtGrant.Amount)
                .WithErrorMessage("RSU grant price must be greater than 0");
        }

        [Fact]
        public void PriceAtGrant_Negative_HasValidationError()
        {
            var grant = new RsuGrant
            {
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(-50),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.PriceAtGrant.Amount)
                .WithErrorMessage("RSU grant price must be greater than 0");
        }

        [Fact]
        public void PriceAtGrant_Positive_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant
            {
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100.5m),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.PriceAtGrant.Amount);
        }

        #endregion

        #region Vesting Period Validation Tests

        [Fact]
        public void VestingPeriodYears_BelowMinimum_HasValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = CalculationConstants.MinVestingPeriodYears - 1,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.VestingPeriodYears)
                .WithErrorMessage($"RSU vesting period must be between {CalculationConstants.MinVestingPeriodYears} and {CalculationConstants.MaxVestingPeriodYears} years");
        }

        [Fact]
        public void VestingPeriodYears_AtMinimum_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = CalculationConstants.MinVestingPeriodYears,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.VestingPeriodYears);
        }

        [Fact]
        public void VestingPeriodYears_AboveMaximum_HasValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = CalculationConstants.MaxVestingPeriodYears + 1,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.VestingPeriodYears)
                .WithErrorMessage($"RSU vesting period must be between {CalculationConstants.MinVestingPeriodYears} and {CalculationConstants.MaxVestingPeriodYears} years");
        }

        [Fact]
        public void VestingPeriodYears_AtMaximum_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = CalculationConstants.MaxVestingPeriodYears,
                GrantDate = DateTime.Now.AddDays(-1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.VestingPeriodYears);
        }

        #endregion

        #region Grant Date Validation Tests

        [Fact]
        public void GrantDate_InFuture_HasValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddDays(1)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldHaveValidationErrorFor(x => x.GrantDate)
                .WithErrorMessage("RSU grant date cannot be in the future");
        }

        [Fact]
        public void GrantDate_Today_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddMinutes(-1) // Slightly in the past to avoid timing issues
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.GrantDate);
        }

        [Fact]
        public void GrantDate_InPast_DoesNotHaveValidationError()
        {
            var grant = new RsuGrant 
            { 
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddYears(-2)
            };
            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveValidationErrorFor(x => x.GrantDate);
        }

        #endregion

        #region Valid Grant Tests

        [Fact]
        public void ValidGrant_DoesNotHaveAnyValidationErrors()
        {
            var grant = new RsuGrant
            {
                NumberOfShares = 1000,
                PriceAtGrant = Money.Usd(100.5m),
                VestingPeriodYears = 4,
                GrantDate = DateTime.Now.AddYears(-1)
            };

            var result = _validator.TestValidate(grant);
            result.ShouldNotHaveAnyValidationErrors();
        }

        #endregion
    }
}
