namespace FirePlanningTool.Services
{
    internal sealed class ExcelWorkbookModel
    {
        public required ExcelSummaryModel Summary { get; init; }

        public required ExcelInputsModel Inputs { get; init; }

        public required IReadOnlyList<ExcelYearlyProjectionRowModel> YearlyProjections { get; init; }

        public required IReadOnlyList<ExcelMoneyFlowRowModel> MoneyFlows { get; init; }
    }

    internal sealed class ExcelSummaryModel
    {
        public required string ExportDateUtc { get; init; }

        public string ScenarioName { get; init; } = string.Empty;

        public string ScenarioNotes { get; init; } = string.Empty;

        public string AppVersion { get; init; } = string.Empty;

        public required string CurrencyCode { get; init; }

        public decimal CurrentPortfolioValue { get; init; }

        public decimal PeakPortfolioValue { get; init; }

        public decimal NetPeakValue { get; init; }

        public decimal TotalContributions { get; init; }

        public decimal GrossAnnualWithdrawal { get; init; }

        public decimal NetMonthlyExpense { get; init; }

        public decimal TaxAtRetirement { get; init; }

        public decimal EndPortfolioValue { get; init; }

        public int FireAgeReached { get; init; }

        public decimal AccumulationWeightedReturn { get; init; }

        public decimal RetirementWeightedReturn { get; init; }

        public bool HasRsuSection { get; init; }

        public decimal RsuValueAtRetirement { get; init; }

        public decimal RsuNetProceeds { get; init; }

        public decimal RsuTaxesPaid { get; init; }

        public int CurrentYear { get; init; }

        public int EarlyRetirementYear { get; init; }

        public int AgeAtRetirement { get; init; }

        public int YearsUntilRetirement { get; init; }

        public int FullRetirementYear { get; init; }

        public int YearsInRetirement { get; init; }
    }

    internal sealed class ExcelInputsModel
    {
        public int BirthYear { get; init; }

        public required string BirthDateIso { get; init; }

        public int EarlyRetirementYear { get; init; }

        public int FullRetirementAge { get; init; }

        public decimal MonthlyContribution { get; init; }

        public required string MonthlyContributionCurrencyCode { get; init; }

        public bool AdjustContributionsForInflation { get; init; }

        public required string DisplayCurrencyCode { get; init; }

        public decimal UsdIlsRate { get; init; }

        public decimal WithdrawalRate { get; init; }

        public decimal InflationRate { get; init; }

        public decimal CapitalGainsTax { get; init; }

        public string TaxBasisDisplay { get; init; } = string.Empty;

        public decimal PensionNetMonthly { get; init; }

        public required string PensionCurrencyCode { get; init; }

        public string InvestmentStrategy { get; init; } = string.Empty;

        public bool UseRetirementPortfolio { get; init; }

        public bool IncludeRsu { get; init; }
    }

    internal sealed class ExcelYearlyProjectionRowModel
    {
        public int Year { get; init; }

        public int Age { get; init; }

        public string Phase { get; init; } = string.Empty;

        public decimal PortfolioValue { get; init; }

        public required string CurrencyCode { get; init; }

        public decimal TotalContributions { get; init; }

        public decimal AnnualWithdrawal { get; init; }

        public decimal WithdrawalTax { get; init; }

        public decimal ExpenseTax { get; init; }

        public decimal TotalCapitalGainsTax { get; init; }

        public decimal PensionIncome { get; init; }

        public decimal PlannedExpenses { get; init; }

        public int RsuSharesVested { get; init; }

        public int RsuSharesSold { get; init; }

        public decimal RsuSaleProceeds { get; init; }

        public decimal RsuTaxPaid { get; init; }

        public decimal RsuHoldingsValue { get; init; }
    }

    internal sealed class ExcelMoneyFlowRowModel
    {
        public int Year { get; init; }

        public string Phase { get; init; } = string.Empty;

        public decimal Contributions { get; init; }

        public required string CurrencyCode { get; init; }

        public decimal PortfolioGrowth { get; init; }

        public decimal RsuNetProceeds { get; init; }

        public decimal CapitalGainsTax { get; init; }

        public decimal PlannedExpenses { get; init; }

        public decimal RetirementWithdrawals { get; init; }

        public decimal RebalancingTax { get; init; }

        public decimal PensionIncome { get; init; }

        public bool IsRetirementYear { get; init; }
    }
}
