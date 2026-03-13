using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using ClosedXML.Excel;
using System.IO;

namespace FirePlanningTool.Tests.Services;

/// <summary>
/// Tests for Excel export service functionality.
/// Verifies sheet generation, data accuracy, and currency handling.
/// </summary>
public class ExcelExportServiceTests
{
    private readonly ExcelExportService _service;
    private readonly FireCalculationResult _sampleResult;
    private readonly ExcelExportOptions _sampleOptions;

    public ExcelExportServiceTests()
    {
        _service = new ExcelExportService();
        _sampleResult = CreateSampleResult();
        _sampleOptions = CreateSampleOptions();
    }

    [Fact]
    public void GenerateExcel_ShouldReturnNonEmptyByteArray()
    {
        // Act
        var result = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        result.Should().NotBeNull();
        result.Length.Should().BeGreaterThan(0);
    }

    [Fact]
    public void GenerateExcel_ShouldCreateValidXlsxFile()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert - file should be loadable by ClosedXML
        using var stream = new MemoryStream(bytes);
        var action = () => new XLWorkbook(stream);
        action.Should().NotThrow();
    }

    [Fact]
    public void GenerateExcel_ShouldContainSummarySheet()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        
        var sheet = workbook.Worksheets.FirstOrDefault(w => w.Name.Contains("Summary") || w.Name.Contains("סיכום"));
        sheet.Should().NotBeNull("Summary sheet should exist");
    }

    [Fact]
    public void GenerateExcel_ShouldContainUserInputsSheet()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        
        var sheet = workbook.Worksheets.FirstOrDefault(w => w.Name.Contains("User Inputs") || w.Name.Contains("פרמטרים"));
        sheet.Should().NotBeNull("User Inputs sheet should exist");
    }

    [Fact]
    public void GenerateExcel_ShouldContainYearlyProjectionsSheet()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        
        var sheet = workbook.Worksheets.FirstOrDefault(w => w.Name.Contains("Yearly") || w.Name.Contains("תחזית"));
        sheet.Should().NotBeNull("Yearly Projections sheet should exist");
    }

    [Fact]
    public void GenerateExcel_ShouldContainMoneyFlowDetailsSheet()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        
        var sheet = workbook.Worksheets.FirstOrDefault(w => w.Name.Contains("Money Flow Details") || w.Name.Contains("פירוט תזרים"));
        sheet.Should().NotBeNull("Money Flow Details sheet should exist");
    }

    [Fact]
    public void SummarySheet_ShouldContainKeyMetrics()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Summary"));

        // Check for key metrics (values should be in column 3)
        var cells = sheet.CellsUsed().ToList();
        var cellValues = cells.Select(c => c.GetValue<string>()).ToList();
        
        cellValues.Should().Contain(c => c.Contains("Current Portfolio Value") || c.Contains("שווי נוכחי"));
        cellValues.Should().Contain(c => c.Contains("Peak Portfolio Value") || c.Contains("שווי שיא"));
        cellValues.Should().Contain(c => c.Contains("FIRE Age") || c.Contains("גיל FIRE"));
    }

    [Fact]
    public void SummarySheet_ShouldIncludeScenarioName()
    {
        // Arrange
        var options = CreateSampleOptions();
        options.ScenarioName = "Test Scenario 2025";

        // Act
        var bytes = _service.GenerateExcel(_sampleResult, options);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Summary"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain("Test Scenario 2025");
    }

    [Fact]
    public void SummarySheet_ShouldIncludeScenarioNotes()
    {
        // Arrange
        var options = CreateSampleOptions();
        options.ScenarioNotes = "Conservative 4% withdrawal rate";

        // Act
        var bytes = _service.GenerateExcel(_sampleResult, options);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Summary"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain("Conservative 4% withdrawal rate");
    }

    [Fact]
    public void SummarySheet_ShouldIncludeCurrencyColumns()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Summary"));

        // Column 4 should contain currency codes
        var currencyCells = sheet.Column(4).CellsUsed().Select(c => c.GetValue<string>()).ToList();
        
        // Should have multiple currency entries (USD or ILS)
        var currencyEntries = currencyCells.Where(c => c == "USD" || c == "$" || c == "ILS" || c == "₪").ToList();
        currencyEntries.Should().NotBeEmpty("Currency column should contain currency codes");
    }

    [Fact]
    public void UserInputsSheet_ShouldContainBirthYear()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("User Inputs") || w.Name.Contains("פרמטרים"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain(c => c.Contains("Birth Year") || c.Contains("שנת לידה"));
        cells.Should().Contain("1990");
    }

    [Fact]
    public void UserInputsSheet_ShouldContainRetirementParameters()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Inputs") || w.Name.Contains("פרמטרים"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain(c => c.Contains("Early Retirement Year") || c.Contains("שנת פרישה מוקדמת"));
        cells.Should().Contain(c => c.Contains("Withdrawal Rate") || c.Contains("אחוז משיכה"));
    }

    [Fact]
    public void UserInputsSheet_ShouldContainContributionInflationSetting()
    {
        // Arrange
        var options = CreateSampleOptions();
        options.Input.AdjustContributionsForInflation = true;

        // Act
        var bytes = _service.GenerateExcel(_sampleResult, options);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Inputs") || w.Name.Contains("פרמטרים"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain(c => c.Contains("Adjust Contributions for Inflation") || c.Contains("הצמד הפקדות לאינפלציה"));
        cells.Should().Contain("True");
    }

    [Fact]
    public void YearlyProjectionsSheet_ShouldContainAllYears()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Yearly") || w.Name.Contains("תחזית"));

        // Should have header row + data rows (one per year)
        var rowCount = sheet.RowsUsed().Count();
        rowCount.Should().Be(_sampleResult.YearlyData.Count + 1, "Should have header + one row per year");
    }

    [Fact]
    public void YearlyProjectionsSheet_ShouldHaveCurrencyColumnsAfterMonetaryValues()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Yearly") || w.Name.Contains("תחזית"));

        // Column 5 should contain currency for column 4 (Portfolio Value)
        var headerRow = sheet.Row(1);
        var col5Header = headerRow.Cell(5).GetValue<string>();
        col5Header.Should().Contain("Currency", "Column 5 should be currency for Portfolio Value");
    }

    [Fact]
    public void YearlyProjectionsSheet_ShouldContainPhaseInformation()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Yearly") || w.Name.Contains("תחזית"));

        // Column 3 should contain Phase information
        var phaseCells = sheet.Column(3).CellsUsed().Skip(1).Select(c => c.GetValue<string>()).ToList();
        phaseCells.Should().Contain(c => c == "Accumulation" || c == "Retirement" || c == "צבירה" || c == "פרישה");
    }

    [Fact]
    public void MoneyFlowDetailsSheet_ShouldContainFlowData()
    {
        // Act
        var bytes = _service.GenerateExcel(_sampleResult, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Flow") || w.Name.Contains("תזרים"));

        var headerRow = sheet.Row(1);
        var headers = headerRow.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        
        headers.Should().Contain(h => h.Contains("Contributions") || h.Contains("הפקדות"));
        headers.Should().Contain(h => h.Contains("Portfolio Growth") || h.Contains("צמיחה"));
        headers.Should().Contain(h => h.Contains("Capital Gains Tax") || h.Contains("מס רווח הון"));
    }

    [Fact]
    public void GenerateExcel_WithRsuData_ShouldIncludeRsuValues()
    {
        // Arrange
        var resultWithRsu = CreateSampleResult();
        resultWithRsu.TotalRsuValueAtRetirement = 50000m;
        resultWithRsu.TotalRsuNetProceeds = 45000m;
        resultWithRsu.TotalRsuTaxesPaid = 5000m;

        // Act
        var bytes = _service.GenerateExcel(resultWithRsu, _sampleOptions);

        // Assert
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First(w => w.Name.Contains("Summary"));

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain(c => c.Contains("RSU Value at Retirement") || c.Contains("שווי RSU בפרישה"));
    }

    [Fact]
    public void GenerateExcel_ShouldCompleteWithinPerformanceTarget()
    {
        // Arrange
        var result = CreateLargeResult(); // Create a result with many years
        var options = CreateSampleOptions();

        // Act
        var startTime = DateTime.UtcNow;
        var bytes = _service.GenerateExcel(result, options);
        var duration = (DateTime.UtcNow - startTime).TotalSeconds;

        // Assert
        duration.Should().BeLessThan(3.0, "Export should complete in under 3 seconds (PRD requirement)");
        bytes.Length.Should().BeLessThan(5 * 1024 * 1024, "File size should be under 5MB (PRD requirement)");
    }

    [Fact]
    public void GenerateExcel_ShouldHandleHebrewText()
    {
        // Arrange
        var options = CreateSampleOptions();
        options.ScenarioName = "תוכנית פרישה שמרנית";

        // Act
        var bytes = _service.GenerateExcel(_sampleResult, options);

        // Assert - should not throw and file should be valid
        using var stream = new MemoryStream(bytes);
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();

        var cells = sheet.CellsUsed().Select(c => c.GetValue<string>()).ToList();
        cells.Should().Contain("תוכנית פרישה שמרנית");
    }

    #region Helper Methods

    private FireCalculationResult CreateSampleResult()
    {
        var result = new FireCalculationResult
        {
            CurrentValue = 100000m,
            PeakValue = 500000m,
            GrossPeakValue = 520000m,
            RetirementTaxToPay = 20000m,
            EndValue = 300000m,
            GrossAnnualWithdrawal = 20000m,
            NetMonthlyExpense = 1500m,
            TotalContributions = 200000m,
            FireAgeReached = 45,
            AccumulationWeightedReturn = 7.5m,
            RetirementWeightedReturn = 5.0m,
            YearlyData = new List<YearlyData>()
        };

        // Add 5 sample years
        for (int i = 0; i < 5; i++)
        {
            result.YearlyData.Add(new YearlyData
            {
                Year = 2025 + i,
                PortfolioValue = 100000m + (i * 50000m),
                TotalContributions = 10000m * (i + 1),
                AnnualWithdrawal = i >= 3 ? 20000m : null,
                Phase = i >= 3 ? "Retirement" : "Accumulation",
                FlowData = new SankeyFlowData
                {
                    MonthlyContributions = i < 3 ? 10000m : 0m,
                    PortfolioGrowth = 7000m,
                    CapitalGainsTax = i >= 3 ? 2000m : 0m,
                    RetirementWithdrawals = i >= 3 ? 20000m : 0m,
                    Phase = i >= 3 ? "Retirement" : "Accumulation",
                    PensionIncome = i >= 4 ? 5000m : 0m
                }
            });
        }

        return result;
    }

    private FireCalculationResult CreateLargeResult()
    {
        var result = CreateSampleResult();
        result.YearlyData.Clear();

        // Create 50 years of data to test performance
        for (int i = 0; i < 50; i++)
        {
            result.YearlyData.Add(new YearlyData
            {
                Year = 2025 + i,
                PortfolioValue = 100000m + (i * 10000m),
                TotalContributions = 10000m * (i + 1),
                AnnualWithdrawal = i >= 20 ? 20000m : null,
                Phase = i >= 20 ? "Retirement" : "Accumulation",
                FlowData = new SankeyFlowData
                {
                    MonthlyContributions = i < 20 ? 10000m : 0m,
                    PortfolioGrowth = 7000m,
                    CapitalGainsTax = i >= 20 ? 2000m : 0m,
                    RetirementWithdrawals = i >= 20 ? 20000m : 0m,
                    Phase = i >= 20 ? "Retirement" : "Accumulation"
                }
            });
        }

        return result;
    }

    private ExcelExportOptions CreateSampleOptions()
    {
        return new ExcelExportOptions
        {
            ScenarioName = "Test Scenario",
            ScenarioNotes = "Test notes",
            UsdIlsRate = 3.6m,
            Input = new FirePlanInput
            {
                BirthYear = 1990,
                BirthDate = new DateTime(1990, 1, 1),
                EarlyRetirementYear = 2035,
                FullRetirementAge = 67,
                MonthlyContribution = Money.Usd(1000),
                Currency = "$",
                WithdrawalRate = 4.0m,
                InflationRate = 2.0m,
                CapitalGainsTax = 25.0m,
                PensionNetMonthly = Money.Usd(500),
                InvestmentStrategy = "fixed",
                UseRetirementPortfolio = false,
                IncludeRsuInCalculations = false
            },
            AppVersion = "1.0.0"
        };
    }

    #endregion
}
