using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Strategy for calculating returns using a fixed return percentage.
    /// This demonstrates how easy it is to add new calculation methods.
    /// Simply returns the fixed percentage stored in Value1.
    /// Uses Result pattern for consistent interface across strategies.
    /// </summary>
    public class FixedReturnStrategy : IReturnCalculationStrategy
    {
        /// <inheritdoc />
        public string Name => "Fixed";

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
