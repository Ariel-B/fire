using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FirePlanningTool.Validators;
using FluentAssertions;
using FluentValidation.TestHelper;
using Xunit;

namespace FirePlanningTool.Tests.Validators
{
    public class RsuConfigurationValidatorTests
    {
        private readonly RsuConfigurationValidator _validator;

        public RsuConfigurationValidatorTests()
        {
            _validator = new RsuConfigurationValidator();
        }

        #region Stock Symbol Validation Tests

        [Fact]
        public void StockSymbol_Empty_HasValidationError()
        {
            var config = new RsuConfiguration { StockSymbol = "" };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.StockSymbol)
                .WithErrorMessage("RSU stock symbol is required");
        }

        [Fact]
        public void StockSymbol_Null_HasValidationError()
        {
            var config = new RsuConfiguration { StockSymbol = null! };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.StockSymbol)
                .WithErrorMessage("RSU stock symbol is required");
        }

        [Fact]
        public void StockSymbol_TooLong_HasValidationError()
        {
            var config = new RsuConfiguration { StockSymbol = "VERYLONGSYMBOL" };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.StockSymbol)
                .WithErrorMessage("RSU stock symbol must be 10 characters or less");
        }

        [Fact]
        public void StockSymbol_AtMaximumLength_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "ABCDEFGHIJ",
                CurrentPricePerShare = Money.Usd(100)
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.StockSymbol);
        }

        [Fact]
        public void StockSymbol_Valid_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150)
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.StockSymbol);
        }

        #endregion

        #region Current Price Validation Tests

        [Fact]
        public void CurrentPricePerShare_Zero_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(0)
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.CurrentPricePerShare.Amount)
                .WithErrorMessage("RSU current price must be greater than 0");
        }

        [Fact]
        public void CurrentPricePerShare_Negative_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(-10)
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.CurrentPricePerShare.Amount)
                .WithErrorMessage("RSU current price must be greater than 0");
        }

        [Fact]
        public void CurrentPricePerShare_Positive_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150.5m)
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.CurrentPricePerShare.Amount);
        }

        #endregion

        #region Tax Rate Validation Tests

        [Fact]
        public void MarginalTaxRate_Negative_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                MarginalTaxRate = -1
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.MarginalTaxRate)
                .WithErrorMessage("RSU marginal tax rate must be between 0 and 100");
        }

        [Fact]
        public void MarginalTaxRate_AboveMaximum_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                MarginalTaxRate = 101
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.MarginalTaxRate)
                .WithErrorMessage("RSU marginal tax rate must be between 0 and 100");
        }

        [Fact]
        public void MarginalTaxRate_Valid_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                MarginalTaxRate = 47
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.MarginalTaxRate);
        }

        #endregion

        #region Expected Return Validation Tests

        [Fact]
        public void ExpectedAnnualReturn_BelowMinimum_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                ExpectedAnnualReturn = -101
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.ExpectedAnnualReturn)
                .WithErrorMessage("RSU expected annual return must be between -100 and 100");
        }

        [Fact]
        public void ExpectedAnnualReturn_AboveMaximum_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                ExpectedAnnualReturn = 101
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.ExpectedAnnualReturn)
                .WithErrorMessage("RSU expected annual return must be between -100 and 100");
        }

        [Fact]
        public void ExpectedAnnualReturn_Valid_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                ExpectedAnnualReturn = 10
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.ExpectedAnnualReturn);
        }

        #endregion

        #region Grants Collection Validation Tests

        [Fact]
        public void Grants_AboveMaximum_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                Grants = Enumerable.Range(1, CalculationConstants.MaxRsuGrants + 1)
                    .Select(i => new RsuGrant
                    {
                        NumberOfShares = 100,
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        GrantDate = DateTime.Now.AddDays(-1)
                    })
                    .ToList()
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor(x => x.Grants)
                .WithErrorMessage($"Maximum {CalculationConstants.MaxRsuGrants} RSU grants allowed");
        }

        [Fact]
        public void Grants_AtMaximum_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                Grants = Enumerable.Range(1, CalculationConstants.MaxRsuGrants)
                    .Select(i => new RsuGrant
                    {
                        NumberOfShares = 100,
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        GrantDate = DateTime.Now.AddDays(-1)
                    })
                    .ToList()
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.Grants);
        }

        [Fact]
        public void Grants_Empty_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                Grants = new List<RsuGrant>()
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.Grants);
        }

        [Fact]
        public void Grants_Null_DoesNotHaveValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                Grants = null!
            };
            var result = _validator.TestValidate(config);
            result.ShouldNotHaveValidationErrorFor(x => x.Grants);
        }

        [Fact]
        public void Grants_WithInvalidGrant_HasValidationError()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150),
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        NumberOfShares = 0, // Invalid
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        GrantDate = DateTime.Now.AddDays(-1)
                    }
                }
            };
            var result = _validator.TestValidate(config);
            result.ShouldHaveValidationErrorFor("Grants[0].NumberOfShares");
        }

        #endregion

        #region Valid Configuration Tests

        [Fact]
        public void ValidConfiguration_DoesNotHaveAnyValidationErrors()
        {
            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(150.5m),
                MarginalTaxRate = 47m,
                ExpectedAnnualReturn = 10m,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4,
                        GrantDate = DateTime.Now.AddYears(-1)
                    }
                }
            };

            var result = _validator.TestValidate(config);
            result.ShouldNotHaveAnyValidationErrors();
        }

        #endregion
    }
}
