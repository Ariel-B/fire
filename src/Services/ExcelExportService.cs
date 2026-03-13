using ClosedXML.Excel;
using FirePlanningTool.Models;
using FirePlanningTool.ValueObjects;
using System.Globalization;

namespace FirePlanningTool.Services
{
    /// <summary>
    /// Excel export service implementation using ClosedXML.
    /// Generates multi-sheet workbooks with FIRE calculation results.
    /// </summary>
    public class ExcelExportService : IExcelExportService
    {
        private const int HEADER_ROW = 1;

        /// <summary>
        /// Generates an Excel workbook with FIRE calculation results.
        /// </summary>
        public byte[] GenerateExcel(FireCalculationResult result, ExcelExportOptions options)
        {
            var workbookModel = BuildWorkbookModel(result, options);
            using var workbook = new XLWorkbook();

            // Create sheets in order
            CreateSummarySheet(workbook, workbookModel.Summary);
            // Sheet 2: Charts - deferred to Phase 2
            CreateUserInputsSheet(workbook, workbookModel.Inputs);
            CreateYearlyProjectionsSheet(workbook, workbookModel.YearlyProjections);
            CreateMoneyFlowDetailsSheet(workbook, workbookModel.MoneyFlows);
            // Sheets 6-9: Portfolio/Expense/RSU details - deferred to Phase 2

            // Save to memory stream and return as byte array
            using var stream = new MemoryStream();
            workbook.SaveAs(stream);
            return stream.ToArray();
        }

        internal ExcelWorkbookModel BuildWorkbookModel(FireCalculationResult result, ExcelExportOptions options)
        {
            ArgumentNullException.ThrowIfNull(result);
            ArgumentNullException.ThrowIfNull(options);
            ArgumentNullException.ThrowIfNull(options.Input);

            var displayCurrencyCode = SupportedCurrencies.GetCode(options.Input.Currency);

            return new ExcelWorkbookModel
            {
                Summary = BuildSummaryModel(result, options, displayCurrencyCode),
                Inputs = BuildInputsModel(options, displayCurrencyCode),
                YearlyProjections = result.YearlyData
                    .Select(yearly => BuildYearlyProjectionRowModel(yearly, options.Input, options.UsdIlsRate, displayCurrencyCode))
                    .ToList(),
                MoneyFlows = result.YearlyData
                    .Where(y => y.FlowData != null)
                    .Select(yearly => BuildMoneyFlowRowModel(yearly, options.UsdIlsRate, displayCurrencyCode))
                    .ToList()
            };
        }

        /// <summary>
        /// Creates Sheet 1: Summary with key metrics, timeline, and methodology notes.
        /// </summary>
        private void CreateSummarySheet(XLWorkbook workbook, ExcelSummaryModel summary)
        {
            var sheet = workbook.Worksheets.Add("Summary - סיכום");
            int row = 1;

            // Headers
            sheet.Cell(row, 1).Value = "שדה (עברית)";
            sheet.Cell(row, 2).Value = "Field (English)";
            sheet.Cell(row, 3).Value = "ערך (Value)";
            sheet.Cell(row, 4).Value = "מטבע (Currency)";
            StyleHeader(sheet.Range(row, 1, row, 4));
            row++;

            // Export metadata
            AddRow(sheet, ref row, "תאריך יצוא", "Export Date", summary.ExportDateUtc);
            AddRow(sheet, ref row, "שם תרחיש", "Scenario Name", summary.ScenarioName);
            AddRow(sheet, ref row, "הערות תרחיש", "Scenario Notes", summary.ScenarioNotes);
            AddRow(sheet, ref row, "גרסת התוכנה", "App Version", summary.AppVersion);
            AddSeparator(sheet, ref row);

            // Key Metrics
            AddRow(sheet, ref row, "**מדדים עיקריים**", "**Key Metrics**", "", "", isHeader: true);
            AddMoneyRow(sheet, ref row, "שווי נוכחי", "Current Portfolio Value", summary.CurrentPortfolioValue, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "שווי שיא הצבירה", "Peak Portfolio Value", summary.PeakPortfolioValue, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "שווי נטו (אחרי מס)", "Net Peak Value", summary.NetPeakValue, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "סה\"כ הפקדות", "Total Contributions", summary.TotalContributions, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "משיכה שנתית ברוטו", "Gross Annual Withdrawal", summary.GrossAnnualWithdrawal, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "הוצאה חודשית נטו", "Net Monthly Expense", summary.NetMonthlyExpense, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "מס בפרישה", "Tax at Retirement", summary.TaxAtRetirement, summary.CurrencyCode);
            AddMoneyRow(sheet, ref row, "שווי סופי", "End Portfolio Value", summary.EndPortfolioValue, summary.CurrencyCode);
            AddRow(sheet, ref row, "גיל FIRE", "FIRE Age Reached", summary.FireAgeReached.ToString());
            AddSeparator(sheet, ref row);

            // Returns
            AddRow(sheet, ref row, "**תשואות**", "**Returns**", "", "", isHeader: true);
            AddPercentageRow(sheet, ref row, "תשואה משוקללת צבירה", "Accumulation Weighted Return", summary.AccumulationWeightedReturn);
            AddPercentageRow(sheet, ref row, "תשואה משוקללת פרישה", "Retirement Weighted Return", summary.RetirementWeightedReturn);
            AddSeparator(sheet, ref row);

            // RSU Summary (if applicable)
            if (summary.HasRsuSection)
            {
                AddRow(sheet, ref row, "**סיכום RSU**", "**RSU Summary**", "", "", isHeader: true);
                AddMoneyRow(sheet, ref row, "שווי RSU בפרישה", "RSU Value at Retirement", summary.RsuValueAtRetirement, summary.CurrencyCode);
                AddMoneyRow(sheet, ref row, "תמורה נטו RSU", "RSU Net Proceeds", summary.RsuNetProceeds, summary.CurrencyCode);
                AddMoneyRow(sheet, ref row, "מס RSU ששולם", "RSU Taxes Paid", summary.RsuTaxesPaid, summary.CurrencyCode);
                AddSeparator(sheet, ref row);
            }

            // Timeline
            AddRow(sheet, ref row, "**ציר זמן**", "**Timeline**", "", "", isHeader: true);
            AddRow(sheet, ref row, "שנה נוכחית", "Current Year", summary.CurrentYear.ToString());
            AddRow(sheet, ref row, "שנת פרישה מוקדמת", "Early Retirement Year", summary.EarlyRetirementYear.ToString());
            AddRow(sheet, ref row, "גיל בפרישה", "Age at Retirement", summary.AgeAtRetirement.ToString());
            AddRow(sheet, ref row, "שנים עד פרישה", "Years Until Retirement", summary.YearsUntilRetirement.ToString());
            AddRow(sheet, ref row, "שנת פרישה מלאה", "Full Retirement Year", summary.FullRetirementYear.ToString());
            AddRow(sheet, ref row, "שנות בפרישה", "Years in Retirement", summary.YearsInRetirement.ToString());
            AddSeparator(sheet, ref row);

            // Methodology & Assumptions
            AddRow(sheet, ref row, "**מתודולוגיה והנחות**", "**Methodology & Assumptions**", "", "", isHeader: true);
            AddRow(sheet, ref row, "מודל צמיחת תיק", "Portfolio Growth Model", "Weighted return per asset using selected strategy (CAGR / Total Growth / Target Price)");
            AddRow(sheet, ref row, "מודל אינפלציה", "Inflation Model", "Constant annual rate applied to withdrawals and expenses");
            AddRow(sheet, ref row, "חישוב משיכה", "Withdrawal Calculation", "Withdrawal % × Portfolio Value at start of retirement, then inflation-adjusted each year");
            AddRow(sheet, ref row, "חישוב מס", "Tax Model", "Israeli capital gains tax on real gains (cost-basis adjusted). RSU: Section 102 marginal + optional 3% surtax");
            AddRow(sheet, ref row, "הערה", "Note", "All values are projections based on the assumptions above. Past performance does not guarantee future results.");

            // Auto-fit columns
            sheet.Columns().AdjustToContents();
        }

        /// <summary>
        /// Creates Sheet 3: User Inputs with all input parameters.
        /// </summary>
        private void CreateUserInputsSheet(XLWorkbook workbook, ExcelInputsModel inputs)
        {
            var sheet = workbook.Worksheets.Add("Inputs - פרמטרים");
            int row = 1;

            // Headers
            sheet.Cell(row, 1).Value = "שדה (עברית)";
            sheet.Cell(row, 2).Value = "Field (English)";
            sheet.Cell(row, 3).Value = "ערך (Value)";
            sheet.Cell(row, 4).Value = "מטבע (Currency)";
            StyleHeader(sheet.Range(row, 1, row, 4));
            row++;

            // Personal Details
            AddRow(sheet, ref row, "**פרטים אישיים**", "**Personal Details**", "", "", isHeader: true);
            AddRow(sheet, ref row, "שנת לידה", "Birth Year", inputs.BirthYear.ToString());
            AddRow(sheet, ref row, "תאריך לידה", "Birth Date", inputs.BirthDateIso);
            AddSeparator(sheet, ref row);

            // Retirement Timeline
            AddRow(sheet, ref row, "**ציר זמן פרישה**", "**Retirement Timeline**", "", "", isHeader: true);
            AddRow(sheet, ref row, "שנת פרישה מוקדמת", "Early Retirement Year", inputs.EarlyRetirementYear.ToString());
            AddRow(sheet, ref row, "גיל פרישה מלאה", "Full Retirement Age", inputs.FullRetirementAge.ToString());
            AddSeparator(sheet, ref row);

            // Financial Parameters
            AddRow(sheet, ref row, "**פרמטרים פיננסיים**", "**Financial Parameters**", "", "", isHeader: true);
            AddMoneyRow(sheet, ref row, "הפקדה חודשית", "Monthly Contribution", inputs.MonthlyContribution, inputs.MonthlyContributionCurrencyCode);
            AddRow(sheet, ref row, "הצמד הפקדות לאינפלציה", "Adjust Contributions for Inflation", inputs.AdjustContributionsForInflation.ToString());
            AddRow(sheet, ref row, "מטבע הצגה", "Display Currency", inputs.DisplayCurrencyCode);
            AddRow(sheet, ref row, "שער USD/ILS", "USD/ILS Rate", inputs.UsdIlsRate.ToString("F4"));
            AddPercentageRow(sheet, ref row, "אחוז משיכה", "Withdrawal Rate", inputs.WithdrawalRate);
            AddPercentageRow(sheet, ref row, "אחוז אינפלציה", "Inflation Rate", inputs.InflationRate);
            AddPercentageRow(sheet, ref row, "מס רווח הון", "Capital Gains Tax", inputs.CapitalGainsTax);
            AddRow(sheet, ref row, "בסיס מס", "Tax Basis", inputs.TaxBasisDisplay);
            AddSeparator(sheet, ref row);

            // Pension
            AddRow(sheet, ref row, "**פנסיה**", "**Pension**", "", "", isHeader: true);
            AddMoneyRow(sheet, ref row, "פנסיה חודשית נטו", "Net Monthly Pension", inputs.PensionNetMonthly, inputs.PensionCurrencyCode);
            AddSeparator(sheet, ref row);

            // Strategy
            AddRow(sheet, ref row, "**אסטרטגיה**", "**Strategy**", "", "", isHeader: true);
            AddRow(sheet, ref row, "אסטרטגיית השקעה", "Investment Strategy", inputs.InvestmentStrategy);
            AddRow(sheet, ref row, "שימוש בתיק פרישה", "Use Retirement Portfolio", inputs.UseRetirementPortfolio.ToString());
            AddRow(sheet, ref row, "כלול RSU בחישובים", "Include RSU", inputs.IncludeRsu.ToString());

            // Auto-fit columns
            sheet.Columns().AdjustToContents();
        }

        /// <summary>
        /// Creates Sheet 4: Yearly Projections with year-by-year core data.
        /// </summary>
        private void CreateYearlyProjectionsSheet(XLWorkbook workbook, IReadOnlyList<ExcelYearlyProjectionRowModel> yearlyProjections)
        {
            var sheet = workbook.Worksheets.Add("Yearly - תחזית שנתית");
            int row = 1;

            // Headers - bilingual with currency columns
            sheet.Cell(row, 1).Value = "שנה (Year)";
            sheet.Cell(row, 2).Value = "גיל (Age)";
            sheet.Cell(row, 3).Value = "שלב (Phase)";
            sheet.Cell(row, 4).Value = "שווי תיק (Portfolio Value)";
            sheet.Cell(row, 5).Value = "מטבע (Currency)";
            sheet.Cell(row, 6).Value = "סה\"כ הפקדות (Total Contributions)";
            sheet.Cell(row, 7).Value = "מטבע (Currency)";
            sheet.Cell(row, 8).Value = "משיכה שנתית (Annual Withdrawal)";
            sheet.Cell(row, 9).Value = "מטבע (Currency)";
            sheet.Cell(row, 10).Value = "מס על משיכה (Withdrawal Tax)";
            sheet.Cell(row, 11).Value = "מטבע (Currency)";
            sheet.Cell(row, 12).Value = "מס על הוצאות (Expense Tax)";
            sheet.Cell(row, 13).Value = "מטבע (Currency)";
            sheet.Cell(row, 14).Value = "סה\"כ מס רווח הון (Total Cap Gains Tax)";
            sheet.Cell(row, 15).Value = "מטבע (Currency)";
            sheet.Cell(row, 16).Value = "הכנסה מפנסיה (Pension Income)";
            sheet.Cell(row, 17).Value = "מטבע (Currency)";
            sheet.Cell(row, 18).Value = "הוצאות מתוכננות (Planned Expenses)";
            sheet.Cell(row, 19).Value = "מטבע (Currency)";
            sheet.Cell(row, 20).Value = "מניות RSU שהבשילו (RSU Shares Vested)";
            sheet.Cell(row, 21).Value = "מניות RSU שנמכרו (RSU Shares Sold)";
            sheet.Cell(row, 22).Value = "תמורת מכירת RSU (RSU Sale Proceeds)";
            sheet.Cell(row, 23).Value = "מטבע (Currency)";
            sheet.Cell(row, 24).Value = "מס RSU (RSU Tax Paid)";
            sheet.Cell(row, 25).Value = "מטבע (Currency)";
            sheet.Cell(row, 26).Value = "שווי אחזקות RSU (RSU Holdings Value)";
            sheet.Cell(row, 27).Value = "מטבע (Currency)";
            StyleHeader(sheet.Range(row, 1, row, 27));
            row++;

            // Data rows
            foreach (var yearly in yearlyProjections)
            {
                int col = 1;

                sheet.Cell(row, col++).Value = yearly.Year;
                sheet.Cell(row, col++).Value = yearly.Age;
                sheet.Cell(row, col++).Value = yearly.Phase;
                sheet.Cell(row, col++).Value = yearly.PortfolioValue;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;
                sheet.Cell(row, col++).Value = yearly.TotalContributions;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;
                sheet.Cell(row, col++).Value = yearly.AnnualWithdrawal;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                // Withdrawal Tax and Expense Tax
                sheet.Cell(row, col++).Value = yearly.WithdrawalTax;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;
                sheet.Cell(row, col++).Value = yearly.ExpenseTax;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                // Total Capital Gains Tax
                sheet.Cell(row, col++).Value = yearly.TotalCapitalGainsTax;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                // Pension Income
                sheet.Cell(row, col++).Value = yearly.PensionIncome;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                // Planned Expenses
                sheet.Cell(row, col++).Value = yearly.PlannedExpenses;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                // RSU data
                sheet.Cell(row, col++).Value = yearly.RsuSharesVested;
                sheet.Cell(row, col++).Value = yearly.RsuSharesSold;
                sheet.Cell(row, col++).Value = yearly.RsuSaleProceeds;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;
                sheet.Cell(row, col++).Value = yearly.RsuTaxPaid;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;
                sheet.Cell(row, col++).Value = yearly.RsuHoldingsValue;
                sheet.Cell(row, col++).Value = yearly.CurrencyCode;

                row++;
            }

            // Format numeric columns
            FormatCurrencyColumns(sheet, 4, 2); // Portfolio Value
            FormatCurrencyColumns(sheet, 6, 2); // Total Contributions
            FormatCurrencyColumns(sheet, 8, 2); // Annual Withdrawal
            FormatCurrencyColumns(sheet, 10, 2); // Withdrawal Tax
            FormatCurrencyColumns(sheet, 12, 2); // Expense Tax
            FormatCurrencyColumns(sheet, 14, 2); // Total Cap Gains Tax
            FormatCurrencyColumns(sheet, 16, 2); // Pension Income
            FormatCurrencyColumns(sheet, 18, 2); // Planned Expenses
            FormatCurrencyColumns(sheet, 22, 2); // RSU Sale Proceeds
            FormatCurrencyColumns(sheet, 24, 2); // RSU Tax Paid
            FormatCurrencyColumns(sheet, 26, 2); // RSU Holdings Value

            // Auto-fit columns
            sheet.Columns().AdjustToContents();
        }

        /// <summary>
        /// Creates Sheet 5: Money Flow Details with Sankey flow data.
        /// </summary>
        private void CreateMoneyFlowDetailsSheet(XLWorkbook workbook, IReadOnlyList<ExcelMoneyFlowRowModel> moneyFlows)
        {
            var sheet = workbook.Worksheets.Add("Flow - פירוט תזרים");
            int row = 1;

            // Headers
            sheet.Cell(row, 1).Value = "שנה (Year)";
            sheet.Cell(row, 2).Value = "שלב (Phase)";
            sheet.Cell(row, 3).Value = "הפקדות (Contributions)";
            sheet.Cell(row, 4).Value = "מטבע (Currency)";
            sheet.Cell(row, 5).Value = "צמיחה (Portfolio Growth)";
            sheet.Cell(row, 6).Value = "מטבע (Currency)";
            sheet.Cell(row, 7).Value = "תמורת RSU (RSU Net Proceeds)";
            sheet.Cell(row, 8).Value = "מטבע (Currency)";
            sheet.Cell(row, 9).Value = "מס רווח הון (Capital Gains Tax)";
            sheet.Cell(row, 10).Value = "מטבע (Currency)";
            sheet.Cell(row, 11).Value = "הוצאות מתוכננות (Planned Expenses)";
            sheet.Cell(row, 12).Value = "מטבע (Currency)";
            sheet.Cell(row, 13).Value = "משיכות פרישה (Retirement Withdrawals)";
            sheet.Cell(row, 14).Value = "מטבע (Currency)";
            sheet.Cell(row, 15).Value = "מס איזון מחדש (Rebalancing Tax)";
            sheet.Cell(row, 16).Value = "מטבע (Currency)";
            sheet.Cell(row, 17).Value = "הכנסה מפנסיה (Pension Income)";
            sheet.Cell(row, 18).Value = "מטבע (Currency)";
            sheet.Cell(row, 19).Value = "שנת פרישה (Is Retirement Year)";
            StyleHeader(sheet.Range(row, 1, row, 19));
            row++;

            // Data rows
            foreach (var moneyFlow in moneyFlows)
            {
                int col = 1;
                sheet.Cell(row, col++).Value = moneyFlow.Year;
                sheet.Cell(row, col++).Value = moneyFlow.Phase;
                sheet.Cell(row, col++).Value = moneyFlow.Contributions;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.PortfolioGrowth;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.RsuNetProceeds;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.CapitalGainsTax;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.PlannedExpenses;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.RetirementWithdrawals;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.RebalancingTax;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.PensionIncome;
                sheet.Cell(row, col++).Value = moneyFlow.CurrencyCode;
                sheet.Cell(row, col++).Value = moneyFlow.IsRetirementYear ? "Yes" : "No";

                row++;
            }

            // Format numeric columns
            FormatCurrencyColumns(sheet, 3, 2);  // Contributions
            FormatCurrencyColumns(sheet, 5, 2);  // Portfolio Growth
            FormatCurrencyColumns(sheet, 7, 2);  // RSU Net Proceeds
            FormatCurrencyColumns(sheet, 9, 2);  // Capital Gains Tax
            FormatCurrencyColumns(sheet, 11, 2); // Planned Expenses
            FormatCurrencyColumns(sheet, 13, 2); // Retirement Withdrawals
            FormatCurrencyColumns(sheet, 15, 2); // Rebalancing Tax
            FormatCurrencyColumns(sheet, 17, 2); // Pension Income

            // Auto-fit columns
            sheet.Columns().AdjustToContents();
        }

        #region Helper Methods

        private static ExcelSummaryModel BuildSummaryModel(FireCalculationResult result, ExcelExportOptions options, string displayCurrencyCode)
        {
            var currentYear = DateTime.UtcNow.Year;
            var fullRetirementYear = options.Input.BirthYear + options.Input.FullRetirementAge;

            return new ExcelSummaryModel
            {
                ExportDateUtc = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC"),
                ScenarioName = options.ScenarioName ?? string.Empty,
                ScenarioNotes = options.ScenarioNotes ?? string.Empty,
                AppVersion = options.AppVersion,
                CurrencyCode = displayCurrencyCode,
                CurrentPortfolioValue = ConvertToDisplayCurrency(result.CurrentValue, displayCurrencyCode, options.UsdIlsRate),
                PeakPortfolioValue = ConvertToDisplayCurrency(result.PeakValue, displayCurrencyCode, options.UsdIlsRate),
                NetPeakValue = ConvertToDisplayCurrency(result.GrossPeakValue - result.RetirementTaxToPay, displayCurrencyCode, options.UsdIlsRate),
                TotalContributions = ConvertToDisplayCurrency(result.TotalContributions, displayCurrencyCode, options.UsdIlsRate),
                GrossAnnualWithdrawal = ConvertToDisplayCurrency(result.GrossAnnualWithdrawal, displayCurrencyCode, options.UsdIlsRate),
                NetMonthlyExpense = ConvertToDisplayCurrency(result.NetMonthlyExpense, displayCurrencyCode, options.UsdIlsRate),
                TaxAtRetirement = ConvertToDisplayCurrency(result.RetirementTaxToPay, displayCurrencyCode, options.UsdIlsRate),
                EndPortfolioValue = ConvertToDisplayCurrency(result.EndValue, displayCurrencyCode, options.UsdIlsRate),
                FireAgeReached = result.FireAgeReached,
                AccumulationWeightedReturn = result.AccumulationWeightedReturn,
                RetirementWeightedReturn = result.RetirementWeightedReturn,
                HasRsuSection = result.TotalRsuValueAtRetirement > 0,
                RsuValueAtRetirement = ConvertToDisplayCurrency(result.TotalRsuValueAtRetirement, displayCurrencyCode, options.UsdIlsRate),
                RsuNetProceeds = ConvertToDisplayCurrency(result.TotalRsuNetProceeds, displayCurrencyCode, options.UsdIlsRate),
                RsuTaxesPaid = ConvertToDisplayCurrency(result.TotalRsuTaxesPaid, displayCurrencyCode, options.UsdIlsRate),
                CurrentYear = currentYear,
                EarlyRetirementYear = options.Input.EarlyRetirementYear,
                AgeAtRetirement = result.FireAgeReached,
                YearsUntilRetirement = options.Input.EarlyRetirementYear - currentYear,
                FullRetirementYear = fullRetirementYear,
                YearsInRetirement = fullRetirementYear - options.Input.EarlyRetirementYear
            };
        }

        private static ExcelInputsModel BuildInputsModel(ExcelExportOptions options, string displayCurrencyCode)
        {
            return new ExcelInputsModel
            {
                BirthYear = options.Input.BirthYear,
                BirthDateIso = options.Input.BirthDate.ToString("yyyy-MM-dd"),
                EarlyRetirementYear = options.Input.EarlyRetirementYear,
                FullRetirementAge = options.Input.FullRetirementAge,
                MonthlyContribution = options.Input.MonthlyContribution.Amount,
                MonthlyContributionCurrencyCode = SupportedCurrencies.GetCode(options.Input.MonthlyContribution.Currency),
                AdjustContributionsForInflation = options.Input.AdjustContributionsForInflation,
                DisplayCurrencyCode = displayCurrencyCode,
                UsdIlsRate = options.UsdIlsRate,
                WithdrawalRate = options.Input.WithdrawalRate,
                InflationRate = options.Input.InflationRate,
                CapitalGainsTax = options.Input.CapitalGainsTax,
                TaxBasisDisplay = options.Input.TaxBasis?.ToString("F2") ?? "Auto-calculated",
                PensionNetMonthly = options.Input.PensionNetMonthly.Amount,
                PensionCurrencyCode = SupportedCurrencies.GetCode(options.Input.PensionNetMonthly.Currency),
                InvestmentStrategy = options.Input.InvestmentStrategy,
                UseRetirementPortfolio = options.Input.UseRetirementPortfolio,
                IncludeRsu = options.Input.IncludeRsuInCalculations
            };
        }

        private static ExcelYearlyProjectionRowModel BuildYearlyProjectionRowModel(YearlyData yearly, FirePlanInput input, decimal usdIlsRate, string displayCurrencyCode)
        {
            return new ExcelYearlyProjectionRowModel
            {
                Year = yearly.Year,
                Age = yearly.Year - input.BirthYear,
                Phase = yearly.Phase,
                PortfolioValue = ConvertToDisplayCurrency(yearly.PortfolioValue, displayCurrencyCode, usdIlsRate),
                CurrencyCode = displayCurrencyCode,
                TotalContributions = ConvertToDisplayCurrency(yearly.TotalContributions, displayCurrencyCode, usdIlsRate),
                AnnualWithdrawal = ConvertToDisplayCurrency(yearly.AnnualWithdrawal ?? 0, displayCurrencyCode, usdIlsRate),
                WithdrawalTax = ConvertToDisplayCurrency(yearly.FlowData?.WithdrawalCapGainsTax ?? 0, displayCurrencyCode, usdIlsRate),
                ExpenseTax = ConvertToDisplayCurrency(yearly.FlowData?.ExpensesCapGainsTax ?? 0, displayCurrencyCode, usdIlsRate),
                TotalCapitalGainsTax = ConvertToDisplayCurrency(yearly.FlowData?.CapitalGainsTax ?? 0, displayCurrencyCode, usdIlsRate),
                PensionIncome = ConvertToDisplayCurrency(yearly.FlowData?.PensionIncome ?? 0, displayCurrencyCode, usdIlsRate),
                PlannedExpenses = ConvertToDisplayCurrency(yearly.FlowData?.PlannedExpenses ?? 0, displayCurrencyCode, usdIlsRate),
                RsuSharesVested = yearly.RsuSharesVested,
                RsuSharesSold = yearly.RsuSharesSold,
                RsuSaleProceeds = ConvertToDisplayCurrency(yearly.RsuSaleProceeds, displayCurrencyCode, usdIlsRate),
                RsuTaxPaid = ConvertToDisplayCurrency(yearly.RsuTaxesPaid, displayCurrencyCode, usdIlsRate),
                RsuHoldingsValue = ConvertToDisplayCurrency(yearly.RsuHoldingsValue, displayCurrencyCode, usdIlsRate)
            };
        }

        private static ExcelMoneyFlowRowModel BuildMoneyFlowRowModel(YearlyData yearly, decimal usdIlsRate, string displayCurrencyCode)
        {
            return new ExcelMoneyFlowRowModel
            {
                Year = yearly.Year,
                Phase = yearly.FlowData.Phase,
                Contributions = ConvertToDisplayCurrency(yearly.FlowData.MonthlyContributions, displayCurrencyCode, usdIlsRate),
                CurrencyCode = displayCurrencyCode,
                PortfolioGrowth = ConvertToDisplayCurrency(yearly.FlowData.PortfolioGrowth, displayCurrencyCode, usdIlsRate),
                RsuNetProceeds = ConvertToDisplayCurrency(yearly.FlowData.RsuNetProceeds, displayCurrencyCode, usdIlsRate),
                CapitalGainsTax = ConvertToDisplayCurrency(yearly.FlowData.CapitalGainsTax, displayCurrencyCode, usdIlsRate),
                PlannedExpenses = ConvertToDisplayCurrency(yearly.FlowData.PlannedExpenses, displayCurrencyCode, usdIlsRate),
                RetirementWithdrawals = ConvertToDisplayCurrency(yearly.FlowData.RetirementWithdrawals, displayCurrencyCode, usdIlsRate),
                RebalancingTax = ConvertToDisplayCurrency(yearly.FlowData.RetirementRebalancingTax, displayCurrencyCode, usdIlsRate),
                PensionIncome = ConvertToDisplayCurrency(yearly.FlowData.PensionIncome, displayCurrencyCode, usdIlsRate),
                IsRetirementYear = yearly.FlowData.IsRetirementYear
            };
        }

        private static decimal ConvertToDisplayCurrency(decimal usdValue, string displayCurrencyCode, decimal usdIlsRate)
        {
            if (string.Equals(displayCurrencyCode, "ILS", StringComparison.OrdinalIgnoreCase) && usdIlsRate > 0)
            {
                return usdValue * usdIlsRate;
            }

            return usdValue;
        }

        private void AddRow(IXLWorksheet sheet, ref int row, string hebrew, string english, string value, string currency = "", bool isHeader = false)
        {
            sheet.Cell(row, 1).Value = hebrew;
            sheet.Cell(row, 2).Value = english;
            // Prevent Excel formula injection by prefixing dangerous characters with apostrophe
            sheet.Cell(row, 3).Value = SanitizeForExcel(value);
            if (!string.IsNullOrEmpty(currency))
            {
                sheet.Cell(row, 4).Value = currency;
            }

            if (isHeader)
            {
                var range = sheet.Range(row, 1, row, 4);
                range.Style.Font.Bold = true;
                range.Style.Fill.BackgroundColor = XLColor.LightGray;
            }

            row++;
        }

        /// <summary>
        /// Sanitizes text for Excel to prevent formula injection.
        /// Prefixes values starting with =, +, -, @ with an apostrophe.
        /// </summary>
        private static string SanitizeForExcel(string value)
        {
            if (string.IsNullOrEmpty(value))
                return value;

            // Check if value starts with dangerous characters
            if (value.StartsWith('=') || value.StartsWith('+') ||
                value.StartsWith('-') || value.StartsWith('@'))
            {
                return "'" + value;
            }

            return value;
        }

        private void AddMoneyRow(IXLWorksheet sheet, ref int row, string hebrew, string english, decimal value, string currency)
        {
            sheet.Cell(row, 1).Value = hebrew;
            sheet.Cell(row, 2).Value = english;
            sheet.Cell(row, 3).Value = value;
            sheet.Cell(row, 3).Style.NumberFormat.Format = "#,##0.00";
            sheet.Cell(row, 4).Value = currency;
            row++;
        }

        private void AddPercentageRow(IXLWorksheet sheet, ref int row, string hebrew, string english, decimal value)
        {
            sheet.Cell(row, 1).Value = hebrew;
            sheet.Cell(row, 2).Value = english;
            sheet.Cell(row, 3).Value = value;
            sheet.Cell(row, 3).Style.NumberFormat.Format = "0.00\"%\"";
            row++;
        }

        private void AddSeparator(IXLWorksheet sheet, ref int row)
        {
            sheet.Cell(row, 1).Value = "---";
            sheet.Cell(row, 2).Value = "---";
            row++;
        }

        private void StyleHeader(IXLRange range)
        {
            range.Style.Font.Bold = true;
            range.Style.Fill.BackgroundColor = XLColor.LightBlue;
            range.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            range.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Center;
        }

        private void FormatCurrencyColumns(IXLWorksheet sheet, int columnNumber, int startRow)
        {
            var lastRow = sheet.LastRowUsed()?.RowNumber() ?? startRow;
            if (lastRow >= startRow)
            {
                var range = sheet.Range(startRow, columnNumber, lastRow, columnNumber);
                range.Style.NumberFormat.Format = "#,##0.00";
            }
        }

        #endregion
    }
}
