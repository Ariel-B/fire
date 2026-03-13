using System.Globalization;
using System.IO;
using ClosedXML.Excel;
using FirePlanningTool.Controllers;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.Tests.Fixtures;
using FirePlanningTool.Validators;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace FirePlanningTool.Tests.Integration
{
    /// <summary>
    /// Integration tests for the export workflow using real controllers and services.
    /// The suite validates the intent of the export feature: round-trip fidelity where supported,
    /// calculation-to-export data mapping, currency handling, and XLSX generation.
    /// </summary>
    public class ExcelExportWorkflowIntegrationTests
    {
        private readonly FireCalculator _calculator;
        private readonly ExcelExportService _exportService;
        private readonly FirePlanController _firePlanController;
        private readonly ExportController _exportController;

        public ExcelExportWorkflowIntegrationTests()
        {
            _calculator = TestDataBuilder.CreateFireCalculator();
            _exportService = new ExcelExportService();

            _firePlanController = new FirePlanController(
                new Mock<ILogger<FirePlanController>>().Object,
                _calculator,
                new FirePlanInputValidator(),
                new FirePlanDataValidator(),
                new JsonLoadRequestValidator(),
                Options.Create(new AssetNamesConfiguration()));

            _exportController = new ExportController(
                _exportService,
                _calculator,
                new FirePlanInputValidator(),
                new Mock<ILogger<ExportController>>().Object);
        }

        public static IEnumerable<object[]> SaveLoadWorkflowScenarios()
        {
            yield return new object[] { CreateScenario("Basic", TestDataBuilder.CreateBasicFirePlanInput()) };
            yield return new object[] { CreateScenario("PortfolioExpenses", CreatePortfolioAndExpensesInput()) };
            yield return new object[] { CreateScenario("Ils", TestDataBuilder.CreateFirePlanInputWithUsdIlsConversion()) };
            yield return new object[] { CreateScenario("Rsu", TestDataBuilder.CreateFirePlanInputWithRsuConfiguration()) };
        }

        [Theory]
        [MemberData(nameof(SaveLoadWorkflowScenarios))]
        public void SaveLoadCalculateAndExport_WorkflowMaintainsDataFidelity(ExportWorkflowScenario scenario)
        {
            // Arrange
            var saveResult = _firePlanController.SavePlan(scenario.PlanData!);

            // Act
            var savedJson = ExtractSavedJson(saveResult);
            var loadResult = _firePlanController.LoadPlan(new JsonLoadRequest { JsonData = savedJson });
            var loadedPlan = ExtractLoadedPlan(loadResult);

            var calculationResult = _calculator.Calculate(scenario.Input);
            var exportOptions = CreateExportOptions(scenario);
            var workbookModel = _exportService.BuildWorkbookModel(calculationResult, exportOptions);

            var exportResult = _exportController.ExportToExcel(new ExportRequest
            {
                Input = scenario.Input,
                ScenarioName = scenario.Name,
                ScenarioNotes = scenario.Notes,
                UsdIlsRate = scenario.Input.UsdIlsRate
            });

            using var workbook = OpenWorkbook(ExtractExcelBytes(exportResult));

            // Assert
            loadedPlan.Inputs.BirthDate.Should().Be(scenario.PlanData!.Inputs.BirthDate);
            loadedPlan.Inputs.EarlyRetirementYear.Should().Be(scenario.PlanData.Inputs.EarlyRetirementYear);
            loadedPlan.Inputs.FullRetirementAge.Should().Be(scenario.PlanData.Inputs.FullRetirementAge);
            loadedPlan.Inputs.MonthlyContribution.Should().Be(scenario.PlanData.Inputs.MonthlyContribution);
            loadedPlan.Inputs.Currency.Should().Be(scenario.PlanData.Inputs.Currency);
            loadedPlan.IncludeRsuInCalculations.Should().Be(scenario.PlanData.IncludeRsuInCalculations);
            loadedPlan.Expenses.Should().HaveCount(scenario.PlanData.Expenses.Count);
            loadedPlan.AccumulationPortfolio.Should().HaveCount(scenario.PlanData.AccumulationPortfolio.Count);
            loadedPlan.AccumulationAllocation.Should().HaveCount(scenario.PlanData.AccumulationAllocation.Count);

            if (scenario.PlanData.RsuConfiguration is null)
            {
                loadedPlan.RsuConfiguration.Should().BeNull();
            }
            else
            {
                loadedPlan.RsuConfiguration.Should().NotBeNull();
                loadedPlan.RsuConfiguration!.StockSymbol.Should().Be(scenario.PlanData.RsuConfiguration.StockSymbol);
                loadedPlan.RsuConfiguration.Grants.Should().HaveCount(scenario.PlanData.RsuConfiguration.Grants.Count);
            }

            workbookModel.Summary.FireAgeReached.Should().Be(calculationResult.FireAgeReached);
            workbookModel.Summary.FireAgeReached.Should().Be(scenario.Input.EarlyRetirementYear - scenario.Input.BirthYear);
            workbookModel.Summary.CurrentPortfolioValue.Should().Be(ConvertToDisplayCurrency(calculationResult.CurrentValue, scenario.Input));
            workbookModel.Summary.TotalContributions.Should().Be(ConvertToDisplayCurrency(calculationResult.TotalContributions, scenario.Input));
            workbookModel.Summary.EndPortfolioValue.Should().Be(ConvertToDisplayCurrency(calculationResult.EndValue, scenario.Input));
            workbookModel.Summary.CurrencyCode.Should().Be(GetDisplayCurrencyCode(scenario.Input));
            workbookModel.Inputs.MonthlyContribution.Should().Be(scenario.Input.MonthlyContribution.Amount);
            workbookModel.Inputs.MonthlyContributionCurrencyCode.Should().Be(GetCurrencyCode(scenario.Input.MonthlyContribution.Currency));
            workbookModel.YearlyProjections.Should().HaveCount(calculationResult.YearlyData.Count);
            workbookModel.MoneyFlows.Should().HaveCount(calculationResult.YearlyData.Count(y => y.FlowData != null));

            var firstProjection = workbookModel.YearlyProjections.First();
            var firstYear = calculationResult.YearlyData.First();
            firstProjection.Year.Should().Be(firstYear.Year);
            firstProjection.Age.Should().Be(firstYear.Year - scenario.Input.BirthYear);
            firstProjection.PortfolioValue.Should().Be(ConvertToDisplayCurrency(firstYear.PortfolioValue, scenario.Input));

            workbook.Worksheets.Should().HaveCount(4);
            workbook.Worksheet(1).Name.Should().Contain("Summary");
            workbook.Worksheet(2).Name.Should().Contain("Inputs");
            workbook.Worksheet(3).Name.Should().Contain("Yearly");
            workbook.Worksheet(4).Name.Should().Contain("Flow");
            workbook.Worksheet("Yearly - תחזית שנתית").RowsUsed().Count().Should().Be(workbookModel.YearlyProjections.Count + 1);
            workbook.Worksheet("Flow - פירוט תזרים").RowsUsed().Count().Should().Be(workbookModel.MoneyFlows.Count + 1);

            var summarySheet = workbook.Worksheet("Summary - סיכום");
            GetSummaryValueCell(summarySheet, "Current Portfolio Value").GetValue<decimal>()
                .Should().BeApproximately(workbookModel.Summary.CurrentPortfolioValue, 0.01m);
            GetSummaryValueCell(summarySheet, "Total Contributions").GetValue<decimal>()
                .Should().BeApproximately(workbookModel.Summary.TotalContributions, 0.01m);
            GetSummaryValueCell(summarySheet, "FIRE Age Reached").GetString()
                .Should().Be(workbookModel.Summary.FireAgeReached.ToString(CultureInfo.InvariantCulture));

            var yearlySheet = workbook.Worksheet("Yearly - תחזית שנתית");
            yearlySheet.Cell(2, 1).GetValue<int>().Should().Be(firstProjection.Year);
            yearlySheet.Cell(2, 2).GetValue<int>().Should().Be(firstProjection.Age);
            yearlySheet.Cell(2, 4).GetValue<decimal>().Should().BeApproximately(firstProjection.PortfolioValue, 0.01m);
            yearlySheet.Cell(2, 5).GetString().Should().Be(firstProjection.CurrencyCode);
        }

        [Fact]
        public void CalculateAndExport_IlsScenario_ConvertsMonetaryValuesConsistently()
        {
            // Arrange
            var scenario = CreateScenario("Ils", TestDataBuilder.CreateFirePlanInputWithUsdIlsConversion());
            var calculationResult = _calculator.Calculate(scenario.Input);
            var exportOptions = CreateExportOptions(scenario);

            // Act
            var workbookModel = _exportService.BuildWorkbookModel(calculationResult, exportOptions);
            var exportResult = _exportController.ExportToExcel(new ExportRequest
            {
                Input = scenario.Input,
                ScenarioName = scenario.Name,
                ScenarioNotes = scenario.Notes,
                UsdIlsRate = scenario.Input.UsdIlsRate
            });

            using var workbook = OpenWorkbook(ExtractExcelBytes(exportResult));

            // Assert
            workbookModel.Summary.CurrencyCode.Should().Be("ILS");
            workbookModel.YearlyProjections.Should().NotBeEmpty();
            workbookModel.YearlyProjections.First().CurrencyCode.Should().Be("ILS");

            var expectedCurrentValueIls = calculationResult.CurrentValue * scenario.Input.UsdIlsRate;
            workbookModel.Summary.CurrentPortfolioValue.Should().Be(expectedCurrentValueIls);

            var yearlySheet = workbook.Worksheet("Yearly - תחזית שנתית");
            yearlySheet.Cell(2, 5).GetString().Should().Be("ILS");
            yearlySheet.Cell(2, 4).GetValue<decimal>().Should().BeApproximately(workbookModel.YearlyProjections.First().PortfolioValue, 0.01m);
        }

        [Fact]
        public void CalculateAndExport_RsuScenario_IncludesRsuSummaryAndProjectedRows()
        {
            // Arrange
            var input = TestDataBuilder.CreateFirePlanInputWithRsuConfiguration();
            var scenario = new ExportWorkflowScenario(
                "Rsu",
                "RSU configuration export",
                input,
                null);

            var calculationResult = _calculator.Calculate(input);
            var exportOptions = CreateExportOptions(scenario);

            // Act
            var workbookModel = _exportService.BuildWorkbookModel(calculationResult, exportOptions);
            var exportResult = _exportController.ExportToExcel(new ExportRequest
            {
                Input = input,
                ScenarioName = scenario.Name,
                ScenarioNotes = scenario.Notes,
                UsdIlsRate = input.UsdIlsRate
            });

            using var workbook = OpenWorkbook(ExtractExcelBytes(exportResult));
            var summarySheet = workbook.Worksheet("Summary - סיכום");
            var summaryValues = summarySheet.CellsUsed().Select(cell => cell.GetString()).ToList();

            // Assert
            workbookModel.Summary.HasRsuSection.Should().Be(calculationResult.TotalRsuValueAtRetirement > 0);
            workbookModel.YearlyProjections.Should().Contain(row =>
                row.RsuSharesVested > 0 || row.RsuSharesSold > 0 || row.RsuSaleProceeds > 0 || row.RsuHoldingsValue > 0);

            if (workbookModel.Summary.HasRsuSection)
            {
                summaryValues.Should().Contain(value => value.Contains("RSU Summary") || value.Contains("סיכום RSU"));
                summaryValues.Should().Contain(value => value.Contains("RSU Value at Retirement") || value.Contains("שווי RSU בפרישה"));
            }
        }

        private static ExportWorkflowScenario CreateScenario(string name, FirePlanInput input)
        {
            return new ExportWorkflowScenario(
                name,
                $"{name} export workflow",
                input,
                CreatePlanData(input));
        }

        private static FirePlanInput CreatePortfolioAndExpensesInput()
        {
            var input = TestDataBuilder.CreateFirePlanInputWithPortfolio();
            input.Expenses = TestDataBuilder.CreateFirePlanInputWithExpenses().Expenses;
            input.AccumulationAllocation = TestDataBuilder.CreateFirePlanInputWithAllocation().AccumulationAllocation;
            input.RetirementAllocation = TestDataBuilder.CreateFirePlanInputWithAllocation().RetirementAllocation;
            input.InvestmentStrategy = "ageBased";
            return input;
        }

        private static FirePlanData CreatePlanData(FirePlanInput input)
        {
            return new FirePlanData
            {
                Inputs = new FirePlanInputs
                {
                    BirthDate = input.BirthDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
                    EarlyRetirementYear = input.EarlyRetirementYear.ToString(CultureInfo.InvariantCulture),
                    FullRetirementAge = input.FullRetirementAge.ToString(CultureInfo.InvariantCulture),
                    MonthlyContribution = input.MonthlyContribution.Amount.ToString(CultureInfo.InvariantCulture),
                    Currency = input.Currency,
                    WithdrawalRate = input.WithdrawalRate.ToString(CultureInfo.InvariantCulture),
                    InflationRate = input.InflationRate.ToString(CultureInfo.InvariantCulture),
                    CapitalGainsTax = input.CapitalGainsTax.ToString(CultureInfo.InvariantCulture),
                    PensionNetMonthlyAmount = input.PensionNetMonthly.Amount.ToString(CultureInfo.InvariantCulture),
                    PensionCurrency = input.PensionNetMonthly.Currency == "ILS" ? "₪" : "$"
                },
                RsuConfiguration = input.RsuConfiguration,
                IncludeRsuInCalculations = input.IncludeRsuInCalculations,
                Expenses = input.Expenses.ToList(),
                AccumulationPortfolio = input.AccumulationPortfolio.ToList(),
                RetirementPortfolio = input.RetirementPortfolio.ToList(),
                AccumulationAllocation = input.AccumulationAllocation.ToList(),
                RetirementAllocation = input.RetirementAllocation.ToList(),
                InvestmentStrategy = input.InvestmentStrategy,
                CurrentPortfolioValue = input.CurrentPortfolioValue.ToString(CultureInfo.InvariantCulture)
            };
        }

        private static ExcelExportOptions CreateExportOptions(ExportWorkflowScenario scenario)
        {
            return new ExcelExportOptions
            {
                ScenarioName = scenario.Name,
                ScenarioNotes = scenario.Notes,
                Input = scenario.Input,
                UsdIlsRate = scenario.Input.UsdIlsRate,
                AppVersion = "test-version"
            };
        }

        private static string ExtractSavedJson(IActionResult saveResult)
        {
            var okResult = saveResult.Should().BeOfType<OkObjectResult>().Subject;
            okResult.Value.Should().NotBeNull();
            var value = okResult.Value!;
            var dataProperty = value.GetType().GetProperty("data");
            dataProperty.Should().NotBeNull();
            return (string)dataProperty!.GetValue(value)!;
        }

        private static FirePlanData ExtractLoadedPlan(ActionResult<FirePlanData> loadResult)
        {
            var okResult = loadResult.Result.Should().BeOfType<OkObjectResult>().Subject;
            return okResult.Value.Should().BeOfType<FirePlanData>().Subject;
        }

        private static byte[] ExtractExcelBytes(IActionResult exportResult)
        {
            return exportResult.Should().BeOfType<FileContentResult>().Subject.FileContents;
        }

        private static XLWorkbook OpenWorkbook(byte[] workbookBytes)
        {
            return new XLWorkbook(new MemoryStream(workbookBytes));
        }

        private static IXLCell GetSummaryValueCell(IXLWorksheet sheet, string englishLabel)
        {
            var row = sheet.RowsUsed()
                .First(r => string.Equals(r.Cell(2).GetString(), englishLabel, StringComparison.Ordinal));

            return row.Cell(3);
        }

        private static string GetDisplayCurrencyCode(FirePlanInput input)
        {
            return input.Currency == "₪" ? "ILS" : "USD";
        }

        private static string GetCurrencyCode(string currency)
        {
            return currency switch
            {
                "₪" => "ILS",
                "$" => "USD",
                _ => currency
            };
        }

        private static decimal ConvertToDisplayCurrency(decimal usdValue, FirePlanInput input)
        {
            return GetDisplayCurrencyCode(input) == "ILS"
                ? usdValue * input.UsdIlsRate
                : usdValue;
        }

        public sealed record ExportWorkflowScenario(
            string Name,
            string Notes,
            FirePlanInput Input,
            FirePlanData? PlanData);
    }
}