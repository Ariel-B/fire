using System.Text.Json;
using FirePlanningTool.Models;
using Microsoft.Extensions.Caching.Memory;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Interface for Israel CPI inflation data operations.
    /// </summary>
    public interface IInflationDataService
    {
        /// <summary>
        /// Gets historical Israel CPI inflation data and period CAGR statistics.
        /// Data is fetched from CBS and cached for 24 hours.
        /// </summary>
        /// <returns>Inflation history response, or null if data is unavailable</returns>
        Task<InflationHistoryResponse?> GetIsraelInflationHistoryAsync();
    }

    /// <summary>
    /// Service that fetches and caches Israel CPI inflation data from the
    /// Central Bureau of Statistics (CBS) API.
    /// </summary>
    public class InflationDataService : IInflationDataService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ILogger<InflationDataService> _logger;
        private const string CacheKey = "inflation_israel_history";
        private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);
        // PageSize=500 covers ~384 monthly entries from 1993; sufficient until ~2034.
        private const string CbsUrl = "https://api.cbs.gov.il/index/data/price?id=120010&format=json&startPeriod=01-1993&PageSize=500";
        private static readonly int[] CagrPeriods = [1, 5, 10, 15, 20, 30];

        /// <summary>
        /// Initializes a new instance of the InflationDataService.
        /// </summary>
        /// <param name="httpClient">HTTP client for CBS API requests</param>
        /// <param name="cache">In-memory cache for storing fetched data</param>
        /// <param name="logger">Logger for diagnostic information</param>
        public InflationDataService(HttpClient httpClient, IMemoryCache cache, ILogger<InflationDataService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<InflationHistoryResponse?> GetIsraelInflationHistoryAsync()
        {
            if (_cache.TryGetValue(CacheKey, out InflationHistoryResponse? cached) && cached != null)
            {
                return cached;
            }

            try
            {
                var json = await _httpClient.GetStringAsync(CbsUrl);
                using var doc = JsonDocument.Parse(json);
                var root = doc.RootElement;

                if (!root.TryGetProperty("month", out var months) || months.ValueKind != JsonValueKind.Array || months.GetArrayLength() == 0)
                {
                    _logger.LogWarning("CBS response missing 'month' array");
                    return null;
                }

                var firstMonth = months[0];
                if (!firstMonth.TryGetProperty("date", out var dateArray) || dateArray.ValueKind != JsonValueKind.Array)
                {
                    _logger.LogWarning("CBS response missing 'date' array inside 'month'");
                    return null;
                }

                var entries = new List<(int Year, int Month, decimal? IndexValue, decimal? PercentYear)>();

                foreach (var el in dateArray.EnumerateArray())
                {
                    if (el.ValueKind != JsonValueKind.Object) continue;

                    int year = el.TryGetProperty("year", out var yearEl) && yearEl.ValueKind == JsonValueKind.Number ? yearEl.GetInt32() : 0;
                    int month = el.TryGetProperty("month", out var monthEl) && monthEl.ValueKind == JsonValueKind.Number ? monthEl.GetInt32() : 0;

                    decimal? percentYear = null;
                    if (el.TryGetProperty("percentYear", out var py) && py.ValueKind == JsonValueKind.Number)
                    {
                        percentYear = py.GetDecimal();
                    }

                    decimal? indexValue = null;
                    if (el.TryGetProperty("currBase", out var cb) && cb.ValueKind == JsonValueKind.Object && cb.TryGetProperty("value", out var val) && val.ValueKind == JsonValueKind.Number)
                    {
                        indexValue = val.GetDecimal();
                    }

                    if (year != 0 && month != 0)
                    {
                        entries.Add((year, month, indexValue, percentYear));
                    }
                }

                // Use December entries as the year's representative value
                var decEntries = entries.Where(e => e.Month == 12 && (e.IndexValue.HasValue || e.PercentYear.HasValue))
                                        .OrderBy(e => e.Year)
                                        .ToList();

                if (decEntries.Count == 0)
                {
                    _logger.LogWarning("No December CPI entries found in CBS data");
                    return null;
                }

                var dataPoints = decEntries
                    .Where(e => e.PercentYear.HasValue)
                    .Select(e => new InflationDataPoint
                    {
                        Year = e.Year,
                        InflationRate = e.PercentYear!.Value,
                        IndexValue = e.IndexValue
                    }).ToList();

                var stats = new List<InflationStats>();
                var latest = decEntries.Last();

                foreach (var p in CagrPeriods)
                {
                    var startYear = latest.Year - p;
                    var start = decEntries.FirstOrDefault(d => d.Year == startYear && d.IndexValue.HasValue);

                    // FirstOrDefault returns a default value tuple when no match — check Year explicitly
                    if (start.Year == 0 || !start.IndexValue.HasValue || !latest.IndexValue.HasValue || start.IndexValue.Value <= 0)
                    {
                        continue;
                    }

                    var factor = (double)(latest.IndexValue.Value / start.IndexValue.Value);
                    if (factor > 0)
                    {
                        var cagr = Math.Pow(factor, 1.0 / p) - 1.0;
                        stats.Add(new InflationStats
                        {
                            PeriodYears = p,
                            AverageInflation = (decimal)cagr,
                            StartYear = startYear,
                            EndYear = latest.Year
                        });
                    }
                }

                var response = new InflationHistoryResponse
                {
                    DataPoints = dataPoints,
                    Stats = stats,
                    Source = "CBS",
                    LastUpdated = DateTime.UtcNow
                };

                _cache.Set(CacheKey, response, CacheTtl);

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching/parsing CBS CPI data");
                return null;
            }
        }
    }
}
