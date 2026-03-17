using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using System.Text.Json.Serialization;

namespace FirePlanningTool.Models
{
    /// <summary>
    /// Standardized error response format for all API error responses.
    /// </summary>
    public class ApiErrorResponse
    {
        /// <summary>
        /// Human-readable error description.
        /// </summary>
        public string Error { get; }

        /// <summary>
        /// Creates a new API error response.
        /// </summary>
        /// <param name="error">Human-readable error description.</param>
        public ApiErrorResponse(string error)
        {
            Error = error;
        }
    }

    /// <summary>
    /// Input parameters for FIRE (Financial Independence, Retire Early) plan calculation.
    /// Contains all user-provided data including retirement timeline, portfolio allocation, expenses, and RSU configuration.
    /// </summary>
    public class FirePlanInput
    {
        /// <summary>
        /// User's birth date for precise pension start timing.
        /// </summary>
        public DateTime BirthDate { get; set; } = new DateTime(1990, 1, 1);

        /// <summary>
        /// User's birth year. Setting this will update BirthDate to January 1st of the specified year
        /// (preserves month/day if BirthDate was already set to a non-default value).
        /// Getting returns the year from BirthDate.
        /// </summary>
        public int BirthYear
        {
            get => BirthDate.Year;
            set
            {
                // If BirthDate is default or was only set via BirthYear, use Jan 1 of that year
                // Otherwise, preserve the month and day from the existing BirthDate
                if (BirthDate == default || BirthDate == new DateTime(BirthDate.Year, 1, 1))
                {
                    BirthDate = new DateTime(value, 1, 1);
                }
                else
                {
                    // Try to preserve month and day, adjusting for leap year edge case
                    try
                    {
                        BirthDate = new DateTime(value, BirthDate.Month, BirthDate.Day);
                    }
                    catch (ArgumentOutOfRangeException)
                    {
                        // Handle Feb 29 on non-leap years
                        BirthDate = new DateTime(value, BirthDate.Month, 28);
                    }
                }
            }
        }

        /// <summary>
        /// Year when early retirement is planned (e.g., 2035).
        /// </summary>
        public int EarlyRetirementYear { get; set; }

        /// <summary>
        /// Age at which full retirement benefits become available (e.g., 67).
        /// </summary>
        public int FullRetirementAge { get; set; }

        /// <summary>
        /// Optional cost basis (total contributions) for tax calculations. If null, calculated from portfolio and contributions.
        /// </summary>
        public decimal? TaxBasis { get; set; }

        /// <summary>
        /// Monthly contribution amount to investment portfolio (Money type with currency).
        /// </summary>
        public Money MonthlyContribution { get; set; } = Money.Usd(0);

        /// <summary>
        /// When true, monthly contributions are increased by the annual inflation rate each January 1.
        /// The entered contribution amount is treated as the current calendar-year amount.
        /// </summary>
        public bool AdjustContributionsForInflation { get; set; } = false;

        /// <summary>
        /// Display currency for calculations and results ("$" for USD, "₪" for ILS).
        /// </summary>
        public string Currency { get; set; } = "$";

        /// <summary>
        /// Exchange rate for USD to ILS conversion (default: 3.6).
        /// </summary>
        public decimal UsdIlsRate { get; set; } = 3.6m;

        /// <summary>
        /// Annual withdrawal rate as percentage during retirement (e.g., 4.0 for 4% safe withdrawal rate).
        /// </summary>
        public decimal WithdrawalRate { get; set; }

        /// <summary>
        /// Expected annual inflation rate as percentage (e.g., 2.0 for 2%).
        /// </summary>
        public decimal InflationRate { get; set; }

        /// <summary>
        /// Capital gains tax rate as percentage (e.g., 25.0 for 25%).
        /// </summary>
        public decimal CapitalGainsTax { get; set; }

        /// <summary>
        /// List of planned one-time or recurring expenses (e.g., car purchase, house down payment).
        /// </summary>
        public List<PlannedExpense> Expenses { get; set; } = new();

        /// <summary>
        /// Portfolio assets held during accumulation phase (before retirement).
        /// </summary>
        public List<PortfolioAsset> AccumulationPortfolio { get; set; } = new();

        /// <summary>
        /// Portfolio assets to hold during retirement phase (after early retirement).
        /// </summary>
        public List<PortfolioAsset> RetirementPortfolio { get; set; } = new();

        /// <summary>
        /// Percentage-based allocation strategy for accumulation phase (e.g., 70% stocks, 30% bonds).
        /// </summary>
        public List<PortfolioAllocation> AccumulationAllocation { get; set; } = new();

        /// <summary>
        /// Percentage-based allocation strategy for retirement phase (e.g., 50% stocks, 50% bonds).
        /// </summary>
        public List<PortfolioAllocation> RetirementAllocation { get; set; } = new();

        /// <summary>
        /// Investment strategy type: "fixed" (no changes), "ageBased" (adjust with age), or "targetDate" (adjust toward retirement).
        /// </summary>
        public string InvestmentStrategy { get; set; } = "fixed";

        /// <summary>
        /// Current total portfolio value for percentage-based allocation calculations.
        /// </summary>
        public decimal CurrentPortfolioValue { get; set; } = 0;

        /// <summary>
        /// When true, switches to retirement portfolio allocation at retirement (triggers capital gains tax event).
        /// </summary>
        public bool UseRetirementPortfolio { get; set; } = false;

        /// <summary>
        /// RSU (Restricted Stock Unit) configuration including grants and liquidation strategy.
        /// </summary>
        public RsuConfiguration? RsuConfiguration { get; set; }

        /// <summary>
        /// When true, includes RSU vesting and sales in FIRE plan calculations.
        /// </summary>
        public bool IncludeRsuInCalculations { get; set; } = true;

        /// <summary>
        /// Net monthly pension amount (fixed nominal, not inflation-indexed).
        /// This amount reduces stock-portfolio withdrawals during retirement (Money type with currency).
        /// </summary>
        public Money PensionNetMonthly { get; set; } = Money.Usd(0);

        /// <summary>
        /// Target net monthly expense in retirement (after tax, inflation-adjusted).
        /// Optional field - if not provided, calculated from expenses list.
        /// </summary>
        public Money? TargetMonthlyExpense { get; set; }
    }

    /// <summary>
    /// Represents a planned future expense in the FIRE plan timeline.
    /// Can be one-time (e.g., car purchase) or recurring (e.g., annual vacation).
    /// </summary>
    public class PlannedExpense
    {
        /// <summary>
        /// Unique identifier for the expense.
        /// </summary>
        public long Id { get; set; }

        /// <summary>
        /// Type or description of the expense (e.g., "Car", "House Down Payment", "Vacation").
        /// </summary>
        public string Type { get; set; } = string.Empty;

        /// <summary>
        /// Net amount of the expense after taxes (Money type with currency).
        /// </summary>
        public Money NetAmount { get; set; } = Money.Usd(0);

        /// <summary>
        /// Year when the expense occurs or starts recurring.
        /// </summary>
        public int Year { get; set; }

        /// <summary>
        /// How often the expense repeats in years (default: 1 for one-time, 2 for every 2 years, etc.).
        /// </summary>
        public int FrequencyYears { get; set; } = 1;

        /// <summary>
        /// How many times the expense repeats (default: 1 for one-time).
        /// </summary>
        public int RepetitionCount { get; set; } = 1;
    }

    /// <summary>
    /// Represents a single asset (stock, ETF, mutual fund, bond, commodity) in the investment portfolio.
    /// Supports any tradeable security available via Finnhub API.
    /// </summary>
    public class PortfolioAsset
    {
        /// <summary>
        /// Unique identifier for the asset.
        /// </summary>
        public long Id { get; set; }

        /// <summary>
        /// Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs, GLD for commodities).
        /// </summary>
        public string Symbol { get; set; } = string.Empty;

        /// <summary>
        /// Number of shares/units held.
        /// </summary>
        public decimal Quantity { get; set; }

        /// <summary>
        /// Current market price per share/unit (Money type with currency).
        /// </summary>
        public Money CurrentPrice { get; set; } = Money.Usd(0);

        /// <summary>
        /// Average cost basis per share (Money type with currency).
        /// </summary>
        public Money AverageCost { get; set; } = Money.Usd(0);

        /// <summary>
        /// Calculation method for future price projections: "CAGR" (historical growth), "TotalGrowth" (fixed percentage), or "TargetPrice" (specific target).
        /// </summary>
        public string Method { get; set; } = "CAGR";

        /// <summary>
        /// First calculation parameter (meaning depends on Method: CAGR years, growth percentage, or target price).
        /// </summary>
        public decimal Value1 { get; set; }

        /// <summary>
        /// Second calculation parameter (meaning depends on Method: unused, years to target, or unused).
        /// </summary>
        public decimal Value2 { get; set; }

        /// <summary>
        /// Display name of the asset (e.g., "Vanguard Total Stock Market ETF").
        /// Resolved from etf-names.json or API lookup. May be empty if name is unknown.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Market capitalization in USD, or null if not available.
        /// </summary>
        public decimal? MarketCapUsd { get; set; }
    }

    /// <summary>
    /// Represents a target allocation percentage for an asset class in the portfolio.
    /// Used for percentage-based portfolio management (e.g., 70% stocks, 30% bonds).
    /// </summary>
    public class PortfolioAllocation
    {
        /// <summary>
        /// Unique identifier for the allocation.
        /// </summary>
        public long Id { get; set; }

        /// <summary>
        /// Asset type or class (e.g., "Stocks", "Bonds", "Real Estate", in Hebrew: "מניות", "אגרות חוב", "נדל\"ן").
        /// </summary>
        public string AssetType { get; set; } = string.Empty;

        /// <summary>
        /// Target allocation percentage for this asset class (e.g., 70.0 for 70%).
        /// </summary>
        public decimal TargetPercentage { get; set; }

        /// <summary>
        /// Expected annual return percentage for this asset class (e.g., 7.0 for 7%).
        /// </summary>
        public decimal ExpectedAnnualReturn { get; set; }

        /// <summary>
        /// Optional description or notes about this allocation.
        /// </summary>
        public string Description { get; set; } = string.Empty;
    }

    /// <summary>
    /// Complete calculation results for a FIRE plan including portfolio projections, withdrawals, taxes, and RSU data.
    /// </summary>
    public class ResultsFormulaMetadata
    {
        /// <summary>
        /// Inputs for explaining the total-contributions card.
        /// </summary>
        public TotalContributionsFormulaMetadata TotalContributions { get; set; } = new();

        /// <summary>
        /// Inputs for explaining annual withdrawal and monthly expense cards.
        /// </summary>
        public AnnualWithdrawalFormulaMetadata AnnualWithdrawal { get; set; } = new();

        /// <summary>
        /// Inputs for explaining the peak-value card when retirement rebalancing applies.
        /// </summary>
        public PeakValueFormulaMetadata PeakValue { get; set; } = new();
    }

    /// <summary>
    /// Explanation inputs for the total contributions result card.
    /// </summary>
    public class TotalContributionsFormulaMetadata
    {
        /// <summary>
        /// Current portfolio cost basis before any future accumulation contributions.
        /// </summary>
        public decimal CurrentCostBasis { get; set; }

        /// <summary>
        /// Contributions added during the modeled accumulation phase.
        /// </summary>
        public decimal AccumulationContributions { get; set; }

        /// <summary>
        /// Computed total contributions before any manual tax-basis override.
        /// </summary>
        public decimal ComputedTotalContributions { get; set; }

        /// <summary>
        /// Whether the user supplied a manual tax basis override.
        /// </summary>
        public bool UsesManualTaxBasis { get; set; }

        /// <summary>
        /// Manual tax basis used for the displayed result when provided.
        /// </summary>
        public decimal? ManualTaxBasis { get; set; }
    }

    /// <summary>
    /// Explanation inputs for annual withdrawal and derived monthly expense cards.
    /// </summary>
    public class AnnualWithdrawalFormulaMetadata
    {
        /// <summary>
        /// Portfolio value used as the withdrawal base.
        /// </summary>
        public decimal PeakValueForWithdrawal { get; set; }

        /// <summary>
        /// Withdrawal rate percentage.
        /// </summary>
        public decimal WithdrawalRate { get; set; }

        /// <summary>
        /// Effective tax rate percentage applied to gross withdrawals.
        /// </summary>
        public decimal EffectiveTaxRate { get; set; }
    }

    /// <summary>
    /// Explanation inputs for the peak-value card.
    /// </summary>
    public class PeakValueFormulaMetadata
    {
        /// <summary>
        /// Whether the plan switches to a retirement portfolio at retirement.
        /// </summary>
        public bool UsesRetirementPortfolio { get; set; }

        /// <summary>
        /// Whether the displayed card value is the gross pre-tax peak value.
        /// </summary>
        public bool DisplayedValueIsGross { get; set; }

        /// <summary>
        /// Tax-adjusted peak portfolio value after retirement rebalancing tax.
        /// </summary>
        public decimal TaxAdjustedPeakValue { get; set; }

        /// <summary>
        /// One-time retirement rebalancing tax.
        /// </summary>
        public decimal RetirementTaxToPay { get; set; }
    }

    /// <summary>
    /// Complete calculation results for a FIRE plan including portfolio projections, withdrawals, taxes, and explainability metadata.
    /// </summary>
    public class FireCalculationResult
    {
        /// <summary>
        /// Total amount contributed to the portfolio over the entire accumulation phase.
        /// </summary>
        public decimal TotalContributions { get; set; }

        /// <summary>
        /// Contributions added during the modeled accumulation phase (excluding current cost basis).
        /// This is the preferred field name for API consumers.
        /// </summary>
        public decimal TotalAccumulationContributions { get; set; }

        /// <summary>
        /// Backward-compatible alias for total accumulation contributions.
        /// Despite the legacy name, this is a total amount across the accumulation phase, not a monthly amount.
        /// </summary>
        public decimal TotalMonthlyContributions { get; set; }

        /// <summary>
        /// Portfolio value at early retirement (after retirement rebalancing tax if applicable).
        /// </summary>
        public decimal PeakValue { get; set; }

        /// <summary>
        /// Portfolio value at early retirement before any retirement rebalancing tax.
        /// </summary>
        public decimal GrossPeakValue { get; set; }

        /// <summary>
        /// Tax owed on capital gains when switching to retirement portfolio allocation.
        /// </summary>
        public decimal RetirementTaxToPay { get; set; }

        /// <summary>
        /// Portfolio value at the end of the retirement phase.
        /// </summary>
        public decimal EndValue { get; set; }

        /// <summary>
        /// Gross annual withdrawal amount (before taxes) at start of retirement.
        /// </summary>
        public decimal GrossAnnualWithdrawal { get; set; }

        /// <summary>
        /// Net annual withdrawal amount (after taxes) at start of retirement.
        /// </summary>
        public decimal NetAnnualWithdrawal { get; set; }

        /// <summary>
        /// Gross monthly expense amount (before taxes) at start of retirement.
        /// </summary>
        public decimal GrossMonthlyExpense { get; set; }

        /// <summary>
        /// Net monthly expense amount (after taxes) at start of retirement.
        /// </summary>
        public decimal NetMonthlyExpense { get; set; }

        /// <summary>
        /// Year-by-year breakdown of portfolio value, contributions, withdrawals, and expenses.
        /// </summary>
        public List<YearlyData> YearlyData { get; set; } = new();

        /// <summary>
        /// Portfolio assets used during accumulation phase.
        /// </summary>
        public List<PortfolioAsset> AccumulationPortfolio { get; set; } = new();

        /// <summary>
        /// Portfolio assets used during retirement phase.
        /// </summary>
        public List<PortfolioAsset> RetirementPortfolio { get; set; } = new();

        /// <summary>
        /// Current portfolio value at the start of calculations.
        /// </summary>
        public decimal CurrentValue { get; set; }

        /// <summary>
        /// Current portfolio cost basis at the start of calculations.
        /// </summary>
        public decimal CurrentCostBasis { get; set; }

        /// <summary>
        /// Percentage-based allocation strategy for accumulation phase.
        /// </summary>
        public List<PortfolioAllocation> AccumulationAllocation { get; set; } = new();

        /// <summary>
        /// Percentage-based allocation strategy for retirement phase.
        /// </summary>
        public List<PortfolioAllocation> RetirementAllocation { get; set; } = new();

        /// <summary>
        /// Weighted average expected return during accumulation phase (in percentage).
        /// </summary>
        public decimal AccumulationWeightedReturn { get; set; }

        /// <summary>
        /// Weighted average expected return during retirement phase (in percentage).
        /// </summary>
        public decimal RetirementWeightedReturn { get; set; }

        /// <summary>
        /// Year-by-year RSU vesting, selling, and tax timeline.
        /// </summary>
        public RsuYearlyData[] RsuTimeline { get; set; } = Array.Empty<RsuYearlyData>();

        /// <summary>
        /// Total market value of RSU holdings at early retirement.
        /// </summary>
        public decimal TotalRsuValueAtRetirement { get; set; }

        /// <summary>
        /// Total net proceeds from RSU sales after taxes.
        /// </summary>
        public decimal TotalRsuNetProceeds { get; set; }

        /// <summary>
        /// Total taxes paid on RSU transactions (vesting and sales).
        /// </summary>
        public decimal TotalRsuTaxesPaid { get; set; }

        /// <summary>
        /// Summary of current RSU holdings and activity.
        /// </summary>
        public RsuSummary? RsuSummary { get; set; }

        /// <summary>
        /// Age at which FIRE (Financial Independence) is reached.
        /// Calculated as EarlyRetirementYear - BirthYear.
        /// </summary>
        public int FireAgeReached { get; set; }

        /// <summary>
        /// Formula inputs for results-card explainability panels.
        /// </summary>
        public ResultsFormulaMetadata FormulaMetadata { get; set; } = new();
    }

    /// <summary>
    /// Money flow breakdown for a single year, used for Sankey diagram visualization.
    /// Tracks all inflows (contributions, growth, RSU) and outflows (taxes, expenses, withdrawals).
    /// </summary>
    public class SankeyFlowData
    {
        /// <summary>
        /// Total monthly contributions made this year.
        /// </summary>
        public decimal MonthlyContributions { get; set; }

        /// <summary>
        /// Portfolio investment growth (returns) this year.
        /// </summary>
        public decimal PortfolioGrowth { get; set; }

        /// <summary>
        /// Net proceeds from RSU sales this year (after taxes).
        /// </summary>
        public decimal RsuNetProceeds { get; set; }

        /// <summary>
        /// Capital gains taxes paid this year on withdrawals or asset sales.
        /// </summary>
        public decimal CapitalGainsTax { get; set; }

        /// <summary>
        /// Total planned expenses this year (e.g., car, house down payment).
        /// </summary>
        public decimal PlannedExpenses { get; set; }

        /// <summary>
        /// Total retirement withdrawals this year for living expenses.
        /// </summary>
        public decimal RetirementWithdrawals { get; set; }

        /// <summary>
        /// Tax paid on portfolio rebalancing at retirement (switching allocations).
        /// </summary>
        public decimal RetirementRebalancingTax { get; set; }

        /// <summary>
        /// Current phase: "Accumulation" or "Retirement".
        /// </summary>
        public string Phase { get; set; } = "";

        /// <summary>
        /// Annual pension income received this year (in USD).
        /// Zero during accumulation phase and retirement years before pension starts.
        /// </summary>
        public decimal PensionIncome { get; set; }

        /// <summary>
        /// Whether this is the year of retirement (transition year).
        /// </summary>
        public bool IsRetirementYear { get; set; }

        /// <summary>
        /// Capital gains tax paid specifically on retirement withdrawals this year.
        /// </summary>
        public decimal WithdrawalCapGainsTax { get; set; }

        /// <summary>
        /// Capital gains tax paid specifically on planned expenses this year.
        /// </summary>
        public decimal ExpensesCapGainsTax { get; set; }
    }

    /// <summary>
    /// Portfolio data and financial activity for a single year in the FIRE plan timeline.
    /// </summary>
    public class YearlyData
    {
        /// <summary>
        /// Calendar year.
        /// </summary>
        public int Year { get; set; }

        /// <summary>
        /// Total portfolio value at end of year.
        /// </summary>
        public decimal PortfolioValue { get; set; }

        /// <summary>
        /// Cumulative contributions to date.
        /// </summary>
        public decimal TotalContributions { get; set; }

        /// <summary>
        /// Annual withdrawal amount this year (null if in accumulation phase).
        /// </summary>
        public decimal? AnnualWithdrawal { get; set; }

        /// <summary>
        /// Current phase: "Accumulation" or "Retirement".
        /// </summary>
        public string Phase { get; set; } = string.Empty;

        /// <summary>
        /// Planned expenses occurring in this year.
        /// </summary>
        public List<PlannedExpense> Expenses { get; set; } = new();

        /// <summary>
        /// Number of RSU shares that vested this year.
        /// </summary>
        public int RsuSharesVested { get; set; }

        /// <summary>
        /// Number of RSU shares sold this year.
        /// </summary>
        public int RsuSharesSold { get; set; }

        /// <summary>
        /// Net proceeds from RSU sales this year after taxes, in USD.
        /// This value is currency-normalized for consistency with portfolio calculations.
        /// </summary>
        public decimal RsuSaleProceeds { get; set; }

        /// <summary>
        /// Total RSU-related taxes paid this year.
        /// </summary>
        public decimal RsuTaxesPaid { get; set; }

        /// <summary>
        /// Market value of vested but unsold RSU holdings.
        /// </summary>
        public decimal RsuHoldingsValue { get; set; }

        /// <summary>
        /// Detailed money flow breakdown for Sankey diagram visualization.
        /// </summary>
        public SankeyFlowData FlowData { get; set; } = new();
    }

    /// <summary>
    /// Complete FIRE plan data for saving and loading via JSON serialization.
    /// Contains all inputs, expenses, and portfolio configuration.
    /// </summary>
    public class FirePlanData
    {
        /// <summary>
        /// User input parameters for the FIRE plan (as strings for UI binding).
        /// </summary>
        public FirePlanInputs Inputs { get; set; } = new();

        /// <summary>
        /// RSU configuration persisted with the saved plan.
        /// </summary>
        public RsuConfiguration? RsuConfiguration { get; set; }

        /// <summary>
        /// Whether RSU data should be included in calculations for the saved plan.
        /// </summary>
        public bool IncludeRsuInCalculations { get; set; } = true;

        /// <summary>
        /// List of planned expenses.
        /// </summary>
        public List<PlannedExpense> Expenses { get; set; } = new();

        /// <summary>
        /// Portfolio assets for accumulation phase.
        /// </summary>
        public List<PortfolioAsset> AccumulationPortfolio { get; set; } = new();

        /// <summary>
        /// Portfolio assets for retirement phase.
        /// </summary>
        public List<PortfolioAsset> RetirementPortfolio { get; set; } = new();

        /// <summary>
        /// Percentage-based allocation for accumulation phase.
        /// </summary>
        public List<PortfolioAllocation> AccumulationAllocation { get; set; } = new();

        /// <summary>
        /// Percentage-based allocation for retirement phase.
        /// </summary>
        public List<PortfolioAllocation> RetirementAllocation { get; set; } = new();

        /// <summary>
        /// Investment strategy type: "fixed", "ageBased", or "targetDate".
        /// </summary>
        public string InvestmentStrategy { get; set; } = "fixed";

        /// <summary>
        /// Current portfolio value as string for UI binding.
        /// </summary>
        public string CurrentPortfolioValue { get; set; } = "0";
    }

    /// <summary>
    /// User input parameters for FIRE plan as string values for UI binding.
    /// These are converted to typed values in FirePlanInput for calculations.
    /// </summary>
    public class FirePlanInputs
    {
        /// <summary>
        /// User's birth date as string (ISO format: yyyy-MM-dd).
        /// </summary>
        public string BirthDate { get; set; } = string.Empty;

        /// <summary>
        /// Birth year as string (for backward compatibility). Setting this updates BirthDate.
        /// </summary>
        public string BirthYear
        {
            get
            {
                if (DateTime.TryParse(BirthDate, out var date))
                {
                    return date.Year.ToString();
                }
                // Fall back to extracting year from BirthDate string if it's just a year
                return BirthDate.Length >= 4 ? BirthDate.Substring(0, 4) : string.Empty;
            }
            set
            {
                if (int.TryParse(value, out var year))
                {
                    BirthDate = $"{year}-01-01";
                }
            }
        }

        /// <summary>
        /// Early retirement year as string.
        /// </summary>
        public string EarlyRetirementYear { get; set; } = string.Empty;

        /// <summary>
        /// Full retirement age as string.
        /// </summary>
        public string FullRetirementAge { get; set; } = string.Empty;

        /// <summary>
        /// Monthly contribution amount as string.
        /// </summary>
        public string MonthlyContribution { get; set; } = string.Empty;

        /// <summary>
        /// Display currency ("$" or "₪").
        /// </summary>
        public string Currency { get; set; } = "₪";

        /// <summary>
        /// Withdrawal rate percentage as string.
        /// </summary>
        public string WithdrawalRate { get; set; } = string.Empty;

        /// <summary>
        /// Inflation rate percentage as string.
        /// </summary>
        public string InflationRate { get; set; } = string.Empty;

        /// <summary>
        /// Capital gains tax rate percentage as string.
        /// </summary>
        public string CapitalGainsTax { get; set; } = string.Empty;

        /// <summary>
        /// Net monthly pension amount as string (fixed nominal, not inflation-indexed).
        /// </summary>
        public string PensionNetMonthlyAmount { get; set; } = string.Empty;

        /// <summary>
        /// Currency of the pension amount ("$" or "₪").
        /// </summary>
        public string PensionCurrency { get; set; } = "$";
    }
}
