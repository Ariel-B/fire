using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Strategy for calculating returns based on a target price.
    /// Calculates CAGR needed to reach target price within a specified timeframe.
    /// Value2 contains the target price, yearsToRetirement is the timeframe.
    /// Uses Result pattern for validation without throwing exceptions.
    /// </summary>
    public class TargetPriceReturnStrategy : IReturnCalculationStrategy
    {
        /// <inheritdoc />
        public string Name => "מחיר יעד";

        /// <inheritdoc />
        public Result<decimal> CalculateAnnualReturn(PortfolioAsset? asset, int? yearsToRetirement)
        {
            if (asset == null)
            {
                return Result<decimal>.Failure(Error.Validation("Asset cannot be null"));
            }

            if (asset.CurrentPrice.Amount <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Current price must be greater than zero for target price calculation"));
            }

            if (asset.Value2 <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Target price must be greater than zero for target price calculation"));
            }

            if (!yearsToRetirement.HasValue || yearsToRetirement.Value <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Years to retirement must be a positive value for target price calculation"));
            }

            var currentPrice = asset.CurrentPrice.Amount;
            var targetPrice = asset.Value2;
            var years = yearsToRetirement.Value;

            var annualReturn = ((decimal)Math.Pow((double)(targetPrice / currentPrice), 1.0 / years) - 1) * 100;
            return Result<decimal>.Success(annualReturn);
        }
    }
}
