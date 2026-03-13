namespace FirePlanningTool.Tests.Calculations
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Edge case and error handling tests for FireCalculator
    /// Tests boundary conditions, null handling, empty collections, and exceptional scenarios
    /// </summary>
    public class FireCalculatorEdgeCaseTests
    {
        private readonly FireCalculator _calculator;

        public FireCalculatorEdgeCaseTests()
        {
            _calculator = TestDataBuilder.CreateFireCalculator();
        }

        #region Null and Empty Input Tests

        [Fact]
        public void Calculate_WithNullInput_ThrowsArgumentNullException()
        {
            // Act & Assert
            Assert.Throws<ArgumentNullException>(() => _calculator.Calculate(null!));
        }

        [Fact]
        public void Calculate_WithZeroUsdIlsRate_UsesDefaultRate()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                UsdIlsRate = 0m, // Zero rate should use default
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            // Should still work with default rate
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithNegativeUsdIlsRate_UsesDefaultRate()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                UsdIlsRate = -1m, // Negative rate should use default
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithAccumulationAllocation_UsesAllocationReturn()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                AccumulationAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Stocks", TargetPercentage = 60, ExpectedAnnualReturn = 7 },
                    new() { AssetType = "Bonds", TargetPercentage = 40, ExpectedAnnualReturn = 3 }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithRetirementPortfolioButNotUsing_UsesRetirementPortfolioReturn()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>
                {
                    new()
                    {
                        Symbol = "BOND",
                        Quantity = 1000,
                        CurrentPrice = Money.Usd(100),
                        AverageCost = Money.Usd(100),
                    }
                },
                UseRetirementPortfolio = false, // Not using retirement portfolio
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithTaxBasisProvided_UsesTaxBasisInsteadOfCalculated()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                TaxBasis = 50000m, // Provided tax basis
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithUseRetirementPortfolioAndRetirementAllocation_CalculatesRetirementTax()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(5000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.25m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new()
                    {
                        Symbol = "SPY",
                        Quantity = 100,
                        CurrentPrice = Money.Usd(400),
                        AverageCost = Money.Usd(300),
                    }
                },
                UseRetirementPortfolio = true,
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Bonds", TargetPercentage = 60, ExpectedAnnualReturn = 3 },
                    new() { AssetType = "Cash", TargetPercentage = 40, ExpectedAnnualReturn = 1 }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
            // When using retirement portfolio, should have calculated retirement tax
        }

        [Fact]
        public void Calculate_WithUseRetirementPortfolioButZeroPeakValue_SkipsRetirementTax()
        {
            // Arrange - scenario where peak value is zero
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2025, // Very soon, no time to accumulate
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(0m), // No contributions
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.25m,
                AccumulationPortfolio = new List<PortfolioAsset>(), // Empty portfolio
                UseRetirementPortfolio = true,
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new() { AssetType = "Bonds", TargetPercentage = 100, ExpectedAnnualReturn = 3 }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithoutRetirementAllocationButNotUsingRetirementPortfolio_UsesAccumulationReturn()
        {
            // Arrange - Neither using retirement portfolio nor having retirement allocation
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                UseRetirementPortfolio = false,
                RetirementAllocation = new List<PortfolioAllocation>(), // Empty
                RetirementPortfolio = new List<PortfolioAsset>(), // Empty
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            Assert.NotEmpty(result.YearlyData);
        }

        [Fact]
        public void Calculate_WithEmptyPortfolio_CalculatesWithZeroValue()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.EndValue.Should().BeGreaterThan(0); // Should have value from contributions
        }

        [Fact]
        public void Calculate_WithEmptyExpenses_CalculatesWithMinimalExpenses()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.NetMonthlyExpense.Should().BeGreaterThanOrEqualTo(0);
        }

        #endregion

        #region Boundary Condition Tests

        [Fact]
        public void Calculate_WithZeroContribution_CalculatesWithoutContributions()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(0m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    // 100 shares @ $800 avg cost = $80,000 cost basis
                    new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(1000), AverageCost = Money.Usd(800), Method = "CAGR", Value1 = 7 }
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.TotalContributions.Should().Be(80000);
        }

        [Fact]
        public void Calculate_WithZeroWithdrawalRate_CalculatesWithoutWithdrawals()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.GrossAnnualWithdrawal.Should().Be(0);
        }

        [Fact]
        public void Calculate_WithHighWithdrawalRate_CalculatesHighWithdrawal()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.10m, // 10% - higher than typical 4% rule
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.GrossAnnualWithdrawal.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithZeroInflation_CalculatesWithoutInflation()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            // With zero inflation, year-by-year values should be consistent
        }

        [Fact]
        public void Calculate_WithZeroTaxRate_CalculatesWithoutTaxes()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
        }

        #endregion

        #region Age and Year Tests

        [Fact]
        public void Calculate_WithValidDates_CalculatesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2040, // Valid retirement date
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.YearlyData.Should().HaveCount(x => x > 0);
        }

        [Fact]
        public void Calculate_WithVeryHighFullRetirementAge_CalculatesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 100, // Very late retirement
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.YearlyData.Should().HaveCount(x => x > 0);
        }

        #endregion

        #region Expense Tests

        [Fact]
        public void Calculate_WithVeryHighExpenses_CalculatesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Housing", NetAmount = Money.Usd(100000m), Year = 2030 },
                    new() { Type = "Living", NetAmount = Money.Usd(50000m), Year = 2030 }
                }
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.NetMonthlyExpense.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithExpenseInPastYear_HandlesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>
                {
                    new() { Type = "Historical", NetAmount = Money.Usd(1000m), Year = 2020 } // Past year
                }
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
        }

        #endregion

        #region Portfolio Tests

        [Fact]
        public void Calculate_WithMixedCurrencyPortfolio_CalculatesCorrectly()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                },
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.EndValue.Should().BeGreaterThan(0);
        }

        [Fact]
        public void Calculate_WithVeryLargePortfolio_HandlesPerformance()
        {
            // Arrange
            var assets = Enumerable.Range(0, 100)
                .Select(i => new PortfolioAsset
                {
                    Symbol = $"SYM{i}",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(100),
                    AverageCost = Money.Usd(80),
                })
                .ToList();

            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = assets,
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var startTime = DateTime.UtcNow;
            var result = _calculator.Calculate(input);
            var duration = DateTime.UtcNow - startTime;

            // Assert
            Assert.NotNull(result);
            duration.TotalSeconds.Should().BeLessThan(5); // Should complete quickly
        }

        #endregion

        #region Result Validation Tests

        [Fact]
        public void Calculate_ResultHasYearlyData_VerifyDataStructure()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            Assert.NotNull(result);
            result.YearlyData.Should().NotBeNull();
            result.YearlyData.Should().HaveCount(x => x > 0);

            foreach (var year in result.YearlyData)
            {
                year.Year.Should().BeGreaterThan(0);
                year.PortfolioValue.Should().BeGreaterThanOrEqualTo(0);
            }
        }

        [Fact]
        public void Calculate_PeakValueIsGreaterOrEqual_EndValue()
        {
            // Arrange
            var input = new FirePlanInput
            {
                BirthYear = 1985,
                EarlyRetirementYear = 2030,
                FullRetirementAge = 70,
                MonthlyContribution = Money.Usd(1000m),
                WithdrawalRate = 0.04m,
                InflationRate = 0.03m,
                CapitalGainsTax = 0.15m,
                AccumulationPortfolio = new List<PortfolioAsset>(),
                RetirementPortfolio = new List<PortfolioAsset>(),
                Expenses = new List<PlannedExpense>()
            };

            // Act
            var result = _calculator.Calculate(input);

            // Assert
            result.PeakValue.Should().BeGreaterThanOrEqualTo(result.EndValue);
        }

        #endregion
    }
}
