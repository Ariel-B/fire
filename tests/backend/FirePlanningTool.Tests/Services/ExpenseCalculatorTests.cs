using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Services
{
    public class ExpenseCalculatorTests
    {
        private readonly ExpenseCalculator _calculator;
        private readonly ICurrencyConverter _currencyConverter;

        public ExpenseCalculatorTests()
        {
            _calculator = new ExpenseCalculator();
            _currencyConverter = new CurrencyConverter();
        }

        [Fact]
        public void GetExpensesForYear_NoExpenses_ReturnsEmpty()
        {
            var result = _calculator.GetExpensesForYear(null, 2025);
            result.Should().BeEmpty();
        }

        [Fact]
        public void GetExpensesForYear_SingleExpense_ReturnsExpense()
        {
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { Year = 2025, NetAmount = Money.Usd(10000), FrequencyYears = 1, RepetitionCount = 1 }
            };

            var result = _calculator.GetExpensesForYear(expenses, 2025);
            result.Should().HaveCount(1);
            result[0].NetAmount.Amount.Should().Be(10000);
        }

        [Fact]
        public void GetExpensesForYear_RepeatingExpense_ReturnsForMatchingYears()
        {
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { Year = 2025, NetAmount = Money.Usd(10000), FrequencyYears = 2, RepetitionCount = 3 }
            };

            // Should match years 2025, 2027, 2029
            _calculator.GetExpensesForYear(expenses, 2025).Should().HaveCount(1);
            _calculator.GetExpensesForYear(expenses, 2026).Should().BeEmpty();
            _calculator.GetExpensesForYear(expenses, 2027).Should().HaveCount(1);
            _calculator.GetExpensesForYear(expenses, 2029).Should().HaveCount(1);
            _calculator.GetExpensesForYear(expenses, 2031).Should().BeEmpty();
        }

        [Fact]
        public void CalculateYearExpenses_NoExpenses_ReturnsZero()
        {
            var result = _calculator.CalculateYearExpenses(new List<PlannedExpense>(), 2025, 2025, 2.0m, _currencyConverter);
            result.Should().Be(0);
        }

        [Fact]
        public void CalculateYearExpenses_SingleExpense_ReturnsAmount()
        {
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { NetAmount = Money.Usd(10000) }
            };

            var result = _calculator.CalculateYearExpenses(expenses, 2025, 2025, 2.0m, _currencyConverter);
            result.Should().Be(10000);
        }

        [Fact]
        public void CalculateYearExpenses_WithInflation_AdjustsAmount()
        {
            var expenses = new List<PlannedExpense>
            {
                new PlannedExpense { NetAmount = Money.Usd(10000) }
            };

            // Testing with a fixed date (Jan 1, 2025) to get exactly 5 years of inflation
            // 5 years later with 2% inflation: 10000 * 1.02^5 = 11040.81
            var fixedDate = new DateTime(2025, 1, 1);
            var result = _calculator.CalculateYearExpenses(expenses, 2030, 2025, 2.0m, _currencyConverter, fixedDate);
            result.Should().BeApproximately(11040.81m, 0.01m);
        }

        [Fact]
        public void CalculateGrossExpense_NoTax_ReturnsSameAmount()
        {
            var result = _calculator.CalculateGrossExpense(10000, 0.5m, 0);
            result.Should().Be(10000);
        }

        [Fact]
        public void CalculateGrossExpense_WithTax_GrossesUp()
        {
            // Net 10000, profit ratio 50%, tax 25%
            // Effective tax = 0.5 * 0.25 = 12.5%
            // Gross = 10000 / (1 - 0.125) = 11428.57
            var result = _calculator.CalculateGrossExpense(10000, 0.5m, 25);
            result.Should().BeApproximately(11428.57m, 0.01m);
        }

        [Fact]
        public void CalculateGrossExpense_ZeroProfitRatio_NoTax()
        {
            var result = _calculator.CalculateGrossExpense(10000, 0, 25);
            result.Should().Be(10000);
        }
    }
}
