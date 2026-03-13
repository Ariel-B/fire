using FirePlanningTool.Models;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for FIRE (Financial Independence, Retire Early) calculations.
    /// </summary>
    public interface IFireCalculator
    {
        /// <summary>
        /// Calculates a complete FIRE plan with accumulation and retirement phase projections.
        /// </summary>
        /// <param name="input">FIRE plan input parameters</param>
        /// <returns>Complete calculation results with yearly projections</returns>
        FireCalculationResult Calculate(FirePlanInput input);
    }

    /// <summary>
    /// Orchestrates FIRE (Financial Independence, Retire Early) calculations by delegating
    /// to specialized calculators for accumulation, retirement, taxes, expenses, and portfolio growth.
    /// </summary>
    public class FireCalculator : IFireCalculator
    {
        private readonly ICurrencyConverter _currencyConverter;
        private readonly IRsuCalculator _rsuCalculator;
        private readonly IPortfolioGrowthCalculator _portfolioGrowthCalculator;
        private readonly ITaxCalculator _taxCalculator;
        private readonly IExpenseCalculator _expenseCalculator;
        private readonly IAccumulationPhaseCalculator _accumulationPhaseCalculator;
        private readonly IRetirementPhaseCalculator _retirementPhaseCalculator;

        /// <summary>
        /// Initializes a new instance with all required dependencies.
        /// All dependencies are resolved via the DI container (see Program.cs).
        /// </summary>
        public FireCalculator(
            ICurrencyConverter currencyConverter,
            IRsuCalculator rsuCalculator,
            IPortfolioGrowthCalculator portfolioGrowthCalculator,
            ITaxCalculator taxCalculator,
            IExpenseCalculator expenseCalculator,
            IAccumulationPhaseCalculator accumulationPhaseCalculator,
            IRetirementPhaseCalculator retirementPhaseCalculator)
        {
            _currencyConverter = currencyConverter ?? throw new ArgumentNullException(nameof(currencyConverter));
            _rsuCalculator = rsuCalculator ?? throw new ArgumentNullException(nameof(rsuCalculator));
            _portfolioGrowthCalculator = portfolioGrowthCalculator ?? throw new ArgumentNullException(nameof(portfolioGrowthCalculator));
            _taxCalculator = taxCalculator ?? throw new ArgumentNullException(nameof(taxCalculator));
            _expenseCalculator = expenseCalculator ?? throw new ArgumentNullException(nameof(expenseCalculator));
            _accumulationPhaseCalculator = accumulationPhaseCalculator ?? throw new ArgumentNullException(nameof(accumulationPhaseCalculator));
            _retirementPhaseCalculator = retirementPhaseCalculator ?? throw new ArgumentNullException(nameof(retirementPhaseCalculator));
        }

        /// <inheritdoc />
        public FireCalculationResult Calculate(FirePlanInput input)
        {
            if (input == null) throw new ArgumentNullException(nameof(input));

            // Setup phase parameters
            var currentYear = DateTime.Now.Year;
            var accumulationYears = Math.Max(0, input.EarlyRetirementYear - currentYear);
            var targetRetirementAge = Math.Max(input.FullRetirementAge, 100);
            var retirementEndYear = input.BirthYear + targetRetirementAge;
            var retirementYears = Math.Max(0, retirementEndYear - input.EarlyRetirementYear + 1);
            var usdIlsRate = input.UsdIlsRate > 0 ? input.UsdIlsRate : 3.6m;

            // Update currency converter
            _currencyConverter.UpdateUsdIlsRate(usdIlsRate);

            var monthlyContributionUsd = _currencyConverter.ConvertToUsd(input.MonthlyContribution.Amount, input.MonthlyContribution.Currency);
            var useRetirementPortfolio = input.UseRetirementPortfolio && input.RetirementAllocation.Any();

            // Calculate current portfolio values using portfolio growth calculator
            var currentPortfolioValue = _portfolioGrowthCalculator.CalculatePortfolioValue(input.AccumulationPortfolio, _currencyConverter);
            var currentCostBasis = _portfolioGrowthCalculator.CalculatePortfolioCostBasis(input.AccumulationPortfolio, _currencyConverter);

            // Calculate weighted returns using portfolio growth calculator
            var accumulationReturn = input.AccumulationAllocation.Any()
                ? _portfolioGrowthCalculator.CalculateAllocationWeightedReturn(input.AccumulationAllocation)
                : _portfolioGrowthCalculator.CalculateWeightedReturn(input.AccumulationPortfolio, accumulationYears, _currencyConverter);

            decimal retirementReturn;
            if (useRetirementPortfolio)
            {
                retirementReturn = _portfolioGrowthCalculator.CalculateAllocationWeightedReturn(input.RetirementAllocation);
            }
            else if (input.RetirementPortfolio.Any())
            {
                retirementReturn = _portfolioGrowthCalculator.CalculateWeightedReturn(input.RetirementPortfolio, retirementYears, _currencyConverter);
            }
            else
            {
                retirementReturn = accumulationReturn;
            }

            // Calculate RSU timeline
            var (rsuTimeline, rsuSummary, totalRsuNetProceeds, totalRsuTaxesPaid, rsuValueAtRetirement) =
                CalculateRsuData(input, currentYear, retirementEndYear);

            var rsuYearlyLookup = rsuTimeline.ToDictionary(r => r.Year, r => r);

            // Run accumulation phase calculation
            var accumulationResult = _accumulationPhaseCalculator.Calculate(new AccumulationPhaseInput
            {
                CurrentYear = currentYear,
                CurrentDate = DateTime.Now,
                AccumulationYears = accumulationYears,
                StartingPortfolioValue = currentPortfolioValue,
                MonthlyContributionUsd = monthlyContributionUsd,
                AdjustContributionsForInflation = input.AdjustContributionsForInflation,
                AccumulationReturn = accumulationReturn,
                InflationRate = input.InflationRate,
                Expenses = input.Expenses,
                RsuYearlyLookup = rsuYearlyLookup,
                RsuConfiguration = input.RsuConfiguration,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                CurrentPortfolioValue = currentPortfolioValue
            });

            var peakValue = accumulationResult.EndPortfolioValue;
            var actualContributions = accumulationResult.ActualContributions;

            // For SellAtRetirement strategy, add retirement-year RSU proceeds to peak value
            // since these shares will be liquidated at retirement and add to available funds
            var retirementYearRsuNetProceeds = 0m;
            if (input.RsuConfiguration?.LiquidationStrategy == RsuLiquidationStrategy.SellAtRetirement &&
                rsuYearlyLookup.TryGetValue(input.EarlyRetirementYear, out var retirementYearRsu))
            {
                var rsuCurrency = input.RsuConfiguration.CurrentPricePerShare.Currency;
                retirementYearRsuNetProceeds = rsuCurrency == "$"
                    ? retirementYearRsu.NetSaleProceeds
                    : _currencyConverter.ConvertToUsd(retirementYearRsu.NetSaleProceeds, rsuCurrency);
                peakValue += retirementYearRsuNetProceeds;
            }

            var grossPeakValue = peakValue;

            // Calculate cost basis for tax calculations
            var totalContributions = input.TaxBasis.HasValue ? input.TaxBasis.Value : (currentCostBasis + actualContributions);
            var originalTotalContributions = totalContributions;

            // Calculate retirement tax if switching portfolios
            var retirementTaxToPay = 0m;
            var profitRatio = _taxCalculator.CalculateProfitRatio(peakValue, totalContributions);

            if (useRetirementPortfolio && peakValue > 0)
            {
                retirementTaxToPay = _taxCalculator.CalculateRetirementTax(peakValue, totalContributions, input.CapitalGainsTax);
                if (retirementTaxToPay > 0)
                {
                    peakValue = Math.Max(0, peakValue - retirementTaxToPay);
                }
                totalContributions = peakValue;
                profitRatio = 0;
            }

            // Calculate withdrawal parameters
            var initialGrossAnnualWithdrawal = peakValue * input.WithdrawalRate / 100;
            var effectiveTaxRate = _taxCalculator.CalculateEffectiveTaxRate(profitRatio, input.CapitalGainsTax);
            var initialAnnualWithdrawal = initialGrossAnnualWithdrawal * (1 - effectiveTaxRate);
            var initialMonthlyNet = initialAnnualWithdrawal / 12;

            // Convert pension to USD for calculations
            var pensionNetMonthlyAmountUsd = _currencyConverter.ConvertToUsd(input.PensionNetMonthly.Amount, input.PensionNetMonthly.Currency);

            // Run retirement phase calculation
            var retirementResult = _retirementPhaseCalculator.Calculate(new RetirementPhaseInput
            {
                EarlyRetirementYear = input.EarlyRetirementYear,
                RetirementYears = retirementYears,
                CurrentYear = currentYear,
                StartingPortfolioValue = peakValue,
                InitialGrossAnnualWithdrawal = initialGrossAnnualWithdrawal,
                InitialAnnualWithdrawal = initialAnnualWithdrawal,
                RetirementReturn = retirementReturn,
                InflationRate = input.InflationRate,
                CapitalGainsTax = input.CapitalGainsTax,
                InitialProfitRatio = profitRatio,
                InitialCostBasis = totalContributions,
                Expenses = input.Expenses,
                RsuYearlyLookup = rsuYearlyLookup,
                RsuConfiguration = input.RsuConfiguration,
                RetirementTaxToPay = retirementTaxToPay,
                CurrencyConverter = _currencyConverter,
                ExpenseCalculator = _expenseCalculator,
                TaxCalculator = _taxCalculator,
                // Pension parameters
                BirthDate = input.BirthDate,
                FullRetirementAge = input.FullRetirementAge,
                PensionNetMonthlyAmountUsd = pensionNetMonthlyAmountUsd
            });

            // Combine results
            var allYearlyData = new List<YearlyData>();
            allYearlyData.AddRange(accumulationResult.YearlyData);
            allYearlyData.AddRange(retirementResult.YearlyData);

            return new FireCalculationResult
            {
                TotalContributions = originalTotalContributions,
                PeakValue = peakValue,
                GrossPeakValue = grossPeakValue,
                RetirementTaxToPay = retirementTaxToPay,
                EndValue = Math.Max(0, retirementResult.EndPortfolioValue),
                GrossAnnualWithdrawal = initialGrossAnnualWithdrawal,
                NetMonthlyExpense = initialMonthlyNet,
                YearlyData = allYearlyData,
                AccumulationPortfolio = input.AccumulationPortfolio,
                RetirementPortfolio = input.RetirementPortfolio,
                CurrentValue = currentPortfolioValue,
                AccumulationAllocation = input.AccumulationAllocation,
                RetirementAllocation = input.RetirementAllocation,
                AccumulationWeightedReturn = accumulationReturn,
                RetirementWeightedReturn = retirementReturn,
                RsuTimeline = rsuTimeline,
                TotalRsuValueAtRetirement = rsuValueAtRetirement,
                TotalRsuNetProceeds = totalRsuNetProceeds,
                TotalRsuTaxesPaid = totalRsuTaxesPaid,
                RsuSummary = rsuSummary,
                FireAgeReached = input.EarlyRetirementYear - input.BirthYear
            };
        }

        private (RsuYearlyData[] timeline, RsuSummary? summary, decimal totalNetProceeds, decimal totalTaxesPaid, decimal valueAtRetirement)
            CalculateRsuData(FirePlanInput input, int currentYear, int retirementEndYear)
        {
            RsuYearlyData[] rsuTimeline = Array.Empty<RsuYearlyData>();
            RsuSummary? rsuSummary = null;
            decimal totalRsuNetProceeds = 0;
            decimal totalRsuTaxesPaid = 0;
            decimal rsuValueAtRetirement = 0;



            if (input.RsuConfiguration != null && input.IncludeRsuInCalculations && input.RsuConfiguration.Grants.Any())
            {
                rsuTimeline = _rsuCalculator.ProjectRsuTimeline(
                    input.RsuConfiguration,
                    currentYear,
                    retirementEndYear,
                    input.EarlyRetirementYear,
                    input.CapitalGainsTax
                );

                rsuSummary = _rsuCalculator.GetCurrentSummary(input.RsuConfiguration, DateTime.Now);

                foreach (var rsuYear in rsuTimeline)
                {
                    totalRsuNetProceeds += rsuYear.NetSaleProceeds;
                    totalRsuTaxesPaid += rsuYear.TaxesPaid;

                    if (rsuYear.Year == input.EarlyRetirementYear)
                    {
                        rsuValueAtRetirement = rsuYear.MarketValue;
                    }
                }
            }



            return (rsuTimeline, rsuSummary, totalRsuNetProceeds, totalRsuTaxesPaid, rsuValueAtRetirement);
        }

        /// <summary>
        /// Legacy method: Calculate portfolio value. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <returns>Total portfolio value in USD</returns>
        public decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio)
        {
            return _portfolioGrowthCalculator.CalculatePortfolioValue(portfolio, _currencyConverter);
        }

        /// <summary>
        /// Legacy method: Calculate portfolio cost basis. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <returns>Total cost basis in USD</returns>
        public decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio)
        {
            return _portfolioGrowthCalculator.CalculatePortfolioCostBasis(portfolio, _currencyConverter);
        }

        /// <summary>
        /// Legacy method: Calculate portfolio profit ratio. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <returns>Profit ratio (0-1)</returns>
        public decimal CalculatePortfolioProfitRatio(List<PortfolioAsset> portfolio)
        {
            return _portfolioGrowthCalculator.CalculatePortfolioProfitRatio(portfolio, _currencyConverter);
        }

        /// <summary>
        /// Legacy method: Calculate weighted return. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <param name="yearsToRetirement">Years until retirement (for target price calculations)</param>
        /// <returns>Weighted annual return percentage</returns>
        public decimal CalculateWeightedReturn(List<PortfolioAsset> portfolio, int? yearsToRetirement = null)
        {
            return _portfolioGrowthCalculator.CalculateWeightedReturn(portfolio, yearsToRetirement, _currencyConverter);
        }

        /// <summary>
        /// Legacy method: Calculate weighted return from allocations. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="allocations">List of portfolio allocations</param>
        /// <returns>Weighted annual return percentage</returns>
        public decimal CalculateAllocationWeightedReturn(List<PortfolioAllocation> allocations)
        {
            return _portfolioGrowthCalculator.CalculateAllocationWeightedReturn(allocations);
        }

        /// <summary>
        /// Legacy method: Generate age-based allocation. Use IPortfolioGrowthCalculator instead.
        /// </summary>
        /// <param name="currentAge">Current age of the investor</param>
        /// <param name="isRetirement">Whether in retirement phase</param>
        /// <returns>List of recommended portfolio allocations</returns>
        public List<PortfolioAllocation> GenerateAgeBasedAllocation(int currentAge, bool isRetirement = false)
        {
            return _portfolioGrowthCalculator.GenerateAgeBasedAllocation(currentAge, isRetirement);
        }
    }
}
