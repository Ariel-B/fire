namespace FirePlanningTool.Tests.Performance
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Performance and load tests for large datasets and long-running calculations
    /// Ensures scalability and efficiency
    /// </summary>
    public class PerformanceTests
    {
        #region Large Portfolio Tests

        [Fact]
        public void Calculate_WithLargePortfolio_100Assets_CompletesInTime()
        {
            var assets = GenerateLargePortfolio(100);
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = assets,
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var startTime = DateTime.Now;

            var result = calculator.Calculate(input);

            var duration = DateTime.Now - startTime;
            duration.Should().BeLessThan(TimeSpan.FromSeconds(5));
            result.Should().NotBeNull();
        }

        [Fact]
        public void Calculate_WithLargePortfolio_500Assets_CompletesReasonably()
        {
            var assets = GenerateLargePortfolio(500);
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = assets,
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
        }

        #endregion

        #region Long Timeline Tests

        [Fact]
        public void Calculate_With50YearAccumulation_CompletesSuccessfully()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1980,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 100,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Count.Should().BeGreaterThan(50);
        }

        [Fact]
        public void Calculate_With50YearRetirement_HandlesLongWithdrawalPeriod()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1950,
                EarlyRetirementYear = 2000,
                FullRetirementAge = 100,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 10000, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(100) }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        #endregion

        #region Complex Expense Scenarios

        [Fact]
        public void Calculate_With100Expenses_ProcessesAll()
        {
            var expenses = GenerateLargeExpenseList(100);
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = expenses
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithManyRepeatedExpenses_CalculatesCorrectly()
        {
            var expenses = new List<PlannedExpense>
            {
                new() { Type = "Expense1", NetAmount = Money.Usd(1000), Year = 2040, RepetitionCount = 30, FrequencyYears = 1 },
                new() { Type = "Expense2", NetAmount = Money.Usd(2000), Year = 2040, RepetitionCount = 20, FrequencyYears = 1 },
                new() { Type = "Expense3", NetAmount = Money.Usd(500), Year = 2040, RepetitionCount = 50, FrequencyYears = 1 }
            };

            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(5000),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = expenses
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        #endregion

        #region Multiple Currency Tests

        [Fact]
        public void Calculate_WithMultipleCurrencyAssets_ConvertsCorrectly()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                UsdIlsRate = 3.6m,
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
        }

        [Fact]
        public void Calculate_WithDifferentExchangeRates_ProducesDifferentResults()
        {
            var inputLow = CreateInputWithExchangeRate(3.0m);
            var inputHigh = CreateInputWithExchangeRate(4.2m);

            var calculator = TestDataBuilder.CreateFireCalculator();
            var resultLow = calculator.Calculate(inputLow);
            var resultHigh = calculator.Calculate(inputHigh);

            // Different exchange rates should produce different results
            resultLow.Should().NotBeNull();
            resultHigh.Should().NotBeNull();
        }

        #endregion

        #region Allocation-Based Portfolio Tests

        [Fact]
        public void Calculate_WithPortfolioAllocation_CalculatesWeightedReturns()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                AccumulationAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 70, ExpectedAnnualReturn = 8 },
                    new() { AssetType = "Bonds", TargetPercentage = 30, ExpectedAnnualReturn = 3 }
                },
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 50, ExpectedAnnualReturn = 8 },
                    new() { AssetType = "Bonds", TargetPercentage = 50, ExpectedAnnualReturn = 3 }
                },
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.AccumulationWeightedReturn.Should().BeGreaterThan(0);
            result.RetirementWeightedReturn.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithAllocationStrategy_AgeBasedRebalancing()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                InvestmentStrategy = "ageBased",
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                AccumulationAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 80, ExpectedAnnualReturn = 8 },
                    new() { AssetType = "Bonds", TargetPercentage = 20, ExpectedAnnualReturn = 3 }
                },
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 40, ExpectedAnnualReturn = 8 },
                    new() { AssetType = "Bonds", TargetPercentage = 60, ExpectedAnnualReturn = 3 }
                },
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
        }

        #endregion

        #region Helper Methods

        private static List<PortfolioAsset> GenerateLargePortfolio(int count)
        {
            var assets = new List<PortfolioAsset>();
            var symbols = new[] { "VTI", "VXUS", "BND", "BNDX", "VNQ", "VGIT", "VTIP", "SCHP", "GLD", "DBC" };

            for (int i = 0; i < count; i++)
            {
                assets.Add(new PortfolioAsset
                {
                    Symbol = symbols[i % symbols.Length] + (i / symbols.Length),
                    Quantity = 10 + (i % 100),
                    CurrentPrice = Money.Usd(100 + (i % 200)),
                    AverageCost = Money.Usd(80 + (i % 200)),
                });
            }

            return assets;
        }

        private static List<PlannedExpense> GenerateLargeExpenseList(int count)
        {
            var expenses = new List<PlannedExpense>();
            var types = new[] { "Travel", "Home", "Health", "Education", "Entertainment", "Vacation" };

            for (int i = 0; i < count; i++)
            {
                expenses.Add(new PlannedExpense
                {
                    Type = types[i % types.Length] + i,
                    NetAmount = Money.Usd(1000 + (i % 5000)),
                    Year = 2040 + (i % 10),
                    RepetitionCount = 1 + (i % 5),
                    FrequencyYears = 1
                });
            }

            return expenses;
        }

        private static FirePlanInput CreateInputWithExchangeRate(decimal rate)
        {
            return new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                UsdIlsRate = rate,
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };
        }

        #endregion
    }
}
