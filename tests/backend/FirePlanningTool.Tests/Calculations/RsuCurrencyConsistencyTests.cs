using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using FirePlanningTool.Services;
using FluentAssertions;
using Xunit;

namespace FirePlanningTool.Tests.Calculations
{
    public class RsuCurrencyConsistencyTests
    {
        [Fact]
        public void AccumulationPhase_WithIlsRsuProceeds_UsesCurrencyConvertedValue()
        {
            // Arrange
            var currencyConverter = new CurrencyConverter(3.6m); // USD/ILS rate
            var expenseCalculator = new ExpenseCalculator();
            var calculator = new AccumulationPhaseCalculator();

            // RSU data in ILS (NetSaleProceeds = 36000 ILS)
            var rsuData = new Dictionary<int, RsuYearlyData>
            {
                { 2025, new RsuYearlyData { Year = 2025, NetSaleProceeds = 36000m, SharesVested = 100, SharesSold = 100 } }
            };

            var rsuConfig = new RsuConfiguration
            {
                CurrentPricePerShare = Money.Ils(100)  // ILS currency
            };

            var input = new AccumulationPhaseInput
            {
                CurrentYear = 2025,
                AccumulationYears = 1,
                StartingPortfolioValue = 100000m,
                MonthlyContributionUsd = 1000m,
                AccumulationReturn = 7m,
                InflationRate = 2m,
                RsuYearlyLookup = rsuData,
                RsuConfiguration = rsuConfig,
                CurrencyConverter = currencyConverter,
                ExpenseCalculator = expenseCalculator,
                CurrentPortfolioValue = 100000m
            };

            // Act
            var result = calculator.Calculate(input);

            // Assert
            var expectedProceedsUsd = 36000m / 3.6m;  // = 10000 USD
            result.YearlyData[0].RsuSaleProceeds.Should().BeApproximately(expectedProceedsUsd, 0.01m,
                "RsuSaleProceeds should be in USD, converted from ILS");
            result.YearlyData[0].FlowData.RsuNetProceeds.Should().BeApproximately(expectedProceedsUsd, 0.01m,
                "FlowData.RsuNetProceeds should be in USD, matching RsuSaleProceeds");

            // Both fields should be consistent
            result.YearlyData[0].RsuSaleProceeds.Should().BeApproximately(result.YearlyData[0].FlowData.RsuNetProceeds, 0.01m,
                "RsuSaleProceeds and FlowData.RsuNetProceeds must use the same currency (USD) for consistency");
        }

        [Fact]
        public void RetirementPhase_WithIlsRsuProceeds_UsesCurrencyConvertedValue()
        {
            // Arrange
            var currencyConverter = new CurrencyConverter(3.6m);
            var expenseCalculator = new ExpenseCalculator();
            var taxCalculator = new TaxCalculator();
            var calculator = new RetirementPhaseCalculator();

            // RSU data in ILS (NetSaleProceeds = 36000 ILS)
            var rsuData = new Dictionary<int, RsuYearlyData>
            {
                { 2025, new RsuYearlyData { Year = 2025, NetSaleProceeds = 36000m, SharesVested = 100, SharesSold = 100 } }
            };

            var rsuConfig = new RsuConfiguration
            {
                CurrentPricePerShare = Money.Ils(100)  // ILS currency
            };

            var input = new RetirementPhaseInput
            {
                EarlyRetirementYear = 2025,
                RetirementYears = 1,
                CurrentYear = 2025,
                StartingPortfolioValue = 500000m,
                InitialGrossAnnualWithdrawal = 25000m,
                InitialAnnualWithdrawal = 20000m,
                RetirementReturn = 5m,
                InflationRate = 2m,
                CapitalGainsTax = 25m,
                InitialProfitRatio = 0.6m,
                InitialCostBasis = 200000m,
                RsuYearlyLookup = rsuData,
                RsuConfiguration = rsuConfig,
                CurrencyConverter = currencyConverter,
                ExpenseCalculator = expenseCalculator,
                TaxCalculator = taxCalculator
            };

            // Act
            var result = calculator.Calculate(input);

            // Assert
            var expectedProceedsUsd = 36000m / 3.6m;  // = 10000 USD
            result.YearlyData[0].RsuSaleProceeds.Should().BeApproximately(expectedProceedsUsd, 0.01m,
                "RsuSaleProceeds should be in USD, converted from ILS");
            result.YearlyData[0].FlowData.RsuNetProceeds.Should().BeApproximately(expectedProceedsUsd, 0.01m,
                "FlowData.RsuNetProceeds should be in USD, matching RsuSaleProceeds");

            // Both fields should be consistent
            result.YearlyData[0].RsuSaleProceeds.Should().BeApproximately(result.YearlyData[0].FlowData.RsuNetProceeds, 0.01m,
                "RsuSaleProceeds and FlowData.RsuNetProceeds must use the same currency (USD) for consistency");
        }
    }
}
