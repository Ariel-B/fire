using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for RSU (Restricted Stock Unit) calculations
    /// </summary>
    public interface IRsuCalculator
    {
        /// <summary>
        /// Project RSU timeline from start year to end year
        /// </summary>
        /// <param name="config">RSU configuration including grants</param>
        /// <param name="startYear">First year of projection</param>
        /// <param name="endYear">Last year of projection</param>
        /// <param name="retirementYear">Year of early retirement (unvested shares forfeited)</param>
        /// <param name="capitalGainsTaxRate">Capital gains tax rate from global settings</param>
        /// <returns>Array of yearly RSU data</returns>
        RsuYearlyData[] ProjectRsuTimeline(
            RsuConfiguration config,
            int startYear,
            int endYear,
            int retirementYear,
            decimal capitalGainsTaxRate);

        /// <summary>
        /// Project future stock prices based on expected return
        /// </summary>
        /// <param name="currentPrice">Current stock price</param>
        /// <param name="annualReturn">Expected annual return percentage</param>
        /// <param name="method">Projection method ("CAGR" or "Fixed")</param>
        /// <param name="years">Number of years to project</param>
        /// <returns>Array of projected prices (index 0 = current price)</returns>
        decimal[] ProjectStockPrices(decimal currentPrice, decimal annualReturn, string method, int years);

        /// <summary>
        /// Calculate vested shares for a grant as of a specific date
        /// </summary>
        /// <param name="grant">The RSU grant</param>
        /// <param name="asOfDate">Date to calculate vesting for</param>
        /// <returns>Number of vested shares</returns>
        int CalculateVestedShares(RsuGrant grant, DateTime asOfDate);

        /// <summary>
        /// Calculate Section 102 tax (for shares held 2+ years from grant)
        /// </summary>
        decimal CalculateSection102Tax(
            RsuGrant grant,
            decimal salePrice,
            int sharesSold,
            decimal marginalTaxRate,
            decimal capitalGainsTaxRate,
            bool subjectTo3PercentSurtax);

        /// <summary>
        /// Calculate regular tax (for shares held less than 2 years)
        /// </summary>
        decimal CalculateRegularTax(
            RsuGrant grant,
            decimal vestPrice,
            decimal salePrice,
            int sharesSold,
            decimal marginalTaxRate,
            decimal capitalGainsTaxRate,
            bool subjectTo3PercentSurtax);

        /// <summary>
        /// Get current RSU summary for display
        /// </summary>
        RsuSummary GetCurrentSummary(RsuConfiguration config, DateTime asOfDate);
    }

    /// <summary>
    /// RSU calculation service implementing Israeli Section 102 tax law
    /// </summary>
    public class RsuCalculator : IRsuCalculator
    {
        private readonly ICurrencyConverter _currencyConverter;

        /// <summary>
        /// Creates a new RSU calculator with default currency converter
        /// </summary>
        public RsuCalculator() : this(new CurrencyConverter())
        {
        }

        /// <summary>
        /// Creates a new RSU calculator with dependency injection
        /// </summary>
        public RsuCalculator(ICurrencyConverter currencyConverter)
        {
            _currencyConverter = currencyConverter ?? throw new ArgumentNullException(nameof(currencyConverter));
        }

        /// <inheritdoc/>
        public decimal[] ProjectStockPrices(decimal currentPrice, decimal annualReturn, string method, int years)
        {
            if (years < 0) throw new ArgumentException("Years must be non-negative", nameof(years));
            if (currentPrice < 0) throw new ArgumentException("Current price must be non-negative", nameof(currentPrice));

            var prices = new decimal[years + 1];
            prices[0] = currentPrice;

            for (int i = 1; i <= years; i++)
            {
                if (method == "CAGR")
                {
                    // Compound Annual Growth Rate
                    prices[i] = currentPrice * (decimal)Math.Pow(1 + (double)annualReturn / 100, i);
                }
                else // Fixed
                {
                    // Simple annual growth from previous year
                    prices[i] = prices[i - 1] * (1 + annualReturn / 100);
                }
            }

            return prices;
        }

        /// <inheritdoc/>
        public int CalculateVestedShares(RsuGrant grant, DateTime asOfDate)
        {
            if (grant == null) throw new ArgumentNullException(nameof(grant));

            var elapsedDays = (asOfDate - grant.GrantDate).TotalDays;
            var elapsedYears = elapsedDays / 365.25;

            // If fully vested
            if (elapsedYears >= grant.VestingPeriodYears)
            {
                return grant.NumberOfShares;
            }

            if (grant.VestingType == VestingScheduleType.Standard)
            {
                // Standard vesting: 1-year cliff, then 25% yearly
                // Nothing vests until 1 year has passed
                if (elapsedYears < 1.0)
                {
                    return 0;
                }

                // After cliff: calculate based on completed years
                // Year 1 complete = 25%, Year 2 complete = 50%, etc.
                var completedYears = (int)Math.Floor(elapsedYears);
                var vestingRate = Math.Min(1.0, completedYears * 0.25);
                return (int)(grant.NumberOfShares * vestingRate);
            }

            // Default linear vesting (for future vesting types)
            var linearRate = elapsedYears / grant.VestingPeriodYears;
            return (int)(grant.NumberOfShares * Math.Min(1.0, linearRate));
        }

        /// <inheritdoc/>
        public decimal CalculateSection102Tax(
            RsuGrant grant,
            decimal salePrice,
            int sharesSold,
            decimal marginalTaxRate,
            decimal capitalGainsTaxRate,
            bool subjectTo3PercentSurtax)
        {
            if (grant == null) throw new ArgumentNullException(nameof(grant));
            if (sharesSold <= 0) return 0;

            // Use Money type for type-safe currency conversion (fixes Bug #3)
            // Convert prices to ILS for tax calculation (Israeli tax is in ILS)
            var grantPriceTyped = grant.PriceAtGrant;
            var grantPriceIls = _currencyConverter.ConvertToIls(grantPriceTyped).Amount;

            var salePriceTyped = Money.Create(salePrice, grant.PriceAtGrant.Currency);
            var salePriceIls = _currencyConverter.ConvertToIls(salePriceTyped).Amount;

            // Marginal tax on the lower of grant price or sale price
            var taxableGrantValue = Math.Min(grantPriceIls, salePriceIls) * sharesSold;
            var marginalTax = taxableGrantValue * (marginalTaxRate / 100m);

            // Capital gains tax on appreciation (if any)
            var capitalGains = Math.Max(0, (salePriceIls - grantPriceIls) * sharesSold);

            // Apply capital gains tax + 3% surtax if applicable
            var effectiveCapitalGainsRate = capitalGainsTaxRate / 100m;
            if (subjectTo3PercentSurtax)
            {
                effectiveCapitalGainsRate += CalculationConstants.SurtaxRate;
            }

            var capitalGainsTax = capitalGains * effectiveCapitalGainsRate;

            return marginalTax + capitalGainsTax;
        }

        /// <inheritdoc/>
        public decimal CalculateRegularTax(
            RsuGrant grant,
            decimal vestPrice,
            decimal salePrice,
            int sharesSold,
            decimal marginalTaxRate,
            decimal capitalGainsTaxRate,
            bool subjectTo3PercentSurtax)
        {
            if (grant == null) throw new ArgumentNullException(nameof(grant));
            if (sharesSold <= 0) return 0;

            // Use Money type for type-safe currency conversion (fixes Bug #4)
            // Convert prices to ILS for tax calculation
            var grantPriceTyped = grant.PriceAtGrant;
            var grantPriceIls = _currencyConverter.ConvertToIls(grantPriceTyped).Amount;

            var vestPriceTyped = Money.Create(vestPrice, grant.PriceAtGrant.Currency);
            var vestPriceIls = _currencyConverter.ConvertToIls(vestPriceTyped).Amount;

            var salePriceTyped = Money.Create(salePrice, grant.PriceAtGrant.Currency);
            var salePriceIls = _currencyConverter.ConvertToIls(salePriceTyped).Amount;

            // Marginal tax on grant value (or sale price if lower)
            var taxableGrantValue = Math.Min(grantPriceIls, salePriceIls) * sharesSold;
            var marginalTax = taxableGrantValue * (marginalTaxRate / 100m);

            // Income tax on appreciation from grant to vest
            var incomeAtVest = Math.Max(0, (vestPriceIls - grantPriceIls) * sharesSold);
            var incomeTax = incomeAtVest * (marginalTaxRate / 100m);

            // Capital gains tax on appreciation from vest to sale
            var capitalGains = Math.Max(0, (salePriceIls - vestPriceIls) * sharesSold);

            // Apply capital gains tax + 3% surtax if applicable
            var effectiveCapitalGainsRate = capitalGainsTaxRate / 100m;
            if (subjectTo3PercentSurtax)
            {
                effectiveCapitalGainsRate += CalculationConstants.SurtaxRate;
            }

            var capitalGainsTax = capitalGains * effectiveCapitalGainsRate;

            return marginalTax + incomeTax + capitalGainsTax;
        }

        /// <inheritdoc/>
        public RsuSummary GetCurrentSummary(RsuConfiguration config, DateTime asOfDate)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));

            var summary = new RsuSummary();

            foreach (var grant in config.Grants)
            {
                summary.TotalSharesGranted += grant.NumberOfShares;

                var vestedShares = CalculateVestedShares(grant, asOfDate);
                summary.TotalSharesVested += vestedShares;
                summary.TotalSharesUnvested += (grant.NumberOfShares - vestedShares);
            }

            // For current summary, all vested shares are held (not yet sold)
            summary.TotalSharesHeld = summary.TotalSharesVested;

            // Calculate current market value
            summary.CurrentMarketValue = summary.TotalSharesGranted * config.CurrentPricePerShare.Amount;

            return summary;
        }

        /// <inheritdoc/>
        public RsuYearlyData[] ProjectRsuTimeline(
            RsuConfiguration config,
            int startYear,
            int endYear,
            int retirementYear,
            decimal capitalGainsTaxRate)
        {
            if (config == null) throw new ArgumentNullException(nameof(config));
            if (endYear < startYear) throw new ArgumentException("End year must be >= start year");

            var totalYears = endYear - startYear;
            var projectedPrices = ProjectStockPrices(
                config.CurrentPricePerShare.Amount,
                config.ExpectedAnnualReturn,
                config.ReturnMethod,
                totalYears
            );

            var yearlyData = new List<RsuYearlyData>();
            var heldShares = new List<HeldShareInfo>();
            var hasRetired = false;
            var totalSharesSold = 0;
            var totalSharesForfeited = 0;

            // Initialize heldShares with shares that vested before startYear but haven't been sold yet.
            // This handles the case where the simulation starts mid-way through a grant's vesting period.
            // Without this, pre-simulation vested-but-unsold shares are lost, causing RSU columns to show
            // zero for users with older grants.
            var preStartDate = new DateTime(startYear - 1, 12, 31); // End of year before simulation starts
            foreach (var grant in config.Grants)
            {
                var sharesVestedBeforeStart = CalculateVestedShares(grant, preStartDate);
                if (sharesVestedBeforeStart <= 0) continue;

                if (config.LiquidationStrategy == RsuLiquidationStrategy.SellAfter2Years)
                {
                    // Shares are sold in the first year where yearsSinceGrant >= Section 102 holding period (2 years).
                    // Use preStartDate (Dec 31 of the year before the simulation starts) to determine whether
                    // the holding period elapsed BEFORE the simulation window. If the grant was not yet 2 years
                    // old by Dec 31 of (startYear-1), those vested shares could NOT have been sold yet and must
                    // be carried into heldShares so the simulation sells them in the correct year.
                    var yearsSinceGrantByPreStart = (preStartDate - grant.GrantDate).TotalDays / 365.25;
                    if (yearsSinceGrantByPreStart < CalculationConstants.Section102HoldingPeriodYears)
                    {
                        // Grant was not yet 2 years old by end of (startYear-1).
                        // Pre-simulation vested shares are still held — add them.
                        heldShares.Add(new HeldShareInfo
                        {
                            GrantId = grant.Id,
                            Grant = grant,
                            Shares = sharesVestedBeforeStart,
                            VestDate = preStartDate,
                            VestPrice = projectedPrices[0] // Approximate with startYear price
                        });
                    }
                    // If the grant was already 2+ years old by end of (startYear-1), the shares
                    // qualified in a prior year and were sold before the simulation window.
                }
                else if (config.LiquidationStrategy == RsuLiquidationStrategy.SellAtRetirement)
                {
                    // For SellAtRetirement: shares accumulate until retirement regardless of eligibility;
                    // all pre-simulation vested shares must be tracked in heldShares.
                    heldShares.Add(new HeldShareInfo
                    {
                        GrantId = grant.Id,
                        Grant = grant,
                        Shares = sharesVestedBeforeStart,
                        VestDate = preStartDate,
                        VestPrice = projectedPrices[0]
                    });
                }
            }

            for (int yearIndex = 0; yearIndex <= totalYears; yearIndex++)
            {
                var currentYear = startYear + yearIndex;
                var currentDate = new DateTime(currentYear, 12, 31); // End of year
                var currentPrice = projectedPrices[yearIndex];

                var yearData = new RsuYearlyData
                {
                    Year = currentYear,
                    ProjectedStockPrice = currentPrice
                };

                // Check for retirement this year
                if (currentYear == retirementYear && !hasRetired)
                {
                    hasRetired = true;

                    // Forfeit all unvested shares at retirement
                    // Also add vested shares to heldShares (they weren't tracked before retirement)
                    foreach (var grant in config.Grants)
                    {
                        var vestedAtRetirement = CalculateVestedShares(grant, currentDate);
                        var unvested = grant.NumberOfShares - vestedAtRetirement;

                        // Add vested shares to heldShares (for selling later)
                        // Calculate shares newly vested this year
                        var previousVested = CalculateVestedShares(grant, new DateTime(currentYear - 1, 12, 31));
                        var newlyVested = vestedAtRetirement - previousVested;
                        if (newlyVested > 0)
                        {
                            yearData.SharesVested += newlyVested;

                            heldShares.Add(new HeldShareInfo
                            {
                                GrantId = grant.Id,
                                Grant = grant,
                                Shares = newlyVested,
                                VestDate = currentDate,
                                VestPrice = currentPrice
                            });

                            yearData.Transactions.Add(new RsuTransaction
                            {
                                GrantId = grant.Id,
                                TransactionDate = currentDate,
                                Type = RsuTransactionType.Vest,
                                Shares = newlyVested,
                                PricePerShare = currentPrice
                            });
                        }

                        if (unvested > 0)
                        {
                            yearData.SharesForfeited += unvested;
                            yearData.ForfeitedValue += unvested * currentPrice;
                            totalSharesForfeited += unvested;

                            yearData.Transactions.Add(new RsuTransaction
                            {
                                GrantId = grant.Id,
                                TransactionDate = currentDate,
                                Type = RsuTransactionType.Forfeit,
                                Shares = unvested,
                                PricePerShare = currentPrice
                            });
                        }
                    }
                }

                // Process vesting for all grants (only if still employed)
                if (!hasRetired)
                {
                    foreach (var grant in config.Grants)
                    {
                        var previousVested = CalculateVestedShares(grant, new DateTime(currentYear - 1, 12, 31));
                        var currentVested = CalculateVestedShares(grant, currentDate);
                        var newlyVested = currentVested - previousVested;

                        if (newlyVested > 0)
                        {
                            yearData.SharesVested += newlyVested;

                            // Add to held shares tracking
                            heldShares.Add(new HeldShareInfo
                            {
                                GrantId = grant.Id,
                                Grant = grant,
                                Shares = newlyVested,
                                VestDate = currentDate,
                                VestPrice = currentPrice
                            });

                            yearData.Transactions.Add(new RsuTransaction
                            {
                                GrantId = grant.Id,
                                TransactionDate = currentDate,
                                Type = RsuTransactionType.Vest,
                                Shares = newlyVested,
                                PricePerShare = currentPrice
                            });
                        }
                    }
                }

                // Apply liquidation strategy (Strategy 1: Sell 2 years after grant)
                if (config.LiquidationStrategy == RsuLiquidationStrategy.SellAfter2Years)
                {
                    var sharesToSell = new List<HeldShareInfo>();

                    foreach (var held in heldShares)
                    {
                        // Check if 2 years have passed since grant date
                        var yearsSinceGrant = (currentDate - held.Grant.GrantDate).TotalDays / 365.25;
                        if (yearsSinceGrant >= CalculationConstants.Section102HoldingPeriodYears)
                        {
                            sharesToSell.Add(held);
                        }
                    }

                    foreach (var held in sharesToSell)
                    {
                        // Calculate Section 102 tax (returns value in ILS)
                        var taxIls = CalculateSection102Tax(
                            held.Grant,
                            currentPrice,
                            held.Shares,
                            config.MarginalTaxRate,
                            capitalGainsTaxRate,
                            config.SubjectTo3PercentSurtax
                        );

                        // Use Money type for type-safe currency conversion
                        var taxIlsTyped = Money.Ils(taxIls);
                        var taxUsd = _currencyConverter.ConvertToUsd(taxIlsTyped).Amount;

                        var grossProceeds = held.Shares * currentPrice;
                        var netProceeds = grossProceeds - taxUsd;

                        yearData.SharesSold += held.Shares;
                        yearData.GrossSaleProceeds += grossProceeds;
                        yearData.NetSaleProceeds += netProceeds;
                        yearData.TaxesPaid += taxUsd;
                        totalSharesSold += held.Shares;

                        yearData.Transactions.Add(new RsuTransaction
                        {
                            GrantId = held.GrantId,
                            TransactionDate = currentDate,
                            Type = RsuTransactionType.Sell,
                            Shares = held.Shares,
                            PricePerShare = currentPrice,
                            TaxRate = (config.SubjectTo3PercentSurtax ? capitalGainsTaxRate + 3 : capitalGainsTaxRate) / 100m,
                            TaxAmount = taxUsd,
                            Section102Applied = true
                        });

                        heldShares.Remove(held);
                    }
                }
                // Apply liquidation strategy (Strategy 2: Sell at retirement)
                else if (config.LiquidationStrategy == RsuLiquidationStrategy.SellAtRetirement)
                {
                    // Only sell after retirement
                    if (hasRetired)
                    {
                        var sharesToSell = new List<HeldShareInfo>();

                        foreach (var held in heldShares)
                        {
                            // Check if 2 years have passed since grant date (Section 102 eligible)
                            var yearsSinceGrant = (currentDate - held.Grant.GrantDate).TotalDays / 365.25;
                            if (yearsSinceGrant >= CalculationConstants.Section102HoldingPeriodYears)
                            {
                                sharesToSell.Add(held);
                            }
                            // Non-eligible shares remain in heldShares, will be sold when eligible
                        }

                        foreach (var held in sharesToSell)
                        {
                            // Calculate Section 102 tax (returns value in ILS)
                            var taxIls = CalculateSection102Tax(
                                held.Grant,
                                currentPrice,
                                held.Shares,
                                config.MarginalTaxRate,
                                capitalGainsTaxRate,
                                config.SubjectTo3PercentSurtax
                            );

                            // Use Money type for type-safe currency conversion
                            var taxIlsTyped = Money.Ils(taxIls);
                            var taxUsd = _currencyConverter.ConvertToUsd(taxIlsTyped).Amount;

                            var grossProceeds = held.Shares * currentPrice;
                            var netProceeds = grossProceeds - taxUsd;

                            yearData.SharesSold += held.Shares;
                            yearData.GrossSaleProceeds += grossProceeds;
                            yearData.NetSaleProceeds += netProceeds;
                            yearData.TaxesPaid += taxUsd;
                            totalSharesSold += held.Shares;

                            yearData.Transactions.Add(new RsuTransaction
                            {
                                GrantId = held.GrantId,
                                TransactionDate = currentDate,
                                Type = RsuTransactionType.Sell,
                                Shares = held.Shares,
                                PricePerShare = currentPrice,
                                TaxRate = (config.SubjectTo3PercentSurtax ? capitalGainsTaxRate + 3 : capitalGainsTaxRate) / 100m,
                                TaxAmount = taxUsd,
                                Section102Applied = true
                            });

                            heldShares.Remove(held);
                        }
                    }
                    // Pre-retirement: do nothing, shares accumulate in heldShares
                }

                // Calculate shares held at end of year
                yearData.SharesHeld = heldShares.Sum(h => h.Shares);

                // Calculate total market value (held shares only, post-retirement excludes unvested)
                if (hasRetired)
                {
                    yearData.MarketValue = yearData.SharesHeld * currentPrice;
                }
                else
                {
                    // Pre-retirement: include all shares (vested held + unvested)
                    var totalUnvested = config.Grants.Sum(g =>
                        g.NumberOfShares - CalculateVestedShares(g, currentDate));
                    yearData.MarketValue = (yearData.SharesHeld + totalUnvested) * currentPrice;
                }

                yearlyData.Add(yearData);
            }

            return yearlyData.ToArray();
        }

        /// <summary>
        /// Helper class to track held shares
        /// </summary>
        private class HeldShareInfo
        {
            public long GrantId { get; set; }
            public RsuGrant Grant { get; set; } = null!;
            public int Shares { get; set; }
            public DateTime VestDate { get; set; }
            public decimal VestPrice { get; set; }
        }
    }
}
