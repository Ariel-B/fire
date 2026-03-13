using FirePlanningTool.Models;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Prototype: Portfolio validator using Result pattern instead of exceptions.
    /// Demonstrates comprehensive validation with rich error context.
    /// </summary>
    public class PortfolioValidatorWithResult
    {
        /// <summary>
        /// Validates a portfolio asset for calculation readiness.
        /// Returns detailed validation errors without throwing exceptions.
        /// </summary>
        public Result<PortfolioAsset> ValidateAsset(PortfolioAsset? asset)
        {
            if (asset == null)
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation("Portfolio asset cannot be null"));
            }

            if (string.IsNullOrWhiteSpace(asset.Symbol))
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation("Asset symbol is required"));
            }

            if (asset.Symbol.Length > 10)
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation($"Asset symbol '{asset.Symbol}' exceeds maximum length of 10 characters"));
            }

            if (asset.Quantity < 0)
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation($"Asset '{asset.Symbol}' has negative quantity: {asset.Quantity}"));
            }

            if (asset.CurrentPrice.Amount < 0)
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation($"Asset '{asset.Symbol}' has negative current price: {asset.CurrentPrice.Amount}"));
            }

            if (asset.AverageCost.Amount < 0)
            {
                return Result<PortfolioAsset>.Failure(
                    Error.Validation($"Asset '{asset.Symbol}' has negative average cost: {asset.AverageCost.Amount}"));
            }

            return Result<PortfolioAsset>.Success(asset);
        }

        /// <summary>
        /// Validates an entire portfolio and returns all validation errors.
        /// Demonstrates accumulating multiple errors instead of failing on first exception.
        /// </summary>
        public Result<List<PortfolioAsset>> ValidatePortfolio(List<PortfolioAsset>? portfolio)
        {
            if (portfolio == null)
            {
                return Result<List<PortfolioAsset>>.Failure(
                    Error.Validation("Portfolio cannot be null"));
            }

            if (portfolio.Count == 0)
            {
                // Empty portfolio is valid
                return Result<List<PortfolioAsset>>.Success(portfolio);
            }

            if (portfolio.Count > 1000)
            {
                return Result<List<PortfolioAsset>>.Failure(
                    Error.Validation($"Portfolio exceeds maximum size of 1000 assets (has {portfolio.Count})"));
            }

            var errors = new List<string>();
            foreach (var asset in portfolio)
            {
                var result = ValidateAsset(asset);
                if (result.IsFailure)
                {
                    errors.Add(result.Error.Message);
                }
            }

            if (errors.Any())
            {
                return Result<List<PortfolioAsset>>.Failure(
                    Error.Validation($"Portfolio validation failed: {string.Join("; ", errors)}"));
            }

            return Result<List<PortfolioAsset>>.Success(portfolio);
        }

        /// <summary>
        /// Validates calculation inputs and returns structured error information.
        /// </summary>
        public Result<decimal> ValidateCalculationInputs(
            decimal portfolioValue,
            decimal withdrawalRate,
            decimal inflationRate)
        {
            if (portfolioValue < 0)
            {
                return Result<decimal>.Failure(
                    Error.Validation($"Portfolio value cannot be negative: {portfolioValue}"));
            }

            if (withdrawalRate < 0 || withdrawalRate > 100)
            {
                return Result<decimal>.Failure(
                    Error.Validation($"Withdrawal rate must be between 0 and 100, got: {withdrawalRate}"));
            }

            if (inflationRate < -50 || inflationRate > 100)
            {
                return Result<decimal>.Failure(
                    Error.Validation($"Inflation rate must be between -50 and 100, got: {inflationRate}"));
            }

            // Calculate safe withdrawal amount
            var annualWithdrawal = portfolioValue * (withdrawalRate / 100);
            return Result<decimal>.Success(annualWithdrawal);
        }
    }
}
