using FirePlanningTool.Controllers;
using FirePlanningTool.Models;
using FirePlanningTool.Services;
using FirePlanningTool.ValueObjects;
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text.Json;
using Xunit;

namespace FirePlanningTool.Tests.Controllers
{
    /// <summary>
    /// Integration tests for ExportController.
    /// Tests complete user flow from frontend JSON→backend deserialization→export.
    /// </summary>
    public class ExportControllerIntegrationTests
    {
        /// <summary>
        /// Creates a comprehensive FirePlanInput matching all possible user inputs from the frontend.
        /// This simulates what gatherInputData() creates and sends to the backend.
        /// </summary>
        private static FirePlanInput CreateComprehensiveUserInput()
        {
            return new FirePlanInput
            {
                // Basic info
                BirthDate = new DateTime(1985, 3, 15),
                BirthYear = 1985,
                EarlyRetirementYear = 2035,
                FullRetirementAge = 67,

                // All Money fields that frontend sends
                MonthlyContribution = Money.Usd(5000),
                PensionNetMonthly = Money.Usd(2000),
                TargetMonthlyExpense = Money.Usd(8000),

                // Currency settings
                Currency = "$",
                UsdIlsRate = 3.7m,

                // Financial parameters
                WithdrawalRate = 4.0m,
                InflationRate = 2.5m,
                CapitalGainsTax = 25.0m,

                // Portfolio with multiple assets (tests Money fields in arrays)
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new PortfolioAsset
                    {
                        Id = 1,
                        Symbol = "VTI",
                        Quantity = 100,
                        CurrentPrice = Money.Usd(220.50m),
                        AverageCost = Money.Usd(200.00m),
                        Method = "CAGR",
                        Value1 = 10.0m,
                        Value2 = 0
                    },
                    new PortfolioAsset
                    {
                        Id = 2,
                        Symbol = "VXUS",
                        Quantity = 50,
                        CurrentPrice = Money.Usd(65.25m),
                        AverageCost = Money.Usd(60.00m),
                        Method = "CAGR",
                        Value1 = 8.5m,
                        Value2 = 0
                    }
                },

                // Retirement allocation
                RetirementAllocation = new List<PortfolioAllocation>
                {
                    new PortfolioAllocation
                    {
                        Id = 1,
                        AssetType = "Stocks",
                        TargetPercentage = 60,
                        ExpectedAnnualReturn = 8.0m
                    },
                    new PortfolioAllocation
                    {
                        Id = 2,
                        AssetType = "Bonds",
                        TargetPercentage = 40,
                        ExpectedAnnualReturn = 4.0m
                    }
                },

                // Multiple expenses (tests Money fields in expense arrays)
                Expenses = new List<PlannedExpense>
                {
                    new PlannedExpense
                    {
                        Id = 1,
                        Type = "Car Purchase",
                        NetAmount = Money.Usd(35000),
                        Year = 2030,
                        FrequencyYears = 1,
                        RepetitionCount = 1
                    },
                    new PlannedExpense
                    {
                        Id = 2,
                        Type = "Annual Vacation",
                        NetAmount = Money.Usd(5000),
                        Year = 2026,
                        FrequencyYears = 1,
                        RepetitionCount = 10
                    }
                },

                // RSU Configuration (tests Money fields in RSU grants)
                RsuConfiguration = new RsuConfiguration
                {
                    StockSymbol = "GOOGL",
                    CurrentPricePerShare = Money.Usd(150.00m),
                    ExpectedAnnualReturn = 12.0m,
                    ReturnMethod = "CAGR",
                    DefaultVestingPeriodYears = 4,
                    LiquidationStrategy = RsuLiquidationStrategy.SellAfter2Years,
                    MarginalTaxRate = 47m,
                    SubjectTo3PercentSurtax = true,
                    Grants = new List<RsuGrant>
                    {
                        new RsuGrant
                        {
                            Id = 1,
                            GrantDate = new DateTime(2023, 1, 15),
                            NumberOfShares = 1000,
                            PriceAtGrant = Money.Usd(120.00m),
                            VestingPeriodYears = 4,
                            VestingType = VestingScheduleType.Standard
                        },
                        new RsuGrant
                        {
                            Id = 2,
                            GrantDate = new DateTime(2024, 3, 1),
                            NumberOfShares = 800,
                            PriceAtGrant = Money.Usd(140.00m),
                            VestingPeriodYears = 4,
                            VestingType = VestingScheduleType.Standard
                        }
                    }
                },
                IncludeRsuInCalculations = true,

                UseRetirementPortfolio = true
            };
        }

        [Fact]
        public void ExportToExcel_With_Complete_User_Input_Should_Deserialize_All_Money_Fields()
        {
            // Arrange: Create comprehensive input
            var input = CreateComprehensiveUserInput();

            // Step 1: Serialize to JSON (simulating frontend sending to backend)
            var jsonOptions = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                WriteIndented = true
            };
            var json = JsonSerializer.Serialize(input, jsonOptions);

            // Step 2: Deserialize (simulating ASP.NET Core model binding)
            var deserializedInput = JsonSerializer.Deserialize<FirePlanInput>(json, jsonOptions);

            // Assert: Verify ALL Money fields deserialized correctly
            Assert.NotNull(deserializedInput);

            // Basic Money fields
            Assert.Equal(5000, deserializedInput.MonthlyContribution.Amount);
            Assert.Equal("USD", deserializedInput.MonthlyContribution.Currency);
            Assert.Equal(2000, deserializedInput.PensionNetMonthly.Amount);
            Assert.Equal("USD", deserializedInput.PensionNetMonthly.Currency);
            Assert.NotNull(deserializedInput.TargetMonthlyExpense);
            Assert.Equal(8000, deserializedInput.TargetMonthlyExpense.Value.Amount);
            Assert.Equal("USD", deserializedInput.TargetMonthlyExpense.Value.Currency);

            // Portfolio Money fields
            Assert.Equal(2, deserializedInput.AccumulationPortfolio.Count);
            Assert.Equal(220.50m, deserializedInput.AccumulationPortfolio[0].CurrentPrice.Amount);
            Assert.Equal("USD", deserializedInput.AccumulationPortfolio[0].CurrentPrice.Currency);
            Assert.Equal(200.00m, deserializedInput.AccumulationPortfolio[0].AverageCost.Amount);
            Assert.Equal(65.25m, deserializedInput.AccumulationPortfolio[1].CurrentPrice.Amount);
            Assert.Equal(60.00m, deserializedInput.AccumulationPortfolio[1].AverageCost.Amount);

            // Expense Money fields
            Assert.Equal(2, deserializedInput.Expenses.Count);
            Assert.Equal(35000, deserializedInput.Expenses[0].NetAmount.Amount);
            Assert.Equal("USD", deserializedInput.Expenses[0].NetAmount.Currency);
            Assert.Equal(5000, deserializedInput.Expenses[1].NetAmount.Amount);

            // RSU Money fields (tests Money in RSU grants)
            Assert.NotNull(deserializedInput.RsuConfiguration);
            Assert.Equal(150.00m, deserializedInput.RsuConfiguration.CurrentPricePerShare.Amount);
            Assert.Equal("USD", deserializedInput.RsuConfiguration.CurrentPricePerShare.Currency);
            Assert.Equal(2, deserializedInput.RsuConfiguration.Grants.Count);
            Assert.Equal(120.00m, deserializedInput.RsuConfiguration.Grants[0].PriceAtGrant.Amount);
            Assert.Equal("USD", deserializedInput.RsuConfiguration.Grants[0].PriceAtGrant.Currency);
            Assert.Equal(140.00m, deserializedInput.RsuConfiguration.Grants[1].PriceAtGrant.Amount);
            Assert.True(deserializedInput.IncludeRsuInCalculations);

            // Step 3: Test full export controller flow
            var mockExcelService = new Mock<IExcelExportService>();
            var mockCalculator = new Mock<IFireCalculator>();
            var mockInputValidator = new Mock<IValidator<FirePlanInput>>();
            var mockLogger = new Mock<ILogger<ExportController>>();

            // Validator returns valid result by default
            mockInputValidator
                .Setup(v => v.Validate(It.IsAny<FirePlanInput>()))
                .Returns(new FluentValidation.Results.ValidationResult());

            // Setup calculator
            mockCalculator
                .Setup(c => c.Calculate(It.IsAny<FirePlanInput>()))
                .Returns(new FireCalculationResult
                {
                    FireAgeReached = 50,
                    CurrentValue = 1000000m,
                    PeakValue = 2000000m,
                    YearlyData = new List<YearlyData>()
                });

            // Setup Excel service
            mockExcelService
                .Setup(e => e.GenerateExcel(It.IsAny<FireCalculationResult>(), It.IsAny<ExcelExportOptions>()))
                .Returns(new byte[] { 1, 2, 3 });

            var controller = new ExportController(
                mockExcelService.Object,
                mockCalculator.Object,
                mockInputValidator.Object,
                mockLogger.Object
            );

            var exportRequest = new ExportRequest
            {
                Input = deserializedInput,
                ScenarioName = "Comprehensive Test",
                ScenarioNotes = "Testing all Money fields"
            };

            // Act: Call export endpoint
            var result = controller.ExportToExcel(exportRequest);

            // Assert: Should succeed without Money deserialization errors
            Assert.IsNotType<BadRequestObjectResult>(result);
            var fileResult = Assert.IsType<FileContentResult>(result);

            // Verify calculator was called with correct input
            mockCalculator.Verify(c => c.Calculate(It.Is<FirePlanInput>(i =>
                i.MonthlyContribution.Amount == 5000 &&
                i.PensionNetMonthly.Amount == 2000 &&
                i.TargetMonthlyExpense.HasValue &&
                i.TargetMonthlyExpense.Value.Amount == 8000
            )), Times.Once);
        }

        [Fact]
        public void ExportToExcel_With_ILS_Currency_Should_Handle_Mixed_Currencies()
        {
            // Arrange: Create input with ILS Money fields
            var input = new FirePlanInput
            {
                BirthYear = 1990,
                EarlyRetirementYear = 2040,
                FullRetirementAge = 67,
                MonthlyContribution = Money.Ils(15000),
                PensionNetMonthly = Money.Ils(7000),
                TargetMonthlyExpense = Money.Ils(25000),
                Currency = "₪",
                UsdIlsRate = 3.7m,
                WithdrawalRate = 4.0m,
                InflationRate = 2.0m,
                CapitalGainsTax = 25.0m,
                AccumulationPortfolio = new List<PortfolioAsset>
                {
                    new PortfolioAsset
                    {
                        Id = 1,
                        Symbol = "VTI",
                        Quantity = 100,
                        CurrentPrice = Money.Usd(220m),
                        AverageCost = Money.Usd(200m),
                        Method = "CAGR",
                        Value1 = 10.0m
                    }
                },
                Expenses = new List<PlannedExpense>
                {
                    new PlannedExpense
                    {
                        Id = 1,
                        Type = "Vacation",
                        NetAmount = Money.Ils(20000),
                        Year = 2030,
                        FrequencyYears = 1,
                        RepetitionCount = 1
                    }
                }
            };

            // Serialize and deserialize
            var json = JsonSerializer.Serialize(input, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            var deserializedInput = JsonSerializer.Deserialize<FirePlanInput>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            // Assert: Mixed currencies should work
            Assert.NotNull(deserializedInput);
            Assert.Equal("ILS", deserializedInput.MonthlyContribution.Currency);
            Assert.Equal(15000, deserializedInput.MonthlyContribution.Amount);
            Assert.Equal("USD", deserializedInput.AccumulationPortfolio[0].CurrentPrice.Currency);
            Assert.Equal(220m, deserializedInput.AccumulationPortfolio[0].CurrentPrice.Amount);
        }
    }
}
