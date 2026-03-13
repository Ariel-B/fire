using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using System.Text.Json.Serialization;

namespace FirePlanningTool.Models
{
    /// <summary>
    /// Types of vesting schedules for RSU grants
    /// </summary>
    public enum VestingScheduleType
    {
        /// <summary>
        /// Standard vesting: 1-year cliff, then 25% yearly (most common)
        /// </summary>
        Standard
        // Phase 2 vesting types:
        // Quarterly,  // 25% per year, paid quarterly
        // Yearly,     // 25% per year, annual from start
        // Cliff,      // 100% after N years
        // Custom      // User-defined schedule
    }

    /// <summary>
    /// RSU liquidation strategies optimized for Israeli tax law (Section 102).
    /// These strategies determine when RSU shares are sold and how taxes are calculated.
    /// <para>
    /// Israeli Section 102 provides favorable capital gains tax treatment (25% + 3% surtax)
    /// for RSU shares held at least 2 years from the grant date.
    /// </para>
    /// </summary>
    /// <remarks>
    /// <para><b>Tax Context:</b></para>
    /// <list type="bullet">
    ///   <item>Section 102 eligible (2+ years from grant): 25% capital gains tax + optional 3% surtax</item>
    ///   <item>Not eligible (&lt;2 years): Higher marginal income tax at vest + capital gains on appreciation</item>
    /// </list>
    /// </remarks>
    public enum RsuLiquidationStrategy
    {
        /// <summary>
        /// Strategy 1: Sell 2 years after grant date for full Section 102 benefit.
        /// <para>
        /// When shares vest, they are held (not sold). Exactly 2 years after the grant date,
        /// all vested shares from that grant are sold with maximum tax optimization.
        /// </para>
        /// </summary>
        /// <remarks>
        /// <para><b>Early Retirement Handling:</b></para>
        /// <list type="bullet">
        ///   <item>At retirement: All unvested RSUs are forfeited (lost)</item>
        ///   <item>Only vested shares at retirement are kept</item>
        ///   <item>Continue selling vested shares 2 years after grant as planned</item>
        ///   <item>No new shares vest after retirement</item>
        /// </list>
        /// <para><b>Tax Calculation:</b></para>
        /// <code>
        /// Marginal Tax = MIN(Grant Price, Sale Price) × Shares × Marginal Tax Rate
        /// Capital Gains = (Sale Price - Grant Price) × Shares (if positive)
        /// Capital Gains Tax = Capital Gains × (25% + 3% surtax if applicable)
        /// Total Tax = Marginal Tax + Capital Gains Tax
        /// Net Proceeds = (Sale Price × Shares) - Total Tax
        /// </code>
        /// <para><b>Pros:</b> Maximum tax benefit (25% capital gains on all gains)</para>
        /// <para><b>Cons:</b> Concentration risk, delayed liquidity, high forfeiture risk if retiring early</para>
        /// </remarks>
        SellAfter2Years,

        /// <summary>
        /// Strategy 2: Sell at early retirement with partial Section 102 benefit.
        /// <para>
        /// When early retirement year is reached, sell all Section 102 eligible shares immediately.
        /// Hold non-eligible shares until they reach 2-year eligibility, then sell.
        /// </para>
        /// </summary>
        /// <remarks>
        /// <para><b>Behavior at Retirement:</b></para>
        /// <list type="bullet">
        ///   <item>All unvested RSUs are forfeited (standard employment termination rule)</item>
        ///   <item>Sell all vested shares granted ≥2 years ago (Section 102 applies)</item>
        ///   <item>Hold vested shares granted &lt;2 years ago until they reach 2-year eligibility</item>
        ///   <item>Post-retirement: Sell remaining vested shares when they reach 2-year mark</item>
        /// </list>
        /// <para><b>Tax Treatment:</b></para>
        /// <list type="bullet">
        ///   <item>Section 102 eligible (2+ years from grant): Capital gains tax only (25% + 3%)</item>
        ///   <item>Not eligible (&lt;2 years): Higher tax (income tax at vest + capital gains)</item>
        /// </list>
        /// <para><b>Pros:</b> Immediate liquidity at retirement for vested shares, lower forfeiture risk,
        /// more flexibility in retirement timing</para>
        /// <para><b>Cons:</b> All unvested RSUs forfeited at retirement, less tax benefit for recently
        /// granted shares (&lt;2 years), may sacrifice significant unvested value</para>
        /// </remarks>
        SellAtRetirement
    }

    /// <summary>
    /// Types of RSU transactions
    /// </summary>
    public enum RsuTransactionType
    {
        /// <summary>
        /// Shares vested (became owned by employee)
        /// </summary>
        Vest,

        /// <summary>
        /// Shares sold
        /// </summary>
        Sell,

        /// <summary>
        /// Shares held (not yet sold)
        /// </summary>
        Hold,

        /// <summary>
        /// Unvested shares lost upon resignation/retirement
        /// </summary>
        Forfeit
    }

    /// <summary>
    /// Represents a single RSU grant from an employer
    /// </summary>
    public class RsuGrant
    {
        /// <summary>
        /// Unique identifier for the grant
        /// </summary>
        public long Id { get; set; }

        /// <summary>
        /// Date when RSUs were granted by the employer
        /// </summary>
        public DateTime GrantDate { get; set; }

        /// <summary>
        /// Total number of shares granted
        /// </summary>
        public int NumberOfShares { get; set; }

        /// <summary>
        /// Stock price on grant date (Money type with currency, used for tax basis calculation)
        /// </summary>
        public Money PriceAtGrant { get; set; } = Money.Usd(0);

        /// <summary>
        /// Number of years until fully vested (default: 4)
        /// </summary>
        public int VestingPeriodYears { get; set; } = 4;

        /// <summary>
        /// Type of vesting schedule
        /// </summary>
        public VestingScheduleType VestingType { get; set; } = VestingScheduleType.Standard;

        /// <summary>
        /// Date when Section 102 tax benefit applies (2 years after grant)
        /// </summary>
        public DateTime Section102EligibleDate => GrantDate.AddYears(2);
    }

    /// <summary>
    /// Global configuration for RSU grants (per company/stock symbol)
    /// </summary>
    public class RsuConfiguration
    {
        /// <summary>
        /// Company stock ticker symbol (e.g., GOOGL, MSFT)
        /// </summary>
        public string StockSymbol { get; set; } = string.Empty;

        /// <summary>
        /// Current market price per share (Money type with currency)
        /// </summary>
        public Money CurrentPricePerShare { get; set; } = Money.Usd(0);

        /// <summary>
        /// Expected annual return percentage for stock price projection
        /// </summary>
        public decimal ExpectedAnnualReturn { get; set; } = 0;

        /// <summary>
        /// Method for projecting future prices ("CAGR" or "Fixed")
        /// </summary>
        public string ReturnMethod { get; set; } = "CAGR";

        /// <summary>
        /// Default vesting period for new grants (years)
        /// </summary>
        public int DefaultVestingPeriodYears { get; set; } = 4;

        /// <summary>
        /// Strategy for liquidating vested RSUs
        /// </summary>
        public RsuLiquidationStrategy LiquidationStrategy { get; set; } = RsuLiquidationStrategy.SellAfter2Years;

        /// <summary>
        /// User's marginal income tax rate (%) for RSU grant value taxation
        /// Typically 31-50% depending on income bracket
        /// </summary>
        public decimal MarginalTaxRate { get; set; } = 47m;

        /// <summary>
        /// Whether user's annual income exceeds ₪721,560 threshold (3% additional tax on gains)
        /// </summary>
        public bool SubjectTo3PercentSurtax { get; set; } = true;

        /// <summary>
        /// List of RSU grants
        /// </summary>
        public List<RsuGrant> Grants { get; set; } = new();
    }

    /// <summary>
    /// Represents a single RSU transaction (vest, sell, hold, forfeit)
    /// </summary>
    public class RsuTransaction
    {
        /// <summary>
        /// ID of the grant this transaction belongs to
        /// </summary>
        public long GrantId { get; set; }

        /// <summary>
        /// Date of the transaction
        /// </summary>
        public DateTime TransactionDate { get; set; }

        /// <summary>
        /// Type of transaction
        /// </summary>
        public RsuTransactionType Type { get; set; }

        /// <summary>
        /// Number of shares involved
        /// </summary>
        public int Shares { get; set; }

        /// <summary>
        /// Price per share at transaction time
        /// </summary>
        public decimal PricePerShare { get; set; }

        /// <summary>
        /// Tax rate applied (as decimal, e.g., 0.25 for 25%)
        /// </summary>
        public decimal TaxRate { get; set; }

        /// <summary>
        /// Total tax amount paid
        /// </summary>
        public decimal TaxAmount { get; set; }

        /// <summary>
        /// Whether Section 102 benefit was applied
        /// </summary>
        public bool Section102Applied { get; set; }
    }

    /// <summary>
    /// RSU data for a single year in the simulation
    /// </summary>
    public class RsuYearlyData
    {
        /// <summary>
        /// Calendar year
        /// </summary>
        public int Year { get; set; }

        /// <summary>
        /// Number of shares that vested this year
        /// </summary>
        public int SharesVested { get; set; }

        /// <summary>
        /// Number of shares sold this year
        /// </summary>
        public int SharesSold { get; set; }

        /// <summary>
        /// Number of shares still held (vested but not sold)
        /// </summary>
        public int SharesHeld { get; set; }

        /// <summary>
        /// Number of unvested shares forfeited (at retirement)
        /// </summary>
        public int SharesForfeited { get; set; }

        /// <summary>
        /// Market value of all shares (vested + unvested)
        /// </summary>
        public decimal MarketValue { get; set; }

        /// <summary>
        /// Value of forfeited shares
        /// </summary>
        public decimal ForfeitedValue { get; set; }

        /// <summary>
        /// Gross proceeds from sales before tax
        /// </summary>
        public decimal GrossSaleProceeds { get; set; }

        /// <summary>
        /// Net proceeds from sales after tax
        /// </summary>
        public decimal NetSaleProceeds { get; set; }

        /// <summary>
        /// Total taxes paid on RSU transactions this year
        /// </summary>
        public decimal TaxesPaid { get; set; }

        /// <summary>
        /// Projected stock price for this year
        /// </summary>
        public decimal ProjectedStockPrice { get; set; }

        /// <summary>
        /// Individual transactions that occurred this year
        /// </summary>
        public List<RsuTransaction> Transactions { get; set; } = new();
    }

    /// <summary>
    /// Summary of RSU holdings and activity
    /// </summary>
    public class RsuSummary
    {
        /// <summary>
        /// Total shares granted across all grants
        /// </summary>
        public int TotalSharesGranted { get; set; }

        /// <summary>
        /// Total shares that have vested
        /// </summary>
        public int TotalSharesVested { get; set; }

        /// <summary>
        /// Total shares not yet vested
        /// </summary>
        public int TotalSharesUnvested { get; set; }

        /// <summary>
        /// Total vested shares still held (not sold)
        /// </summary>
        public int TotalSharesHeld { get; set; }

        /// <summary>
        /// Total shares sold
        /// </summary>
        public int TotalSharesSold { get; set; }

        /// <summary>
        /// Total shares lost due to forfeiture at retirement
        /// </summary>
        public int TotalSharesForfeited { get; set; }

        /// <summary>
        /// Current market value of all shares
        /// </summary>
        public decimal CurrentMarketValue { get; set; }

        /// <summary>
        /// Total net proceeds received from all sales
        /// </summary>
        public decimal TotalProceedsToDate { get; set; }

        /// <summary>
        /// Total taxes paid on all RSU transactions
        /// </summary>
        public decimal TotalTaxesPaid { get; set; }

        /// <summary>
        /// Dollar value of forfeited shares
        /// </summary>
        public decimal ForfeitedValue { get; set; }

        /// <summary>
        /// Percentage of total grant value lost to forfeiture (0-100)
        /// </summary>
        public decimal ForfeiturePercentage { get; set; }
    }
}
