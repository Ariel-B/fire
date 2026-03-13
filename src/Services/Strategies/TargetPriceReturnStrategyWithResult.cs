using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Prototype: Strategy for calculating returns based on a target price using Result pattern.
    /// This demonstrates how Result pattern can replace exception-based error handling.
    /// 
    /// Benefits demonstrated:
    /// - No exception allocation overhead
    /// - Explicit error handling in method signature
    /// - Easier to test error scenarios
    /// - Compiler-enforced error checking
    /// </summary>
    public class TargetPriceReturnStrategyWithResult
    {
        /// <summary>
        /// Strategy name in Hebrew.
        /// </summary>
        public string Name => "מחיר יעד";

        /// <summary>
        /// Calculate annual return needed to reach target price.
        /// Returns Result instead of throwing exceptions.
        /// </summary>
        public Result<decimal> CalculateAnnualReturn(PortfolioAsset? asset, int? yearsToRetirement)
        {
            // Validation: null asset
            if (asset == null)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Asset cannot be null"));
            }

            // Validation: current price must be positive
            if (asset.CurrentPrice.Amount <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Current price must be greater than zero for target price calculation"));
            }

            // Validation: target price must be positive
            if (asset.Value2 <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Target price must be greater than zero for target price calculation"));
            }

            // Validation: years to retirement must be provided and positive
            if (!yearsToRetirement.HasValue || yearsToRetirement.Value <= 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation("Years to retirement must be a positive value for target price calculation"));
            }

            // Perform calculation
            var currentPrice = asset.CurrentPrice.Amount;
            var targetPrice = asset.Value2;
            var years = yearsToRetirement.Value;

            var annualReturn = ((decimal)Math.Pow((double)(targetPrice / currentPrice), 1.0 / years) - 1) * 100;
            
            return Result<decimal>.Success(annualReturn);
        }
    }
}
