using FirePlanningTool.Models;
using FirePlanningTool.Services.Strategies;
using FirePlanningTool.ValueObjects;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for portfolio growth and return calculations.
    /// </summary>
    public interface IPortfolioGrowthCalculator
    {
        /// <summary>
        /// Calculate weighted return from asset-based portfolio.
        /// </summary>
        decimal CalculateWeightedReturn(List<PortfolioAsset> portfolio, int? yearsToRetirement, ICurrencyConverter currencyConverter);

        /// <summary>
        /// Calculate weighted return from percentage-based allocation.
        /// </summary>
        decimal CalculateAllocationWeightedReturn(List<PortfolioAllocation> allocations);

        /// <summary>
        /// Generate age-based allocation automatically.
        /// </summary>
        List<PortfolioAllocation> GenerateAgeBasedAllocation(int currentAge, bool isRetirement = false);

        /// <summary>
        /// Calculate portfolio value from holdings with currency conversion.
        /// </summary>
        decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter);

        /// <summary>
        /// Calculate portfolio cost basis from holdings with currency conversion.
        /// </summary>
        decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter);

        /// <summary>
        /// Calculate portfolio profit ratio.
        /// </summary>
        decimal CalculatePortfolioProfitRatio(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter);
    }

    /// <summary>
    /// Calculator for portfolio growth projections, weighted returns, and allocation strategies.
    /// </summary>
    public class PortfolioGrowthCalculator : IPortfolioGrowthCalculator
    {
        private readonly IReturnCalculationStrategyFactory _strategyFactory;

        /// <summary>
        /// Initializes a new instance of the PortfolioGrowthCalculator class.
        /// </summary>
        /// <param name="strategyFactory">Factory for resolving return calculation strategies</param>
        public PortfolioGrowthCalculator(IReturnCalculationStrategyFactory strategyFactory)
        {
            _strategyFactory = strategyFactory ?? throw new ArgumentNullException(nameof(strategyFactory));
        }

        /// <inheritdoc />
        public decimal CalculateWeightedReturn(List<PortfolioAsset> portfolio, int? yearsToRetirement, ICurrencyConverter currencyConverter)
        {
            var totalValue = CalculatePortfolioValue(portfolio, currencyConverter);
            if (totalValue == 0) return 0;

            decimal weightedReturn = 0;

            foreach (var asset in portfolio)
            {
                // Use Money type for type-safe currency conversion (fixes Bug #1)
                var priceInUsd = currencyConverter.ConvertToUsd(asset.CurrentPrice);
                var assetValue = asset.Quantity * priceInUsd.Amount;
                var assetWeight = assetValue / totalValue;

                var strategy = _strategyFactory.GetStrategy(asset.Method);
                var returnResult = strategy.CalculateAnnualReturn(asset, yearsToRetirement);

                // Handle Result pattern - use 0 for failed calculations to avoid breaking the calculation
                // Errors are logged but don't stop portfolio calculation
                var annualReturn = returnResult.IsSuccess ? returnResult.Value : 0;

                weightedReturn += assetWeight * annualReturn;
            }

            return weightedReturn;
        }

        /// <inheritdoc />
        public decimal CalculateAllocationWeightedReturn(List<PortfolioAllocation> allocations)
        {
            if (allocations == null || !allocations.Any()) return 0;

            var totalPercentage = allocations.Sum(a => a.TargetPercentage);
            if (totalPercentage == 0) return 0;

            decimal weightedReturn = 0;
            foreach (var allocation in allocations)
            {
                var normalizedWeight = allocation.TargetPercentage / totalPercentage;
                weightedReturn += normalizedWeight * allocation.ExpectedAnnualReturn;
            }

            return weightedReturn;
        }

        /// <inheritdoc />
        public List<PortfolioAllocation> GenerateAgeBasedAllocation(int currentAge, bool isRetirement = false)
        {
            var allocations = new List<PortfolioAllocation>();

            // Rule of thumb: Equity percentage = 100 - current age (minimum 30% for retirement)
            var equityPercentage = isRetirement ? Math.Max(30, 100 - currentAge) : Math.Max(40, 100 - currentAge);
            var bondPercentage = 100 - equityPercentage;

            allocations.Add(new PortfolioAllocation
            {
                Id = 1,
                AssetType = "מניות",
                TargetPercentage = equityPercentage,
                ExpectedAnnualReturn = 7.0m, // Default equity return
                Description = "מניות מגוונות"
            });

            allocations.Add(new PortfolioAllocation
            {
                Id = 2,
                AssetType = "אגרות חוב",
                TargetPercentage = bondPercentage,
                ExpectedAnnualReturn = 3.0m, // Default bond return
                Description = "אגרות חוב ממשלתיות וקונצרניות"
            });

            return allocations;
        }

        /// <inheritdoc />
        public decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter)
        {
            // Use Money type for type-safe currency conversion (fixes Bug #2)
            return portfolio.Sum(asset =>
            {
                var priceInUsd = currencyConverter.ConvertToUsd(asset.CurrentPrice);
                return asset.Quantity * priceInUsd.Amount;
            });
        }

        /// <inheritdoc />
        public decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter)
        {
            // Use Money type for type-safe currency conversion
            return portfolio.Sum(asset =>
            {
                var costInUsd = currencyConverter.ConvertToUsd(asset.AverageCost);
                return asset.Quantity * costInUsd.Amount;
            });
        }

        /// <inheritdoc />
        public decimal CalculatePortfolioProfitRatio(List<PortfolioAsset> portfolio, ICurrencyConverter currencyConverter)
        {
            var currentValue = CalculatePortfolioValue(portfolio, currencyConverter);
            var costBasis = CalculatePortfolioCostBasis(portfolio, currencyConverter);

            if (currentValue <= 0 || costBasis <= 0) return 0;
            if (currentValue <= costBasis) return 0;

            return (currentValue - costBasis) / currentValue;
        }
    }
}
