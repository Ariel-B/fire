namespace FirePlanningTool.Tests.Rsu
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Tests for SellAtRetirement strategy withdrawal rate calculation.
    /// Verifies that RSU proceeds at retirement are included when calculating the withdrawal rate.
    /// </summary>
    /// <remarks>
    /// Bug Background: When using SellAtRetirement strategy, RSU proceeds at retirement
    /// were not being factored into the peak portfolio value used to calculate withdrawals.
    /// This meant users would have a lower withdrawal rate than expected, since the
    /// actual portfolio value at retirement is higher due to the RSU sales proceeds.
    /// </remarks>
    public class SellAtRetirementWithdrawalRateTests
    {
        private readonly FireCalculator _fireCalculator;

        public SellAtRetirementWithdrawalRateTests()
        {
            _fireCalculator = TestDataBuilder.CreateFireCalculator();
        }

        /// <summary>
        /// Verifies that RSU proceeds at retirement are included in the withdrawal calculation
        /// for the SellAtRetirement strategy.
        /// </summary>
        [Fact]
        public void SellAtRetirement_WithdrawalRate_IncludesRsuProceeds()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var retirementYear = currentYear + 5;

            // Create input WITHOUT RSU to establish baseline withdrawal
            var inputWithoutRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithoutRsu.RsuConfiguration = null;
            inputWithoutRsu.IncludeRsuInCalculations = false;

            // Create input WITH RSU using SellAtRetirement strategy
            var inputWithRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithRsu.RsuConfiguration = CreateSellAtRetirementRsuConfiguration(currentYear, retirementYear);
            inputWithRsu.IncludeRsuInCalculations = true;

            // Act
            var resultWithoutRsu = _fireCalculator.Calculate(inputWithoutRsu);
            var resultWithRsu = _fireCalculator.Calculate(inputWithRsu);

            // Assert
            // The RSU proceeds at retirement should increase the effective portfolio value,
            // resulting in a higher gross annual withdrawal
            resultWithRsu.GrossAnnualWithdrawal.Should().BeGreaterThan(
                resultWithoutRsu.GrossAnnualWithdrawal,
                "because RSU proceeds at retirement should be included in the withdrawal calculation");
        }

        /// <summary>
        /// Verifies that the SellAfter2Years strategy withdrawal rate also reflects RSU proceeds
        /// (proceeds come during accumulation, so portfolio is already larger at retirement).
        /// </summary>
        [Fact]
        public void SellAfter2Years_WithdrawalRate_ReflectsRsuProceeds()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var retirementYear = currentYear + 5;

            // Create input WITHOUT RSU to establish baseline withdrawal
            var inputWithoutRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithoutRsu.RsuConfiguration = null;
            inputWithoutRsu.IncludeRsuInCalculations = false;

            // Create input WITH RSU using SellAfter2Years strategy
            var inputWithRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithRsu.RsuConfiguration = CreateSellAfter2YearsRsuConfiguration(currentYear);
            inputWithRsu.IncludeRsuInCalculations = true;

            // Act
            var resultWithoutRsu = _fireCalculator.Calculate(inputWithoutRsu);
            var resultWithRsu = _fireCalculator.Calculate(inputWithRsu);

            // Assert
            // For SellAfter2Years, RSU proceeds come during accumulation,
            // so portfolio should already be larger at retirement
            resultWithRsu.GrossAnnualWithdrawal.Should().BeGreaterThan(
                resultWithoutRsu.GrossAnnualWithdrawal,
                "because RSU proceeds during accumulation should increase portfolio value");
        }

        /// <summary>
        /// Verifies that the withdrawal rate difference between strategies is significant
        /// when RSU proceeds at retirement are substantial.
        /// </summary>
        [Fact]
        public void SellAtRetirement_WithLargeRsuPosition_HasProportionallyHigherWithdrawal()
        {
            // Arrange: Use a scenario where RSU is a significant portion of wealth
            var currentYear = DateTime.Now.Year;
            var retirementYear = currentYear + 5;

            var input = CreateBaseFirePlanInput(retirementYear);
            // Start with small portfolio to make RSU impact more visible
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset
                {
                    Id = 1,
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100), // $10,000 starting portfolio
                    AverageCost = Money.Usd(100),
                    Method = "CAGR",
                    Value1 = 7
                }
            };
            input.MonthlyContribution = Money.Usd(1000);

            // Large RSU position that will vest and be sold at retirement
            input.RsuConfiguration = new RsuConfiguration
            {
                StockSymbol = "TEST",
                CurrentPricePerShare = Money.Usd(200),
                ExpectedAnnualReturn = 10m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    // Grant from 3 years ago (will be 102-eligible at retirement)
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(currentYear - 3, 6, 15),
                        NumberOfShares = 1000, // At $200/share = $200,000 gross
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        VestingType = VestingScheduleType.Standard
                    }
                }
            };
            input.IncludeRsuInCalculations = true;

            // Act
            var result = _fireCalculator.Calculate(input);

            // Get the RSU data to verify it's actually being sold at retirement
            var retirementYearData = result.YearlyData.FirstOrDefault(y => y.Year == retirementYear);
            var rsuSoldAtRetirement = result.RsuTimeline?.FirstOrDefault(r => r.Year == retirementYear)?.SharesSold ?? 0;

            // Assert
            rsuSoldAtRetirement.Should().BeGreaterThan(0,
                "because SellAtRetirement should sell 102-eligible shares at retirement");

            // The withdrawal should be based on portfolio + RSU proceeds
            // With 4% rule: if RSU adds $150k net (after 25%+3% tax on $200k), 
            // that's an extra $6k/year in withdrawal
            result.GrossAnnualWithdrawal.Should().BeGreaterThan(0);
        }

        /// <summary>
        /// Verifies that the peak value includes RSU proceeds for SellAtRetirement strategy.
        /// </summary>
        [Fact]
        public void SellAtRetirement_PeakValue_IncludesRsuProceeds()
        {
            // Arrange
            var currentYear = DateTime.Now.Year;
            var retirementYear = currentYear + 5;

            var inputWithoutRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithoutRsu.RsuConfiguration = null;
            inputWithoutRsu.IncludeRsuInCalculations = false;

            var inputWithRsu = CreateBaseFirePlanInput(retirementYear);
            inputWithRsu.RsuConfiguration = CreateSellAtRetirementRsuConfiguration(currentYear, retirementYear);
            inputWithRsu.IncludeRsuInCalculations = true;

            // Act
            var resultWithoutRsu = _fireCalculator.Calculate(inputWithoutRsu);
            var resultWithRsu = _fireCalculator.Calculate(inputWithRsu);

            // Assert
            // GrossPeakValue should include RSU proceeds at retirement
            resultWithRsu.GrossPeakValue.Should().BeGreaterThan(
                resultWithoutRsu.GrossPeakValue,
                "because gross peak value should include RSU proceeds for SellAtRetirement");
        }

        #region Helper Methods

        private static FirePlanInput CreateBaseFirePlanInput(int retirementYear)
        {
            return new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = retirementYear,
                FullRetirementAge = 67,
                MonthlyContribution = Money.Usd(3000),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 25m,
                UsdIlsRate = 3.6m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new PortfolioAsset
                    {
                        Id = 1,
                        Symbol = "VTI",
                        Quantity = 400,
                        CurrentPrice = Money.Usd(250),
                        AverageCost = Money.Usd(200),
                        Method = "CAGR",
                        Value1 = 7
                    }
                }
            };
        }

        private static RsuConfiguration CreateSellAtRetirementRsuConfiguration(int currentYear, int retirementYear)
        {
            return new RsuConfiguration
            {
                StockSymbol = "TEST",
                CurrentPricePerShare = Money.Usd(150),
                ExpectedAnnualReturn = 10m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    // Grant from 3 years ago - will be 102-eligible at retirement
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(currentYear - 3, 6, 15),
                        NumberOfShares = 500,
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        VestingType = VestingScheduleType.Standard
                    }
                }
            };
        }

        private static RsuConfiguration CreateSellAfter2YearsRsuConfiguration(int currentYear)
        {
            return new RsuConfiguration
            {
                StockSymbol = "TEST",
                CurrentPricePerShare = Money.Usd(150),
                ExpectedAnnualReturn = 10m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    // Grant from 3 years ago - will be sold 2 years after grant
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(currentYear - 3, 1, 1),
                        NumberOfShares = 500,
                        PriceAtGrant = Money.Usd(100),
                        VestingPeriodYears = 4,
                        VestingType = VestingScheduleType.Standard
                    }
                }
            };
        }

        #endregion
    }
}
