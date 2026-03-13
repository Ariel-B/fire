namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for tax-related calculations.
    /// </summary>
    public interface ITaxCalculator
    {
        /// <summary>
        /// Calculate profit ratio (proportion of portfolio that is gains vs principal).
        /// </summary>
        decimal CalculateProfitRatio(decimal portfolioValue, decimal costBasis);

        /// <summary>
        /// Calculate effective tax rate based on profit ratio and capital gains tax.
        /// </summary>
        decimal CalculateEffectiveTaxRate(decimal profitRatio, decimal capitalGainsTax);

        /// <summary>
        /// Calculate tax on a withdrawal amount.
        /// </summary>
        decimal CalculateWithdrawalTax(decimal withdrawalAmount, decimal profitRatio, decimal capitalGainsTax);

        /// <summary>
        /// Calculate retirement rebalancing tax (tax on gains when switching portfolios).
        /// </summary>
        decimal CalculateRetirementTax(decimal portfolioValue, decimal costBasis, decimal capitalGainsTax);

        /// <summary>
        /// Update cost basis after withdrawal (reduce by principal portion).
        /// </summary>
        decimal UpdateCostBasisAfterWithdrawal(decimal currentCostBasis, decimal withdrawalAmount, decimal profitRatio);
    }

    /// <summary>
    /// Tax calculator for FIRE plan including capital gains, withdrawal taxes, and profit ratio calculations.
    /// </summary>
    public class TaxCalculator : ITaxCalculator
    {
        /// <inheritdoc />
        public decimal CalculateProfitRatio(decimal portfolioValue, decimal costBasis)
        {
            if (portfolioValue <= 0 || costBasis <= 0) return 0;
            if (portfolioValue <= costBasis) return 0;
            return (portfolioValue - costBasis) / portfolioValue;
        }

        /// <inheritdoc />
        public decimal CalculateEffectiveTaxRate(decimal profitRatio, decimal capitalGainsTax)
        {
            if (capitalGainsTax == 0) return 0;
            return profitRatio * capitalGainsTax / 100;
        }

        /// <inheritdoc />
        public decimal CalculateWithdrawalTax(decimal withdrawalAmount, decimal profitRatio, decimal capitalGainsTax)
        {
            return withdrawalAmount * profitRatio * capitalGainsTax / 100;
        }

        /// <inheritdoc />
        public decimal CalculateRetirementTax(decimal portfolioValue, decimal costBasis, decimal capitalGainsTax)
        {
            if (portfolioValue <= costBasis) return 0;
            var gains = portfolioValue - costBasis;
            return gains * capitalGainsTax / 100;
        }

        /// <inheritdoc />
        public decimal UpdateCostBasisAfterWithdrawal(decimal currentCostBasis, decimal withdrawalAmount, decimal profitRatio)
        {
            // Principal portion of withdrawal reduces cost basis
            var principalPortion = withdrawalAmount * (1 - profitRatio);
            return Math.Max(0, currentCostBasis - principalPortion);
        }
    }
}
