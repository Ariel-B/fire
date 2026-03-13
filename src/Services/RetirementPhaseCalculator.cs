using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for retirement phase calculations.
    /// </summary>
    public interface IRetirementPhaseCalculator
    {
        /// <summary>
        /// Calculate retirement phase data including withdrawals, taxes, and expenses.
        /// </summary>
        RetirementPhaseResult Calculate(RetirementPhaseInput input);
    }

    /// <summary>
    /// Input parameters for retirement phase calculation.
    /// </summary>
    public class RetirementPhaseInput
    {
        /// <summary>
        /// Year when early retirement begins.
        /// </summary>
        public int EarlyRetirementYear { get; set; }

        /// <summary>
        /// Number of years in retirement phase.
        /// </summary>
        public int RetirementYears { get; set; }

        /// <summary>
        /// Current calendar year (for reference).
        /// </summary>
        public int CurrentYear { get; set; }

        /// <summary>
        /// Portfolio value at start of retirement phase (in USD).
        /// </summary>
        public decimal StartingPortfolioValue { get; set; }

        /// <summary>
        /// Initial gross annual withdrawal (before taxes).
        /// </summary>
        public decimal InitialGrossAnnualWithdrawal { get; set; }

        /// <summary>
        /// Initial net annual withdrawal (after taxes).
        /// </summary>
        public decimal InitialAnnualWithdrawal { get; set; }

        /// <summary>
        /// Expected annual return rate as percentage during retirement.
        /// </summary>
        public decimal RetirementReturn { get; set; }

        /// <summary>
        /// Annual inflation rate as percentage.
        /// </summary>
        public decimal InflationRate { get; set; }

        /// <summary>
        /// Capital gains tax rate as percentage.
        /// </summary>
        public decimal CapitalGainsTax { get; set; }

        /// <summary>
        /// Initial profit ratio (proportion of portfolio that is gains).
        /// </summary>
        public decimal InitialProfitRatio { get; set; }

        /// <summary>
        /// Initial cost basis (total contributions) at retirement start.
        /// </summary>
        public decimal InitialCostBasis { get; set; }

        /// <summary>
        /// List of planned expenses during retirement phase.
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
        /// Tax owed on portfolio rebalancing at retirement.
        /// </summary>
        public decimal RetirementTaxToPay { get; set; }

        /// <summary>
        /// Currency converter for multi-currency calculations.
        /// </summary>
        public ICurrencyConverter CurrencyConverter { get; set; } = null!;

        /// <summary>
        /// Expense calculator for planned expense management.
        /// </summary>
        public IExpenseCalculator ExpenseCalculator { get; set; } = null!;

        /// <summary>
        /// Tax calculator for withdrawal and capital gains taxes.
        /// </summary>
        public ITaxCalculator TaxCalculator { get; set; } = null!;

        /// <summary>
        /// User's birth date for pension start calculation.
        /// </summary>
        public DateTime BirthDate { get; set; }

        /// <summary>
        /// Full retirement age (in years) when pension begins.
        /// </summary>
        public int FullRetirementAge { get; set; }

        /// <summary>
        /// Net monthly pension amount in USD (fixed nominal, not inflation-indexed).
        /// </summary>
        public decimal PensionNetMonthlyAmountUsd { get; set; }
    }

    /// <summary>
    /// Result of retirement phase calculation.
    /// </summary>
    public class RetirementPhaseResult
    {
        /// <summary>
        /// Portfolio value at end of retirement phase.
        /// </summary>
        public decimal EndPortfolioValue { get; set; }

        /// <summary>
        /// Year-by-year data for retirement phase.
        /// </summary>
        public List<YearlyData> YearlyData { get; set; } = new();
    }

    /// <summary>
    /// Calculator for the retirement phase of FIRE plan (from early retirement until end of life).
    /// Handles portfolio withdrawals, taxes, expenses, and RSU liquidation.
    /// </summary>
    public class RetirementPhaseCalculator : IRetirementPhaseCalculator
    {
        /// <summary>
        /// Calculate the pension start date (the first day of the month after reaching full retirement age).
        /// </summary>
        /// <param name="birthDate">User's birth date</param>
        /// <param name="fullRetirementAge">Full retirement age in years</param>
        /// <returns>Date when pension payments start</returns>
        private static DateTime CalculatePensionStartDate(DateTime birthDate, int fullRetirementAge)
        {
            // Add full retirement age years to birth date
            var retirementDate = birthDate.AddYears(fullRetirementAge);

            // Pension starts at the next calendar month
            return new DateTime(retirementDate.Year, retirementDate.Month, 1).AddMonths(1);
        }

        /// <summary>
        /// Check if pension is active for a given year and month.
        /// </summary>
        /// <param name="year">Calendar year</param>
        /// <param name="month">Month (1-12)</param>
        /// <param name="pensionStartDate">Date when pension payments start</param>
        /// <returns>True if pension is active for this month</returns>
        private static bool IsPensionActive(int year, int month, DateTime pensionStartDate)
        {
            var currentMonth = new DateTime(year, month, 1);
            return currentMonth >= pensionStartDate;
        }

        /// <inheritdoc />
        public RetirementPhaseResult Calculate(RetirementPhaseInput input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));
            if (input.CurrencyConverter == null) throw new ArgumentNullException(nameof(input.CurrencyConverter));
            if (input.ExpenseCalculator == null) throw new ArgumentNullException(nameof(input.ExpenseCalculator));
            if (input.TaxCalculator == null) throw new ArgumentNullException(nameof(input.TaxCalculator));

            var portfolioValue = input.StartingPortfolioValue;
            var grossAnnualWithdrawal = input.InitialGrossAnnualWithdrawal;
            var annualWithdrawal = input.InitialAnnualWithdrawal;
            var profitRatio = input.InitialProfitRatio;
            var remainingCostBasis = input.InitialCostBasis;
            var yearlyData = new List<YearlyData>();

            var retirementMonthlyReturn = (decimal)Math.Pow((double)(1 + input.RetirementReturn / 100), 1.0 / 12) - 1;

            // Calculate pension start date (the month after reaching full retirement age)
            var pensionStartDate = CalculatePensionStartDate(input.BirthDate, input.FullRetirementAge);
            var hasPension = input.PensionNetMonthlyAmountUsd > 0;

            for (var year = 0; year < input.RetirementYears; year++)
            {
                var currentCalendarYear = input.EarlyRetirementYear + year;
                var isRetirementYear = (year == 0);
                var yearStart = portfolioValue;

                if (year > 0)
                {
                    // Adjust for inflation
                    annualWithdrawal *= (1 + input.InflationRate / 100);
                    var effectiveTaxRate = input.TaxCalculator.CalculateEffectiveTaxRate(profitRatio, input.CapitalGainsTax);
                    grossAnnualWithdrawal = effectiveTaxRate == 0 ? annualWithdrawal : annualWithdrawal / (1 - effectiveTaxRate);
                }

                // Determine how many months to simulate for this year
                // First year (retirement year) may be partial if retirement happens mid-year
                var monthsToSimulate = (year == 0 && currentCalendarYear == input.CurrentYear)
                    ? CalculationConstants.GetRemainingMonthsInCurrentYear()
                    : 12;

                var yearCapitalGainsTax = 0m;
                var yearWithdrawalTax = 0m;
                var yearExpenseTax = 0m;
                var yearPensionOffset = 0m;
                var actualGrossPortfolioWithdrawal = 0m;  // Track actual withdrawal from portfolio (after pension offset)

                // Determine starting month (1-based) for the year's simulation
                var startMonth = (year == 0 && currentCalendarYear == input.CurrentYear)
                    ? 13 - monthsToSimulate  // e.g., if 3 months remain, start at month 10
                    : 1;

                // Monthly simulation with dynamic profit ratio updates
                for (var monthIndex = 0; monthIndex < monthsToSimulate; monthIndex++)
                {
                    var currentMonth = startMonth + monthIndex;
                    portfolioValue *= (1 + retirementMonthlyReturn);

                    // Calculate base monthly withdrawal from portfolio
                    var monthlyWithdrawal = grossAnnualWithdrawal / 12;

                    // Apply pension offset if pension is active for this month
                    // Pension reduces the required withdrawal from portfolio (pension is net, fixed nominal)
                    if (hasPension && IsPensionActive(currentCalendarYear, currentMonth, pensionStartDate))
                    {
                        // The pension covers part of the net spending need, so we need less gross withdrawal from portfolio
                        // Pension is net (no tax), so we reduce the gross withdrawal by grossing up the pension offset
                        var effectiveTaxRate = input.TaxCalculator.CalculateEffectiveTaxRate(profitRatio, input.CapitalGainsTax);
                        var pensionNetOffset = input.PensionNetMonthlyAmountUsd;
                        // Reduce gross withdrawal: if pension covers X net, we need X/(1-taxRate) less gross from portfolio
                        var pensionGrossEquivalent = effectiveTaxRate == 0 ? pensionNetOffset : pensionNetOffset / (1 - effectiveTaxRate);
                        monthlyWithdrawal = Math.Max(0, monthlyWithdrawal - pensionGrossEquivalent);
                        yearPensionOffset += pensionNetOffset;
                    }

                    actualGrossPortfolioWithdrawal += monthlyWithdrawal;

                    // Calculate tax on this withdrawal
                    var monthlyTax = input.TaxCalculator.CalculateWithdrawalTax(monthlyWithdrawal, profitRatio, input.CapitalGainsTax);
                    yearCapitalGainsTax += monthlyTax;
                    yearWithdrawalTax += monthlyTax;

                    // Update cost basis
                    remainingCostBasis = input.TaxCalculator.UpdateCostBasisAfterWithdrawal(remainingCostBasis, monthlyWithdrawal, profitRatio);
                    portfolioValue -= monthlyWithdrawal;

                    // Update profit ratio
                    if (portfolioValue > 0)
                    {
                        profitRatio = input.TaxCalculator.CalculateProfitRatio(portfolioValue, remainingCostBasis);
                    }
                }

                var portfolioBeforeExpensesAndRsu = portfolioValue;

                // Handle planned expenses
                var yearExpenses = input.ExpenseCalculator.GetExpensesForYear(input.Expenses, currentCalendarYear);
                var yearExpensesTotal = 0m;
                var totalExpenseGross = 0m;

                foreach (var expense in yearExpenses)
                {
                    // Use fractional years for inflation calculation
                    var fractionalYears = CalculationConstants.CalculateFractionalYearsFromNow(currentCalendarYear, input.CurrentYear);
                    // Use Money type for type-safe currency conversion (fixes Bug #6 - part 1)
                    var netAmountUsd = input.CurrencyConverter.ConvertToUsd(expense.NetAmount).Amount;
                    var inflatedNetAmount = netAmountUsd * (decimal)Math.Pow((double)(1 + input.InflationRate / 100), (double)fractionalYears);

                    var grossAmount = input.ExpenseCalculator.CalculateGrossExpense(inflatedNetAmount, profitRatio, input.CapitalGainsTax);
                    var expenseTax = grossAmount - inflatedNetAmount;
                    yearCapitalGainsTax += expenseTax;
                    yearExpenseTax += expenseTax;

                    var principalPortion = grossAmount * (1 - profitRatio);
                    remainingCostBasis = Math.Max(0, remainingCostBasis - principalPortion);

                    portfolioValue -= grossAmount;
                    totalExpenseGross += grossAmount;
                    yearExpensesTotal += inflatedNetAmount;

                    // Update profit ratio after expense
                    if (portfolioValue > 0)
                    {
                        profitRatio = input.TaxCalculator.CalculateProfitRatio(portfolioValue, remainingCostBasis);
                    }
                }

                // Add RSU net proceeds
                var rsuData = input.RsuYearlyLookup.GetValueOrDefault(currentCalendarYear);
                var yearRsuProceeds = 0m;
                if (rsuData != null && rsuData.NetSaleProceeds > 0)
                {
                    // Use Money type for type-safe currency conversion (fixes Bug #6 - part 2)
                    var rsuCurrency = input.RsuConfiguration?.CurrentPricePerShare.Currency ?? "$";
                    var proceedsTyped = Money.Create(rsuData.NetSaleProceeds, rsuCurrency);
                    var proceedsUsd = input.CurrencyConverter.ConvertToUsd(proceedsTyped).Amount;
                    portfolioValue += proceedsUsd;
                    yearRsuProceeds = proceedsUsd;
                }

                // Calculate year growth - adjust for partial year
                // actualGrossPortfolioWithdrawal already accounts for pension offset
                var yearGrowth = (portfolioBeforeExpensesAndRsu + actualGrossPortfolioWithdrawal + totalExpenseGross) - yearStart;

                yearlyData.Add(new YearlyData
                {
                    Year = currentCalendarYear,
                    PortfolioValue = Math.Max(0, portfolioValue),
                    AnnualWithdrawal = actualGrossPortfolioWithdrawal,  // Actual portfolio withdrawal after pension offset
                    Phase = "retirement",
                    Expenses = yearExpenses,
                    RsuSharesVested = rsuData?.SharesVested ?? 0,
                    RsuSharesSold = rsuData?.SharesSold ?? 0,
                    RsuSaleProceeds = yearRsuProceeds,  // Use USD-converted value for consistency with FlowData.RsuNetProceeds
                    RsuTaxesPaid = rsuData?.TaxesPaid ?? 0,
                    RsuHoldingsValue = rsuData?.MarketValue ?? 0,
                    FlowData = new SankeyFlowData
                    {
                        PortfolioGrowth = yearGrowth,
                        RsuNetProceeds = yearRsuProceeds,
                        CapitalGainsTax = yearCapitalGainsTax,
                        WithdrawalCapGainsTax = yearWithdrawalTax,
                        ExpensesCapGainsTax = yearExpenseTax,
                        PlannedExpenses = yearExpensesTotal,
                        RetirementWithdrawals = (annualWithdrawal * monthsToSimulate / 12) - yearPensionOffset,  // Net spending from portfolio
                        RetirementRebalancingTax = isRetirementYear ? input.RetirementTaxToPay : 0,
                        PensionIncome = yearPensionOffset,
                        Phase = "retirement",
                        IsRetirementYear = isRetirementYear
                    }
                });
            }

            return new RetirementPhaseResult
            {
                EndPortfolioValue = portfolioValue,
                YearlyData = yearlyData
            };
        }
    }
}
