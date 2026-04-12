namespace FirePlanningTool.Models
{
    /// <summary>
    /// Annual data point for Israel CPI (December value and YoY percent).
    /// </summary>
    public class InflationDataPoint
    {
        /// <summary>Calendar year for this data point.</summary>
        public int Year { get; set; }

        /// <summary>Year-over-year inflation (%) as reported by CBS (percentYear).</summary>
        public decimal InflationRate { get; set; }

        /// <summary>CPI index value for December (currBase.value) when available.</summary>
        public decimal? IndexValue { get; set; }
    }

    /// <summary>
    /// Compound annual growth rate (CAGR) statistics for a given period.
    /// </summary>
    public class InflationStats
    {
        /// <summary>Number of years in this CAGR period (e.g. 5, 10, 30).</summary>
        public int PeriodYears { get; set; }

        /// <summary>Compound annual growth rate expressed as a fraction (e.g. 0.032 = 3.2%).</summary>
        public decimal AverageInflation { get; set; }

        /// <summary>First year of the period.</summary>
        public int StartYear { get; set; }

        /// <summary>Last year of the period.</summary>
        public int EndYear { get; set; }
    }

    /// <summary>
    /// Response returned by the inflation history endpoint.
    /// </summary>
    public class InflationHistoryResponse
    {
        /// <summary>Yearly CPI data points (December values, ordered chronologically).</summary>
        public IReadOnlyList<InflationDataPoint> DataPoints { get; set; } = new List<InflationDataPoint>();

        /// <summary>CAGR statistics for standard periods (1, 5, 10, 15, 20, 30 years).</summary>
        public IReadOnlyList<InflationStats> Stats { get; set; } = new List<InflationStats>();

        /// <summary>Data source identifier (e.g. "CBS").</summary>
        public string Source { get; set; } = "CBS";

        /// <summary>UTC timestamp when the data was last fetched from the source.</summary>
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}
