using FirePlanningTool.Services;

namespace FirePlanningTool.Repositories
{
    /// <summary>
    /// Repository interface for asset market data operations.
    /// Abstracts HTTP calls to external data providers (Finnhub, etc.).
    /// Supports ETFs, stocks, bonds, and other tradeable securities.
    /// </summary>
    public interface IAssetDataRepository
    {
        /// <summary>
        /// Fetches the current market price for an asset symbol from the data provider.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs)</param>
        /// <returns>Current price as decimal, or null if unavailable</returns>
        Task<decimal?> FetchCurrentPriceAsync(string symbol);

        /// <summary>
        /// Fetches company/asset profile information for a symbol from the data provider.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, etc.)</param>
        /// <returns>Company/asset profile data, or null if unavailable</returns>
        Task<FinnhubCompanyProfile?> FetchCompanyProfileAsync(string symbol);

        /// <summary>
        /// Fetches historical candle data (OHLCV) for an asset symbol from the data provider.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, bonds, etc.)</param>
        /// <param name="fromTimestamp">Start date as Unix timestamp</param>
        /// <param name="toTimestamp">End date as Unix timestamp</param>
        /// <returns>Candle data response, or null if unavailable</returns>
        Task<FinnhubCandleResponse?> FetchCandleDataAsync(string symbol, long fromTimestamp, long toTimestamp);

        /// <summary>
        /// Fetches historical price data from Yahoo Finance for an asset symbol.
        /// </summary>
        /// <param name="symbol">Asset ticker symbol (stocks, ETFs, bonds, etc.)</param>
        /// <param name="maxYears">Maximum number of years of historical data to fetch</param>
        /// <returns>Tuple containing timestamps array and close prices array, or null if unavailable</returns>
        Task<(long[] timestamps, double?[] closePrices)?> FetchYahooHistoricalDataAsync(string symbol, int maxYears);
    }
}
