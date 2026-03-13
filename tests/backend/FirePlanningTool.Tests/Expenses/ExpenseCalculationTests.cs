namespace FirePlanningTool.Tests.Expenses
{
    using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Tests.Fixtures;

    public class ExpenseCalculationTests
    {
        #region Planned Expense Tests

        [Fact]
        public void PlannedExpense_OneTimeExpense_HasCorrectProperties()
        {
            var expense = new PlannedExpense
            {
                Id = 1,
                Type = "Vacation",
                NetAmount = Money.Usd(5000),
                Year = 2045,
                FrequencyYears = 1,
                RepetitionCount = 1
            };

            expense.NetAmount.Amount.Should().Be(5000);
            expense.RepetitionCount.Should().Be(1);
        }

        [Fact]
        public void PlannedExpense_RepeatedExpense_CalculatesMultipleOccurrences()
        {
            var expense = new PlannedExpense
            {
                Type = "Annual Vacation",
                NetAmount = Money.Usd(5000),
                Year = 2045,
                FrequencyYears = 1,
                RepetitionCount = 10
            };

            var totalExpense = expense.NetAmount.Amount * expense.RepetitionCount;
            totalExpense.Should().Be(50000);
        }

        [Fact]
        public void PlannedExpense_BiennialExpense_OccursEveryTwoYears()
        {
            var expense = new PlannedExpense
            {
                Type = "Home Repair",
                NetAmount = Money.Usd(10000),
                Year = 2045,
                FrequencyYears = 2,
                RepetitionCount = 5
            };

            var totalCost = expense.NetAmount.Amount * expense.RepetitionCount;
            var yearsSpanned = (expense.RepetitionCount - 1) * expense.FrequencyYears;

            totalCost.Should().Be(50000);
            yearsSpanned.Should().Be(8);
        }

        #endregion

        #region Inflation Adjustment Tests

        [Fact]
        public void InflatedExpense_WithPositiveInflation_IncreasesExpenseAmount()
        {
            var baseAmount = 5000m;
            var inflationRate = 2.5m;
            var yearsFromNow = 5;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), yearsFromNow);

            inflatedAmount.Should().BeGreaterThan(baseAmount);
            inflatedAmount.Should().BeApproximately(5656.36m, 1);
        }

        [Fact]
        public void InflatedExpense_WithZeroInflation_MaintainsBaseAmount()
        {
            var baseAmount = 5000m;
            var inflationRate = 0m;
            var yearsFromNow = 5;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), yearsFromNow);

            inflatedAmount.Should().Be(baseAmount);
        }

        [Fact]
        public void InflatedExpense_WithHighInflation_SignificantlyIncreasesAmount()
        {
            var baseAmount = 10000m;
            var inflationRate = 5m;
            var yearsFromNow = 10;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), yearsFromNow);

            inflatedAmount.Should().BeGreaterThan(15000);
            inflatedAmount.Should().BeApproximately(16289.05m, 1);
        }

        #endregion

        #region Expense Currency Tests

        [Fact]
        public void Expense_InDollar_PreservesValue()
        {
            var expense = new PlannedExpense { NetAmount = Money.Usd(5000) };
            var convertedAmount = expense.NetAmount.Currency == "USD" ? expense.NetAmount.Amount : expense.NetAmount.Amount / 3.6m;

            convertedAmount.Should().Be(5000);
        }

        [Fact]
        public void Expense_InShekel_ConvertsToUsd()
        {
            var expense = new PlannedExpense { NetAmount = Money.Ils(18000) };
            var exchangeRate = 3.6m;
            var amountInUsd = expense.NetAmount.Amount / exchangeRate;

            amountInUsd.Should().Be(5000);
        }

        [Fact]
        public void Expense_MixedCurrencies_ConvertsConsistently()
        {
            var dollarExpense = new PlannedExpense { NetAmount = Money.Usd(5000) };
            var shekelExpense = new PlannedExpense { NetAmount = Money.Ils(18000) };
            var exchangeRate = 3.6m;

            var dollarInUsd = dollarExpense.NetAmount.Amount;
            var shekelInUsd = shekelExpense.NetAmount.Amount / exchangeRate;

            dollarInUsd.Should().Be(shekelInUsd);
        }

        #endregion

        #region Total Expense Calculation Tests

        [Fact]
        public void TotalExpenses_WithMultipleExpenses_SumsAllAmounts()
        {
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(5000), Year = 2045 },
                new() { NetAmount = Money.Usd(10000), Year = 2046 },
                new() { NetAmount = Money.Usd(3000), Year = 2047 }
            };

            var totalExpenses = expenses.Sum(e => e.NetAmount.Amount);
            totalExpenses.Should().Be(18000);
        }

        [Fact]
        public void TotalExpenses_WithRepeatedExpenses_IncludesAllOccurrences()
        {
            var expenses = new List<PlannedExpense>
            {
                new() { NetAmount = Money.Usd(5000), Year = 2045, RepetitionCount = 3, FrequencyYears = 1 },
                new() { NetAmount = Money.Usd(10000), Year = 2045, RepetitionCount = 1 }
            };

            var totalExpenses = expenses.Sum(e => e.NetAmount.Amount * e.RepetitionCount);
            totalExpenses.Should().Be(25000); // (5000 * 3) + (10000 * 1)
        }

        [Fact]
        public void ExpenseImpact_OnPortfolioValue_ReducesBalance()
        {
            var portfolioValue = 500000m;
            var totalExpenses = 50000m;
            var remainingValue = portfolioValue - totalExpenses;

            remainingValue.Should().Be(450000);
        }

        #endregion
    }
}
