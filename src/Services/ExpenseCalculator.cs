using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for expense calculations including planned expenses and inflation adjustments.
    /// </summary>
    public interface IExpenseCalculator
    {
        /// <summary>
        /// Get all expenses that occur in a specific year, including repeated expenses.
        /// </summary>
        List<PlannedExpense> GetExpensesForYear(List<PlannedExpense>? expenses, int targetYear);

        /// <summary>
        /// Calculate the total expense amount for a given year with inflation adjustment.
        /// </summary>
        decimal CalculateYearExpenses(List<PlannedExpense> expenses, int targetYear, int baseYear, decimal inflationRate, ICurrencyConverter currencyConverter, DateTime? currentDate = null);

        /// <summary>
        /// Calculate gross expense amount accounting for taxes.
        /// </summary>
        decimal CalculateGrossExpense(decimal netExpense, decimal profitRatio, decimal capitalGainsTax);
    }

    /// <summary>
    /// Calculator for planned expenses including recurring expenses and inflation adjustments.
    /// </summary>
    public class ExpenseCalculator : IExpenseCalculator
    {
        /// <inheritdoc />
        public List<PlannedExpense> GetExpensesForYear(List<PlannedExpense>? expenses, int targetYear)
        {
            if (expenses == null || !expenses.Any())
                return new List<PlannedExpense>();

            var yearExpenses = new List<PlannedExpense>();

            foreach (var expense in expenses)
            {
                var frequencyYears = expense.FrequencyYears > 0 ? expense.FrequencyYears : 1;
                var repetitionCount = expense.RepetitionCount > 0 ? expense.RepetitionCount : 1;
                var startYear = expense.Year;

                // Check if this target year matches any occurrence of the repeated expense
                for (int i = 0; i < repetitionCount; i++)
                {
                    var occurrenceYear = startYear + (i * frequencyYears);
                    if (occurrenceYear == targetYear)
                    {
                        yearExpenses.Add(expense);
                        break; // Only add once per expense per year
                    }
                }
            }

            return yearExpenses;
        }

        /// <inheritdoc />
        public decimal CalculateYearExpenses(List<PlannedExpense> expenses, int targetYear, int baseYear, decimal inflationRate, ICurrencyConverter currencyConverter, DateTime? currentDate = null)
        {
            decimal total = 0;
            // Use fractional years to account for partial current year based on actual date
            var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(targetYear, baseYear, currentDate);

            foreach (var expense in expenses)
            {
                // Use Money type for type-safe currency conversion (fixes Bug #5)
                var netAmountUsd = currencyConverter.ConvertToUsd(expense.NetAmount).Amount;
                var inflatedAmount = netAmountUsd * (decimal)Math.Pow((double)(1 + inflationRate / 100), (double)fractionalYears);
                total += inflatedAmount;
            }

            return total;
        }

        /// <inheritdoc />
        public decimal CalculateGrossExpense(decimal netExpense, decimal profitRatio, decimal capitalGainsTax)
        {
            var effectiveTaxRate = capitalGainsTax == 0 ? 0 : (profitRatio * capitalGainsTax / 100);
            return effectiveTaxRate == 0 ? netExpense : netExpense / (1 - effectiveTaxRate);
        }
    }
}
