using FirePlanningTool.Models;

namespace FirePlanningTool.Services.Strategies
{
    /// <summary>
    /// Strategy interface for calculating expected annual return from portfolio assets.
    /// Implementations handle different calculation methods (CAGR, Target Price, etc.).
    /// Uses Result pattern for explicit error handling without exceptions.
    /// </summary>
    public interface IReturnCalculationStrategy
    {
        /// <summary>
        /// Gets the name/identifier of this calculation strategy.
        /// Used for strategy resolution by the factory.
        /// </summary>
        string Name { get; }

        /// <summary>
        /// Calculate expected annual return percentage for a single asset.
        /// Returns Result to handle validation errors without throwing exceptions.
        /// </summary>
        /// <param name="asset">Portfolio asset with calculation parameters</param>
        /// <param name="yearsToRetirement">Years until retirement (optional, used by some strategies)</param>
        /// <returns>Result containing annual return percentage or validation error</returns>
        Result<decimal> CalculateAnnualReturn(PortfolioAsset? asset, int? yearsToRetirement);
    }
}
