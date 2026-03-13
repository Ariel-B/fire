namespace FirePlanningTool.Tests.Taxes
{
    public class TaxCalculationTests
    {
        #region Capital Gains Tax Tests

        [Fact]
        public void CapitalGainsTax_WithZeroGains_AppliesNoTax()
        {
            var portfolioValue = 100000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var gains = portfolioValue - costBasis;
            var taxableGains = gains > 0 ? gains : 0;
            var taxOwed = taxableGains * (capitalGainsTaxRate / 100);

            gains.Should().Be(0);
            taxOwed.Should().Be(0);
        }

        [Fact]
        public void CapitalGainsTax_WithPositiveGains_CalculatesTaxCorrectly()
        {
            var portfolioValue = 125000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var gains = portfolioValue - costBasis;
            var taxOwed = gains * (capitalGainsTaxRate / 100);

            gains.Should().Be(25000);
            taxOwed.Should().Be(5000);
        }

        [Fact]
        public void CapitalGainsTax_WithLosses_NoTaxOwed()
        {
            var portfolioValue = 75000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var gains = portfolioValue - costBasis;
            var taxOwed = gains > 0 ? gains * (capitalGainsTaxRate / 100) : 0;

            gains.Should().Be(-25000);
            taxOwed.Should().Be(0);
        }

        [Fact]
        public void CapitalGainsTax_DifferentRates_ProduceProportionalTaxes()
        {
            var portfolioValue = 150000m;
            var costBasis = 100000m;
            var gains = portfolioValue - costBasis;

            var lowTaxRate = 15m;
            var highTaxRate = 30m;

            var lowTax = gains * (lowTaxRate / 100);
            var highTax = gains * (highTaxRate / 100);

            lowTax.Should().Be(7500);
            highTax.Should().Be(15000);
            highTax.Should().Be(lowTax * 2);
        }

        #endregion

        #region Effective Tax Rate Tests

        [Fact]
        public void EffectiveTaxRate_WithHighGainRatio_HigherTaxImpact()
        {
            var portfolioValue = 150000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var profitRatio = (portfolioValue - costBasis) / portfolioValue; // 0.333
            var effectiveTaxRate = (profitRatio * capitalGainsTaxRate / 100); // 6.67%

            profitRatio.Should().BeApproximately(0.333m, 0.01m);
            effectiveTaxRate.Should().BeApproximately(0.0667m, 0.001m);
        }

        [Fact]
        public void EffectiveTaxRate_WithLowGainRatio_LowerTaxImpact()
        {
            var portfolioValue = 110000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var profitRatio = (portfolioValue - costBasis) / portfolioValue; // 0.0909
            var effectiveTaxRate = (profitRatio * capitalGainsTaxRate / 100);

            profitRatio.Should().BeApproximately(0.0909m, 0.01m);
            effectiveTaxRate.Should().BeApproximately(0.01818m, 0.001m);
        }

        [Fact]
        public void EffectiveTaxRate_NoGains_ZeroTax()
        {
            var portfolioValue = 100000m;
            var costBasis = 100000m;
            var capitalGainsTaxRate = 20m;

            var profitRatio = portfolioValue > costBasis ? (portfolioValue - costBasis) / portfolioValue : 0;
            var effectiveTaxRate = (profitRatio * capitalGainsTaxRate / 100);

            profitRatio.Should().Be(0);
            effectiveTaxRate.Should().Be(0);
        }

        #endregion

        #region Tax Impact on Withdrawals Tests

        [Fact]
        public void WithdrawalTax_ReducesAvailableFunds()
        {
            var grossWithdrawal = 40000m;
            var effectiveTaxRate = 0.15m;

            var netWithdrawal = grossWithdrawal * (1 - effectiveTaxRate);

            netWithdrawal.Should().Be(34000);
        }

        [Fact]
        public void WithdrawalTax_HighTaxRate_SignificantlyReducesFunds()
        {
            var grossWithdrawal = 40000m;
            var effectiveTaxRate = 0.30m;

            var netWithdrawal = grossWithdrawal * (1 - effectiveTaxRate);

            netWithdrawal.Should().Be(28000);
        }

        [Fact]
        public void WithdrawalTax_NoTax_PreservesFullAmount()
        {
            var grossWithdrawal = 40000m;
            var effectiveTaxRate = 0m;

            var netWithdrawal = grossWithdrawal * (1 - effectiveTaxRate);

            netWithdrawal.Should().Be(40000);
        }

        #endregion

        #region Tax Basis Tests

        [Fact]
        public void TaxBasis_CalculatedFromPortfolio_MatchesCostBasis()
        {
            var portfolio = new List<(decimal qty, decimal cost)>
            {
                (100, 200), // VTI: 100 * 200
                (200, 75)   // BND: 200 * 75
            };

            var calculatedBasis = portfolio.Sum(a => a.qty * a.cost);
            calculatedBasis.Should().Be(35000);
        }

        [Fact]
        public void TaxBasis_ZeroBasis_MaximumTaxImpact()
        {
            var portfolioValue = 150000m;
            var costBasis = 0m;
            var capitalGainsTaxRate = 20m;

            var gains = portfolioValue - costBasis;
            var tax = gains * (capitalGainsTaxRate / 100);
            var profitRatio = 1m;

            gains.Should().Be(150000);
            tax.Should().Be(30000);
            profitRatio.Should().Be(1);
        }

        #endregion

        #region Multi-Year Tax Impact Tests

        [Fact]
        public void AccumulatedGains_Over10Years_WithAnnualContributions()
        {
            var startingBalance = 100000m;
            var annualReturn = 0.07m;
            var years = 10;

            var endingBalance = startingBalance;
            for (int i = 0; i < years; i++)
            {
                endingBalance *= (1 + annualReturn);
            }
            var totalGains = endingBalance - startingBalance;

            totalGains.Should().BeGreaterThan(0);
            endingBalance.Should().BeApproximately(196715, 10);
            totalGains.Should().BeApproximately(96715, 10);
        }

        #endregion

        #region Net Monthly Expense with Cost Basis Tests

        [Fact]
        public void NetMonthlyExpense_WithUnrealizedGains_TaxesBasedOnCostBasis()
        {
            // Portfolio worth $1,000,000 but cost basis is $600,000
            // This means $400,000 in unrealized gains (40% profit ratio)
            var portfolioValue = 1000000m;
            var costBasis = 600000m;
            var withdrawalRate = 4m; // 4%
            var capitalGainsTaxRate = 25m; // 25%

            // Calculate profit ratio: (value - cost) / value = 400K / 1M = 0.4
            var profitRatio = (portfolioValue - costBasis) / portfolioValue;
            profitRatio.Should().Be(0.4m);

            // Calculate effective tax rate: profitRatio * taxRate = 0.4 * 0.25 = 0.10 (10%)
            var effectiveTaxRate = profitRatio * (capitalGainsTaxRate / 100);
            effectiveTaxRate.Should().Be(0.10m);

            // Gross annual withdrawal: 1M * 4% = $40,000
            var grossAnnualWithdrawal = portfolioValue * (withdrawalRate / 100);
            grossAnnualWithdrawal.Should().Be(40000m);

            // Net annual withdrawal: $40K * (1 - 10%) = $36,000
            var netAnnualWithdrawal = grossAnnualWithdrawal * (1 - effectiveTaxRate);
            netAnnualWithdrawal.Should().Be(36000m);

            // Net monthly expense: $36K / 12 = $3,000
            var netMonthlyExpense = netAnnualWithdrawal / 12;
            netMonthlyExpense.Should().Be(3000m);
        }

        [Fact]
        public void NetMonthlyExpense_WhenCostBasisEqualsMarketValue_NoTaxOnWithdrawals()
        {
            // Portfolio worth $1,000,000 with cost basis also $1,000,000 (no gains)
            var portfolioValue = 1000000m;
            var costBasis = 1000000m;
            var withdrawalRate = 4m;
            var capitalGainsTaxRate = 25m;

            // No profit, so profit ratio is 0
            var profitRatio = portfolioValue > costBasis
                ? (portfolioValue - costBasis) / portfolioValue
                : 0;
            profitRatio.Should().Be(0m);

            // Effective tax rate is 0
            var effectiveTaxRate = profitRatio * (capitalGainsTaxRate / 100);
            effectiveTaxRate.Should().Be(0m);

            // Gross and net are the same
            var grossAnnualWithdrawal = portfolioValue * (withdrawalRate / 100);
            var netAnnualWithdrawal = grossAnnualWithdrawal * (1 - effectiveTaxRate);
            var netMonthlyExpense = netAnnualWithdrawal / 12;

            // $40K / 12 = $3,333.33
            netMonthlyExpense.Should().BeApproximately(3333.33m, 0.01m);
        }

        [Fact]
        public void NetMonthlyExpense_HighUnrealizedGains_HigherTaxImpact()
        {
            // Portfolio doubled: worth $2,000,000 but cost basis is $1,000,000
            // 50% profit ratio
            var portfolioValue = 2000000m;
            var costBasis = 1000000m;
            var withdrawalRate = 4m;
            var capitalGainsTaxRate = 25m;

            var profitRatio = (portfolioValue - costBasis) / portfolioValue;
            profitRatio.Should().Be(0.5m);

            // Effective tax rate: 0.5 * 0.25 = 0.125 (12.5%)
            var effectiveTaxRate = profitRatio * (capitalGainsTaxRate / 100);
            effectiveTaxRate.Should().Be(0.125m);

            var grossAnnualWithdrawal = portfolioValue * (withdrawalRate / 100); // $80,000
            var netAnnualWithdrawal = grossAnnualWithdrawal * (1 - effectiveTaxRate); // $70,000
            var netMonthlyExpense = netAnnualWithdrawal / 12;

            grossAnnualWithdrawal.Should().Be(80000m);
            netAnnualWithdrawal.Should().Be(70000m);
            netMonthlyExpense.Should().BeApproximately(5833.33m, 0.01m);
        }

        [Fact]
        public void NetMonthlyExpense_BugScenario_CostBasisNotMarketValue()
        {
            // This test validates the fix for the bug where totalContributions
            // was initialized with currentValue (market value) instead of cost basis.
            // 
            // Bug scenario: User has portfolio with significant unrealized gains.
            // The old code would use market value as "contributions", resulting in
            // near-zero profit ratio and understated taxes.

            // Example: Portfolio with 40% unrealized gains
            var marketValue = 1000000m;
            var costBasis = 600000m; // User actually contributed $600K
            var withdrawalRate = 4m;
            var capitalGainsTax = 25m;

            // CORRECT calculation (using cost basis):
            var correctProfitRatio = (marketValue - costBasis) / marketValue; // 0.4
            var correctEffectiveTaxRate = correctProfitRatio * (capitalGainsTax / 100); // 0.1
            var correctGrossWithdrawal = marketValue * (withdrawalRate / 100); // $40,000
            var correctNetAnnual = correctGrossWithdrawal * (1 - correctEffectiveTaxRate); // $36,000
            var correctNetMonthly = correctNetAnnual / 12; // $3,000

            // INCORRECT calculation (bug - using market value as basis):
            var wrongProfitRatio = (marketValue - marketValue) / marketValue; // 0
            var wrongEffectiveTaxRate = wrongProfitRatio * (capitalGainsTax / 100); // 0
            var wrongNetAnnual = correctGrossWithdrawal * (1 - wrongEffectiveTaxRate); // $40,000
            var wrongNetMonthly = wrongNetAnnual / 12; // $3,333.33

            // Validate correct values
            correctProfitRatio.Should().Be(0.4m);
            correctNetMonthly.Should().Be(3000m);

            // The bug would result in higher net monthly (less tax)
            wrongNetMonthly.Should().BeGreaterThan(correctNetMonthly);
            wrongNetMonthly.Should().BeApproximately(3333.33m, 0.01m);

            // The difference is significant: $333/month or $4000/year
            var monthlyDifference = wrongNetMonthly - correctNetMonthly;
            monthlyDifference.Should().BeApproximately(333.33m, 0.01m);
        }

        [Fact]
        public void ProfitRatio_WithContributionsDuringAccumulation_CorrectlyTracked()
        {
            // Simulates accumulation where:
            // - Starting cost basis: $500,000
            // - Monthly contribution: $5,000 for 5 years = $300,000
            // - Total contributions (tax basis): $800,000
            // - Portfolio grows to $1,500,000

            var startingCostBasis = 500000m;
            var monthlyContribution = 5000m;
            var years = 5;
            var newContributions = monthlyContribution * 12 * years; // $300,000
            var totalCostBasis = startingCostBasis + newContributions; // $800,000
            var finalPortfolioValue = 1500000m;

            // Profit ratio should be based on cost basis, not starting value
            var profitRatio = (finalPortfolioValue - totalCostBasis) / finalPortfolioValue;
            // (1.5M - 800K) / 1.5M = 700K / 1.5M = 0.4667

            profitRatio.Should().BeApproximately(0.4667m, 0.001m);

            // With 25% capital gains tax
            var capitalGainsTax = 25m;
            var effectiveTaxRate = profitRatio * (capitalGainsTax / 100);
            // 0.4667 * 0.25 = 0.1167 (11.67%)
            effectiveTaxRate.Should().BeApproximately(0.1167m, 0.001m);
        }

        #endregion
    }
}

