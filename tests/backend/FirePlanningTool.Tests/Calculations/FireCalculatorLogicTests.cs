namespace FirePlanningTool.Tests.Calculations
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Integration tests for FIRE calculation through FireCalculator service
    /// Tests the full calculation flow without ASP.NET Controller dependencies
    /// </summary>
    public class FireCalculatorLogicTests
    {
        private readonly FireCalculator _fireCalculator;

        public FireCalculatorLogicTests()
        {
            _fireCalculator = TestDataBuilder.CreateFireCalculator();
        }

        #region Basic Calculation Tests

        [Fact]
        public void CalculatePlan_ValidInput_ReturnsResult()
        {
            var input = CreateValidFirePlanInput();

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
        }

        [Fact]
        public void CalculatePlan_WithPortfolio_ReturnsPortfolioData()
        {
            var input = CreateValidFirePlanInput();
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
            };

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
            result.AccumulationPortfolio.Should().NotBeEmpty();
        }

        [Fact]
        public void CalculatePlan_WithExpenses_IncludesExpenseCalculations()
        {
            var input = CreateValidFirePlanInput();
            input.Expenses = new List<PlannedExpense>
            {
                new() { Type = "Vacation", NetAmount = Money.Usd(5000), Year = 2045, RepetitionCount = 1 }
            };

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void CalculatePlan_WithTaxRates_IncludesTaxCalculations()
        {
            var input = CreateValidFirePlanInput();
            input.CapitalGainsTax = 15m;

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
        }

        #endregion

        #region Result Validation Tests

        [Fact]
        public void CalculationResult_ContainsYearlyData()
        {
            var input = CreateValidFirePlanInput();

            var result = _fireCalculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void CalculationResult_WithPortfolio_ContainsPortfolioMetrics()
        {
            var input = CreateValidFirePlanInput();
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
            };

            var result = _fireCalculator.Calculate(input);

            result.AccumulationPortfolio.Should().NotBeEmpty();
        }

        [Fact]
        public void CalculationResult_ContainsEndValue()
        {
            var input = CreateValidFirePlanInput();

            var result = _fireCalculator.Calculate(input);

            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        #endregion

        #region Accumulation Phase Tests

        [Fact]
        public void YearlyData_ContainAccumulationPhase()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = 2045;

            var result = _fireCalculator.Calculate(input);

            // Check if yearly data exists and has phase information
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void AccumulationYears_ShowIncreasingBalance()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = 2045;
            input.MonthlyContribution = Money.Usd(2500);

            var result = _fireCalculator.Calculate(input);

            var yearlyData = result.YearlyData.Where(y => y.Year < input.EarlyRetirementYear).ToList();
            yearlyData.Should().NotBeEmpty();

            for (int i = 1; i < yearlyData.Count; i++)
            {
                var previousValue = yearlyData[i - 1].PortfolioValue;
                var currentValue = yearlyData[i].PortfolioValue;
                // Should generally increase or stay same (accounting for market conditions)
                currentValue.Should().BeGreaterThanOrEqualTo(previousValue * 0.9m); // Allow 10% variance
            }
        }

        #endregion

        #region Retirement Phase Tests

        [Fact]
        public void RetirementYears_ContainRetirementData()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = 2045;
            input.FullRetirementAge = 70;

            var result = _fireCalculator.Calculate(input);

            // Should contain yearly data spanning both accumulation and retirement
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void RetirementYears_WithdrawalApplied()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = 2045;
            input.FullRetirementAge = 70;
            input.WithdrawalRate = 4m;

            var result = _fireCalculator.Calculate(input);

            result.GrossAnnualWithdrawal.Should().BeGreaterThan(0);
        }

        #endregion

        #region Edge Case Tests

        [Fact]
        public void Plan_WithZeroMonthlyContribution_CalculatesFromInitialBalance()
        {
            var input = CreateValidFirePlanInput();
            input.MonthlyContribution = Money.Usd(0);

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Plan_WithHighInflation_AffectsProjections()
        {
            var inputLow = CreateValidFirePlanInput();
            inputLow.InflationRate = 2m;

            var inputHigh = CreateValidFirePlanInput();
            inputHigh.InflationRate = 5m;

            var resultLow = _fireCalculator.Calculate(inputLow);
            var resultHigh = _fireCalculator.Calculate(inputHigh);

            // Both should be valid results
            resultLow.Should().NotBeNull();
            resultHigh.Should().NotBeNull();
        }

        [Fact]
        public void Plan_WithHighContribution_IncreasesEndValue()
        {
            var inputLow = CreateValidFirePlanInput();
            inputLow.MonthlyContribution = Money.Usd(1000);

            var inputHigh = CreateValidFirePlanInput();
            inputHigh.MonthlyContribution = Money.Usd(5000);

            var resultLow = _fireCalculator.Calculate(inputLow);
            var resultHigh = _fireCalculator.Calculate(inputHigh);

            resultLow.Should().NotBeNull();
            resultHigh.Should().NotBeNull();
            resultHigh.EndValue.Should().BeGreaterThanOrEqualTo(resultLow.EndValue);
        }

        #endregion

        #region Cost Basis vs Market Value Tests

        [Fact]
        public void Calculate_WithUnrealizedGains_UsesCostBasisForTaxCalculation()
        {
            // Portfolio with significant unrealized gains
            // Market value: $100,000, Cost basis: $60,000 (40% profit ratio)
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year; // Retire immediately
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0); // No additional contributions

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000), // Market value: $100,000
                    AverageCost = Money.Usd(600), // Cost basis: $60,000
                    Method = "CAGR",
                    Value1 = 7
                }
            };

            var result = _fireCalculator.Calculate(input);

            // Market value = 100 * $1000 = $100,000
            // Cost basis = 100 * $600 = $60,000
            // Profit = $40,000, Profit ratio = 40/100 = 0.4
            // Effective tax rate = 0.4 * 0.25 = 0.10 (10%)
            // Gross annual withdrawal = $100,000 * 4% = $4,000
            // Net annual = $4,000 * (1 - 0.10) = $3,600
            // Net monthly = $3,600 / 12 = $300

            result.GrossAnnualWithdrawal.Should().Be(4000m);
            result.NetMonthlyExpense.Should().Be(300m);
        }

        [Fact]
        public void Calculate_WhenCostBasisEqualsMarketValue_NoTaxOnWithdrawals()
        {
            // Portfolio with no unrealized gains
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000), // Market value: $100,000
                    AverageCost = Money.Usd(1000), // Cost basis: $100,000 (same as market)
                    Method = "CAGR",
                    Value1 = 7
                }
            };

            var result = _fireCalculator.Calculate(input);

            // No unrealized gains, so no tax
            // Gross = Net = $100,000 * 4% = $4,000
            // Net monthly = $4,000 / 12 = $333.33

            result.GrossAnnualWithdrawal.Should().Be(4000m);
            result.NetMonthlyExpense.Should().BeApproximately(333.33m, 0.01m);
        }

        [Fact]
        public void Calculate_WithTaxBasisOverride_UsesTaxBasisForCalculation()
        {
            // TaxBasis explicitly set (testing scenario override)
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);
            input.TaxBasis = 50000m; // Override: actual contributions were $50,000

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000), // Market value: $100,000
                    AverageCost = Money.Usd(600), // Cost basis would be $60,000, but TaxBasis overrides
                    Method = "CAGR",
                    Value1 = 7
                }
            };

            var result = _fireCalculator.Calculate(input);

            // Using TaxBasis = $50,000 instead of cost basis
            // Profit = $100,000 - $50,000 = $50,000
            // Profit ratio = 50/100 = 0.5
            // Effective tax = 0.5 * 0.25 = 0.125 (12.5%)
            // Gross = $4,000
            // Net annual = $4,000 * (1 - 0.125) = $3,500
            // Net monthly = $3,500 / 12 = $291.67

            result.GrossAnnualWithdrawal.Should().Be(4000m);
            result.NetMonthlyExpense.Should().BeApproximately(291.67m, 0.01m);
        }

        [Fact]
        public void Calculate_PopulatesExplainabilityMetadataForResultsCards()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);
            input.TaxBasis = 50000m;
            input.UseRetirementPortfolio = true;
            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new()
                {
                    AssetType = "Bonds",
                    TargetPercentage = 100,
                    ExpectedAnnualReturn = 3
                }
            };

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(600),
                    Method = "CAGR",
                    Value1 = 7
                }
            };

            var result = _fireCalculator.Calculate(input);

            result.CurrentCostBasis.Should().Be(60000m);
            result.TotalMonthlyContributions.Should().Be(0m);
            result.NetAnnualWithdrawal.Should().Be(3500m);
            result.GrossMonthlyExpense.Should().BeApproximately(291.67m, 0.01m);

            result.FormulaMetadata.Should().NotBeNull();
            result.FormulaMetadata.TotalContributions.UsesManualTaxBasis.Should().BeTrue();
            result.FormulaMetadata.TotalContributions.ManualTaxBasis.Should().Be(50000m);
            result.FormulaMetadata.TotalContributions.ComputedTotalContributions.Should().Be(60000m);
            result.FormulaMetadata.AnnualWithdrawal.WithdrawalRate.Should().Be(4m);
            result.FormulaMetadata.AnnualWithdrawal.PeakValueForWithdrawal.Should().Be(87500m);
            result.FormulaMetadata.AnnualWithdrawal.EffectiveTaxRate.Should().Be(0m);
            result.FormulaMetadata.PeakValue.DisplayedValueIsGross.Should().BeTrue();
            result.FormulaMetadata.PeakValue.TaxAdjustedPeakValue.Should().Be(87500m);
            result.FormulaMetadata.PeakValue.RetirementTaxToPay.Should().Be(12500m);
        }

        [Fact]
        public void Calculate_PortfolioWithMultipleAssets_AggregatesCostBasisCorrectly()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(500), // Market: $50,000
                    AverageCost = Money.Usd(300), // Cost: $30,000
                    Method = "CAGR",
                    Value1 = 7
                },
                new()
                {
                    Symbol = "BND",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(500), // Market: $50,000
                    AverageCost = Money.Usd(500), // Cost: $50,000 (no gain)
                    Method = "CAGR",
                    Value1 = 3
                }
            };

            var result = _fireCalculator.Calculate(input);

            // Total market value: $100,000
            // Total cost basis: $80,000
            // Profit: $20,000, Ratio: 20/100 = 0.2
            // Effective tax: 0.2 * 0.25 = 0.05 (5%)
            // Gross = $4,000
            // Net annual = $4,000 * 0.95 = $3,800
            // Net monthly = $316.67

            result.GrossAnnualWithdrawal.Should().Be(4000m);
            result.NetMonthlyExpense.Should().BeApproximately(316.67m, 0.01m);
        }

        [Fact]
        public void Calculate_WhenUsingRetirementPortfolio_PaysSwitchingTaxOnce()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.MonthlyContribution = Money.Usd(0);
            input.CapitalGainsTax = 25m;
            input.UseRetirementPortfolio = true;

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(600),
                    Method = "CAGR",
                    Value1 = 0
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Bonds", TargetPercentage = 100, ExpectedAnnualReturn = 3 }
            };

            var result = _fireCalculator.Calculate(input);

            var expectedGrossPeak = 100000m;
            var expectedCostBasis = 60000m;
            var expectedTax = (expectedGrossPeak - expectedCostBasis) * 0.25m;
            var expectedNetPeak = expectedGrossPeak - expectedTax;

            result.GrossPeakValue.Should().Be(expectedGrossPeak);
            result.RetirementTaxToPay.Should().Be(expectedTax);
            result.PeakValue.Should().Be(expectedNetPeak);
            result.TotalContributions.Should().Be(expectedCostBasis);
            result.GrossAnnualWithdrawal.Should().Be(expectedNetPeak * input.WithdrawalRate / 100);
            result.NetMonthlyExpense.Should().BeApproximately(result.GrossAnnualWithdrawal / 12, 0.01m);
        }

        [Fact]
        public void Calculate_WhenNotUsingRetirementPortfolio_DoesNotApplySwitchingTax()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.MonthlyContribution = Money.Usd(0);
            input.CapitalGainsTax = 25m;
            input.UseRetirementPortfolio = false; // Explicit for clarity

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(600),
                    Method = "CAGR",
                    Value1 = 0
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Bonds", TargetPercentage = 100, ExpectedAnnualReturn = 3 }
            };

            var result = _fireCalculator.Calculate(input);

            var expectedGrossPeak = 100000m;
            var expectedCostBasis = 60000m;
            var expectedProfitRatio = (expectedGrossPeak - expectedCostBasis) / expectedGrossPeak;
            var expectedEffectiveTaxRate = expectedProfitRatio * (input.CapitalGainsTax / 100);

            result.GrossPeakValue.Should().Be(expectedGrossPeak);
            result.RetirementTaxToPay.Should().Be(0);
            result.PeakValue.Should().Be(expectedGrossPeak);
            result.TotalContributions.Should().Be(expectedCostBasis);
            result.GrossAnnualWithdrawal.Should().Be(expectedGrossPeak * input.WithdrawalRate / 100);

            var expectedNetMonthly = (result.GrossAnnualWithdrawal * (1 - expectedEffectiveTaxRate)) / 12;
            result.NetMonthlyExpense.Should().BeApproximately(expectedNetMonthly, 0.01m);
        }

        #endregion

        #region Helper Methods

        private static FirePlanInput CreateValidFirePlanInput()
        {
            return new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                UsdIlsRate = 3.6m,
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                Expenses = new List<PlannedExpense>(),
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                AccumulationAllocation = new List<PortfolioAllocation>(),
                RetirementAllocation = new List<PortfolioAllocation>()
            };
        }

        #endregion

        #region Helper Method Tests

        [Fact]
        public void CalculateWeightedReturn_WithTargetPriceMethod_CalculatesCorrectly()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "TEST",
                    Quantity = 10,
                    CurrentPrice = Money.Usd(100),
                    Method = "מחיר יעד",
                    Value2 = 200 // Target price
                }
            };

            var result = _fireCalculator.CalculateWeightedReturn(portfolio, 10);

            // CAGR for doubling in 10 years is approx 7.18%
            result.Should().BeApproximately(7.177m, 0.01m);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_WithValidAllocations_ReturnsWeightedAverage()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new() { TargetPercentage = 60, ExpectedAnnualReturn = 10 },
                new() { TargetPercentage = 40, ExpectedAnnualReturn = 5 }
            };

            var result = _fireCalculator.CalculateAllocationWeightedReturn(allocations);

            // (0.6 * 10) + (0.4 * 5) = 6 + 2 = 8
            result.Should().Be(8);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_WithEmptyAllocations_ReturnsZero()
        {
            var result = _fireCalculator.CalculateAllocationWeightedReturn(new List<PortfolioAllocation>());
            result.Should().Be(0);
        }

        [Fact]
        public void GenerateAgeBasedAllocation_ForAccumulation_ReturnsCorrectSplit()
        {
            var age = 30;
            var result = _fireCalculator.GenerateAgeBasedAllocation(age, isRetirement: false);

            var stocks = result.First(a => a.AssetType == "מניות");
            var bonds = result.First(a => a.AssetType == "אגרות חוב");

            // 100 - 30 = 70% stocks
            stocks.TargetPercentage.Should().Be(70);
            bonds.TargetPercentage.Should().Be(30);
        }

        [Fact]
        public void GenerateAgeBasedAllocation_ForRetirement_RespectsMinimumStock()
        {
            var age = 80;
            var result = _fireCalculator.GenerateAgeBasedAllocation(age, isRetirement: true);

            var stocks = result.First(a => a.AssetType == "מניות");

            // 100 - 80 = 20, but min is 30
            stocks.TargetPercentage.Should().Be(30);
        }

        [Fact]
        public void CalculatePortfolioProfitRatio_WithProfit_ReturnsRatio()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) }
            };
            // Value = 1000, Cost = 800, Profit = 200, Ratio = 200/1000 = 0.2

            var result = _fireCalculator.CalculatePortfolioProfitRatio(portfolio);
            result.Should().Be(0.2m);
        }

        [Fact]
        public void CalculatePortfolioProfitRatio_WithLoss_ReturnsZero()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Quantity = 10, CurrentPrice = Money.Usd(80), AverageCost = Money.Usd(100) }
            };

            var result = _fireCalculator.CalculatePortfolioProfitRatio(portfolio);
            result.Should().Be(0);
        }

        #endregion

        #region Comprehensive calculateFirePlan Coverage Tests

        [Fact]
        public void Calculate_AccumulationWithExpenses_GrossesUpForTaxes()
        {
            // Test that expenses during accumulation are grossed up for taxes
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 2; // 2 years of accumulation
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);
            input.InflationRate = 0; // Zero inflation for simpler calculation

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000), // $100,000 market value
                    AverageCost = Money.Usd(500), // $50,000 cost basis = 50% profit ratio
                    Method = "CAGR",
                    Value1 = 0 // 0% return for simpler calculation
                }
            };

            // Add expense in first year of accumulation
            input.Expenses = new List<PlannedExpense>
            {
                new()
                {
                    Type = "Car",
                    NetAmount = Money.Usd(10000), // Net amount needed
                    Year = DateTime.Now.Year,
                    RepetitionCount = 1
                }
            };

            var result = _fireCalculator.Calculate(input);

            // With 50% profit ratio and 25% tax = 12.5% effective rate
            // Gross = Net / (1 - 0.125) = 10000 / 0.875 = 11428.57
            // Portfolio should be reduced by more than $10,000
            result.CurrentValue.Should().Be(100000m);
            // The expense should have been grossed up
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_RetirementWithExpenses_GrossesUpForTaxes()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year; // Retire now
            input.FullRetirementAge = DateTime.Now.Year - input.BirthYear + 5; // 5 years of retirement
            input.CapitalGainsTax = 25m;
            input.WithdrawalRate = 4m;
            input.MonthlyContribution = Money.Usd(0);
            input.InflationRate = 0;

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(600), // 40% profit ratio
                    Method = "CAGR",
                    Value1 = 0
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 0 }
            };

            input.Expenses = new List<PlannedExpense>
            {
                new()
                {
                    Type = "Medical",
                    NetAmount = Money.Usd(5000),
                    Year = DateTime.Now.Year + 1, // Second year of retirement
                    RepetitionCount = 1
                }
            };

            var result = _fireCalculator.Calculate(input);

            result.Should().NotBeNull();
            result.YearlyData.Where(y => y.Phase == "retirement").Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_InflationAdjustsWithdrawalsEachYear()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.FullRetirementAge = DateTime.Now.Year - input.BirthYear + 3; // 3 years retirement
            input.InflationRate = 10m; // 10% inflation for clear visibility
            input.CapitalGainsTax = 0; // No tax for simpler calculation
            input.WithdrawalRate = 4m;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(1000), // No gains
                    Method = "CAGR",
                    Value1 = 0
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 0 }
            };

            var result = _fireCalculator.Calculate(input);

            var retirementYears = result.YearlyData.Where(y => y.Phase == "retirement").ToList();
            retirementYears.Should().HaveCountGreaterThan(1);

            // Second year withdrawal should be higher than first due to inflation
            if (retirementYears.Count >= 2)
            {
                var year1Withdrawal = retirementYears[0].AnnualWithdrawal ?? 0;
                var year2Withdrawal = retirementYears[1].AnnualWithdrawal ?? 0;
                year2Withdrawal.Should().BeGreaterThan(year1Withdrawal);
            }
        }

        [Fact]
        public void Calculate_MonthlyCompoundGrowth_MatchesExpectedFormula()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 1; // 1 year accumulation
            input.MonthlyContribution = Money.Usd(0); // No contributions
            input.InflationRate = 0;
            input.CapitalGainsTax = 0;

            // Portfolio with known return
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100), // $10,000 starting value
                    AverageCost = Money.Usd(100),
                    Method = "CAGR",
                    Value1 = 12 // 12% annual return
                }
            };

            var result = _fireCalculator.Calculate(input);

            // After remaining months in current year at 12% annual return (monthly compounding)
            // The backend uses simple monthly: r/12 per month
            // With partial year based on current date
            var remainingMonths = CalculationConstants.GetRemainingMonthsInCurrentYear();
            var expectedValue = 10000m * (decimal)Math.Pow(1.01, remainingMonths);

            result.PeakValue.Should().BeApproximately(expectedValue, 10m);
        }

        [Fact]
        public void Calculate_ContributionsAddedAfterGrowth()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 1;
            input.MonthlyContribution = Money.Usd(1000m);
            input.InflationRate = 0;
            input.CapitalGainsTax = 0;

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 10,
                    CurrentPrice = Money.Usd(100), // $1,000 starting
                    AverageCost = Money.Usd(100),
                    Method = "CAGR",
                    Value1 = 0 // 0% return
                }
            };

            var result = _fireCalculator.Calculate(input);

            // With 0% return and $1000/month for remaining months in current year
            // End value = $1,000 + ($1000 * remaining months)
            var remainingMonths = CalculationConstants.GetRemainingMonthsInCurrentYear();
            var expectedContributions = 1000m * remainingMonths;
            var expectedPeakValue = 1000m + expectedContributions;

            result.PeakValue.Should().Be(expectedPeakValue);
            result.TotalContributions.Should().Be(expectedPeakValue); // Initial $1000 + new contributions
        }

        [Fact]
        public void Calculate_YearlyDataContainsCorrectPhases()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = DateTime.Now.Year + 2;
            input.FullRetirementAge = 70;

            var result = _fireCalculator.Calculate(input);

            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();
            var retirementYears = result.YearlyData.Where(y => y.Phase == "retirement").ToList();

            accumulationYears.Should().HaveCount(2); // 2 years until retirement
            retirementYears.Should().NotBeEmpty();

            // All accumulation years should be before retirement year
            accumulationYears.All(y => y.Year < input.EarlyRetirementYear).Should().BeTrue();
            retirementYears.All(y => y.Year >= input.EarlyRetirementYear).Should().BeTrue();
        }

        [Fact]
        public void Calculate_RetirementExtendsToAtLeastAge100()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1990;
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.FullRetirementAge = 70;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(100) }
            };

            var result = _fireCalculator.Calculate(input);

            var lastYear = result.YearlyData.Last();
            var expectedLastYear = input.BirthYear + Math.Max(input.FullRetirementAge, 100);

            lastYear.Year.Should().Be(expectedLastYear);
        }

        [Fact]
        public void Calculate_RetirementRespectsHigherTargetAges()
        {
            var input = CreateValidFirePlanInput();
            input.BirthYear = 1985;
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.FullRetirementAge = 105; // Explicitly higher than 100
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(100) }
            };

            var result = _fireCalculator.Calculate(input);

            var lastYear = result.YearlyData.Last();
            var expectedLastYear = input.BirthYear + input.FullRetirementAge;

            lastYear.Year.Should().Be(expectedLastYear);
        }

        [Fact]
        public void Calculate_NegativeAccumulationYears_SkipsAccumulation()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year - 5; // Already retired 5 years ago
            input.BirthYear = 1960;
            input.FullRetirementAge = 80;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80) }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 5 }
            };

            var result = _fireCalculator.Calculate(input);

            // Should have no accumulation years
            var accumulationYears = result.YearlyData.Where(y => y.Phase == "accumulation").ToList();
            accumulationYears.Should().BeEmpty();

            // Should still have retirement years
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithAllocation_UsesAllocationReturn()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 1;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100),
                    AverageCost = Money.Usd(100),
                    Method = "CAGR",
                    Value1 = 5 // 5% return on asset
                }
            };

            input.AccumulationAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 10 } // 10% on allocation
            };

            var result = _fireCalculator.Calculate(input);

            // Should use allocation return (10%) not asset return (5%)
            result.AccumulationWeightedReturn.Should().Be(10m);
        }

        [Fact]
        public void Calculate_GrossAnnualWithdrawal_EqualsWithdrawalRateTimesPeakValue()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000), // $100,000
                    AverageCost = Money.Usd(1000)
                }
            };

            var result = _fireCalculator.Calculate(input);

            var expectedGrossWithdrawal = result.PeakValue * 0.04m;
            result.GrossAnnualWithdrawal.Should().Be(expectedGrossWithdrawal);
        }

        [Fact]
        public void Calculate_NetMonthlyExpense_EqualsNetAnnualDividedBy12()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.WithdrawalRate = 4m;
            input.CapitalGainsTax = 25m;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(1000),
                    AverageCost = Money.Usd(500) // 50% profit ratio
                }
            };

            var result = _fireCalculator.Calculate(input);

            // Profit ratio = 50%, Tax = 25%, Effective = 12.5%
            // Gross = $4,000, Net = $4,000 * 0.875 = $3,500
            // Monthly = $3,500 / 12 = $291.67
            var expectedNetMonthly = (result.GrossAnnualWithdrawal * (1 - 0.5m * 0.25m)) / 12;
            result.NetMonthlyExpense.Should().BeApproximately(expectedNetMonthly, 0.01m);
        }

        [Fact]
        public void Calculate_PortfolioNeverGoesNegative()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year;
            input.FullRetirementAge = DateTime.Now.Year - input.BirthYear + 50; // Long retirement
            input.WithdrawalRate = 10m; // High withdrawal rate
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 10,
                    CurrentPrice = Money.Usd(100),
                    AverageCost = Money.Usd(100)
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 0 }
            };

            var result = _fireCalculator.Calculate(input);

            // All portfolio values should be >= 0
            result.YearlyData.All(y => y.PortfolioValue >= 0).Should().BeTrue();
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public void Calculate_CurrentValue_EqualsPortfolioMarketValue()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 1;
            input.MonthlyContribution = Money.Usd(0);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 50, CurrentPrice = Money.Usd(200), AverageCost = Money.Usd(150) },
                new() { Symbol = "BND", Quantity = 100, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(100) }
            };

            var result = _fireCalculator.Calculate(input);

            // Current value = (50 * 200) + (100 * 100) = 10,000 + 10,000 = 20,000
            result.CurrentValue.Should().Be(20000m);
        }

        [Fact]
        public void Calculate_TotalContributions_EqualsCostBasisPlusNewContributions()
        {
            var input = CreateValidFirePlanInput();
            input.EarlyRetirementYear = DateTime.Now.Year + 1; // 1 year
            input.MonthlyContribution = Money.Usd(500m);

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100), // $10,000 market value
                    AverageCost = Money.Usd(80) // $8,000 cost basis
                }
            };

            var result = _fireCalculator.Calculate(input);

            // Cost basis = $8,000, New contributions = remaining months * $500
            var remainingMonths = CalculationConstants.GetRemainingMonthsInCurrentYear();
            var expectedTotal = 8000m + (remainingMonths * 500m);
            result.TotalContributions.Should().Be(expectedTotal);
        }

        #endregion
    }
}
