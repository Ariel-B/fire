using System;
using System.Collections.Generic;

namespace FirePlanningTool.Models
{
    /// <summary>
    /// Annual data point for Israel CPI (December value and YoY percent).
    /// </summary>
    public record InflationDataPoint
    {
        public int Year { get; init; }
        /// <summary>Year-over-year inflation (%) as reported by CBS (percentYear)</summary>
        public decimal InflationRate { get; init; }
        /// <summary>Index value for the month (currBase.value) when available</summary>
        public decimal? IndexValue { get; init; }
    }

    /// <summary>
    /// Compound average (CAGR) statistics for a given period.
    /// </summary>
    public record InflationStats
    {
        public int PeriodYears { get; init; }
        /// <summary>Compound annual growth rate (CAGR) expressed as percent (e.g., 0.032 = 3.2%)</summary>
        public decimal AverageInflation { get; init; }
        public int StartYear { get; init; }
        public int EndYear { get; init; }
    }

    /// <summary>
    /// Response returned by the inflation history endpoint.
    /// </summary>
    public class InflationHistoryResponse
    {
        public IReadOnlyList<InflationDataPoint> DataPoints { get; set; } = new List<InflationDataPoint>();
        public IReadOnlyList<InflationStats> Stats { get; set; } = new List<InflationStats>();
        public string Source { get; set; } = "CBS";
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    }
}
