using FirePlanningTool.Models;
using System;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for portfolio value calculations
    /// </summary>
    public interface IPortfolioCalculator
    {
        /// <summary>
        /// Calculate the cost basis (total acquisition cost) of a portfolio asset.
        /// </summary>
        /// <param name="asset">The portfolio asset</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Total cost basis in display currency</returns>
        decimal CalculateCostBasis(PortfolioAsset asset, string displayCurrency);

        /// <summary>
        /// Calculate the current market value of a portfolio asset.
        /// </summary>
        /// <param name="asset">The portfolio asset</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Current market value in display currency</returns>
        decimal CalculateMarketValue(PortfolioAsset asset, string displayCurrency);

        /// <summary>
        /// Calculate unrealized gain or loss for a portfolio asset.
        /// </summary>
        /// <param name="asset">The portfolio asset</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Unrealized gain (positive) or loss (negative) in display currency</returns>
        decimal CalculateUnrealizedGainLoss(PortfolioAsset asset, string displayCurrency);

        /// <summary>
        /// Calculate the total market value of a portfolio.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Total portfolio value in display currency</returns>
        decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio, string displayCurrency);

        /// <summary>
        /// Calculate the total cost basis of a portfolio.
        /// </summary>
        /// <param name="portfolio">List of portfolio assets</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Total cost basis in display currency</returns>
        decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio, string displayCurrency);

        /// <summary>
        /// Calculate the exposure percentage of an asset within a portfolio.
        /// </summary>
        /// <param name="asset">The portfolio asset</param>
        /// <param name="portfolio">List of all portfolio assets</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Exposure as percentage (0-100)</returns>
        decimal CalculateExposurePercentage(PortfolioAsset asset, List<PortfolioAsset> portfolio, string displayCurrency);

        /// <summary>
        /// Calculate the total of all planned expenses.
        /// </summary>
        /// <param name="expenses">List of planned expenses</param>
        /// <param name="displayCurrency">Target currency for calculation</param>
        /// <returns>Total expenses in display currency</returns>
        decimal CalculateTotalExpenses(List<PlannedExpense> expenses, string displayCurrency);

        /// <summary>
        /// Convert monthly contribution from one currency to another.
        /// </summary>
        /// <param name="amount">The contribution amount</param>
        /// <param name="fromCurrency">Source currency</param>
        /// <param name="displayCurrency">Target currency</param>
        /// <returns>Converted amount in display currency</returns>
        decimal ConvertMonthlyContribution(decimal amount, string fromCurrency, string displayCurrency);
    }

    /// <summary>
    /// Calculator for portfolio-related operations including value, cost basis, and exposure calculations.
    /// </summary>
    public class PortfolioCalculator : IPortfolioCalculator
    {
        private readonly ICurrencyConverter _currencyConverter;

        /// <summary>
        /// Initializes a new instance of the PortfolioCalculator.
        /// </summary>
        /// <param name="currencyConverter">Currency converter for multi-currency calculations</param>
        public PortfolioCalculator(ICurrencyConverter currencyConverter)
        {
            _currencyConverter = currencyConverter;
        }

        /// <inheritdoc />
        public decimal CalculateCostBasis(PortfolioAsset asset, string displayCurrency)
        {
            var quantity = asset.Quantity;
            var costInDisplayCurrency = _currencyConverter.ConvertToDisplayCurrency(
                asset.AverageCost.Amount, asset.AverageCost.Currency, displayCurrency);
            return quantity * costInDisplayCurrency;
        }

        /// <inheritdoc />
        public decimal CalculateMarketValue(PortfolioAsset asset, string displayCurrency)
        {
            var quantity = asset.Quantity;
            var priceInDisplayCurrency = _currencyConverter.ConvertToDisplayCurrency(
                asset.CurrentPrice.Amount, asset.CurrentPrice.Currency, displayCurrency);
            return quantity * priceInDisplayCurrency;
        }
        
        /// <inheritdoc />
        public decimal CalculateUnrealizedGainLoss(PortfolioAsset asset, string displayCurrency)
        {
            var marketValue = CalculateMarketValue(asset, displayCurrency);
            var costBasis = CalculateCostBasis(asset, displayCurrency);
            return marketValue - costBasis;
        }
        
        /// <inheritdoc />
        public decimal CalculatePortfolioValue(List<PortfolioAsset> portfolio, string displayCurrency)
        {
            decimal totalValue = 0;
            foreach (var asset in portfolio)
            {
                totalValue += CalculateMarketValue(asset, displayCurrency);
            }
            return totalValue;
        }
        
        /// <inheritdoc />
        public decimal CalculatePortfolioCostBasis(List<PortfolioAsset> portfolio, string displayCurrency)
        {
            decimal totalCostBasis = 0;
            foreach (var asset in portfolio)
            {
                totalCostBasis += CalculateCostBasis(asset, displayCurrency);
            }
            return totalCostBasis;
        }
        
        /// <inheritdoc />
        public decimal CalculateExposurePercentage(PortfolioAsset asset, List<PortfolioAsset> portfolio, string displayCurrency)
        {
            var portfolioTotalValue = CalculatePortfolioValue(portfolio, displayCurrency);
            if (portfolioTotalValue == 0) return 0;
            
            var assetValue = CalculateMarketValue(asset, displayCurrency);
            return (assetValue / portfolioTotalValue) * 100;
        }
        
        /// <inheritdoc />
        public decimal CalculateTotalExpenses(List<PlannedExpense> expenses, string displayCurrency)
        {
            decimal totalExpenses = 0;
            foreach (var expense in expenses)
            {
                var expenseInDisplayCurrency = _currencyConverter.ConvertToDisplayCurrency(
                    expense.NetAmount.Amount, expense.NetAmount.Currency, displayCurrency);
                totalExpenses += expenseInDisplayCurrency;
            }
            return totalExpenses;
        }
        
        /// <inheritdoc />
        public decimal ConvertMonthlyContribution(decimal amount, string fromCurrency, string displayCurrency)
        {
            return _currencyConverter.ConvertToDisplayCurrency(amount, fromCurrency, displayCurrency);
        }
    }
}