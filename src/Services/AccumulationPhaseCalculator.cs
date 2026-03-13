using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for accumulation phase calculations.
    /// </summary>
    public interface IAccumulationPhaseCalculator
    {
        /// <summary>
        /// Calculate accumulation phase data including growth, contributions, and expenses.
        /// </summary>
        AccumulationPhaseResult Calculate(AccumulationPhaseInput input);
    }

    /// <summary>
    /// Input parameters for accumulation phase calculation.
    /// </summary>
    public class AccumulationPhaseInput
    {
        /// <summary>
        /// Current calendar year (start of accumulation phase).
        /// </summary>
        public int CurrentYear { get; set; }

        /// <summary>
        /// Number of years in accumulation phase until early retirement.
        /// </summary>
        public int AccumulationYears { get; set; }

        /// <summary>
        /// Portfolio value at start of accumulation phase (in USD).
        /// </summary>
        public decimal StartingPortfolioValue { get; set; }

        /// <summary>
        /// Monthly contribution amount (in USD).
        /// </summary>
        public decimal MonthlyContributionUsd { get; set; }

        /// <summary>
        /// When true, monthly contributions increase by the inflation rate each January 1.
        /// </summary>
        public bool AdjustContributionsForInflation { get; set; }

        /// <summary>
        /// Expected annual return rate as percentage during accumulation.
        /// </summary>
        public decimal AccumulationReturn { get; set; }

        /// <summary>
        /// Annual inflation rate as percentage.
        /// </summary>
        public decimal InflationRate { get; set; }

        /// <summary>
        /// List of planned expenses during accumulation phase.
        /// </summary>
        public List<PlannedExpense>? Expenses { get; set; }

        /// <summary>
        /// Dictionary of RSU data indexed by year.
        /// </summary>
        public Dictionary<int, RsuYearlyData> RsuYearlyLookup { get; set; } = new();

        /// <summary>
        /// RSU configuration for grant management.
        /// </summary>
        public RsuConfiguration? RsuConfiguration { get; set; }

        /// <summary>
        /// Currency converter for multi-currency calculations.
        /// </summary>
        public ICurrencyConverter CurrencyConverter { get; set; } = null!;

        /// <summary>
        /// Expense calculator for planned expense management.
        /// </summary>
        public IExpenseCalculator ExpenseCalculator { get; set; } = null!;

        /// <summary>
        /// Current portfolio value for calculations.
        /// </summary>
        public decimal CurrentPortfolioValue { get; set; }

        /// <summary>
        /// Current date used to determine the remaining months in the first accumulation year.
        /// Defaults to now when not explicitly provided.
        /// </summary>
        public DateTime CurrentDate { get; set; } = DateTime.Now;
    }

    /// <summary>
    /// Result of accumulation phase calculation.
    /// </summary>
    public class AccumulationPhaseResult
    {
        /// <summary>
        /// Portfolio value at end of accumulation phase (at early retirement).
        /// </summary>
        public decimal EndPortfolioValue { get; set; }

        /// <summary>
        /// Total contributions made during accumulation phase.
        /// </summary>
        public decimal ActualContributions { get; set; }

        /// <summary>
        /// Year-by-year data for accumulation phase.
        /// </summary>
        public List<YearlyData> YearlyData { get; set; } = new();
    }

    /// <summary>
    /// Calculator for the accumulation phase of FIRE plan (from now until early retirement).
    /// Handles portfolio growth, contributions, expenses, and RSU integration.
    /// </summary>
    public class AccumulationPhaseCalculator : IAccumulationPhaseCalculator
    {
        /// <inheritdoc />
        public AccumulationPhaseResult Calculate(AccumulationPhaseInput input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            if (input.CurrencyConverter == null) throw new ArgumentNullException(nameof(input.CurrencyConverter));
            if (input.ExpenseCalculator == null) throw new ArgumentNullException(nameof(input.ExpenseCalculator));

            var portfolioValue = input.StartingPortfolioValue;
            var actualContributions = 0m;
            var yearlyData = new List<YearlyData>();



            for (int year = 0; year < input.AccumulationYears; year++)
            {
                var currentCalendarYear = input.CurrentYear + year;
                var yearStart = portfolioValue;

                // Check if RSU data exists for this year
                var rsuDataCheck = input.RsuYearlyLookup.GetValueOrDefault(currentCalendarYear);
                if (rsuDataCheck != null)
                {

                }

                // Get planned expenses for this year
                var yearExpenses = input.ExpenseCalculator.GetExpensesForYear(input.Expenses, currentCalendarYear);

                // Determine how many months to simulate for this year
                // First year (current year) may be partial based on current date
                var monthsToSimulate = (year == 0)
                    ? CalculationConstants.GetRemainingMonthsInCurrentYear(input.CurrentDate)
                    : 12;

                var monthlyContributionUsd = GetMonthlyContributionForYear(input, year);
                var yearContributions = monthlyContributionUsd * monthsToSimulate;

                // Monthly growth and contributions
                for (int month = 0; month < monthsToSimulate; month++)
                {
                    var monthlyReturn = input.AccumulationReturn / 100 / 12;
                    portfolioValue *= (1 + monthlyReturn);
                    portfolioValue += monthlyContributionUsd;
                    actualContributions += monthlyContributionUsd;
                }

                var portfolioBeforeExpenses = portfolioValue;

                // Calculate and apply expenses
                var yearExpensesTotal = input.ExpenseCalculator.CalculateYearExpenses(
                    yearExpenses, currentCalendarYear, input.CurrentYear, input.InflationRate, input.CurrencyConverter);
                portfolioValue -= yearExpensesTotal;

                // Add RSU net proceeds (can be negative if taxes exceed proceeds)
                var rsuData = input.RsuYearlyLookup.GetValueOrDefault(currentCalendarYear);
                var yearRsuProceeds = 0m;
                if (rsuData != null && rsuData.NetSaleProceeds != 0)
                {
                    // Use Money type for type-safe currency conversion (fixes Bug #7)
                    var rsuCurrency = input.RsuConfiguration?.CurrentPricePerShare.Currency ?? "$";
                    var proceedsTyped = Money.Create(rsuData.NetSaleProceeds, rsuCurrency);
                    var proceedsUsd = input.CurrencyConverter.ConvertToUsd(proceedsTyped).Amount;
                    portfolioValue += proceedsUsd;
                    actualContributions += proceedsUsd;  // Track RSU proceeds as contributions (can be negative)
                    yearRsuProceeds = proceedsUsd;
                }

                // Calculate year growth
                var yearGrowth = portfolioBeforeExpenses - yearStart - yearContributions - yearRsuProceeds;

                yearlyData.Add(new YearlyData
                {
                    Year = currentCalendarYear,
                    PortfolioValue = portfolioValue,
                    TotalContributions = input.CurrentPortfolioValue + actualContributions,
                    Phase = "accumulation",
                    Expenses = yearExpenses,
                    RsuSharesVested = rsuData?.SharesVested ?? 0,
                    RsuSharesSold = rsuData?.SharesSold ?? 0,
                    RsuSaleProceeds = yearRsuProceeds,  // Use USD-converted value for consistency with FlowData.RsuNetProceeds
                    RsuTaxesPaid = rsuData?.TaxesPaid ?? 0,
                    RsuHoldingsValue = rsuData?.MarketValue ?? 0,
                    FlowData = new SankeyFlowData
                    {
                        MonthlyContributions = yearContributions,
                        PortfolioGrowth = yearGrowth,
                        RsuNetProceeds = yearRsuProceeds,
                        PlannedExpenses = yearExpensesTotal,
                        Phase = "accumulation",
                        IsRetirementYear = false
                    }
                });
            }

            return new AccumulationPhaseResult
            {
                EndPortfolioValue = portfolioValue,
                ActualContributions = actualContributions,
                YearlyData = yearlyData
            };
        }

        /// <summary>
        /// Calculates the monthly contribution amount to use for a specific accumulation-year offset.
        /// When inflation adjustment is enabled, the base monthly contribution is increased once per year.
        /// </summary>
        /// <param name="input">Accumulation phase inputs including base contribution and inflation settings.</param>
        /// <param name="yearOffset">Zero-based year offset from the plan start year.</param>
        /// <returns>The monthly contribution amount in USD for the specified year.</returns>
        private static decimal GetMonthlyContributionForYear(AccumulationPhaseInput input, int yearOffset)
        {
            if (!input.AdjustContributionsForInflation || yearOffset <= 0)
            {
                return input.MonthlyContributionUsd;
            }

            var multiplier = (decimal)Math.Pow(1 + (double)(input.InflationRate / 100), yearOffset);
            return input.MonthlyContributionUsd * multiplier;
        }
    }
}
