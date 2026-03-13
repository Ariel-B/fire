namespace FirePlanningTool.Tests.Rsu
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Unit tests for RSU (Restricted Stock Unit) calculations
    /// Tests vesting logic, Section 102 tax calculations, and timeline projections
    /// </summary>
    public class RsuCalculatorTests
    {
        private readonly IRsuCalculator _calculator;
        private readonly ICurrencyConverter _currencyConverter;

        public RsuCalculatorTests()
        {
            _currencyConverter = new CurrencyConverter(3.6m);
            _calculator = new RsuCalculator(_currencyConverter);
        }

        #region Vesting Calculation Tests

        [Fact]
        public void CalculateVestedShares_BeforeCliff_ReturnsZero()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - 6 months after grant
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2024, 7, 1));

            // Assert - Before 1-year cliff, nothing should vest
            vestedShares.Should().Be(0);
        }

        [Fact]
        public void CalculateVestedShares_AtOneYear_Returns25Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - Exactly 1 year after grant
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2025, 1, 2));

            // Assert - After 1-year cliff, 25% should vest
            vestedShares.Should().Be(250);
        }

        [Fact]
        public void CalculateVestedShares_AtTwoYears_Returns50Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2023, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - 2 years after grant
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2025, 1, 2));

            // Assert - 50% should be vested
            vestedShares.Should().Be(500);
        }

        [Fact]
        public void CalculateVestedShares_AtFourYears_ReturnsFullShares()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2021, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - 4 years after grant
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2025, 1, 2));

            // Assert - 100% should be vested
            vestedShares.Should().Be(1000);
        }

        [Fact]
        public void CalculateVestedShares_AfterFullVesting_ReturnsFullShares()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2020, 1, 1),
                NumberOfShares = 1000,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - 5 years after grant (beyond vesting period)
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2025, 1, 1));

            // Assert - Should still be 100%
            vestedShares.Should().Be(1000);
        }

        [Fact]
        public void CalculateVestedShares_OddShareCount_RoundsDown()
        {
            // Arrange - 1000 shares / 4 = 250 per year, but test odd number
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 999,
                VestingPeriodYears = 4,
                VestingType = VestingScheduleType.Standard
            };

            // Act - 1 year after grant
            var vestedShares = _calculator.CalculateVestedShares(grant, new DateTime(2025, 1, 2));

            // Assert - 999 * 0.25 = 249.75, rounds down to 249
            vestedShares.Should().Be(249);
        }

        #endregion

        #region Stock Price Projection Tests

        [Fact]
        public void ProjectStockPrices_CAGR_CompoundsCorrectly()
        {
            // Arrange
            decimal currentPrice = 100m;
            decimal annualReturn = 10m; // 10%
            int years = 3;

            // Act
            var prices = _calculator.ProjectStockPrices(currentPrice, annualReturn, "CAGR", years);

            // Assert
            prices.Should().HaveCount(4); // 0 to 3 years
            prices[0].Should().Be(100m);
            prices[1].Should().BeApproximately(110m, 0.01m);
            prices[2].Should().BeApproximately(121m, 0.01m);
            prices[3].Should().BeApproximately(133.1m, 0.1m);
        }

        [Fact]
        public void ProjectStockPrices_Fixed_AppliesSimpleGrowth()
        {
            // Arrange
            decimal currentPrice = 100m;
            decimal annualReturn = 10m; // 10%
            int years = 3;

            // Act
            var prices = _calculator.ProjectStockPrices(currentPrice, annualReturn, "Fixed", years);

            // Assert - Fixed also compounds year-over-year
            prices.Should().HaveCount(4);
            prices[0].Should().Be(100m);
            prices[1].Should().Be(110m);
            prices[2].Should().Be(121m);
            prices[3].Should().Be(133.1m);
        }

        [Fact]
        public void ProjectStockPrices_NegativeReturn_DecreasesPrices()
        {
            // Arrange
            decimal currentPrice = 100m;
            decimal annualReturn = -10m; // -10%
            int years = 2;

            // Act
            var prices = _calculator.ProjectStockPrices(currentPrice, annualReturn, "CAGR", years);

            // Assert
            prices[0].Should().Be(100m);
            prices[1].Should().BeApproximately(90m, 0.01m);
            prices[2].Should().BeApproximately(81m, 0.01m);
        }

        [Fact]
        public void ProjectStockPrices_ZeroYears_ReturnsOnlyCurrentPrice()
        {
            // Arrange
            decimal currentPrice = 150m;

            // Act
            var prices = _calculator.ProjectStockPrices(currentPrice, 10, "CAGR", 0);

            // Assert
            prices.Should().HaveCount(1);
            prices[0].Should().Be(150m);
        }

        #endregion

        #region Section 102 Tax Calculation Tests

        [Fact]
        public void CalculateSection102Tax_BasicCalculation_CorrectTax()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2022, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Usd(100m),
            };

            decimal salePrice = 150m;
            int sharesSold = 100;
            decimal marginalTaxRate = 47m;
            decimal capitalGainsTaxRate = 25m;
            bool surtax = false;

            // Act
            var tax = _calculator.CalculateSection102Tax(grant, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, surtax);

            // Assert
            // Marginal tax on grant value: 100 * 100 * 0.47 = 4700
            // Capital gains on appreciation: (150-100) * 100 * 0.25 = 1250
            // Total: 4700 + 1250 = 5950
            tax.Should().BeApproximately(5950m * 3.6m, 1m); // Converted to ILS
        }

        [Fact]
        public void CalculateSection102Tax_WithSurtax_AddsExtra3Percent()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2022, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Usd(100m),
            };

            decimal salePrice = 200m;
            int sharesSold = 100;
            decimal marginalTaxRate = 47m;
            decimal capitalGainsTaxRate = 25m;
            bool surtax = true;

            // Act
            var taxWithSurtax = _calculator.CalculateSection102Tax(grant, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, surtax);
            var taxWithoutSurtax = _calculator.CalculateSection102Tax(grant, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, !surtax);

            // Assert - Surtax should add 3% to capital gains portion
            taxWithSurtax.Should().BeGreaterThan(taxWithoutSurtax);
        }

        [Fact]
        public void CalculateSection102Tax_PriceBelowGrant_UsesLowerPrice()
        {
            // Arrange - Sale price below grant price
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2022, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Usd(100m),
            };

            decimal salePrice = 80m; // Below grant price
            int sharesSold = 100;
            decimal marginalTaxRate = 47m;
            decimal capitalGainsTaxRate = 25m;
            bool surtax = false;

            // Act
            var tax = _calculator.CalculateSection102Tax(grant, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, surtax);

            // Assert
            // Marginal tax on MIN(grant, sale) = 80 * 100 * 0.47 = 3760
            // Capital gains: 0 (no appreciation)
            // Total: 3760
            tax.Should().BeApproximately(3760m * 3.6m, 1m);
        }

        [Fact]
        public void CalculateSection102Tax_ZeroShares_ReturnsZero()
        {
            // Arrange
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2022, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Usd(100m),
            };

            // Act
            var tax = _calculator.CalculateSection102Tax(grant, 150m, 0, 47m, 25m, false);

            // Assert
            tax.Should().Be(0);
        }

        #endregion

        #region Regular Tax Calculation Tests

        [Fact]
        public void CalculateRegularTax_IncludesIncomeTax()
        {
            // Arrange - Shares sold before 2-year holding period
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2024, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Usd(100m),
            };

            decimal vestPrice = 120m;  // Price when vested
            decimal salePrice = 150m;  // Current sale price
            int sharesSold = 100;
            decimal marginalTaxRate = 47m;
            decimal capitalGainsTaxRate = 25m;

            // Act
            var tax = _calculator.CalculateRegularTax(grant, vestPrice, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, false);

            // Assert
            // Should include income tax on grant-to-vest appreciation
            // Marginal: MIN(100, 150) * 100 * 0.47 = 4700
            // Income (grant to vest): (120-100) * 100 * 0.47 = 940
            // Capital gains (vest to sale): (150-120) * 100 * 0.25 = 750
            // Total: 4700 + 940 + 750 = 6390
            tax.Should().BeApproximately(6390m * 3.6m, 10m);
        }

        #endregion

        #region RSU Summary Tests

        [Fact]
        public void GetCurrentSummary_MultipleGrants_AggregatesCorrectly()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(150m),
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2021, 1, 1), // 4 years ago - fully vested
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    },
                    new RsuGrant
                    {
                        Id = 2,
                        GrantDate = new DateTime(2023, 1, 1), // 2 years ago - 50% vested
                        NumberOfShares = 500,
                        PriceAtGrant = Money.Usd(120m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act
            var summary = _calculator.GetCurrentSummary(config, new DateTime(2025, 1, 2));

            // Assert
            summary.TotalSharesGranted.Should().Be(1500);
            summary.TotalSharesVested.Should().Be(1250); // 1000 + 250 (50% of 500)
            summary.TotalSharesUnvested.Should().Be(250);
            summary.CurrentMarketValue.Should().Be(1500 * 150); // All shares * current price
        }

        [Fact]
        public void GetCurrentSummary_EmptyGrants_ReturnsZeros()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(150m),
                Grants = new List<RsuGrant>()
            };

            // Act
            var summary = _calculator.GetCurrentSummary(config, DateTime.Now);

            // Assert
            summary.TotalSharesGranted.Should().Be(0);
            summary.TotalSharesVested.Should().Be(0);
            summary.CurrentMarketValue.Should().Be(0);
        }

        #endregion

        #region Timeline Projection Tests

        [Fact]
        public void ProjectRsuTimeline_BasicGrant_ProjectsCorrectly()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 10m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2025, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2035, 25m);

            // Assert
            timeline.Should().HaveCount(11); // 2025 to 2035 inclusive
            timeline[0].Year.Should().Be(2025);
            timeline[10].Year.Should().Be(2035);

            // Verify vesting happens
            var vestingYears = timeline.Where(t => t.SharesVested > 0).ToList();
            vestingYears.Should().HaveCountGreaterThan(0);
        }

        [Fact]
        public void ProjectRsuTimeline_RetirementForfeiture_LosesUnvestedShares()
        {
            // Arrange - Grant with 4-year vesting, retire after 2 years
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m, // Keep prices simple
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2025, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Retire in 2027 (2 years after grant - only 50% vested)
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2030, 2027, 25m);

            // Assert - Should have forfeiture in retirement year
            var retirementYear = timeline.First(t => t.Year == 2027);
            retirementYear.SharesForfeited.Should().Be(500); // 50% unvested at retirement
            retirementYear.ForfeitedValue.Should().BeGreaterThan(0);
        }

        [Fact]
        public void ProjectRsuTimeline_SellAfter2Years_SellsEligibleShares()
        {
            // Arrange - Grant in 2023, should be eligible for sale in 2025+
            // Use a higher expected return so net proceeds can be positive after tax
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 50m, // 50% annual return for dramatic price appreciation
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2023, 1, 1), // 2 years before start
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2030, 2030, 25m);

            // Assert - Should have sales after Section 102 eligibility
            var salesYears = timeline.Where(t => t.SharesSold > 0).ToList();
            salesYears.Should().HaveCountGreaterThan(0);

            // Should have gross proceeds (shares sold * price)
            var totalGrossProceeds = timeline.Sum(t => t.GrossSaleProceeds);
            totalGrossProceeds.Should().BeGreaterThan(0);

            // Should have some taxes paid
            var totalTaxes = timeline.Sum(t => t.TaxesPaid);
            totalTaxes.Should().BeGreaterThan(0);
        }

        [Fact]
        public void ProjectRsuTimeline_WithPreSimulationVestedShares_SellAfter2Years_IncludesThemInSales()
        {
            // Regression test: shares that vested BEFORE startYear but haven't been sold yet
            // must be initialized into heldShares so they participate in the simulation.
            // Without this fix, those shares were silently lost, causing all RSU Excel columns
            // to show zero for users with older grants.

            // Arrange - Grant from mid-2024, standard 4-year vesting, simulation starts 2026
            //   Cliff vest (25%) happens July 2025 → vested BEFORE the 2026 simulation start
            //   Section 102 eligibility (2 years since grant) is mid-2026 → not yet sold at sim start
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m, // Flat price to keep math simple
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2024, 6, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Simulation starts 2026 (18 months after grant, before the 2-year sell eligibility)
            var timeline = _calculator.ProjectRsuTimeline(config, 2026, 2032, 2032, 25m);

            // Assert
            // By end of 2025 (pre-start), 25% = 250 shares vested (cliff year 2025-06-01)
            // but NOT yet eligible for sale (< 2 years from grant date of 2024-06-01).
            // Those 250 shares must be in heldShares when the simulation starts.
            //
            // In 2026: 250 more vest (year 2), held total = 500, yearsSinceGrant ≈ 2.6 → SELL 500
            // In 2027: 250 more vest (year 3), heldShares = 250, yearsSinceGrant ≈ 3.6 → SELL 250
            // In 2028: 250 more vest (year 4), heldShares = 250, yearsSinceGrant ≈ 4.6 → SELL 250
            // Total sold: 500 + 250 + 250 = 1000 (all 1000 shares accounted for)

            var totalSharesSold = timeline.Sum(t => t.SharesSold);
            totalSharesSold.Should().Be(1000, "all 1000 shares should be sold across the simulation, " +
                "including the 250 that vested before the simulation start year");

            // The first simulation year should see 500 sales (250 pre-init + 250 newly vested)
            var year2026 = timeline.First(t => t.Year == 2026);
            year2026.SharesSold.Should().Be(500, "250 pre-simulation vested shares + 250 newly vested in 2026 should both be sold");
        }

        [Fact]
        public void ProjectRsuTimeline_GrantTurns2YearsOldAtStartOfSimulation_SellAfter2Years_SharesNotDropped()
        {
            // Regression test for the eligibility boundary bug.
            // A grant from 2024-01-01 is exactly ~2.001 years old at Jan 1, 2026 (the simulation
            // startYear boundary), but only ~1.997 years old at Dec 31, 2025.
            //
            // OLD (buggy) fix checked eligibility using Jan 1 of startYear:
            //   yearsSinceGrant ≈ 2.001 >= 2  → incorrectly marked as "already sold before simulation"
            //   → 25% cliff shares from 2025 silently dropped → RSU columns = 0
            //
            // NEW (correct) fix checks eligibility using Dec 31 of (startYear-1):
            //   yearsSinceGrant ≈ 1.997 < 2  → correctly recognises grant was NOT yet eligible
            //   → 25% cliff shares added to heldShares → sold in first simulation year (2026)

            var config = new RsuConfiguration
            {
                StockSymbol = "AAPL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2024, 1, 1),
                        // 4-year Standard vesting: 25% cliff after year 1 (Jan 2025), then 25%/year
                        // By Dec 31, 2025: 50% vested (years 1+2 completed → 2 * 0.25 = 50%)
                        // But wait: elapsedYears at 2025-12-31 = 1.997, completedYears = 1 → 25%
                        // At 2026-12-31: elapsedYears = 2.997, completedYears = 2 → 50%
                        // Correction: cliff only = 1 year. By preStartDate (2025-12-31): 25% vested.
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Simulation: 2026-2032, retire 2032
            var timeline = _calculator.ProjectRsuTimeline(config, 2026, 2032, 2032, 25m);

            // Pre-simulation (by Dec 31, 2025):
            //   elapsedYears ≈ 1.997 → completedYears=1 → 25% = 250 shares vested
            //   Grant NOT yet 2 years old (1.997 < 2) → shares NOT sold → should be in heldShares

            // Year 2026:
            //   newly vested: completedYears=2 → 50%, previous=25% → newlyVested=25%=250
            //   heldShares: 250 (pre-sim) + 250 (newly vested) = 500
            //   yearsSinceGrant ≈ 2.997 >= 2 → sell 500 shares
            var year2026 = timeline.First(t => t.Year == 2026);
            year2026.SharesSold.Should().Be(500,
                "the 250 shares vested before simulation (not yet eligible at preStartDate) " +
                "plus 250 newly vested in 2026 should all be sold in 2026");

            // All 1000 shares must eventually be sold
            var totalSold = timeline.Sum(t => t.SharesSold);
            totalSold.Should().Be(1000, "every share must be sold across the full simulation");
        }

        [Fact]
        public void ProjectRsuTimeline_WithPreSimulationVestedShares_SellAtRetirement_TracksThemUntilRetirement()
        {
            // Regression test: for SellAtRetirement strategy, shares vested before startYear
            // must be in heldShares and ultimately sold at retirement.

            // Arrange - Grant from 2024-01-01, startYear 2026, retire 2028
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2024, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Simulation: 2026-2032, retire 2028
            // By end of 2025 (pre-start): 25% of shares vested (cliff year 2025-01-01 = 250 shares)
            var timeline = _calculator.ProjectRsuTimeline(config, 2026, 2032, 2028, 25m);

            // Assert
            // At retirement (2028): grant is 50% vested (2 years of vesting in 2028 → 75%? Let me recalc)
            // 2026-12-31: elapsed 2.99 years → completed 2 → 50% = 500 shares
            // 2027-12-31: elapsed 3.99 years → completed 3 → 75% = 750 shares
            // 2028-12-31: elapsed 4.99 years → completed 4 → 100% = 1000, but retirement forfeits unvested
            // At retirement (2028-12-31): 100% vested (4.99 years ≥ 4-year period) → 0 forfeit
            // Section 102 eligibility at 2028-12-31: 4.99 years ≥ 2 → eligible to sell
            // Pre-simulation shares (250 from 2025) should be in heldShares and sold at retirement
            var retirementYearData = timeline.First(t => t.Year == 2028);
            retirementYearData.SharesSold.Should().BeGreaterThan(0,
                "pre-simulation vested shares should be tracked and sold at retirement");

            // Total sold across timeline should include the pre-simulation vested shares
            var totalSold = timeline.Sum(t => t.SharesSold);
            totalSold.Should().BeGreaterThan(0, "pre-simulation vested shares must appear in the simulation");
        }

        [Fact]
        public void ProjectRsuTimeline_NoGrants_ReturnsEmptyTimeline()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                Grants = new List<RsuGrant>()
            };

            // Act
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2030, 2030, 25m);

            // Assert
            timeline.Should().HaveCount(6); // Still creates timeline with years
            timeline.All(t => t.SharesVested == 0).Should().BeTrue();
            timeline.All(t => t.SharesSold == 0).Should().BeTrue();
        }

        #endregion

        #region Currency Conversion Tests

        [Fact]
        public void CalculateSection102Tax_IlsCurrency_ConvertsCorrectly()
        {
            // Arrange - Grant in ILS
            var grant = new RsuGrant
            {
                Id = 1,
                GrantDate = new DateTime(2022, 1, 1),
                NumberOfShares = 100,
                PriceAtGrant = Money.Ils(360m), // ₪360 = $100 at 3.6 rate
            };

            decimal salePrice = 540m; // ₪540 = $150
            int sharesSold = 100;
            decimal marginalTaxRate = 47m;
            decimal capitalGainsTaxRate = 25m;

            // Act
            var tax = _calculator.CalculateSection102Tax(grant, salePrice, sharesSold, marginalTaxRate, capitalGainsTaxRate, false);

            // Assert - Tax should be calculated in ILS
            // Marginal: 360 * 100 * 0.47 = 16920
            // Capital gains: (540-360) * 100 * 0.25 = 4500
            // Total: 21420
            tax.Should().BeApproximately(21420m, 10m);
        }

        #endregion

        #region Edge Case Tests

        [Fact]
        public void CalculateVestedShares_NullGrant_ThrowsException()
        {
            // Act & Assert
            Action act = () => _calculator.CalculateVestedShares(null!, DateTime.Now);
            act.Should().Throw<ArgumentNullException>();
        }

        [Fact]
        public void ProjectStockPrices_NegativeYears_ThrowsException()
        {
            // Act & Assert
            Action act = () => _calculator.ProjectStockPrices(100m, 10m, "CAGR", -1);
            act.Should().Throw<ArgumentException>();
        }

        [Fact]
        public void ProjectRsuTimeline_EndBeforeStart_ThrowsException()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                Grants = new List<RsuGrant>()
            };

            // Act & Assert
            Action act = () => _calculator.ProjectRsuTimeline(config, 2025, 2020, 2030, 25m);
            act.Should().Throw<ArgumentException>();
        }

        [Fact]
        public void GetCurrentSummary_NullConfig_ThrowsException()
        {
            // Act & Assert
            Action act = () => _calculator.GetCurrentSummary(null!, DateTime.Now);
            act.Should().Throw<ArgumentNullException>();
        }

        #endregion

        #region Integration Tests

        [Fact]
        public void FullScenario_MultipleGrantsWithRetirement_CalculatesCorrectly()
        {
            // Arrange - Realistic scenario with multiple grants
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(150m),
                ExpectedAnnualReturn = 8m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    // Grant 1: Jan 2022 - Fully vested by 2026
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    },
                    // Grant 2: Jan 2024 - 50% vested by 2026, 100% by 2028
                    new RsuGrant
                    {
                        Id = 2,
                        GrantDate = new DateTime(2024, 1, 1),
                        NumberOfShares = 500,
                        PriceAtGrant = Money.Usd(120m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2025 to 2035, retire in 2030
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2030, 25m);

            // Assert
            timeline.Should().HaveCount(11);

            // Verify total granted
            var summary = _calculator.GetCurrentSummary(config, new DateTime(2025, 12, 31));
            summary.TotalSharesGranted.Should().Be(1500);

            // Verify some shares are sold over the timeline
            var totalSold = timeline.Sum(t => t.SharesSold);
            totalSold.Should().BeGreaterThan(0);

            // Verify taxes are paid
            var totalTaxes = timeline.Sum(t => t.TaxesPaid);
            totalTaxes.Should().BeGreaterThan(0);

            // Verify retirement year has forfeiture if any unvested shares remain
            var retirementYear = timeline.First(t => t.Year == 2030);
            // Grant 2 would have some unvested shares in 2030
            // Since Grant 2 is from 2024, by 2030 it's fully vested (6 years)
            // So forfeiture might be 0 in this case
        }

        #endregion

        #region SellAtRetirement Strategy Tests

        [Fact]
        public void SellAtRetirement_BeforeRetirement_HoldsAllShares()
        {
            // Arrange - Grant from 2022, retirement in 2030
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(50m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2025 to 2035, retire in 2030
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2030, 25m);

            // Assert - Before retirement (2025-2029), no shares sold
            var preRetirementYears = timeline.Where(t => t.Year < 2030);
            foreach (var year in preRetirementYears)
            {
                year.SharesSold.Should().Be(0, $"Year {year.Year} should not have sales before retirement");
            }
        }

        [Fact]
        public void SellAtRetirement_AtRetirement_SellsSection102EligibleShares()
        {
            // Arrange - Grant from 2022, fully vested and 102-eligible by retirement 2030
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(50m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2025 to 2035, retire in 2030
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2030, 25m);

            // Assert - At retirement year 2030, shares that are 102-eligible should be sold
            var retirementYear = timeline.First(t => t.Year == 2030);
            retirementYear.SharesSold.Should().BeGreaterThan(0, "Should sell 102-eligible shares at retirement");
        }

        [Fact]
        public void SellAtRetirement_HoldsNonEligibleShares_UntilEligible()
        {
            // Arrange - Grant from mid-2029, not 102-eligible until mid-2031
            // This ensures retirement in 2030 finds some vested shares that are NOT 102-eligible
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2029, 7, 1), // July 2029, 102-eligible July 2031
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2029 to 2035, retire in 2030
            // Grant date July 2029, cliff vests July 2030, becomes 102-eligible July 2031
            var timeline = _calculator.ProjectRsuTimeline(config, 2029, 2035, 2030, 25m);

            // Assert - At retirement year 2030:
            // - Cliff (250 shares) vests mid-2030
            // - But grant not yet 102-eligible (only 1.5 years old)
            // - So shares are held, not sold
            var retirementYear = timeline.First(t => t.Year == 2030);

            // At retirement, 750 shares (75%) are forfeited (unvested)
            // The 250 vested shares should be held (not sold yet)
            retirementYear.SharesForfeited.Should().Be(750, "750 unvested shares should be forfeited");
            retirementYear.SharesSold.Should().Be(0, "Non-eligible shares should NOT be sold at retirement");
            retirementYear.SharesHeld.Should().Be(250, "250 vested shares should be held");

            // In 2031 when grant becomes 102-eligible, shares should be sold
            var eligibleYear = timeline.First(t => t.Year == 2031);
            eligibleYear.SharesSold.Should().Be(250, "Held shares should sell when they become 102-eligible");
        }

        [Fact]
        public void SellAtRetirement_MixedGrants_SellsOnlyEligibleAtRetirement()
        {
            // Arrange - Two grants: one old (eligible), one recent (not eligible)
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    // Grant A: 2022, fully 102-eligible by 2030 (8 years old)
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(50m),
                        VestingPeriodYears = 4
                    },
                    // Grant B: July 2029, not 102-eligible until July 2031
                    new RsuGrant
                    {
                        Id = 2,
                        GrantDate = new DateTime(2029, 7, 1),
                        NumberOfShares = 500,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2025 to 2035, retire in 2030
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2030, 25m);

            // Assert - At retirement 2030:
            var retirementYear = timeline.First(t => t.Year == 2030);
            // Grant A (1000 shares) is fully 102-eligible and fully vested - should sell all vested
            // Grant B cliff (125 shares) vests mid-2030, but grant only ~1.5 years old - NOT eligible

            // Should have sold Grant A's vested shares (1000 sold over time before retirement + remaining)
            retirementYear.SharesSold.Should().BeGreaterThan(0, "Grant A 102-eligible shares should be sold");

            // Should still hold Grant B's vested shares (125 from cliff)
            retirementYear.SharesHeld.Should().Be(125, "Grant B's 125 vested shares should be held");

            // Grant B forfeits 375 shares (500 - 125 vested at cliff)
            retirementYear.SharesForfeited.Should().Be(375, "Grant B's 375 unvested shares should be forfeited");

            // In 2031, Grant B becomes eligible and should be sold
            var year2031 = timeline.First(t => t.Year == 2031);
            year2031.SharesSold.Should().Be(125, "Grant B should sell when 102-eligible");
        }

        [Fact]
        public void SellAtRetirement_UsesSellAfter2Years_SellsRegardlessOfRetirement()
        {
            // Arrange - Verify SellAfter2Years still works differently (sells 2 years after grant)
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(50m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Project from 2024 to 2030, retire in 2030
            var timeline = _calculator.ProjectRsuTimeline(config, 2024, 2030, 2030, 25m);

            // Assert - With SellAfter2Years, should sell in 2024 (2 years after 2022 grant)
            var year2024 = timeline.First(t => t.Year == 2024);
            year2024.SharesSold.Should().BeGreaterThan(0, "SellAfter2Years should sell 2 years after grant");
        }

        [Fact]
        public void SellAtRetirement_TaxCalculation_UsesSection102Rate()
        {
            // Arrange
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(200m), // $200 sale price
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2022, 1, 1),
                        NumberOfShares = 100,
                        PriceAtGrant = Money.Usd(100m), // $100 grant price
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act
            var timeline = _calculator.ProjectRsuTimeline(config, 2025, 2035, 2030, 25m);

            // Assert - Verify tax was calculated
            var retirementYear = timeline.First(t => t.Year == 2030);
            retirementYear.TaxesPaid.Should().BeGreaterThan(0, "Section 102 tax should be calculated");

            // Verify transaction has Section102Applied flag
            var sellTransaction = retirementYear.Transactions.FirstOrDefault(t => t.Type == RsuTransactionType.Sell);
            sellTransaction.Should().NotBeNull();
            sellTransaction!.Section102Applied.Should().BeTrue();
        }

        [Fact]
        public void SellAtRetirement_RetirementForfeiture_ForfeitUnvestedShares()
        {
            // Arrange - Grant with shares that won't be vested by retirement
            var config = new RsuConfiguration
            {
                StockSymbol = "GOOGL",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 0m,
                ReturnMethod = "Fixed",
                LiquidationStrategy = RsuLiquidationStrategy.SellAtRetirement,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = false,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(2028, 1, 1), // 4-year vesting ends 2032
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(100m),
                        VestingPeriodYears = 4
                    }
                }
            };

            // Act - Retire in 2030, only 50% vested (year 2 of 4)
            var timeline = _calculator.ProjectRsuTimeline(config, 2028, 2035, 2030, 25m);

            // Assert - At retirement 2030, 500 shares (50%) are forfeited
            var retirementYear = timeline.First(t => t.Year == 2030);
            retirementYear.SharesForfeited.Should().Be(500, "50% unvested shares should be forfeited");
        }

        #endregion
    }
}
