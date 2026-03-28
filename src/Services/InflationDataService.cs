using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using FirePlanningTool.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace FirePlanningTool.Services
{
    public interface IInflationDataService
    {
        Task<InflationHistoryResponse?> GetIsraelInflationHistoryAsync();
    }

    public class InflationDataService : IInflationDataService
    {
        private readonly HttpClient _httpClient;
        private readonly IMemoryCache _cache;
        private readonly ILogger<InflationDataService> _logger;
        private const string CACHE_KEY = "inflation_israel_history";
        private static readonly TimeSpan CACHE_TTL = TimeSpan.FromHours(24);
        private const string CBS_URL = "https://api.cbs.gov.il/index/data/price?id=120010&format=json&startPeriod=01-1993&PageSize=500";

        public InflationDataService(HttpClient httpClient, IMemoryCache cache, ILogger<InflationDataService> logger)
        {
            _httpClient = httpClient;
            _cache = cache;
            _logger = logger;
        }

        public async Task<InflationHistoryResponse?> GetIsraelInflationHistoryAsync()
        {
            if (_cache.TryGetValue(CACHE_KEY, out InflationHistoryResponse? cached) && cached != null)
            {
                return cached;
            }

            try
            {
                var json = await _httpClient.GetStringAsync(CBS_URL);
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

                if (!decEntries.Any())
                {
                    _logger.LogWarning("No December CPI entries found in CBS data");
                    return null;
                }

                var dataPoints = decEntries.Select(e => new InflationDataPoint
                {
                    Year = e.Year,
                    InflationRate = e.PercentYear ?? 0m,
                    IndexValue = e.IndexValue
                }).ToList();

                var stats = new List<InflationStats>();
                int[] periods = new[] { 1, 5, 10, 15, 20, 30 };
                var years = decEntries.Select(d => d.Year).ToList();
                var latest = decEntries.Last();

                foreach (var p in periods)
                {
                    var startYear = latest.Year - p;
                    var start = decEntries.FirstOrDefault(d => d.Year == startYear && d.IndexValue.HasValue);
                    var end = latest;

                    if (start.IndexValue.HasValue && end.IndexValue.HasValue && start.IndexValue.Value > 0)
                    {
                        var startIndex = start.IndexValue.Value;
                        var endIndex = end.IndexValue.Value;
                        var factor = (double)(endIndex / startIndex);
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
                }

                var response = new InflationHistoryResponse
                {
                    DataPoints = dataPoints,
                    Stats = stats,
                    Source = "CBS",
                    LastUpdated = DateTime.UtcNow
                };

                // Cache result
                _cache.Set(CACHE_KEY, response, CACHE_TTL);

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
