using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Integration
{
    /// <summary>
    /// Integration tests for phase calculators, testing service interactions and error handling.
    /// </summary>
    public class PhaseCalculatorsIntegrationTests
    {
        private readonly ICurrencyConverter _currencyConverter;
        private readonly IExpenseCalculator _expenseCalculator;
        private readonly ITaxCalculator _taxCalculator;
        private readonly IAccumulationPhaseCalculator _accumulationPhaseCalculator;
        private readonly IRetirementPhaseCalculator _retirementPhaseCalculator;

        public PhaseCalculatorsIntegrationTests()
        {
            _currencyConverter = new CurrencyConverter();
            _expenseCalculator = new ExpenseCalculator();
            _taxCalculator = new TaxCalculator();
            _accumulationPhaseCalculator = new AccumulationPhaseCalculator();
            _retirementPhaseCalculator = new RetirementPhaseCalculator();
        }

        [Fact]
        public void AccumulationPhase_WithExpensesAndRsu_IntegratesCorrectly()
        {
            // Arrange
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { Year = 2025, NetAmount = Money.Usd(5000), FrequencyYears = 1, RepetitionCount = 1 }
            };

            var rsuData = new Dictionary<int, RsuYearlyData>
            {
                { 2025, new RsuYearlyData { Year = 2025, NetSaleProceeds = 10000, SharesVested = 100, SharesSold = 100 } }
            };

            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 3,
                StartingPortfolioValue = 50000,
                MonthlyContributionUsd = 1000,
                AccumulationReturn = 7.0m,
                InflationRate = 2.0m,
                Expenses = expenses,
                RsuYearlyLookup = rsuData,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 50000
            };

            // Act
            var result = _accumulationPhaseCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            result.EndPortfolioValue.Should().BeGreaterThan(input.StartingPortfolioValue);
            
            // Expected contributions depend on current date:
            // Year 1 (2025): 1000 * remaining months in current year
            // Year 2 (2026): 1000 * 12
            // Year 3 (2027): 1000 * 12
            var remainingMonths = CalculationConstants.GetRemainingMonthsInCurrentYear();
            var expectedMonthlyContributions = (1000 * remainingMonths) + (1000 * 12 * 2);
            
            // RSU net proceeds are now tracked as contributions (similar to monthly savings)
            var expectedRsuProceeds = 10000; // From rsuData in year 2025
            var expectedTotalContributions = expectedMonthlyContributions + expectedRsuProceeds;
            
            result.ActualContributions.Should().Be(expectedTotalContributions, 
                "ActualContributions should include both monthly contributions and RSU net proceeds");
            
            result.YearlyData.Should().HaveCount(3);
            result.YearlyData[0].Expenses.Should().HaveCount(1);
            result.YearlyData[0].RsuSaleProceeds.Should().Be(10000);
        }

        [Fact]
        public void AccumulationPhase_WithInflationAdjustedContributions_OnlyIncreasesOnJanuaryFirst()
        {
            // Arrange
            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                CurrentDate = new DateTime(2025, 7, 15),
                AccumulationYears = 2,
                StartingPortfolioValue = 0,
                MonthlyContributionUsd = 1000,
                AdjustContributionsForInflation = true,
                AccumulationReturn = 0m,
                InflationRate = 12m,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 0
            };

            // Act
            var result = _accumulationPhaseCalculator.Calculate(input);

            // Assert
            result.YearlyData.Should().HaveCount(2);
            result.YearlyData[0].Year.Should().Be(2025);
            result.YearlyData[1].Year.Should().Be(2026);
            result.YearlyData[0].FlowData.MonthlyContributions.Should().Be(6000m);
            result.YearlyData[1].FlowData.MonthlyContributions.Should().Be(13440m);
            result.ActualContributions.Should().Be(19440m);
        }

        [Fact]
        public void AccumulationPhase_WithInflationAdjustedContributions_OnJanuaryFirst_KeepsBaseAmountForThatYear()
        {
            // Arrange
            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                CurrentDate = new DateTime(2025, 1, 1),
                AccumulationYears = 2,
                StartingPortfolioValue = 0,
                MonthlyContributionUsd = 1000,
                AdjustContributionsForInflation = true,
                AccumulationReturn = 0m,
                InflationRate = 10m,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 0
            };

            // Act
            var result = _accumulationPhaseCalculator.Calculate(input);

            // Assert
            result.YearlyData[0].FlowData.MonthlyContributions.Should().Be(12000m);
            result.YearlyData[1].FlowData.MonthlyContributions.Should().Be(13200m);
            result.ActualContributions.Should().Be(25200m);
        }

        [Fact]
        public void RetirementPhase_WithWithdrawalsAndTaxes_IntegratesCorrectly()
        {
            // Arrange
            var input = new RetirementPhaseInput
            {
                EarlyRetirementYear = 2025,
                RetirementYears = 5,
                CurrentYear = 2024,
                StartingPortfolioValue = 1000000,
                InitialGrossAnnualWithdrawal = 40000,
                InitialAnnualWithdrawal = 35000,
                RetirementReturn = 5.0m,
                InflationRate = 2.0m,
                CapitalGainsTax = 25,
                InitialProfitRatio = 0.5m,
                InitialCostBasis = 500000,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                RetirementTaxToPay = 0,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                TaxCalculator = _taxCalculator
            };

            // Act
            var result = _retirementPhaseCalculator.Calculate(input);

            // Assert
            result.Should().NotBeNull();
            // With 5% return and 4% withdrawal, portfolio should grow
            result.EndPortfolioValue.Should().BePositive();
            result.YearlyData.Should().HaveCount(5);
            result.YearlyData.All(y => y.Phase == "retirement").Should().BeTrue();
            result.YearlyData.All(y => y.AnnualWithdrawal > 0).Should().BeTrue();
        }

        [Fact]
        public void AccumulationPhase_WithNullCurrencyConverter_ThrowsArgumentNullException()
        {
            // Arrange
            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 1,
                StartingPortfolioValue = 10000,
                MonthlyContributionUsd = 1000,
                AccumulationReturn = 7.0m,
                InflationRate = 2.0m,
                CurrencyConverter = null!,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 10000
            };

            // Act & Assert
            var action = () => _accumulationPhaseCalculator.Calculate(input);
            action.Should().Throw<ArgumentNullException>()
                .WithParameterName("CurrencyConverter");
        }

        [Fact]
        public void AccumulationPhase_WithNullExpenseCalculator_ThrowsArgumentNullException()
        {
            // Arrange
            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 1,
                StartingPortfolioValue = 10000,
                MonthlyContributionUsd = 1000,
                AccumulationReturn = 7.0m,
                InflationRate = 2.0m,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = null!,
                CurrentPortfolioValue = 10000
            };

            // Act & Assert
            var action = () => _accumulationPhaseCalculator.Calculate(input);
            action.Should().Throw<ArgumentNullException>()
                .WithParameterName("ExpenseCalculator");
        }

        [Fact]
        public void RetirementPhase_WithNullTaxCalculator_ThrowsArgumentNullException()
        {
            // Arrange
            var input = new RetirementPhaseInput
            {
                EarlyRetirementYear = 2025,
                RetirementYears = 1,
                CurrentYear = 2024,
                StartingPortfolioValue = 100000,
                InitialGrossAnnualWithdrawal = 4000,
                InitialAnnualWithdrawal = 3500,
                RetirementReturn = 5.0m,
                InflationRate = 2.0m,
                CapitalGainsTax = 25,
                InitialProfitRatio = 0.5m,
                InitialCostBasis = 50000,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                TaxCalculator = null!
            };

            // Act & Assert
            var action = () => _retirementPhaseCalculator.Calculate(input);
            action.Should().Throw<ArgumentNullException>()
                .WithParameterName("TaxCalculator");
        }

        [Fact]
        public void PhaseCalculators_EndToEnd_ProducesConsistentResults()
        {
            // Arrange - Setup accumulation phase
            var accInput = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 10,
                StartingPortfolioValue = 100000,
                MonthlyContributionUsd = 2000,
                AccumulationReturn = 7.0m,
                InflationRate = 2.0m,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 100000
            };

            // Act - Run accumulation phase
            var accResult = _accumulationPhaseCalculator.Calculate(accInput);

            // Arrange - Setup retirement phase using accumulation results
            var retInput = new RetirementPhaseInput
            {
                EarlyRetirementYear = 2035,
                RetirementYears = 30,
                CurrentYear = 2025,
                StartingPortfolioValue = accResult.EndPortfolioValue,
                InitialGrossAnnualWithdrawal = accResult.EndPortfolioValue * 0.04m,
                InitialAnnualWithdrawal = accResult.EndPortfolioValue * 0.04m * 0.875m,
                RetirementReturn = 5.0m,
                InflationRate = 2.0m,
                CapitalGainsTax = 25,
                InitialProfitRatio = 0.5m,
                InitialCostBasis = 100000 + accResult.ActualContributions,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                RetirementTaxToPay = 0,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                TaxCalculator = _taxCalculator
            };

            // Act - Run retirement phase
            var retResult = _retirementPhaseCalculator.Calculate(retInput);

            // Assert - Verify consistency across phases
            accResult.EndPortfolioValue.Should().BeGreaterThan(100000);
            retResult.YearlyData.Should().HaveCount(30);
            // Allow for growth/withdrawals in first year (±10000 tolerance for retirement tax and first year dynamics)
            retResult.YearlyData[0].PortfolioValue.Should().BeApproximately(accResult.EndPortfolioValue, 10000);
        }

        [Fact]
        public void AccumulationPhase_WithHighExpenses_CanDepleteFunds()
        {
            // Arrange - High expenses that exceed contributions
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { Year = 2025, NetAmount = Money.Usd(50000), FrequencyYears = 1, RepetitionCount = 1 }
            };

            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 1,
                StartingPortfolioValue = 10000,
                MonthlyContributionUsd = 1000,
                AccumulationReturn = 5.0m,
                InflationRate = 2.0m,
                Expenses = expenses,
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = 10000
            };

            // Act
            var result = _accumulationPhaseCalculator.Calculate(input);

            // Assert - Portfolio can go negative with high expenses
            result.EndPortfolioValue.Should().BeLessThan(input.StartingPortfolioValue);
        }

        [Fact]
        public void RetirementPhase_WithInflation_AdjustsWithdrawalsCorrectly()
        {
            // Arrange
            var input = new RetirementPhaseInput
            {
                EarlyRetirementYear = 2025,
                RetirementYears = 5,
                CurrentYear = 2024,
                StartingPortfolioValue = 500000,
                InitialGrossAnnualWithdrawal = 20000,
                InitialAnnualWithdrawal = 17500,
                RetirementReturn = 6.0m,
                InflationRate = 3.0m,
                CapitalGainsTax = 25,
                InitialProfitRatio = 0.5m,
                InitialCostBasis = 250000,
                Expenses = new List<PlannedExpense>(),
                RsuYearlyLookup = new Dictionary<int, RsuYearlyData>(),
                RetirementTaxToPay = 0,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                TaxCalculator = _taxCalculator
            };

            // Act
            var result = _retirementPhaseCalculator.Calculate(input);

            // Assert - Withdrawals should increase with inflation
            var firstYearWithdrawal = result.YearlyData[0].AnnualWithdrawal!.Value;
            var lastYearWithdrawal = result.YearlyData[4].AnnualWithdrawal!.Value;
            lastYearWithdrawal.Should().BeGreaterThan(firstYearWithdrawal);
        }
    }
}
