using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Strategy for calculating returns using Total Growth percentage.
    /// This is equivalent to CAGR but uses a different name (Hebrew: "צמיחה כוללת").
    /// Returns are based on growth percentages stored in Value1.
    /// Uses Result pattern for consistent interface across strategies.
    /// </summary>
    public class TotalGrowthReturnStrategy : IReturnCalculationStrategy
    {
        /// <inheritdoc />
        public string Name => "צמיחה כוללת";

        /// <inheritdoc />
        public Result<decimal> CalculateAnnualReturn(PortfolioAsset? asset, int? yearsToRetirement)
        {
            if (asset == null)
            {
                return Result<decimal>.Failure(Error.Validation("Asset cannot be null"));
            }

            return Result<decimal>.Success(asset.Value1);
        }
    }
}
