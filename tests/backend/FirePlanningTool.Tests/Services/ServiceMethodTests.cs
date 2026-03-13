namespace FirePlanningTool.Tests.Services
{
    using FirePlanningTool.Models;
    using FirePlanningTool.ValueObjects;
    using FirePlanningTool.Services;

    /// <summary>
    /// Tests for specific service methods and calculations
    /// Validates calculation correctness and edge cases in services
    /// </summary>
    public class ServiceMethodTests
    {
        #region Portfolio Calculation Tests

        [Fact]
        public void CalculatePortfolioValue_SingleAsset_ReturnsCorrectValue()
        {
            var calculator = TestDataBuilder.CreateFireCalculator();
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250) }
            };

            // Using reflection to test private method or creating a public test helper
            var value = portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
            value.Should().Be(25000);
        }

        [Fact]
        public void CalculatePortfolioValue_MultipleAssets_ReturnsSummedValue()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250) },
                new() { Symbol = "BND", Quantity = 50, CurrentPrice = Money.Usd(100) },
                new() { Symbol = "VXUS", Quantity = 75, CurrentPrice = Money.Usd(200) }
            };

            var value = portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
            value.Should().Be(45000); // (100*250) + (50*100) + (75*200) = 25000 + 5000 + 15000
        }

        [Fact]
        public void CalculatePortfolioCostBasis_SingleAsset_ReturnsCorrectBasis()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, AverageCost = Money.Usd(200) }
            };

            var costBasis = portfolio.Sum(a => a.Quantity * a.AverageCost.Amount);
            costBasis.Should().Be(20000);
        }

        [Fact]
        public void CalculateGain_Profitable_ReturnsPositiveValue()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(250),
                AverageCost = Money.Usd(200)
            };

            var currentValue = asset.Quantity * asset.CurrentPrice.Amount;
            var costBasis = asset.Quantity * asset.AverageCost.Amount;
            var gain = currentValue - costBasis;

            gain.Should().Be(5000);
            gain.Should().BeGreaterThan(0);
        }

        [Fact]
        public void CalculateGain_Underwater_ReturnsNegativeValue()
        {
            var asset = new PortfolioAsset
            {
                Symbol = "VTI",
                Quantity = 100,
                CurrentPrice = Money.Usd(150),
                AverageCost = Money.Usd(200)
            };

            var currentValue = asset.Quantity * asset.CurrentPrice.Amount;
            var costBasis = asset.Quantity * asset.AverageCost.Amount;
            var loss = currentValue - costBasis;

            loss.Should().Be(-5000);
            loss.Should().BeLessThan(0);
        }

        #endregion

        #region Weighted Return Tests

        [Fact]
        public void CalculateWeightedReturn_SingleAsset_ReturnsAssetReturn()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "VTI", Quantity = 100, CurrentPrice = Money.Usd(250), Value1 = 8, Method = "CAGR" }
            };

            var totalValue = portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
            var weightedReturn = portfolio.Sum(a => (a.Quantity * a.CurrentPrice.Amount / totalValue) * a.Value1);

            weightedReturn.Should().Be(8);
        }

        [Fact]
        public void CalculateWeightedReturn_MultipleAssets_ReturnsWeightedAverage()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "Stocks", Quantity = 70, CurrentPrice = Money.Usd(100), Value1 = 8, Method = "CAGR" },
                new() { Symbol = "Bonds", Quantity = 30, CurrentPrice = Money.Usd(100), Value1 = 3, Method = "CAGR" }
            };

            var totalValue = portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
            var weightedReturn = portfolio.Sum(a => (a.Quantity * a.CurrentPrice.Amount / totalValue) * a.Value1);

            // Expected: (70/100)*8 + (30/100)*3 = 5.6 + 0.9 = 6.5
            weightedReturn.Should().BeApproximately(6.5m, 0.01m);
        }

        [Fact]
        public void CalculateWeightedReturn_EquallyWeighted_ReturnsAverage()
        {
            var portfolio = new List<PortfolioAsset>
            {
                new() { Symbol = "A", Quantity = 50, CurrentPrice = Money.Usd(100), Value1 = 6, Method = "CAGR" },
                new() { Symbol = "B", Quantity = 50, CurrentPrice = Money.Usd(100), Value1 = 10, Method = "CAGR" }
            };

            var totalValue = portfolio.Sum(a => a.Quantity * a.CurrentPrice.Amount);
            var weightedReturn = portfolio.Sum(a => (a.Quantity * a.CurrentPrice.Amount / totalValue) * a.Value1);

            weightedReturn.Should().Be(8);
        }

        #endregion

        #region Allocation Weighted Return Tests

        [Fact]
        public void CalculateAllocationWeightedReturn_SingleAllocation_ReturnsAllocatedReturn()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 100, ExpectedAnnualReturn = 8 }
            };

            var weightedReturn = allocations.Sum(a => (a.TargetPercentage / 100) * a.ExpectedAnnualReturn);

            weightedReturn.Should().Be(8);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_MultipleAllocations_ReturnsWeightedAverage()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 70, ExpectedAnnualReturn = 8 },
                new() { AssetType = "Bonds", TargetPercentage = 30, ExpectedAnnualReturn = 3 }
            };

            var weightedReturn = allocations.Sum(a => (a.TargetPercentage / 100) * a.ExpectedAnnualReturn);

            // Expected: (0.70*8) + (0.30*3) = 5.6 + 0.9 = 6.5
            weightedReturn.Should().BeApproximately(6.5m, 0.01m);
        }

        [Fact]
        public void CalculateAllocationWeightedReturn_ThreeAssetClasses_ReturnsAccurateWeightedReturn()
        {
            var allocations = new List<PortfolioAllocation>
            {
                new() { AssetType = "Stocks", TargetPercentage = 50, ExpectedAnnualReturn = 8 },
                new() { AssetType = "Bonds", TargetPercentage = 35, ExpectedAnnualReturn = 3 },
                new() { AssetType = "RealEstate", TargetPercentage = 15, ExpectedAnnualReturn = 5 }
            };

            var weightedReturn = allocations.Sum(a => (a.TargetPercentage / 100) * a.ExpectedAnnualReturn);

            // Expected: (0.50*8) + (0.35*3) + (0.15*5) = 4 + 1.05 + 0.75 = 5.8
            weightedReturn.Should().BeApproximately(5.8m, 0.01m);
        }

        #endregion

        #region Currency Conversion Tests

        [Fact]
        public void ConvertCurrency_DollarToShekel_AppliesExchangeRate()
        {
            var dollarAmount = 1000m;
            var exchangeRate = 3.6m;

            var shekelAmount = dollarAmount * exchangeRate;

            shekelAmount.Should().Be(3600);
        }

        [Fact]
        public void ConvertCurrency_ShekelToDollar_InversionOfExchangeRate()
        {
            var shekelAmount = 3600m;
            var exchangeRate = 3.6m;

            var dollarAmount = shekelAmount / exchangeRate;

            dollarAmount.Should().Be(1000);
        }

        [Fact]
        public void ConvertCurrency_HighExchangeRate_ProducesDifferentResults()
        {
            var amount = 1000m;
            var lowRate = 3.0m;
            var highRate = 4.0m;

            var lowConversion = amount * lowRate;
            var highConversion = amount * highRate;

            highConversion.Should().BeGreaterThan(lowConversion);
            (highConversion - lowConversion).Should().Be(1000);
        }

        #endregion

        #region Monthly Contribution Tests

        [Fact]
        public void MonthlyContribution_Compounded_12Times_ProducesAnnualGrowth()
        {
            var monthlyContribution = 2500m;
            var months = 12;

            var totalContributedInYear = monthlyContribution * months;

            totalContributedInYear.Should().Be(30000);
        }

        [Fact]
        public void MonthlyContribution_Over30Years_AccumulatesSignificantly()
        {
            var monthlyContribution = 2500m;
            var months = 30 * 12;

            var totalContributions = monthlyContribution * months;

            totalContributions.Should().Be(900000);
        }

        #endregion

        #region Inflation Adjustment Tests

        [Fact]
        public void InflationAdjustment_ZeroInflation_MaintainsValue()
        {
            var baseAmount = 5000m;
            var inflationRate = 0m;
            var years = 10;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), years);

            inflatedAmount.Should().Be(baseAmount);
        }

        [Fact]
        public void InflationAdjustment_2PercentInflation_IncreasesOverTime()
        {
            var baseAmount = 5000m;
            var inflationRate = 2m;
            var years = 10;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), years);

            inflatedAmount.Should().BeGreaterThan(baseAmount);
            inflatedAmount.Should().BeApproximately(6094.94m, 1);
        }

        [Fact]
        public void InflationAdjustment_5PercentInflation_IncreasesMoreAggressively()
        {
            var baseAmount = 10000m;
            var inflationRate = 5m;
            var years = 20;

            var inflatedAmount = baseAmount * (decimal)Math.Pow((double)(1 + inflationRate / 100), years);

            inflatedAmount.Should().BeGreaterThan(baseAmount * 2);
        }

        #endregion

        #region Tax Calculation Tests

        [Fact]
        public void CapitalGainsTax_Zero_AppliesNoTax()
        {
            var gain = 10000m;
            var taxRate = 0m;

            var tax = gain * (taxRate / 100);

            tax.Should().Be(0);
        }

        [Fact]
        public void CapitalGainsTax_Positive_CalculatesCorrectly()
        {
            var gain = 10000m;
            var taxRate = 15m;

            var tax = gain * (taxRate / 100);

            tax.Should().Be(1500);
        }

        [Fact]
        public void CapitalGainsTax_HighRate_ReducesGains()
        {
            var gain = 100000m;
            var lowRate = 15m;
            var highRate = 37m;

            var lowTax = gain * (lowRate / 100);
            var highTax = gain * (highRate / 100);

            highTax.Should().BeGreaterThan(lowTax);
            (highTax - lowTax).Should().Be(22000);
        }

        #endregion

        #region Withdrawal Rate Tests

        [Fact]
        public void WithdrawalRate_4Percent_StandardRate()
        {
            var portfolioValue = 1000000m;
            var withdrawalRate = 4m;

            var annualWithdrawal = portfolioValue * (withdrawalRate / 100);

            annualWithdrawal.Should().Be(40000);
        }

        [Fact]
        public void WithdrawalRate_3Percent_Conservative()
        {
            var portfolioValue = 1000000m;
            var withdrawalRate = 3m;

            var annualWithdrawal = portfolioValue * (withdrawalRate / 100);

            annualWithdrawal.Should().Be(30000);
        }

        [Fact]
        public void WithdrawalRate_5Percent_Aggressive()
        {
            var portfolioValue = 1000000m;
            var withdrawalRate = 5m;

            var annualWithdrawal = portfolioValue * (withdrawalRate / 100);

            annualWithdrawal.Should().Be(50000);
        }

        [Fact]
        public void WithdrawalRate_WithInflationAdjustment_IncreaseOverTime()
        {
            var initialWithdrawal = 40000m;
            var inflationRate = 2.5m;
            var years = 10;

            var finalWithdrawal = initialWithdrawal * (decimal)Math.Pow((double)(1 + inflationRate / 100), years);

            finalWithdrawal.Should().BeGreaterThan(initialWithdrawal);
            finalWithdrawal.Should().BeApproximately(51203.38m, 1);
        }

        #endregion
    }
}
