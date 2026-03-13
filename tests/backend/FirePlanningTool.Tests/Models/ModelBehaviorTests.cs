namespace FirePlanningTool.Tests.Models
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;

    /// <summary>
    /// Tests for data model behavior, properties, and calculations
    /// Validates model logic and consistency
    /// </summary>
    public class ModelBehaviorTests
    {
        #region FirePlanInput Tests

        [Fact]
        public void FirePlanInput_DefaultValues_AreSet()
        {
            var input = new FirePlanInput();

            input.Currency.Should().Be("$");
            input.MonthlyContribution.Currency.Should().Be("USD");
            input.AdjustContributionsForInflation.Should().BeFalse();
            input.UsdIlsRate.Should().Be(3.6m);
            input.InvestmentStrategy.Should().Be("fixed");
            input.CurrentPortfolioValue.Should().Be(0);
        }

        [Fact]
        public void FirePlanInput_Collections_InitializeEmpty()
        {
            var input = new FirePlanInput();

            input.Expenses.Should().BeEmpty();
            input.AccumulationPortfolio.Should().BeEmpty();
            input.RetirementPortfolio.Should().BeEmpty();
            input.AccumulationAllocation.Should().BeEmpty();
            input.RetirementAllocation.Should().BeEmpty();
        }

        [Fact]
        public void FirePlanInput_CanSetAllProperties()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2050,
                FullRetirementAge = 75,
                TaxBasis = 100000,
                MonthlyContribution = Money.Usd(3000),
                AdjustContributionsForInflation = true,
                UseRetirementPortfolio = true,
                IncludeRsuInCalculations = false,
                UsdIlsRate = 4.0m,
                WithdrawalRate = 3.5m,
                InflationRate = 3.0m,
                CapitalGainsTax = 20m,
                InvestmentStrategy = "targetDate",
                PensionNetMonthly = Money.Ils(4200),
                TargetMonthlyExpense = Money.Usd(8000),
            };

            input.BirthYear.Should().Be(1990);
            input.EarlyRetirementYear.Should().Be(2050);
            input.FullRetirementAge.Should().Be(75);
            input.TaxBasis.Should().Be(100000);
            input.MonthlyContribution.Amount.Should().Be(3000);
            input.AdjustContributionsForInflation.Should().BeTrue();
            input.UseRetirementPortfolio.Should().BeTrue();
            input.IncludeRsuInCalculations.Should().BeFalse();
            input.PensionNetMonthly.Should().Be(Money.Ils(4200));
            input.TargetMonthlyExpense.Should().Be(Money.Usd(8000));
            input.WithdrawalRate.Should().Be(3.5m);
        }

        #endregion

        #region PlannedExpense Tests

        [Fact]
        public void PlannedExpense_DefaultValues_AreSet()
        {
            var expense = new PlannedExpense();

            expense.Type.Should().Be(string.Empty);
            expense.NetAmount.Currency.Should().Be("USD");
            expense.FrequencyYears.Should().Be(1);
            expense.RepetitionCount.Should().Be(1);
        }

        [Fact]
        public void PlannedExpense_OneTimeExpense_HasRepetitionOne()
        {
            var expense = new PlannedExpense
            {
                Type = "OneTime",
                NetAmount = Money.Usd(5000),
                RepetitionCount = 1
            };

            expense.RepetitionCount.Should().Be(1);
        }

        [Fact]
        public void PlannedExpense_AnnualExpense_HasFrequencyOne()
        {
            var expense = new PlannedExpense
            {
                Type = "Annual",
                NetAmount = Money.Usd(2000),
                FrequencyYears = 1,
                RepetitionCount = 10
            };

            expense.FrequencyYears.Should().Be(1);
        }

        [Fact]
        public void PlannedExpense_BiennialExpense_HasFrequencyTwo()
        {
            var expense = new PlannedExpense
            {
                Type = "Biennial",
                NetAmount = Money.Usd(3000),
                FrequencyYears = 2,
                RepetitionCount = 5
            };

            expense.FrequencyYears.Should().Be(2);
        }

        [Fact]
        public void RsuSummary_CanReadSalesAndForfeitureMetrics()
        {
            var summary = new RsuSummary
            {
                TotalSharesSold = 120,
                TotalSharesForfeited = 30,
                TotalProceedsToDate = 150000m,
                TotalTaxesPaid = 42000m,
                ForfeitedValue = 18000m,
                ForfeiturePercentage = 12.5m,
            };

            summary.TotalSharesSold.Should().Be(120);
            summary.TotalSharesForfeited.Should().Be(30);
            summary.TotalProceedsToDate.Should().Be(150000m);
            summary.TotalTaxesPaid.Should().Be(42000m);
            summary.ForfeitedValue.Should().Be(18000m);
            summary.ForfeiturePercentage.Should().Be(12.5m);
        }

        #endregion

        #region PortfolioAsset Tests

        [Fact]
        public void PortfolioAsset_DefaultValues_AreSet()
        {
            var asset = new PortfolioAsset();

            asset.Symbol.Should().Be(string.Empty);
            asset.CurrentPrice.Currency.Should().Be("USD");
            asset.AverageCost.Currency.Should().Be("USD");
            asset.Method.Should().Be("CAGR");
        }

        [Fact]
        public void PortfolioAsset_CanCalculateValue()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(250)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().Be(25000);
        }

        [Fact]
        public void PortfolioAsset_CanCalculateCostBasis()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                AverageCost = Money.Usd(200)
            };

            var costBasis = asset.Quantity * asset.AverageCost.Amount;
            costBasis.Should().Be(20000);
        }

        [Fact]
        public void PortfolioAsset_CanCalculateGain()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(250),
                AverageCost = Money.Usd(200)
            };

            var currentValue = asset.Quantity * asset.CurrentPrice.Amount;
            var costBasis = asset.Quantity * asset.AverageCost.Amount;
            var gain = currentValue - costBasis;

            gain.Should().Be(5000);
        }

        [Fact]
        public void PortfolioAsset_WithMultipleMethods_StoresCorrectly()
        {
            var cagrAsset = new PortfolioAsset { Symbol = "A", Method = "CAGR", Value1 = 7 };
            var annualAsset = new PortfolioAsset { Symbol = "B", Method = "Annual", Value1 = 8 };

            cagrAsset.Method.Should().Be("CAGR");
            annualAsset.Method.Should().Be("Annual");
        }

        #endregion

        #region PortfolioAllocation Tests

        [Fact]
        public void PortfolioAllocation_DefaultValues_AreSet()
        {
            var allocation = new PortfolioAllocation();

            allocation.AssetType.Should().Be(string.Empty);
            allocation.Description.Should().Be(string.Empty);
        }

        [Fact]
        public void PortfolioAllocation_CanSetPercentage()
        {
            var allocation = new PortfolioAllocation
            {
                AssetType = "Stocks",
                TargetPercentage = 70
            };

            allocation.TargetPercentage.Should().Be(70);
        }

        [Fact]
        public void PortfolioAllocation_CanSetExpectedReturn()
        {
            var allocation = new PortfolioAllocation
            {
                AssetType = "Stocks",
                ExpectedAnnualReturn = 8
            };

            allocation.ExpectedAnnualReturn.Should().Be(8);
        }

        [Fact]
        public void PortfolioAllocation_AllocationsSumTo100Percent()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 70 },
                new() { AssetType = "Bonds", TargetPercentage = 30 }
            };

            var totalPercentage = allocations.Sum(a => a.TargetPercentage);
            totalPercentage.Should().Be(100);
        }

        #endregion

        #region FireCalculationResult Tests

        [Fact]
        public void FireCalculationResult_DefaultValues_AreSet()
        {
            var result = new FireCalculationResult();

            result.TotalContributions.Should().Be(0);
            result.PeakValue.Should().Be(0);
            result.EndValue.Should().Be(0);
            result.GrossAnnualWithdrawal.Should().Be(0);
            result.NetMonthlyExpense.Should().Be(0);
            result.YearlyData.Should().BeEmpty();
            result.AccumulationPortfolio.Should().BeEmpty();
            result.RetirementPortfolio.Should().BeEmpty();
        }

        [Fact]
        public void FireCalculationResult_CanSetValues()
        {
            var result = new FireCalculationResult
            {
                TotalContributions = 500000,
                PeakValue = 2000000,
                EndValue = 1500000,
                GrossAnnualWithdrawal = 60000,
                NetMonthlyExpense = 5000
            };

            result.TotalContributions.Should().Be(500000);
            result.PeakValue.Should().Be(2000000);
            result.EndValue.Should().Be(1500000);
            result.GrossAnnualWithdrawal.Should().Be(60000);
        }

        [Fact]
        public void FireCalculationResult_CanContainYearlyData()
        {
            var result = new FireCalculationResult
            {
                YearlyData = new List<YearlyData>
                {
                    new() { Year = 2025, PortfolioValue = 100000, Phase = "Accumulation" },
                    new() { Year = 2026, PortfolioValue = 110000, Phase = "Accumulation" }
                }
            };

            result.YearlyData.Count.Should().Be(2);
            result.YearlyData[0].Year.Should().Be(2025);
        }

        [Fact]
        public void FireCalculationResult_WeightedReturnsCalculated()
        {
            var result = new FireCalculationResult
            {
                AccumulationWeightedReturn = 7.5m,
                RetirementWeightedReturn = 5.0m
            };

            result.AccumulationWeightedReturn.Should().Be(7.5m);
            result.RetirementWeightedReturn.Should().Be(5.0m);
        }

        #endregion

        #region YearlyData Tests

        [Fact]
        public void YearlyData_DefaultValues_AreSet()
        {
            var data = new YearlyData();

            data.Year.Should().Be(0);
            data.PortfolioValue.Should().Be(0);
            data.TotalContributions.Should().Be(0);
            data.Phase.Should().Be(string.Empty);
            data.Expenses.Should().BeEmpty();
        }

        [Fact]
        public void YearlyData_CanSetPhase()
        {
            var data = new YearlyData
            {
                Year = 2025,
                Phase = "Accumulation"
            };

            data.Phase.Should().Be("Accumulation");
        }

        [Fact]
        public void YearlyData_CanContainExpenses()
        {
            var data = new YearlyData
            {
                Year = 2025,
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Vacation", NetAmount = Money.Usd(5000) },
                    new() { Type = "Home", NetAmount = Money.Usd(10000) }
                }
            };

            data.Expenses.Count.Should().Be(2);
            data.Expenses.Sum(e => e.NetAmount.Amount).Should().Be(15000);
        }

        #endregion

        #region FirePlanData Tests

        [Fact]
        public void FirePlanData_DefaultValues_AreSet()
        {
            var data = new FirePlanData();

            data.Inputs.Should().NotBeNull();
            data.RsuConfiguration.Should().BeNull();
            data.IncludeRsuInCalculations.Should().BeTrue();
            data.Expenses.Should().BeEmpty();
            data.AccumulationPortfolio.Should().BeEmpty();
            data.RetirementPortfolio.Should().BeEmpty();
            data.InvestmentStrategy.Should().Be("fixed");
            data.CurrentPortfolioValue.Should().Be("0");
        }

        [Fact]
        public void FirePlanData_CanContainAllData()
        {
            var data = new FirePlanData
            {
                Inputs = new FirePlanInputs { BirthYear = "1990" },
                RsuConfiguration = new RsuConfiguration
                {
                    StockSymbol = "MSFT",
                    CurrentPricePerShare = Money.Usd(400),
                    Grants = new List<RsuGrant>
                    {
                        new() { Id = 1, GrantDate = new DateTime(2024, 1, 1), NumberOfShares = 100, PriceAtGrant = Money.Usd(300) }
                    }
                },
                IncludeRsuInCalculations = false,
                Expenses = new List<PlannedExpense> { new() { Type = "Test", NetAmount = Money.Usd(1000) } },
                AccumulationPortfolio = new List<PortfolioAsset> { new() { Symbol = "VTI", Quantity = 100 } },
                InvestmentStrategy = "targetDate",
                CurrentPortfolioValue = "500000"
            };

            data.Inputs.Should().NotBeNull();
            data.RsuConfiguration.Should().NotBeNull();
            data.RsuConfiguration!.StockSymbol.Should().Be("MSFT");
            data.IncludeRsuInCalculations.Should().BeFalse();
            data.Expenses.Count.Should().Be(1);
            data.AccumulationPortfolio.Count.Should().Be(1);
            data.CurrentPortfolioValue.Should().Be("500000");
        }

        #endregion

        #region FirePlanInputs Tests

        [Fact]
        public void FirePlanInputs_DefaultValues_AreSet()
        {
            var inputs = new FirePlanInputs();

            inputs.BirthYear.Should().Be(string.Empty);
            inputs.EarlyRetirementYear.Should().Be(string.Empty);
            inputs.FullRetirementAge.Should().Be(string.Empty);
            inputs.MonthlyContribution.Should().Be(string.Empty);
            inputs.Currency.Should().Be("₪");
            inputs.WithdrawalRate.Should().Be(string.Empty);
            inputs.InflationRate.Should().Be(string.Empty);
            inputs.CapitalGainsTax.Should().Be(string.Empty);
        }

        [Fact]
        public void FirePlanInputs_CanSetAllProperties()
        {
            var inputs = new FirePlanInputs
            {
                BirthYear = "1990",
                EarlyRetirementYear = "2050",
                FullRetirementAge = "70",
                MonthlyContribution = "3000",
                Currency = "$",
                WithdrawalRate = "4",
                InflationRate = "2.5",
                CapitalGainsTax = "15"
            };

            inputs.BirthYear.Should().Be("1990");
            inputs.MonthlyContribution.Should().Be("3000");
            inputs.Currency.Should().Be("$");
        }

        #endregion
    }
}
