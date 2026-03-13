using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    /// <summary>
    /// Tests for PortfolioValidatorWithResult prototype.
    /// Demonstrates validation patterns using Result instead of exceptions.
    /// </summary>
    public class PortfolioValidatorWithResultTests
    {
        private readonly PortfolioValidatorWithResult _validator;

        public PortfolioValidatorWithResultTests()
        {
            _validator = new PortfolioValidatorWithResult();
        }

        #region ValidateAsset Tests

        [Fact]
        public void ValidateAsset_ValidAsset_ReturnsSuccess()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "AAPL",
                Quantity = 10,
                CurrentPrice = Money.Usd(150.50m),
                AverageCost = Money.Usd(100m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(asset);
        }

        [Fact]
        public void ValidateAsset_NullAsset_ReturnsValidationError()
        {
            var result = _validator.ValidateAsset(null);

            result.IsFailure.Should().BeTrue();
            result.Error.Code.Should().Be("VALIDATION_ERROR");
            result.Error.Message.Should().Contain("cannot be null");
        }

        [Fact]
        public void ValidateAsset_EmptySymbol_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "",
                Quantity = 10,
                CurrentPrice = Money.Usd(150.50m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("symbol is required");
        }

        [Fact]
        public void ValidateAsset_SymbolTooLong_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VERYLONGSYMBOL",
                Quantity = 10,
                CurrentPrice = Money.Usd(150.50m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("exceeds maximum length");
        }

        [Fact]
        public void ValidateAsset_NegativeQuantity_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "AAPL",
                Quantity = -5,
                CurrentPrice = Money.Usd(150.50m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("negative quantity");
        }

        [Fact]
        public void ValidateAsset_NegativeCurrentPrice_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "AAPL",
                Quantity = 10,
                CurrentPrice = Money.Usd(-150.50m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("negative current price");
        }

        [Fact]
        public void ValidateAsset_NegativeAverageCost_ReturnsValidationError()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "AAPL",
                Quantity = 10,
                CurrentPrice = Money.Usd(150.50m),
                AverageCost = Money.Usd(-100m)
            };

            var result = _validator.ValidateAsset(asset);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("negative average cost");
        }

        #endregion

        #region ValidatePortfolio Tests

        [Fact]
        public void ValidatePortfolio_ValidPortfolio_ReturnsSuccess()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "AAPL", Quantity = 10, CurrentPrice = Money.Usd(150m) },
                new() { Symbol = "GOOGL", Quantity = 5, CurrentPrice = Money.Usd(2800m) }
            };

            var result = _validator.ValidatePortfolio(portfolio);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().HaveCount(2);
        }

        [Fact]
        public void ValidatePortfolio_EmptyPortfolio_ReturnsSuccess()
        {
            var portfolio = new List<PortfolioAsset>();

            var result = _validator.ValidatePortfolio(portfolio);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().BeEmpty();
        }

        [Fact]
        public void ValidatePortfolio_NullPortfolio_ReturnsValidationError()
        {
            var result = _validator.ValidatePortfolio(null);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("cannot be null");
        }

        [Fact]
        public void ValidatePortfolio_ExceedsMaxSize_ReturnsValidationError()
        {
            var portfolio = Enumerable.Range(0, 1001)
                .Select(i => new PortfolioAsset { Symbol = $"SYM{i}", Quantity = 1, CurrentPrice = Money.Usd(100m) })
                .ToList();

            var result = _validator.ValidatePortfolio(portfolio);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("exceeds maximum size");
            result.Error.Message.Should().Contain("1001");
        }

        [Fact]
        public void ValidatePortfolio_WithInvalidAssets_AccumulatesErrors()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "AAPL", Quantity = 10, CurrentPrice = Money.Usd(150m) },
                new() { Symbol = "", Quantity = 5, CurrentPrice = Money.Usd(100m) }, // Invalid: empty symbol
                new() { Symbol = "GOOGL", Quantity = -5, CurrentPrice = Money.Usd(2800m) } // Invalid: negative quantity
            };

            var result = _validator.ValidatePortfolio(portfolio);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("symbol is required");
            result.Error.Message.Should().Contain("negative quantity");
        }

        #endregion

        #region ValidateCalculationInputs Tests

        [Fact]
        public void ValidateCalculationInputs_ValidInputs_ReturnsSuccess()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: 1_000_000m,
                withdrawalRate: 4m,
                inflationRate: 2m);

            result.IsSuccess.Should().BeTrue();
            result.Value.Should().Be(40_000m); // 1M * 4%
        }

        [Fact]
        public void ValidateCalculationInputs_NegativePortfolioValue_ReturnsValidationError()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: -1_000_000m,
                withdrawalRate: 4m,
                inflationRate: 2m);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("Portfolio value cannot be negative");
        }

        [Fact]
        public void ValidateCalculationInputs_WithdrawalRateTooHigh_ReturnsValidationError()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: 1_000_000m,
                withdrawalRate: 150m,
                inflationRate: 2m);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("Withdrawal rate must be between 0 and 100");
        }

        [Fact]
        public void ValidateCalculationInputs_WithdrawalRateNegative_ReturnsValidationError()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: 1_000_000m,
                withdrawalRate: -5m,
                inflationRate: 2m);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("Withdrawal rate must be between 0 and 100");
        }

        [Fact]
        public void ValidateCalculationInputs_InflationRateTooHigh_ReturnsValidationError()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: 1_000_000m,
                withdrawalRate: 4m,
                inflationRate: 150m);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("Inflation rate must be between -50 and 100");
        }

        [Fact]
        public void ValidateCalculationInputs_InflationRateTooLow_ReturnsValidationError()
        {
            var result = _validator.ValidateCalculationInputs(
                portfolioValue: 1_000_000m,
                withdrawalRate: 4m,
                inflationRate: -60m);

            result.IsFailure.Should().BeTrue();
            result.Error.Message.Should().Contain("Inflation rate must be between -50 and 100");
        }

        #endregion
    }
}
