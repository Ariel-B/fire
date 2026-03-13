namespace FirePlanningTool.Services
{
    /// <summary>
    /// Shared calculation constants for consistency across frontend and backend.
    /// These values should match wwwroot/ts/config/calculation-constants.ts
    /// </summary>
    public static class CalculationConstants
    {
        /// <summary>
        /// Default USD to ILS exchange rate.
        /// </summary>
        public const decimal DefaultUsdIlsRate = 3.6m;

        /// <summary>
        /// Default number of years for target price calculations when retirement timeline is not provided.
        /// </summary>
        public const int DefaultTargetPriceYears = 10;

        /// <summary>
        /// Maximum simulation years to prevent infinite loops in calculations.
        /// </summary>
        public const int MaxSimulationYears = 100;

        /// <summary>
        /// Number of decimal places for currency display formatting.
        /// </summary>
        public const int CurrencyDecimalPlaces = 2;

        /// <summary>
        /// Number of decimal places for percentage calculations.
        /// </summary>
        public const int PercentageDecimalPlaces = 2;

        /// <summary>
        /// Default expected annual return for equities (percentage).
        /// </summary>
        public const decimal DefaultEquityReturn = 7.0m;

        /// <summary>
        /// Default expected annual return for bonds (percentage).
        /// </summary>
        public const decimal DefaultBondReturn = 3.0m;

        /// <summary>
        /// Default capital gains tax rate (percentage).
        /// </summary>
        public const decimal DefaultCapitalGainsTax = 25m;

        // RSU Section 102 constants (Israeli tax law)
        /// <summary>
        /// Number of years shares must be held after grant for Section 102 capital gains treatment
        /// </summary>
        public const int Section102HoldingPeriodYears = 2;

        /// <summary>
        /// Israeli income threshold for 3% surtax on capital gains (2024 value in ILS)
        /// Annual income above this threshold is subject to additional 3% tax
        /// </summary>
        public const decimal SurtaxThresholdILS = 721560m;

        /// <summary>
        /// Additional surtax rate for high income earners (3%)
        /// </summary>
        public const decimal SurtaxRate = 0.03m;

        /// <summary>
        /// Default marginal tax rate for RSU grant value (top Israeli bracket)
        /// </summary>
        public const decimal DefaultMarginalTaxRate = 47m;

        /// <summary>
        /// Maximum number of RSU grants allowed per configuration
        /// </summary>
        public const int MaxRsuGrants = 50;

        /// <summary>
        /// Soft limit for RSU grants (show warning above this)
        /// </summary>
        public const int SoftLimitRsuGrants = 30;

        /// <summary>
        /// Standard vesting period in years for RSU grants
        /// </summary>
        public const int DefaultVestingPeriodYears = 4;

        /// <summary>
        /// Minimum valid vesting period in years
        /// </summary>
        public const int MinVestingPeriodYears = 1;

        /// <summary>
        /// Maximum valid vesting period in years
        /// </summary>
        public const int MaxVestingPeriodYears = 10;

        /// <summary>
        /// Default annual withdrawal rate during retirement (percentage, based on 4% rule).
        /// </summary>
        public const decimal DefaultWithdrawalRate = 4.0m;

        /// <summary>
        /// Default expected annual inflation rate (percentage).
        /// </summary>
        public const decimal DefaultInflationRate = 2.0m;

        /// <summary>
        /// Minimum valid portfolio value.
        /// </summary>
        public const decimal MinPortfolioValue = 0m;

        /// <summary>
        /// Minimum valid profit ratio (0 = all principal, no gains).
        /// </summary>
        public const decimal MinProfitRatio = 0m;

        /// <summary>
        /// Maximum valid profit ratio (1 = all gains, no principal).
        /// </summary>
        public const decimal MaxProfitRatio = 1m;

        /// <summary>
        /// Default profit ratio used when calculation is not possible (50% gains assumption).
        /// </summary>
        public const decimal DefaultProfitRatio = 0.5m;

        // Validation constants for year ranges
        /// <summary>
        /// Minimum valid birth year for input validation
        /// </summary>
        public const int MinBirthYear = 1900;

        /// <summary>
        /// Maximum years in the future for birth year validation (added to current year)
        /// </summary>
        public const int MaxFutureBirthYears = 50;

        /// <summary>
        /// Minimum valid year for retirement planning
        /// </summary>
        public const int MinRetirementYear = 1900;

        /// <summary>
        /// Maximum years in the future for retirement year validation (added to current year)
        /// </summary>
        public const int MaxFutureRetirementYears = 150;

        /// <summary>
        /// Maximum valid retirement age
        /// </summary>
        public const int MaxRetirementAge = 150;

        // Pension constants
        /// <summary>
        /// Maximum valid monthly pension amount (reasonable upper bound for validation)
        /// </summary>
        public const decimal MaxPensionMonthlyAmount = 1_000_000m;

        /// <summary>
        /// Supported currency symbols
        /// </summary>
        public static readonly string[] SupportedCurrencies = { "$", "₪" };

        // Time constants for historical data validation
        /// <summary>
        /// Number of days considered as "two months" for historical data validation
        /// </summary>
        public const int TwoMonthsInDays = 60;

        /// <summary>
        /// Two months expressed in seconds (60 days × 24 hours × 60 minutes × 60 seconds)
        /// Used for validating historical price data timestamp proximity
        /// </summary>
        public const long TwoMonthsInSeconds = TwoMonthsInDays * 24L * 60L * 60L;

        /// <summary>
        /// Get current base year for inflation calculations.
        /// This ensures inflation is calculated from the current year, not a hardcoded value.
        /// </summary>
        public static int GetBaseYear() => DateTime.Now.Year;

        /// <summary>
        /// Calculate years from base year for inflation adjustments.
        /// </summary>
        /// <param name="targetYear">The year to calculate inflation for</param>
        /// <returns>Number of years from base year (can be negative for past years)</returns>
        public static int CalculateYearsFromBase(int targetYear) => targetYear - GetBaseYear();

        /// <summary>
        /// Calculate the fractional year from the current date to the end of the current year.
        /// For example, on December 20, this returns approximately 0.37 (11 days remaining / 30 days average per month).
        /// </summary>
        /// <param name="currentDate">The current date (defaults to DateTime.Now if not provided)</param>
        /// <returns>Fractional year representing the portion of the current year remaining (0 to 1)</returns>
        public static decimal GetRemainingFractionOfCurrentYear(DateTime? currentDate = null)
        {
            var date = currentDate ?? DateTime.Now;
            var endOfYear = new DateTime(date.Year, 12, 31, 23, 59, 59);
            var daysRemaining = (endOfYear - date).TotalDays;
            var daysInYear = DateTime.IsLeapYear(date.Year) ? 366 : 365;
            return (decimal)(daysRemaining / daysInYear);
        }

        /// <summary>
        /// Calculate the fractional years from the current date to a target year.
        /// Accounts for the partial current year based on the current date.
        /// </summary>
        /// <param name="targetYear">The target year</param>
        /// <param name="baseYear">The base year (typically current year)</param>
        /// <param name="currentDate">The current date (defaults to DateTime.Now if not provided)</param>
        /// <returns>Fractional years from current date to target year</returns>
        public static decimal CalculateFractionalYearsFromNow(int targetYear, int baseYear, DateTime? currentDate = null)
        {
            var date = currentDate ?? DateTime.Now;
            var fullYears = targetYear - baseYear;

            if (fullYears == 0)
            {
                // Target year is current year - return 0 as we're already in that year
                return 0;
            }
            else if (fullYears > 0)
            {
                // Future year: subtract the elapsed portion of current year
                var elapsedFractionOfCurrentYear = 1 - GetRemainingFractionOfCurrentYear(date);
                return fullYears - elapsedFractionOfCurrentYear;
            }
            else
            {
                // Past year: add the elapsed portion of current year
                var elapsedFractionOfCurrentYear = 1 - GetRemainingFractionOfCurrentYear(date);
                return fullYears + elapsedFractionOfCurrentYear;
            }
        }

        /// <summary>
        /// Calculate how many months to simulate in the current year based on current date.
        /// For example, on December 20, this returns 1 (finish December).
        /// On January 15, this returns 12 (full year remaining).
        /// </summary>
        /// <param name="currentDate">The current date (defaults to DateTime.Now if not provided)</param>
        /// <returns>Number of months to simulate in the current year (including current month)</returns>
        public static int GetRemainingMonthsInCurrentYear(DateTime? currentDate = null)
        {
            var date = currentDate ?? DateTime.Now;
            return 12 - date.Month + 1; // Include the current month
        }

        /// <summary>
        /// Apply inflation to an amount.
        /// </summary>
        /// <param name="amount">The base amount</param>
        /// <param name="years">Number of years to apply inflation</param>
        /// <param name="inflationRate">Annual inflation rate as decimal (e.g., 0.02 for 2%)</param>
        /// <returns>Inflation-adjusted amount</returns>
        public static decimal ApplyInflation(decimal amount, int years, decimal inflationRate)
        {
            return amount * (decimal)Math.Pow((double)(1 + inflationRate), years);
        }

        /// <summary>
        /// Calculate profit ratio with safety bounds.
        /// </summary>
        /// <param name="portfolioValue">Current portfolio value</param>
        /// <param name="costBasis">Total cost basis (contributions)</param>
        /// <returns>Profit ratio between 0 and 1</returns>
        public static decimal CalculateSafeProfitRatio(decimal portfolioValue, decimal costBasis)
        {
            if (portfolioValue <= 0 || costBasis <= 0)
            {
                return MinProfitRatio;
            }
            if (portfolioValue <= costBasis)
            {
                return MinProfitRatio;
            }
            var ratio = (portfolioValue - costBasis) / portfolioValue;
            return Math.Max(MinProfitRatio, Math.Min(MaxProfitRatio, ratio));
        }

        /// <summary>
        /// Gets the types of return calculation strategies that should be registered in the system.
        /// This is the single source of truth for which strategies are available.
        /// </summary>
        /// <returns>Array of strategy types to register</returns>
        private static readonly Type[] ReturnCalculationStrategyTypes =
        {
            typeof(Strategies.CagrReturnStrategy),
            typeof(Strategies.TotalGrowthReturnStrategy),
            typeof(Strategies.TargetPriceReturnStrategy),
            typeof(Strategies.FixedReturnStrategy)
        };

        /// <summary>
        /// Gets the array of return calculation strategy types available in the system.
        /// Used for dependency injection registration and strategy factory configuration.
        /// </summary>
        /// <returns>Array of strategy implementation types</returns>
        public static Type[] GetReturnCalculationStrategyTypes()
        {
            return ReturnCalculationStrategyTypes;
        }
    }
}
