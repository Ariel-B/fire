using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Strategy for calculating returns using Compound Annual Growth Rate (CAGR).
    /// Returns are based on historical growth rates stored in Value1.
    /// Uses Result pattern for consistent interface across strategies.
    /// </summary>
    public class CagrReturnStrategy : IReturnCalculationStrategy
    {
        /// <inheritdoc />
        public string Name => "CAGR";

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
