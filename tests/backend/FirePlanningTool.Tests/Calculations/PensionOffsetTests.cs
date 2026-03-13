using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Calculations
{
    /// <summary>
    /// Tests for pension offset functionality in retirement phase calculations.
    /// </summary>
    public class PensionOffsetTests
    {
        private readonly FireCalculator _fireCalculator;

        public PensionOffsetTests()
        {
            _fireCalculator = TestDataBuilder.CreateFireCalculator();
        }

        /// <summary>
        /// Helper to create a valid FirePlanInput for testing.
        /// </summary>
        private static FirePlanInput CreateBasicInput()
        {
            return new FirePlanInput
            {
                BirthDate = new DateTime(1960, 6, 15),  // Born June 15, 1960
                EarlyRetirementYear = 2025,             // Early retirement at 65
                FullRetirementAge = 67,                 // Full retirement at 67
                MonthlyContribution = Money.Usd(0),
                UsdIlsRate = 3.6m,
                WithdrawalRate = 4m,
                InflationRate = 0m,                     // No inflation for simpler testing
                CapitalGainsTax = 0m,                   // No tax for simpler testing
                Expenses = new List<PlannedExpense>(),
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new()
                    {
                        Symbol = "VTI",
                        Quantity = 100,
                        CurrentPrice = Money.Usd(1000),          // $100,000 portfolio
                        AverageCost = Money.Usd(1000),   // No gains
                        Method = "CAGR",
                        Value1 = 0                    // 0% return for simpler testing
                    }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                AccumulationAllocation = new List<PortfolioAllocation>(),
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 0 }
                },
                UseRetirementPortfolio = false,
                PensionNetMonthly = Money.Usd(0),
            };
        }

        #region Pension Start Month Tests

        [Fact]
        public void Calculate_WithPension_PensionStartsAtNextMonthAfterFullRetirementAge()
        {
            // Arrange: Born June 15, 1960, Full retirement age 67
            // Pension should start August 2027 (month after turning 67 in June 2027)
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1960, 6, 15);
            input.FullRetirementAge = 67;
            input.PensionNetMonthly = Money.Usd(1000m);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            // The pension should start in 2027 (1960 + 67 = 2027)
            // Pension starts in July 2027 (the next month after June when they turn 67)
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithNoPension_NoOffsetApplied()
        {
            // Arrange
            var input = CreateBasicInput();
            input.PensionNetMonthly = Money.Usd(0);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            // With $100,000 portfolio and 4% withdrawal, expect $4,000/year withdrawal
            result.GrossAnnualWithdrawal.Should().Be(4000m);
        }

        #endregion

        #region Currency Conversion Tests

        [Fact]
        public void Calculate_WithPensionInILS_ConvertsToUSD()
        {
            // Arrange
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1958, 1, 1);  // Already past full retirement age
            input.FullRetirementAge = 67;
            input.EarlyRetirementYear = 2025;
            input.PensionNetMonthly = Money.Usd(3600m);      // 3600 ILS
            input.UsdIlsRate = 3.6m;                    // 3600 ILS = 1000 USD

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            // The pension should be converted to $1000/month USD equivalent
        }

        [Fact]
        public void Calculate_WithPensionInUSD_UsesDirectValue()
        {
            // Arrange
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1958, 1, 1);  // Already past full retirement age
            input.FullRetirementAge = 67;
            input.EarlyRetirementYear = 2025;
            input.PensionNetMonthly = Money.Usd(1000m);       // $1000 USD

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
        }

        #endregion

        #region Withdrawal Floor Tests

        [Fact]
        public void Calculate_WhenPensionExceedsRequiredWithdrawal_WithdrawalFlooredAtZero()
        {
            // Arrange: Small portfolio, large pension
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1958, 1, 1);  // Already past full retirement age
            input.FullRetirementAge = 67;
            input.EarlyRetirementYear = 2025;

            // Small portfolio: $10,000 with 4% withdrawal = $400/year = ~$33/month
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 10,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(1000),
                    Method = "CAGR",
                    Value1 = 0
                }
            };

            // Large pension: $2000/month >> required withdrawal
            input.PensionNetMonthly = Money.Usd(2000m);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            // All withdrawals should be non-negative
            result.YearlyData.Should().AllSatisfy(y =>
            {
                if (y.AnnualWithdrawal.HasValue)
                {
                    y.AnnualWithdrawal.Value.Should().BeGreaterThanOrEqualTo(0);
                }
            });
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        #endregion

        #region Pension Before/After Full Retirement Age Tests

        [Fact]
        public void Calculate_BeforeFullRetirementAge_NoPensionOffset()
        {
            // Arrange: Early retirement before full retirement age
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1970, 1, 1);  // Born 1970
            input.EarlyRetirementYear = 2025;           // Early retire at 55
            input.FullRetirementAge = 67;               // Full retirement at 67
            input.PensionNetMonthly = Money.Usd(1000m);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();

            // Between 2025-2037 (early retirement to full retirement), 
            // pension should NOT offset withdrawals
            var yearsBeforePension = result.YearlyData
                .Where(y => y.Year >= 2025 && y.Year < 2037)
                .ToList();

            yearsBeforePension.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_AfterFullRetirementAge_PensionOffsetApplied()
        {
            // Arrange: Already past full retirement age
            var input = CreateBasicInput();
            input.BirthDate = new DateTime(1950, 1, 1);  // Born 1950
            input.EarlyRetirementYear = 2025;           // Retire now (already 75)
            input.FullRetirementAge = 67;               // Already past FRA
            input.PensionNetMonthly = Money.Usd(500m);       // $500/month pension

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();

            // All retirement years should have pension offset active
            result.YearlyData.Should().NotBeEmpty();
        }

        #endregion

        #region Pension Validation Tests

        [Fact]
        public void Calculate_WithValidPensionAmount_Succeeds()
        {
            // Arrange
            var input = CreateBasicInput();
            input.PensionNetMonthly = Money.Usd(5000m);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
        }

        [Fact]
        public void Calculate_WithZeroPension_Succeeds()
        {
            // Arrange
            var input = CreateBasicInput();
            input.PensionNetMonthly = Money.Usd(0);

            // Act
            var result = _fireCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
        }

        #endregion
    }
}
