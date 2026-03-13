namespace FirePlanningTool.Models
{
    /// <summary>
    /// Response model containing current price information for a tradeable asset.
    /// Supports stocks, ETFs, bonds, and other securities available via Finnhub API.
    /// </summary>
    public class AssetPriceResponse
    {
        /// <summary>
        /// Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs).
        /// </summary>
        public string Symbol { get; set; } = string.Empty;

        /// <summary>
        /// Current market price per share.
        /// </summary>
        public decimal Price { get; set; }

        /// <summary>
        /// Currency of the price (e.g., USD, ILS).
        /// </summary>
        public string Currency { get; set; } = "USD";

        /// <summary>
        /// Timestamp when the price was retrieved.
        /// </summary>
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Request model for fetching multiple asset prices in batch.
    /// Supports stocks, ETFs, bonds, and other tradeable securities.
    /// </summary>
    public class BatchPriceRequest
    {
        /// <summary>
        /// Collection of asset ticker symbols to fetch prices for (maximum 100 symbols).
        /// Supports any asset type available via Finnhub API.
        /// </summary>
        public IEnumerable<string> Symbols { get; set; } = new List<string>();
    }

    /// <summary>
    /// Response model containing prices for multiple assets requested in batch.
    /// </summary>
    public class BatchPriceResponse
    {
        /// <summary>
        /// List of successfully retrieved asset prices.
        /// </summary>
        public List<AssetPriceResponse> Prices { get; set; } = new();

        /// <summary>
        /// Total number of symbols requested.
        /// </summary>
        public int RequestedCount { get; set; }

        /// <summary>
        /// Number of symbols for which prices were successfully found.
        /// </summary>
        public int FoundCount { get; set; }
    }

    /// <summary>
    /// Response model containing company/asset name and market capitalization information.
    /// Supports stocks, ETFs, and other tradeable securities.
    /// </summary>
    public class AssetNameResponse
    {
        /// <summary>
        /// Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs).
        /// </summary>
        public string Symbol { get; set; } = string.Empty;

        /// <summary>
        /// Company name.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Market capitalization in USD, or null if not available.
        /// </summary>
        public decimal? MarketCapUsd { get; set; }

        /// <summary>
        /// Currency of the market capitalization (typically USD).
        /// </summary>
        public string MarketCapCurrency { get; set; } = "USD";

        /// <summary>
        /// Timestamp when the company information was retrieved.
        /// </summary>
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Response model containing historical Compound Annual Growth Rate (CAGR) data for an asset.
    /// Supports stocks, ETFs, bonds, and other tradeable securities.
    /// </summary>
    public class HistoricalCAGRResponse
    {
        /// <summary>
        /// Asset ticker symbol (e.g., AAPL for stocks, VOO for ETFs, TLT for bond ETFs).
        /// </summary>
        public string Symbol { get; set; } = string.Empty;

        /// <summary>
        /// List of CAGR values for different time periods (1, 3, 5, 10, 15, 20 years).
        /// </summary>
        public List<CAGRValue> CAGRs { get; set; } = new();

        /// <summary>
        /// Timestamp when the CAGR data was calculated.
        /// </summary>
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Represents a CAGR (Compound Annual Growth Rate) value for a specific time period.
    /// </summary>
    public class CAGRValue
    {
        /// <summary>
        /// Number of years for this CAGR calculation (e.g., 1, 3, 5, 10, 15, 20).
        /// </summary>
        public int Years { get; set; }

        /// <summary>
        /// CAGR percentage value, or null if data is not available for this time period.
        /// </summary>
        public decimal? Value { get; set; }
    }
}
