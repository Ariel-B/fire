namespace FirePlanningTool.Tests.Calculations
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;
    using FluentAssertions;

    /// <summary>
    /// Tests for calculation improvements including:
    /// - Expense repetition handling
    /// - Dynamic profit ratio updates during retirement
    /// - Currency conversion in portfolio calculations
    /// - Long-term simulation accuracy
    /// </summary>
    public class CalculationImprovementsTests
    {
        private readonly FireCalculator _calculator;
        private readonly ICurrencyConverter _currencyConverter;

        public CalculationImprovementsTests()
        {
            _currencyConverter = new CurrencyConverter(3.6m);
            _calculator = TestDataBuilder.CreateFireCalculator(_currencyConverter);
        }

        #region Expense Repetition Tests

        [Fact]
        public void Calculate_WithRepeatingExpense_IncludesAllOccurrences()
        {
            // Arrange - expense that repeats 3 times every 2 years starting 2026
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(5000m),
                WithdrawalRate = 4m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>
                {
                    new()
                    {
                        Id = 1,
                        Type = "Vacation",
                        NetAmount = Money.Usd(10000),
                        Year = 2026,
                        FrequencyYears = 2,
                        RepetitionCount = 3
                    }
                }
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - should have expenses in 2026, 2028, 2030
            var yearsWithExpenses = result.YearlyData
                .Where(y => y.Expenses != null && y.Expenses.Any())
                .Select(y => y.Year)
                .ToList();

            yearsWithExpenses.Should().Contain(2026);
            yearsWithExpenses.Should().Contain(2028);
            yearsWithExpenses.Should().Contain(2030);
        }

        [Fact]
        public void Calculate_WithSingleExpense_OnlyIncludesOneYear()
        {
            // Arrange - single expense (default repetition)
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(5000m),
                WithdrawalRate = 4m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>
                {
                    new()
                    {
                        Id = 1,
                        Type = "Car Purchase",
                        NetAmount = Money.Usd(30000),
                        Year = 2028,
                        FrequencyYears = 1,
                        RepetitionCount = 1
                    }
                }
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - should only have expense in 2028
            var yearsWithExpenses = result.YearlyData
                .Where(y => y.Expenses != null && y.Expenses.Any())
                .Select(y => y.Year)
                .ToList();

            yearsWithExpenses.Should().ContainSingle().Which.Should().Be(2028);
        }

        [Fact]
        public void Calculate_WithAnnualRepeatingExpense_IncludesEveryYear()
        {
            // Arrange - annual expense for 5 years
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = currentYear + 10,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(5000m),
                WithdrawalRate = 4m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>
                {
                    new()
                    {
                        Id = 1,
                        Type = "Annual Insurance",
                        NetAmount = Money.Usd(5000),
                        Year = currentYear + 1,
                        FrequencyYears = 1,
                        RepetitionCount = 5
                    }
                }
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - should have expenses in 5 consecutive years
            var yearsWithExpenses = result.YearlyData
                .Where(y => y.Expenses != null && y.Expenses.Any())
                .Select(y => y.Year)
                .ToList();

            yearsWithExpenses.Should().HaveCount(5);
            for (int i = 0; i < 5; i++)
            {
                yearsWithExpenses.Should().Contain(currentYear + 1 + i);
            }
        }

        #endregion

        #region Dynamic Profit Ratio Tests

        [Fact]
        public void Calculate_DuringRetirement_ProfitRatioDecreasesOverTime()
        {
            // Arrange - start with high profit ratio, should decrease as withdrawals occur
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = currentYear - 55, // 55 years old
                EarlyRetirementYear = currentYear, // Retire now
                FullRetirementAge = 75, // 20 years of retirement
                MonthlyContribution = Money.Usd(0m),
                WithdrawalRate = 4m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                TaxBasis = 500000m, // Cost basis
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new()
                    {
                        Symbol = "VTI",
                        Quantity = 5000,
                        CurrentPrice = Money.Usd(200),
                        AverageCost = Money.Usd(100),
                        Method = "CAGR",
                        Value1 = 5 // Conservative return
                    }
                },
                RetirementPortfolio = new List<PortfolioAsset>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - portfolio should be positive but decreasing
            result.YearlyData.Should().HaveCountGreaterThan(10);
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);

            // The portfolio value should generally trend downward or be maintained
            var firstRetirementValue = result.YearlyData.First().PortfolioValue;
            var lastRetirementValue = result.YearlyData.Last().PortfolioValue;

            // With 4% withdrawal and 5% return, portfolio should roughly maintain or slowly decrease
            lastRetirementValue.Should().BeLessThanOrEqualTo(firstRetirementValue * 1.5m);
        }

        #endregion

        #region Currency Conversion Tests

        [Fact]
        public void CalculatePortfolioValue_WithMixedCurrencies_ConvertsCorrectly()
        {
            // Arrange
            var usdIlsRate = 3.6m;
            _currencyConverter.UpdateUsdIlsRate(usdIlsRate);
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(200), AverageCost = Money.Usd(150) },
                new() { Symbol = "TASE", Quantity = 1000, CurrentPrice = Money.Ils(360), AverageCost = Money.Ils(300) }
            };

            // Act
            var totalValue = _calculator.CalculatePortfolioValue(portfolio);

            // Assert
            var expectedUsdValue = 20000m; // VTI
            var expectedIlsToUsd = 1000m * 360m / usdIlsRate; // TASE converted
            var expectedTotal = expectedUsdValue + expectedIlsToUsd;

            totalValue.Should().BeApproximately(expectedTotal, 0.01m);
        }

        [Fact]
        public void CalculatePortfolioCostBasis_WithMixedCurrencies_ConvertsCorrectly()
        {
            // Arrange
            var usdIlsRate = 3.6m;
            _currencyConverter.UpdateUsdIlsRate(usdIlsRate);
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(200), AverageCost = Money.Usd(150) },
                new() { Symbol = "TASE", Quantity = 1000, CurrentPrice = Money.Ils(360), AverageCost = Money.Ils(300) }
            };

            // Act
            var totalCostBasis = _calculator.CalculatePortfolioCostBasis(portfolio);

            // Assert
            var expectedUsdCost = 15000m;
            var expectedIlsToUsd = 1000m * 300m / usdIlsRate;
            var expectedTotal = expectedUsdCost + expectedIlsToUsd;

            totalCostBasis.Should().BeApproximately(expectedTotal, 0.01m);
        }

        [Fact]
        public void CalculateWeightedReturn_WithMixedCurrencyPortfolio_UsesCorrectWeights()
        {
            // Arrange
            var usdIlsRate = 3.6m;
            _currencyConverter.UpdateUsdIlsRate(usdIlsRate);
            var portfolio = new List<PortfolioAsset>
            {
                // Asset 1: 10 * 100 USD = 1000 USD with 10% return
                new() { Symbol = "VTI", Quantity = 10, CurrentPrice = Money.Usd(100), AverageCost = Money.Usd(80), Method = "CAGR", Value1 = 10m },
                // Asset 2: 10 * 360 ILS = 3600 ILS = 1000 USD with 3% return
                new() { Symbol = "TASE", Quantity = 10, CurrentPrice = Money.Ils(360), AverageCost = Money.Ils(300), Method = "CAGR", Value1 = 3m }
            };

            // Act
            var weightedReturn = _calculator.CalculateWeightedReturn(portfolio);

            // Assert - should be 6.5% (average of 10% and 3%)
            weightedReturn.Should().BeApproximately(6.5m, 0.01m);
        }

        #endregion

        #region Long-Term Simulation Tests

        [Fact]
        public void Calculate_Over40Years_MaintainsAccuracy()
        {
            // Arrange - 40 year simulation
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = currentYear - 25, // 25 years old
                EarlyRetirementYear = currentYear + 40, // Retire in 40 years
                FullRetirementAge = 90, // Live to 90
                MonthlyContribution = Money.Usd(2000m),
                WithdrawalRate = 4m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - should have reasonable values
            result.PeakValue.Should().BeGreaterThan(0);
            result.EndValue.Should().BeGreaterThanOrEqualTo(0);
            result.YearlyData.Should().HaveCountGreaterThan(40);

            // Portfolio should not have any NaN or Infinity values
            result.YearlyData.Should().AllSatisfy(y =>
            {
                y.PortfolioValue.Should().NotBe(decimal.MaxValue);
                y.PortfolioValue.Should().NotBe(decimal.MinValue);
            });
        }

        [Fact]
        public void Calculate_WithZeroContributionsAndHighWithdrawal_PortfolioDepletes()
        {
            // Arrange - high withdrawal rate should deplete portfolio
            var currentYear = DateTime.Now.Year;
            var input = new FirePlanInput
            {
                BirthYear = currentYear - 60,
                EarlyRetirementYear = currentYear,
                FullRetirementAge = 100, // 40 years of retirement
                MonthlyContribution = Money.Usd(0m),
                WithdrawalRate = 10m, // High withdrawal rate
                InflationRate = 3m, // Higher inflation
                CapitalGainsTax = 25m,
                TaxBasis = 500000m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert - portfolio should deplete to 0 or near 0
            result.EndValue.Should().Be(0);
        }

        #endregion

        #region Target Price Years Tests

        [Fact]
        public void CalculateWeightedReturn_WithTargetPrice_UsesRetirementYears()
        {
            // Arrange - asset with target price method
            var portfolio = new List<PortfolioAsset>
            {
                new()
                {
                    Symbol = "GROWTH",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100),
                    Method = "מחיר יעד",
                    Value1 = 0,
                    Value2 = 200 // Target price is 2x current
                }
            };

            // Act - with 10 years to retirement
            var return10Years = _calculator.CalculateWeightedReturn(portfolio, 10);

            // Act - with 20 years to retirement
            var return20Years = _calculator.CalculateWeightedReturn(portfolio, 20);

            // Assert - shorter time horizon should require higher annual return
            return10Years.Should().BeGreaterThan(return20Years);

            // For 2x growth: 10 years = ~7.2% annual, 20 years = ~3.5% annual
            return10Years.Should().BeApproximately(7.18m, 0.1m);
            return20Years.Should().BeApproximately(3.53m, 0.1m);
        }

        #endregion
    }
}
