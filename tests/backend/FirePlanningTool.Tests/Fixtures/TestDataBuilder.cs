using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.Services.Strategies;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Tests.Fixtures
{
    /// <summary>
    /// Fixture providing test data builders for common test scenarios
    /// </summary>
    public class TestDataBuilder
    {
        public static FirePlanInput CreateBasicFirePlanInput()
        {
            return new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2045,
                FullRetirementAge = 67,
                MonthlyContribution = Money.Usd(5000),
                WithdrawalRate = 4,
                InflationRate = 2.5m,
                CapitalGainsTax = 20,
                UsdIlsRate = 3.6m
            };
        }

        public static FirePlanInput CreateFirePlanInputWithPortfolio()
        {
            var input = CreateBasicFirePlanInput();
            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset
                {
                    Id = 1,
                    Symbol = "VTI",
                    Quantity = 100,
                    CurrentPrice = Money.Usd(250),
                    AverageCost = Money.Usd(200),
                    Method = "CAGR",
                    Value1 = 7,
                    Value2 = 0
                },
                new PortfolioAsset
                {
                    Id = 2,
                    Symbol = "BND",
                    Quantity = 200,
                    CurrentPrice = Money.Usd(80),
                    AverageCost = Money.Usd(75),
                    Method = "CAGR",
                    Value1 = 3.5m,
                    Value2 = 0
                }
            };
            return input;
        }

        public static FirePlanInput CreateFirePlanInputWithExpenses()
        {
            var input = CreateBasicFirePlanInput();
            input.Expenses = new List<PlannedExpense>
            {
                new PlannedExpense
                {
                    Id = 1,
                    Type = "Vacation",
                    NetAmount = Money.Usd(5000),
                    Year = 2045,
                    FrequencyYears = 2,
                    RepetitionCount = 10
                },
                new PlannedExpense
                {
                    Id = 2,
                    Type = "Home Repair",
                    NetAmount = Money.Usd(10000),
                    Year = 2048,
                    FrequencyYears = 5,
                    RepetitionCount = 3
                }
            };
            return input;
        }

        public static FirePlanInput CreateFirePlanInputWithAllocation()
        {
            var input = CreateBasicFirePlanInput();
            input.InvestmentStrategy = "ageBased";
            input.AccumulationAllocation = new List<PortfolioAllocation>
            {
                new PortfolioAllocation
                {
                    Id = 1,
                    AssetType = "Stocks",
                    TargetPercentage = 80,
                    ExpectedAnnualReturn = 7,
                    Description = "US Market Index"
                },
                new PortfolioAllocation
                {
                    Id = 2,
                    AssetType = "Bonds",
                    TargetPercentage = 20,
                    ExpectedAnnualReturn = 3.5m,
                    Description = "Bond Index"
                }
            };

            input.RetirementAllocation = new List<PortfolioAllocation>
            {
                new PortfolioAllocation
                {
                    Id = 3,
                    AssetType = "Stocks",
                    TargetPercentage = 40,
                    ExpectedAnnualReturn = 7,
                    Description = "Conservative Stock Allocation"
                },
                new PortfolioAllocation
                {
                    Id = 4,
                    AssetType = "Bonds",
                    TargetPercentage = 60,
                    ExpectedAnnualReturn = 3.5m,
                    Description = "Bond Heavy Retirement"
                }
            };

            return input;
        }

        public static FirePlanInput CreateFirePlanInputWithTaxBasis(decimal taxBasis)
        {
            var input = CreateBasicFirePlanInput();
            input.TaxBasis = taxBasis;
            return input;
        }

        public static FirePlanInput CreateFirePlanInputWithUsdIlsConversion()
        {
            var input = CreateBasicFirePlanInput();
            input.Currency = "₪";
            input.MonthlyContribution = Money.Ils(5000 * 3.6m);
            input.UsdIlsRate = 3.6m;

            input.AccumulationPortfolio = new List<PortfolioAsset>
            {
                new PortfolioAsset
                {
                    Id = 1,
                    Symbol = "TASE",
                    Quantity = 100,
                    CurrentPrice = Money.Ils(900), // 250 * 3.6
                    AverageCost = Money.Ils(720), // 200 * 3.6
                    Method = "CAGR",
                    Value1 = 7,
                    Value2 = 0
                }
            };

            return input;
        }

        public static FirePlanInput CreateFirePlanInputWithRsuConfiguration()
        {
            var input = CreateBasicFirePlanInput();
            var currentYear = DateTime.Now.Year;
            input.EarlyRetirementYear = currentYear + 5;

            input.RsuConfiguration = new RsuConfiguration
            {
                StockSymbol = "TEST",
                CurrentPricePerShare = Money.Usd(100m),
                ExpectedAnnualReturn = 10m,
                ReturnMethod = "CAGR",
                LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                MarginalTaxRate = 47m,
                SubjectTo3PercentSurtax = true,
                Grants = new List<RsuGrant>
                {
                    new RsuGrant
                    {
                        Id = 1,
                        GrantDate = new DateTime(currentYear - 2, 1, 1), // Grant was 2 years ago
                        NumberOfShares = 1000,
                        PriceAtGrant = Money.Usd(80m),
                        VestingPeriodYears = 4,
                        VestingType = VestingScheduleType.Standard
                    }
                }
            };
            input.IncludeRsuInCalculations = true;

            return input;
        }

        /// <summary>
        /// Creates a FireCalculator with default dependencies wired up, suitable for
        /// integration-style tests that exercise the full calculation pipeline.
        /// </summary>
        public static FireCalculator CreateFireCalculator(ICurrencyConverter? currencyConverter = null)
        {
            var converter = currencyConverter ?? new CurrencyConverter();
            var strategyTypes = CalculationConstants.GetReturnCalculationStrategyTypes();
            var strategies = strategyTypes
                .Select(t => (IReturnCalculationStrategy)Activator.CreateInstance(t)!)
                .ToList();
            var factory = new ReturnCalculationStrategyFactory(strategies);

            return new FireCalculator(
                converter,
                new RsuCalculator(converter),
                new PortfolioGrowthCalculator(factory),
                new TaxCalculator(),
                new ExpenseCalculator(),
                new AccumulationPhaseCalculator(),
                new RetirementPhaseCalculator());
        }
    }
}
