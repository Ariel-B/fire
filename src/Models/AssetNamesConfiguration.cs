using System.Text.Json.Serialization;

namespace FirePlanningTool.Models
{
    /// <summary>
    /// Configuration model for asset name lookup.
    /// Loaded from etf-names.json to provide fallback names for ETFs and indices.
    /// </summary>
    public class AssetNamesConfiguration
    {
        /// <summary>
        /// All asset names organized by category.
        /// </summary>
        [JsonPropertyName("AssetNames")]
        public AssetNameCategories AssetNames { get; set; } = new();

        /// <summary>
        /// Flatten all categories into a single case-insensitive dictionary for lookup.
        /// </summary>
        public IReadOnlyDictionary<string, string> GetFlattenedLookup()
        {
            var lookup = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            // Merge all categories into single dictionary
            AddCategoryToDictionary(lookup, AssetNames.BroadMarket);
            AddCategoryToDictionary(lookup, AssetNames.IndexTracking);
            AddCategoryToDictionary(lookup, AssetNames.LargeCap);
            AddCategoryToDictionary(lookup, AssetNames.MidCap);
            AddCategoryToDictionary(lookup, AssetNames.SmallCap);
            AddCategoryToDictionary(lookup, AssetNames.International);
            AddCategoryToDictionary(lookup, AssetNames.Sectors);
            AddCategoryToDictionary(lookup, AssetNames.Bonds);
            AddCategoryToDictionary(lookup, AssetNames.Commodities);
            AddCategoryToDictionary(lookup, AssetNames.RealEstate);
            AddCategoryToDictionary(lookup, AssetNames.Cryptocurrency);
            AddCategoryToDictionary(lookup, AssetNames.Thematic);
            AddCategoryToDictionary(lookup, AssetNames.Indices);

            return lookup;
        }

        private static void AddCategoryToDictionary(Dictionary<string, string> target, Dictionary<string, string>? source)
        {
            if (source == null) return;

            foreach (var kvp in source)
            {
                // Skip if already exists (first category wins) or if it's a comment key
                if (target.ContainsKey(kvp.Key) || kvp.Key.StartsWith("_"))
                    continue;

                target[kvp.Key] = kvp.Value;
            }
        }
    }

    /// <summary>
    /// Asset names organized by category for structured configuration.
    /// </summary>
    public class AssetNameCategories
    {
        /// <summary>
        /// Gets or sets broad market funds and ETFs.
        /// </summary>
        [JsonPropertyName("BroadMarket")]
        public Dictionary<string, string> BroadMarket { get; set; } = new();

        /// <summary>
        /// Gets or sets index-tracking funds and ETFs.
        /// </summary>
        [JsonPropertyName("IndexTracking")]
        public Dictionary<string, string> IndexTracking { get; set; } = new();

        /// <summary>
        /// Gets or sets large-cap equity funds and ETFs.
        /// </summary>
        [JsonPropertyName("LargeCap")]
        public Dictionary<string, string> LargeCap { get; set; } = new();

        /// <summary>
        /// Gets or sets mid-cap equity funds and ETFs.
        /// </summary>
        [JsonPropertyName("MidCap")]
        public Dictionary<string, string> MidCap { get; set; } = new();

        /// <summary>
        /// Gets or sets small-cap equity funds and ETFs.
        /// </summary>
        [JsonPropertyName("SmallCap")]
        public Dictionary<string, string> SmallCap { get; set; } = new();

        /// <summary>
        /// Gets or sets international equity funds and ETFs.
        /// </summary>
        [JsonPropertyName("International")]
        public Dictionary<string, string> International { get; set; } = new();

        /// <summary>
        /// Gets or sets sector-specific funds and ETFs.
        /// </summary>
        [JsonPropertyName("Sectors")]
        public Dictionary<string, string> Sectors { get; set; } = new();

        /// <summary>
        /// Gets or sets bond funds and fixed-income instruments.
        /// </summary>
        [JsonPropertyName("Bonds")]
        public Dictionary<string, string> Bonds { get; set; } = new();

        /// <summary>
        /// Gets or sets commodity-linked funds and instruments.
        /// </summary>
        [JsonPropertyName("Commodities")]
        public Dictionary<string, string> Commodities { get; set; } = new();

        /// <summary>
        /// Gets or sets real-estate funds and REITs.
        /// </summary>
        [JsonPropertyName("RealEstate")]
        public Dictionary<string, string> RealEstate { get; set; } = new();

        /// <summary>
        /// Gets or sets cryptocurrency-related assets.
        /// </summary>
        [JsonPropertyName("Cryptocurrency")]
        public Dictionary<string, string> Cryptocurrency { get; set; } = new();

        /// <summary>
        /// Gets or sets thematic funds and ETFs.
        /// </summary>
        [JsonPropertyName("Thematic")]
        public Dictionary<string, string> Thematic { get; set; } = new();

        /// <summary>
        /// Gets or sets market index entries.
        /// </summary>
        [JsonPropertyName("Indices")]
        public Dictionary<string, string> Indices { get; set; } = new();
    }
}
