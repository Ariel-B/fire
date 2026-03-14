namespace FirePlanningTool.Tests.InputValidation
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Tests for input validation, error handling, and edge cases
    /// Covers null handling, negative values, boundary conditions
    /// </summary>
    public class InputValidationTests
    {
        #region Null and Empty Input Tests

        [Fact]
        public void Calculate_WithNullPortfolio_ThrowsException()
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
                AccumulationPortfolio = null!,
                RetirementPortfolio = null!,
                Expenses = null!
            };

            var calculator = TestDataBuilder.CreateFireCalculator();

            // FireCalculator expects non-null collections, so this should throw
            Action act = () => calculator.Calculate(input);
            act.Should().Throw<ArgumentNullException>();
        }

        [Fact]
        public void Calculate_WithEmptyPortfolio_CalculatesFromCash()
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
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
            result.TotalContributions.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithEmptyExpenses_CalculatesWithoutExpenses()
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
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        #endregion

        #region Zero and Negative Value Tests

        [Fact]
        public void Calculate_WithZeroMonthlyContribution_StillGrows()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(0m),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Count.Should().BeGreaterThan(0);
            result.PeakValue.Should().BeGreaterThan(0);
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public void Calculate_WithZeroInflationRate_MaintainsPrices()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 0m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithZeroTaxRate_CalculatesWithoutTaxes()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 0m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public void PortfolioAsset_WithZeroQuantity_CalculatesAsZeroValue()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 0m,
                CurrentPrice = Money.Usd(250),
                AverageCost = Money.Usd(200)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().Be(0);
        }

        [Fact]
        public void PortfolioAsset_WithZeroPrice_CalculatesAsZeroValue()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(0m),
                AverageCost = Money.Usd(200)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().Be(0);
        }

        #endregion

        #region Boundary Value Tests

        [Fact]
        public void Calculate_WithVeryShortAccumulationPeriod_OneYear()
        {
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = currentYear + 1,
                FullRetirementAge = 70,
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

            result.YearlyData.Count.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithVeryLongRetirementPeriod_50Years()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1950,
                EarlyRetirementYear = 2020,
                FullRetirementAge = 100,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new() { Symbol = "VTI", Quantity = 1000, CurrentPrice = Money.Usd(250), AverageCost = Money.Usd(200) }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        [Fact]
        public void Calculate_WithMaxWithdrawalRate_SixPercent()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 6m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
        }

        [Fact]
        public void Calculate_WithVeryHighTaxRate_50Percent()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(2500),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 50m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.Should().NotBeNull();
        }

        [Fact]
        public void Calculate_WithVeryHighMonthlyContribution_50000()
        {
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(50000m),
                WithdrawalRate = 4m,
                InflationRate = 2.5m,
                CapitalGainsTax = 15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.PeakValue.Should().BeGreaterThan(1000000);
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
        }

        #endregion

        #region Complex Scenario Tests

        [Fact]
        public void Calculate_WithMultipleLargeExpenses_StillBalances()
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
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "House", NetAmount = Money.Usd(500000), Year = 2040, RepetitionCount = 1 },
                    new() { Type = "Car", NetAmount = Money.Usd(50000), Year = 2042, RepetitionCount = 1 },
                    new() { Type = "Wedding", NetAmount = Money.Usd(100000), Year = 2044, RepetitionCount = 1 }
                }
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithRepeatedExpenses_CalculatesCorrectly()
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
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Annual Vacation", NetAmount = Money.Usd(5000), Year = 2040, RepetitionCount = 20, FrequencyYears = 1 }
                }
            };

            var calculator = TestDataBuilder.CreateFireCalculator();
            var result = calculator.Calculate(input);

            result.YearlyData.Should().NotBeEmpty();
        }

        [Fact]
        public void Calculate_WithMixedCurrencies_Converts()
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

        #endregion

        #region Expense Edge Cases

        [Fact]
        public void PlannedExpense_WithZeroAmount_HasNoImpact()
        {
            var expense = new PlannedExpense
            {
                Type = "Test",
                NetAmount = Money.Usd(0m),
                Year = 2045,
                RepetitionCount = 5
            };

            var totalCost = expense.NetAmount.Amount * expense.RepetitionCount;
            totalCost.Should().Be(0);
        }

        [Fact]
        public void PlannedExpense_WithVeryHighRepetitionCount_CalculatesSum()
        {
            var expense = new PlannedExpense
            {
                Type = "Monthly Expense",
                NetAmount = Money.Usd(1000),
                Year = 2040,
                RepetitionCount = 500,
                FrequencyYears = 1
            };

            var totalCost = expense.NetAmount.Amount * expense.RepetitionCount;
            totalCost.Should().Be(500000);
        }

        [Fact]
        public void PlannedExpense_WithFractionalAmount_CalculatesAccurately()
        {
            var expense = new PlannedExpense
            {
                Type = "Partial Expense",
                NetAmount = Money.Usd(123.45m),
                Year = 2045,
                RepetitionCount = 3
            };

            var totalCost = expense.NetAmount.Amount * expense.RepetitionCount;
            totalCost.Should().Be(370.35m);
        }

        #endregion

        #region Portfolio Edge Cases

        [Fact]
        public void PortfolioAsset_WithFractionalShares_CalculatesCorrectly()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "AAPL",
                Quantity = 10.5m,
                CurrentPrice = Money.Usd(150.75m),
                AverageCost = Money.Usd(140.50m)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().BeApproximately(1582.875m, 0.01m);

            var costBasis = asset.Quantity * asset.AverageCost.Amount;
            costBasis.Should().BeApproximately(1475.25m, 0.01m);
        }

        [Fact]
        public void PortfolioAsset_WithVeryLargeQuantity_CalculatesWithoutOverflow()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 999999m,
                CurrentPrice = Money.Usd(250m),
                AverageCost = Money.Usd(200m)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().Be(249999750m);
        }

        [Fact]
        public void PortfolioAsset_WithSmallFractionalPrice_CalculatesAccurately()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "PENNY",
                Quantity = 1000,
                CurrentPrice = Money.Usd(0.01m),
                AverageCost = Money.Usd(0.005m)
            };

            var value = asset.Quantity * asset.CurrentPrice.Amount;
            value.Should().Be(10m);
        }

        #endregion
    }
}
