# Product Requirements Document: Simulation Export to Spreadsheet

**Version:** 1.3  
**Last Updated:** February 8, 2026  
**Owner:** Product Team  
**Status:** MVP Implemented (Phase 1 Complete)  
**Parent PRD:** PRD_FIRE_PLANNING_TOOL.md

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Background & User Need](#2-background--user-need)
3. [Feature Requirements](#3-feature-requirements)
4. [Data Specification](#4-data-specification)
5. [File Format & Compatibility](#5-file-format--compatibility)
6. [Dynamic Charts in Export](#6-dynamic-charts-in-export)
7. [User Interface](#7-user-interface)
8. [Technical Implementation](#8-technical-implementation)
9. [Validation & Error Handling](#9-validation--error-handling)
10. [Testing Requirements](#10-testing-requirements)
11. [Success Criteria](#11-success-criteria)
12. [Timeline & Effort](#12-timeline--effort)
13. [Open Questions](#13-open-questions)

---

## 1. Executive Summary

### 1.1 Purpose

Enable users to export their complete FIRE simulation results as a single spreadsheet file that can be opened in external software (Microsoft Excel, Google Sheets, LibreOffice Calc, Numbers) for:

- **Verification**: Review and validate all calculation results
- **Custom Analysis**: Perform additional manual calculations
- **Record Keeping**: Archive simulation scenarios for future reference
- **Sharing**: Share complete financial plans with advisors or family members

### 1.2 Key Constraints

| Constraint | Rationale |
|------------|-----------|
| **No formulas** | Export contains only computed results to: (1) protect intellectual property by not exposing calculation logic, (2) ensure consistency across different spreadsheet applications, and (3) prevent formula errors or tampering |
| **Single file** | One self-contained file with all data for easy sharing and archiving |
| **Cross-platform** | Must work seamlessly on Windows and macOS |
| **Dynamic charts** | Charts created from exported data (not screenshots) to allow user customization |

### 1.3 Success Metrics

| Metric | Target |
|--------|--------|
| Export completes in | < 3 seconds |
| File opens correctly in Excel | 100% of exports |
| File opens correctly in Google Sheets | 100% of exports |
| Data matches UI | 100% numerical accuracy |
| User satisfaction | ≥ 4.0/5.0 rating |

---

## 2. Background & User Need

### 2.1 User Problem Statement

**Who:** FIRE Planning Tool users (mostly technically-savvy individuals planning early retirement)

**Pain Point:** Users want to:

1. **Verify calculations**: Trust but verify - understand exactly how their FIRE numbers are computed
2. **Compare scenarios**: Export multiple simulation runs with different parameters and compare them side by side in a spreadsheet
3. **Add custom analysis**: Add their own columns, calculations, or annotations on top of the exported data (e.g., track actual vs projected values)
4. **Professional consultation**: Share detailed projections with financial advisors
5. **Documentation**: Keep records of planning assumptions and projections
6. **Offline access**: Review their plan without internet access

> **Note:** Since exports contain calculated values (not formulas), users cannot modify input parameters in the spreadsheet and see recalculated results. For "what-if" analysis, users should run multiple simulations in the app with different parameters and export each scenario for comparison.

**Current Workaround:** Users manually copy numbers from the UI or take screenshots, which is:

- Time-consuming
- Error-prone
- Doesn't capture all the data
- Not suitable for further analysis

### 2.2 User Quotes (Illustrative)

> "I trust the tool, but I want to see the year-by-year breakdown in Excel where I can add my own columns and formulas."

> "My financial advisor uses Excel. I need to send them my complete plan, not just screenshots."

> "I want to compare multiple scenarios side by side - that's easier in a spreadsheet."

### 2.3 User Problem → Feature Traceability

This matrix maps each user problem (Section 2.1) to the specific export features that address it, and identifies any supplementary capabilities needed.

| # | User Problem | Primary Feature(s) | How the User Solves It |
|---|---|---|---|
| 1 | **Verify calculations** | Yearly Projections (Sheet 4), Money Flow Details (Sheet 5), Summary (Sheet 1) | User opens the spreadsheet and cross-checks year-over-year values: e.g., verifying that `PortfolioValue[Y+1] ≈ PortfolioValue[Y] × (1 + return) + contributions - withdrawals - taxes - expenses`. The Money Flow Details sheet breaks each year into individual flow components (growth, contributions, withdrawals, taxes) so the user can manually reconstruct the calculation. A **Methodology Notes** section in the Summary sheet (rows 31+) documents key formulas and assumptions so the user knows *what* to verify. |
| 2 | **Compare scenarios** | Scenario Name + Notes fields (Summary Sheet rows 2-3), User Inputs (Sheet 3), consistent column structure across exports | User runs multiple simulations with different parameters (e.g., 4% vs 5% withdrawal rate), enters a **Scenario Name** (e.g., "Conservative 4%") before each export, and saves each file. In Excel or Google Sheets, the user opens both files, uses VLOOKUP/INDEX on the Year column to align data, and compares Portfolio Value or FIRE Age side by side. The Scenario Name in cell C2 of every export makes files immediately identifiable without opening them (also visible in the filename). |
| 3 | **Add custom analysis** | All data sheets (Sheets 4-9) with clean tabular layout, frozen headers, consistent column structure | User opens the export, adds custom columns (e.g., "Actual Portfolio Value", "Variance"), writes their own formulas referencing the exported data, adds conditional formatting, or creates pivot tables. The bilingual headers and currency columns make it easy to build on top of the data. |
| 4 | **Professional consultation** | Bilingual headers, Summary overview, User Inputs (Sheet 3), Charts (Sheet 2), Methodology Notes | User emails the `.xlsx` file to their financial advisor. The advisor sees: (a) a Summary with key metrics and methodology notes in English, (b) charts for visual overview, (c) all inputs and assumptions in the User Inputs sheet, and (d) detailed year-by-year projections. The **Scenario Name** and optional **Notes** field provide context about which scenario this represents. |
| 5 | **Documentation / record keeping** | Export Date, App Version, Scenario Name, User Inputs (Sheet 3), all data sheets | User exports each major planning milestone with a descriptive **Scenario Name** (e.g., "Jan 2026 - Post Raise", "Feb 2026 - Added RSU") and archives the files. The User Inputs sheet captures all assumptions, and the export date provides a timestamp for when the plan was generated. |
| 6 | **Offline access** | Single self-contained `.xlsx` file | User downloads the file and can review their entire plan — data, charts, inputs, assumptions — without internet access on any device with a spreadsheet application. |

---

## 3. Feature Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | User can export simulation results with one click | Must Have |
| FR-02 | Export includes all user inputs | Must Have |
| FR-03 | Export includes all yearly projection data | Must Have |
| FR-03b | Export includes detailed money flow data (Sankey flows) | Must Have |
| FR-04 | Export includes portfolio composition data | Must Have |
| FR-05 | Export includes planned expenses data | Must Have |
| FR-06 | Export includes RSU data (if configured) | Must Have |
| FR-07 | Export file opens in Microsoft Excel (Windows/Mac) | Must Have |
| FR-08 | Export file opens in Google Sheets | Must Have |
| FR-09 | Export file opens in LibreOffice Calc | Should Have |
| FR-10 | Export file opens in Apple Numbers | Should Have |
| FR-11 | Export includes embedded charts | Should Have |
| FR-12 | User can choose export filename via browser's "Save As" dialog | Should Have |
| FR-13 | User must enter a **Scenario Name** before exporting (appears in Summary sheet and default filename) | Must Have |
| FR-14 | User can enter optional **Scenario Notes** before exporting (free text, appears in Summary sheet) | Should Have |
| FR-15 | Summary sheet includes a **Methodology Notes** section documenting key formulas and assumptions used in the calculation | Should Have |

### 3.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | Export generation time | < 3 seconds |
| NFR-02 | Maximum file size | < 5 MB |
| NFR-03 | Unicode support (Hebrew text) | Full support |
| NFR-04 | Number precision | 2 decimal places for currency and percentages |
| NFR-05 | Date format | ISO 8601 (YYYY-MM-DD) in data, localized in display |
| NFR-06 | Currency | Each monetary value is exported in the **same currency it appears in the UI**. Every monetary cell is accompanied by a dedicated currency column (e.g., `USD` or `ILS`) so users always know which currency a value is in. No implicit conversions are applied during export. |

---

## 4. Data Specification

### 4.1 Currency Convention

> **Important:** Every monetary value in the export is shown in the **same currency it appears in the UI** at the time of export. Each monetary value has a **dedicated currency column** in an adjacent cell (e.g., `USD` or `ILS`) so the user always knows which currency a number represents. No implicit currency conversions are performed during export — values that the UI shows in USD are exported in USD, and values the UI shows in ILS are exported in ILS.
>
> **Currency column pattern:** For every monetary column `X`, there is an adjacent column `X (מטבע)` / `X (Currency)` containing the ISO 4217 currency code (`USD` or `ILS`). In row-oriented tables (e.g., Summary, User Inputs), the currency code appears in the cell immediately to the right of the value cell.
>
> The USD/ILS exchange rate used by the UI is recorded in the User Inputs sheet for reference.

### 4.2 Sheet Structure

The export file will contain multiple sheets (tabs) organized as follows:

| Sheet # | Sheet Name (English) | Sheet Name (Hebrew) | Content |
|---------|---------------------|---------------------|---------|
| 1 | Summary | סיכום | Key metrics, timeline milestones, and assumptions |
| 2 | Charts | גרפים | Embedded charts (visual learners see these first) |
| 3 | User Inputs | פרמטרים | All user-entered values |
| 4 | Yearly Projections | תחזית שנתית | Core year-by-year simulation data |
| 5 | Money Flow Details | פירוט תזרים | Detailed Sankey flow data (for advanced users) |
| 6 | Accumulation Portfolio | תיק צבירה | Asset details, allocation, and totals |
| 7 | Retirement Portfolio | תיק פרישה | Retirement allocation and totals (if different) |
| 8 | Planned Expenses | הוצאות מתוכננות | Expense schedule with totals summary |
| 9 | RSU Details | פרטי RSU | RSU grants and projections (if applicable) |

### 4.3 Sheet 1: Summary (סיכום)

**Layout:** Four columns — A: Field (Hebrew), B: Field (English), C: Value, D: Currency (מטבע).
Column D contains the ISO 4217 currency code (`USD` or `ILS`) for every monetary row, and is left blank for non-monetary rows (dates, percentages, counts, years).

| Row | Col A (Hebrew) | Col B (English) | Col C: Value / Source | Col D: Currency |
|-----|---------------|-----------------|----------------------|-----------------|
| 1 | תאריך יצוא | Export Date | System timestamp | — |
| 2 | שם תרחיש | Scenario Name | `options.scenarioName` (user-entered; required) | — |
| 3 | הערות תרחיש | Scenario Notes | `options.scenarioNotes` (user-entered; empty if not provided) | — |
| 4 | גרסת התוכנה | App Version | From package.json | — |
| 5 | --- | --- | Separator | — |
| 6 | **מדדים עיקריים** | **Key Metrics** | Header | — |
| 7 | שווי נוכחי | Current Portfolio Value | `result.currentValue` | Same as UI |
| 8 | שווי שיא הצבירה | Peak Portfolio Value | `result.peakValue` | Same as UI |
| 9 | שווי נטו (אחרי מס) | Net Peak Value | `result.grossPeakValue - result.retirementTaxToPay` | Same as UI |
| 10 | סה"כ הפקדות | Total Contributions | `result.totalContributions` | Same as UI |
| 11 | משיכה שנתית ברוטו | Gross Annual Withdrawal | `result.grossAnnualWithdrawal` | Same as UI |
| 12 | הוצאה חודשית נטו | Net Monthly Expense | `result.netMonthlyExpense` | Same as UI |
| 13 | מס בפרישה | Tax at Retirement | `result.retirementTaxToPay` | Same as UI |
| 14 | שווי סופי | End Portfolio Value | `result.endValue` | Same as UI |
| 15 | גיל FIRE | FIRE Age Reached | `result.fireAgeReached` (calculated as `earlyRetirementYear - birthYear`) | — |
| 16 | --- | --- | Separator | — |
| 17 | **תשואות** | **Returns** | Header | — |
| 18 | תשואה משוקללת צבירה | Accumulation Weighted Return | `result.accumulationWeightedReturn` | — (%) |
| 19 | תשואה משוקללת פרישה | Retirement Weighted Return | `result.retirementWeightedReturn` | — (%) |
| 20 | --- | --- | Separator | — |
| 21 | **סיכום RSU** | **RSU Summary** | Header (only if RSU configured) | — |
| 22 | שווי RSU בפרישה | RSU Value at Retirement | `result.totalRsuValueAtRetirement` | Same as UI |
| 23 | תמורה נטו RSU | RSU Net Proceeds | `result.totalRsuNetProceeds` | Same as UI |
| 24 | מס RSU ששולם | RSU Taxes Paid | `result.totalRsuTaxesPaid` | Same as UI |
| 25 | --- | --- | Separator | — |
| 26 | **ציר זמן** | **Timeline** | Header | — |
| 27 | שנה נוכחית | Current Year | System current year | — |
| 28 | שנת פרישה מוקדמת | Early Retirement Year | `input.earlyRetirementYear` | — |
| 29 | גיל בפרישה | Age at Retirement | Calculated: `earlyRetirementYear - birthYear` | — |
| 30 | שנים עד פרישה | Years Until Retirement | Calculated: `earlyRetirementYear - currentYear` | — |
| 31 | שנת פרישה מלאה | Full Retirement Year | Calculated: `birthYear + fullRetirementAge` | — |
| 32 | שנות בפרישה | Years in Retirement | Calculated: `fullRetirementYear - earlyRetirementYear` | — |
| 33 | --- | --- | Separator | — |
| 34 | **מתודולוגיה והנחות** | **Methodology & Assumptions** | Header | — |
| 35 | מודל צמיחת תיק | Portfolio Growth Model | "Weighted return per asset using selected strategy (CAGR / Total Growth / Target Price)" | — |
| 36 | מודל אינפלציה | Inflation Model | "Constant annual rate applied to withdrawals and expenses" | — |
| 37 | חישוב משיכה | Withdrawal Calculation | "Withdrawal % × Portfolio Value at start of retirement, then inflation-adjusted each year" | — |
| 38 | חישוב מס | Tax Model | "Israeli capital gains tax on real gains (cost-basis adjusted). RSU: Section 102 marginal + optional 3% surtax" | — |
| 39 | הערה | Note | "All values are projections based on the assumptions above. Past performance does not guarantee future results." | — |

> **Currency rule:** "Same as UI" means the value is exported in whichever currency it appears in the application UI, and the corresponding ISO 4217 code is placed in Column D.

### 4.4 Sheet 2: Charts (גרפים)

**Position rationale:** Charts are placed as Sheet 2 (immediately after Summary) because many users prefer visual overview before diving into detailed data tables.

See **Section 6: Dynamic Charts** for detailed chart specifications.

**Quick reference:**
| Chart # | Chart Title | Type |
|---------|------------|------|
| 1+2 | Portfolio Growth + Contributions | Line (overlay) |
| 3 | Annual Withdrawals | Bar |
| 4 | Accumulation Portfolio Composition | Donut |
| 5 | Retirement Portfolio Composition | Donut |
| 6 | Planned Expenses by Year | Bar (stacked) |
| 7 | RSU Value Over Time | Line (if applicable) |

### 4.5 Sheet 3: User Inputs (פרמטרים)

**Layout:** Four columns — A: Field (Hebrew), B: Field (English), C: Value, D: Currency (מטבע).
Column D contains the ISO 4217 currency code for monetary rows and is blank for non-monetary rows.

| Row | Col A (Hebrew) | Col B (English) | Col C: Value / Source | Col D: Currency |
|-----|---------------|-----------------|----------------------|-----------------|
| 1 | **פרטים אישיים** | **Personal Details** | Header | — |
| 2 | שנת לידה | Birth Year | `input.birthYear` | — |
| 3 | תאריך לידה | Birth Date | `input.birthDate` | — |
| 4 | --- | --- | Separator | — |
| 5 | **ציר זמן פרישה** | **Retirement Timeline** | Header | — |
| 6 | שנת פרישה מוקדמת | Early Retirement Year | `input.earlyRetirementYear` | — |
| 7 | גיל פרישה מלאה | Full Retirement Age | `input.fullRetirementAge` | — |
| 8 | --- | --- | Separator | — |
| 9 | **פרמטרים פיננסיים** | **Financial Parameters** | Header | — |
| 10 | הפקדה חודשית | Monthly Contribution | `input.monthlyContribution` | Same as UI |
| 11 | מטבע הצגה | Display Currency | `input.currency` | — |
| 12 | שער USD/ILS | USD/ILS Rate | `options.usdIlsRate` (live rate at time of export) | — |
| 13 | אחוז משיכה | Withdrawal Rate | `input.withdrawalRate` | — (%) |
| 14 | אחוז אינפלציה | Inflation Rate | `input.inflationRate` | — (%) |
| 15 | מס רווח הון | Capital Gains Tax | `input.capitalGainsTax` | — (%) |
| 16 | בסיס מס | Tax Basis | `input.taxBasis` | — |
| 17 | --- | --- | Separator | — |
| 18 | **פנסיה** | **Pension** | Header | — |
| 19 | פנסיה חודשית נטו | Net Monthly Pension | `input.pensionNetMonthly` | Same as UI |
| 20 | --- | --- | Separator | — |
| 21 | **אסטרטגיה** | **Strategy** | Header | — |
| 22 | אסטרטגיית השקעה | Investment Strategy | `input.investmentStrategy` | — |
| 23 | שימוש בתיק פרישה | Use Retirement Portfolio | `input.useRetirementPortfolio` | — |
| 24 | כלול RSU בחישובים | Include RSU | `input.includeRsuInCalculations` | — |

### 4.6 Sheet 4: Yearly Projections (תחזית שנתית)

**Core columns for easy navigation. Detailed flow data is in the Money Flow Details sheet.**

**Columns:**

Each monetary column is exported in the **same currency shown in the UI** and is immediately followed by a currency column containing the ISO 4217 code. Non-monetary columns (Year, Age, Phase, share counts) have no currency column.

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | שנה | Year | `yearlyData[].year` |
| B | גיל | Age | Calculated: `year - birthYear` |
| C | שלב | Phase | `yearlyData[].phase` (צבירה/פרישה) |
| D | שווי תיק | Portfolio Value | `yearlyData[].portfolioValue` |
| E | מטבע | Currency | Currency code for column D (same as UI) |
| F | סה"כ הפקדות | Total Contributions | `yearlyData[].totalContributions` |
| G | מטבע | Currency | Currency code for column F |
| H | משיכה שנתית | Annual Withdrawal | `yearlyData[].annualWithdrawal` |
| I | מטבע | Currency | Currency code for column H |
| J | מס על משיכה | Withdrawal Tax | Tax on the annual retirement withdrawal **[Prerequisite: Split `flowData.capitalGainsTax` — see Section 12.1 Phase 0]** |
| K | מטבע | Currency | Currency code for column J |
| L | מס על הוצאות | Expense Tax | Tax on planned expense withdrawals **[Prerequisite: Split `flowData.capitalGainsTax` — see Section 12.1 Phase 0]** |
| M | מטבע | Currency | Currency code for column L |
| N | סה"כ מס רווח הון | Total Capital Gains Tax | `yearlyData[].flowData?.capitalGainsTax` (sum of columns J + L) |
| O | מטבע | Currency | Currency code for column N |
| P | הכנסה מפנסיה | Pension Income | `yearlyData[].flowData?.pensionIncome` |
| Q | מטבע | Currency | Currency code for column P |
| R | הוצאות מתוכננות | Planned Expenses | `yearlyData[].flowData?.plannedExpenses` (inflation-adjusted total for the year) |
| S | מטבע | Currency | Currency code for column R |
| T | מניות RSU שהבשילו | RSU Shares Vested | `yearlyData[].rsuSharesVested` |
| U | מניות RSU שנמכרו | RSU Shares Sold | `yearlyData[].rsuSharesSold` |
| V | תמורת מכירת RSU | RSU Sale Proceeds | `yearlyData[].rsuSaleProceeds` |
| W | מטבע | Currency | Currency code for column V |
| X | מס RSU | RSU Tax Paid | `yearlyData[].rsuTaxesPaid` |
| Y | מטבע | Currency | Currency code for column X |
| Z | שווי אחזקות RSU | RSU Holdings Value | `yearlyData[].rsuHoldingsValue` (value of vested but unsold RSUs) |
| AA | מטבע | Currency | Currency code for column Z |

> **Implementation Note:** Currently `flowData.capitalGainsTax` stores the combined tax for both withdrawals and expenses. To populate columns J and L separately, `RetirementPhaseCalculator` must expose the individual components (withdrawal tax and expense tax) as new fields on `SankeyFlowData`. Column N remains the existing total. **This is a prerequisite backend change tracked in Phase 0 of the timeline (Section 12.1).**

**Row Count:** One row per year from current year to retirement end year (typically 40-60 rows)

### 4.7 Sheet 5: Money Flow Details (פירוט תזרים)

**Detailed Sankey flow data for advanced users who want to understand money movement.**

Each monetary column is followed by a currency column containing the ISO 4217 code matching the UI display currency for that value.

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | שנה | Year | `yearlyData[].year` |
| B | שלב | Phase | `yearlyData[].flowData?.phase` |
| C | הפקדות | Contributions | `yearlyData[].flowData?.monthlyContributions` |
| D | מטבע | Currency | Currency code for column C |
| E | צמיחה | Portfolio Growth | `yearlyData[].flowData?.portfolioGrowth` |
| F | מטבע | Currency | Currency code for column E |
| G | תמורת RSU | RSU Net Proceeds | `yearlyData[].flowData?.rsuNetProceeds` |
| H | מטבע | Currency | Currency code for column G |
| I | מס רווח הון | Capital Gains Tax | `yearlyData[].flowData?.capitalGainsTax` |
| J | מטבע | Currency | Currency code for column I |
| K | הוצאות מתוכננות | Planned Expenses | `yearlyData[].flowData?.plannedExpenses` |
| L | מטבע | Currency | Currency code for column K |
| M | משיכות פרישה | Retirement Withdrawals | `yearlyData[].flowData?.retirementWithdrawals` |
| N | מטבע | Currency | Currency code for column M |
| O | מס איזון מחדש | Rebalancing Tax | `yearlyData[].flowData?.retirementRebalancingTax` |
| P | מטבע | Currency | Currency code for column O |
| Q | הכנסה מפנסיה | Pension Income | `yearlyData[].flowData?.pensionIncome` |
| R | מטבע | Currency | Currency code for column Q |
| S | שנת פרישה | Is Retirement Year | `yearlyData[].flowData?.isRetirementYear` (boolean) |

### 4.8 Sheet 6: Accumulation Portfolio (תיק צבירה)

**Columns:**

Each monetary column is exported in the **same currency shown in the UI** and is immediately followed by a currency column. Price-related columns (Current Price, Average Cost, Target Price) use the asset's native currency; value columns (Market Value, Cost Basis, Gain/Loss) use whichever currency the UI displays them in.

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | סמל | Symbol | `portfolioAsset.symbol` |
| B | שם | Name | `portfolioAsset.name` (populated from `etf-names.json` lookup in API response; fallback: symbol) |
| C | כמות | Quantity | `portfolioAsset.quantity` |
| D | מחיר נוכחי | Current Price | `portfolioAsset.currentPrice` |
| E | מטבע מחיר | Price Currency | `portfolioAsset.currentPrice.currency` (ISO 4217) |
| F | עלות ממוצעת | Average Cost | `portfolioAsset.averageCost` |
| G | מטבע עלות | Cost Currency | Same as column E (asset's native currency) |
| H | שווי שוק | Market Value | `quantity × currentPrice` |
| I | מטבע שווי | Value Currency | Currency as shown in UI for this value |
| J | בסיס עלות | Cost Basis | `quantity × averageCost` |
| K | מטבע בסיס | Basis Currency | Same as column I |
| L | רווח/הפסד | Gain/Loss | Market Value - Cost Basis |
| M | מטבע רווח | G/L Currency | Same as column I |
| N | אחוז מהתיק | % of Portfolio | Calculated |
| O | שיטת תשואה | Return Method | `portfolioAsset.method` ("CAGR", "TotalGrowth", "TargetPrice") |
| P | פרמטר תשואה | Return Parameter | Derived based on method (see note below) |
| Q | מחיר יעד | Target Price | Only if method="TargetPrice" → `value1`; else empty |
| R | מטבע מחיר יעד | Target Currency | Same as column E (only if Target Price populated) |

> **Return Parameter Note (Column P):** 
> - If method="CAGR": Shows `value1` as "X years" (historical CAGR period)
> - If method="TotalGrowth": Shows `value1` as "X%" (expected annual return)
> - If method="TargetPrice": Shows `value2` as "X years" (years to reach target)

**Totals Row (at bottom):**

| Row | A | H | I | J | K | L | M | N | P |
|-----|---|---|---|---|---|---|---|---|---|
| **סה"כ** | TOTAL | Sum of Market Values | Currency | Sum of Cost Basis | Currency | Sum of Gain/Loss | Currency | 100% | Weighted Avg Return |

### 4.9 Sheet 7: Retirement Portfolio (תיק פרישה)

**Same structure as Sheet 6 (Accumulation Portfolio)**, populated with `retirementPortfolio` data, including totals row.

If user hasn't configured a separate retirement portfolio, this sheet shows the retirement allocation percentages:

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | קטגוריה | Category | `allocation.assetType` |
| B | אחוז יעד | Target Percentage | `allocation.targetPercentage` |
| C | תשואה צפויה | Expected Return | `allocation.expectedAnnualReturn` |
| D | תיאור | Description | `allocation.description` |

### 4.10 Sheet 8: Planned Expenses (הוצאות מתוכננות)

**Columns:**

Each expense amount is exported in the **same currency it appears in the UI**, with a dedicated currency column next to each monetary value.

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | סוג הוצאה | Expense Type | `expense.type` (e.g., "Car", "House", "Vacation") |
| B | שנה | Year | `expense.year` |
| C | סכום נטו | Net Amount | `expense.netAmount` |
| D | מטבע | Currency | Currency code for column C (same as UI) |
| E | תדירות (שנים) | Frequency (Years) | `expense.frequencyYears` (1=one-time, 2=every 2 years, etc.) |
| F | מספר חזרות | Repetition Count | `expense.repetitionCount` |
| G | סה"כ השפעה | Total Impact | Calculated: `amount × repetitionCount` |
| H | מטבע | Currency | Currency code for column G (same as UI) |

**Summary Rows (at bottom, separated by empty row):**

| Row | Field (Hebrew) | Field (English) | Calculation | Currency |
|-----|---------------|-----------------|-------------|----------|
| --- | --- | --- | Empty separator row | — |
| סיכום | **סיכום הוצאות** | **Expenses Summary** | Header | — |
| 1 | הוצאות חד פעמיות | One-Time Expenses | Sum where `frequencyYears=1 AND repetitionCount=1` | Same as UI |
| 2 | הוצאות חוזרות | Recurring Expenses Total | Sum of all `amount × repetitionCount` for recurring | Same as UI |
| 3 | **סה"כ כל ההוצאות** | **Grand Total** | Sum of column G (Total Impact) | Same as UI |

> **Note:** If expenses span multiple currencies in the UI, each row retains its own currency. Summary totals are grouped by currency — one total row per currency present.

### 4.11 Sheet 9: RSU Details (פרטי RSU)

**Only included if `input.rsuConfiguration` exists**

> **Currency Note:** All RSU monetary values are exported in the **same currency they appear in the UI**. Each monetary value has a dedicated currency column next to it. RSU values typically appear in USD in the UI since RSUs are US-traded securities, but the export does not force any currency — it mirrors the UI exactly.

**Section A: RSU Configuration**

| Row | Col A (Hebrew) | Col B (English) | Col C: Value / Source | Col D: Currency |
|-----|---------------|-----------------|----------------------|-----------------|
| 1 | **הגדרות RSU** | **RSU Settings** | Header | — |
| 2 | סמל מניה | Stock Symbol | `rsuConfig.stockSymbol` | — |
| 3 | מחיר נוכחי | Current Price Per Share | `rsuConfig.currentPricePerShare` | Same as UI |
| 4 | תשואה צפויה | Expected Return | `rsuConfig.expectedAnnualReturn` | — (%) |
| 5 | שיטת תשואה | Return Method | `rsuConfig.returnMethod` ("CAGR" or "Fixed") | — |
| 6 | תקופת הבשלה ברירת מחדל | Default Vesting Period | `rsuConfig.defaultVestingPeriodYears` (years) | — |
| 7 | שיעור מס שולי | Marginal Tax Rate | `rsuConfig.marginalTaxRate` (%) | — |
| 8 | חייב במס 3% | Subject to 3% Surtax | `rsuConfig.subjectTo3PercentSurtax` | — |
| 9 | אסטרטגיית מכירה | Liquidation Strategy | `rsuConfig.liquidationStrategy` | — |

**Section B: RSU Grants Table**

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | תאריך הקצאה | Grant Date | `grant.grantDate` |
| B | מספר מניות | Number of Shares | `grant.numberOfShares` |
| C | מחיר בהקצאה | Price at Grant | `grant.priceAtGrant` |
| D | מטבע | Currency | Currency code for column C (same as UI) |
| E | תקופת הבשלה | Vesting Period | `grant.vestingPeriodYears` |
| F | סוג הבשלה | Vesting Type | `grant.vestingType` (Standard/Cliff/Custom) |
| G | שנה ראשונה | First Vesting Year | Calculated |
| H | תאריך זכאות 102 | Section 102 Eligible | `grant.section102EligibleDate` |

**Section C: RSU Timeline (from rsuTimeline[])**

| Column | Header (Hebrew) | Header (English) | Source |
|--------|----------------|------------------|--------|
| A | שנה | Year | `rsuYearlyData.year` |
| B | מניות שהבשילו | Shares Vested | `rsuYearlyData.sharesVested` |
| C | מניות שנמכרו | Shares Sold | `rsuYearlyData.sharesSold` |
| D | מניות מוחזקות | Shares Held | `rsuYearlyData.sharesHeld` (vested but not sold) |
| E | מניות שאבדו | Shares Forfeited | `rsuYearlyData.sharesForfeited` (unvested at retirement) |
| F | מחיר מניה | Stock Price | `rsuYearlyData.projectedStockPrice` |
| G | מטבע מחיר | Price Currency | Currency code for column F (same as UI) |
| H | שווי שוק | Market Value | `rsuYearlyData.marketValue` |
| I | מטבע שווי | Value Currency | Currency code for column H |
| J | שווי אבוד | Forfeited Value | `rsuYearlyData.forfeitedValue` |
| K | מטבע | Currency | Currency code for column J |
| L | תמורה ברוטו | Gross Proceeds | `rsuYearlyData.grossSaleProceeds` |
| M | מטבע | Currency | Currency code for column L |
| N | מס | Tax Paid | `rsuYearlyData.taxesPaid` |
| O | מטבע | Currency | Currency code for column N |
| P | תמורה נטו | Net Proceeds | `rsuYearlyData.netSaleProceeds` |
| Q | מטבע | Currency | Currency code for column P |

**Section D: RSU Summary (from result.rsuSummary)**

| Row | Col A (Hebrew) | Col B (English) | Col C: Value / Source | Col D: Currency |
|-----|---------------|-----------------|----------------------|-----------------|
| 1 | **סיכום RSU** | **RSU Summary** | Header | — |
| 2 | סה"כ מניות שהוקצו | Total Shares Granted | `rsuSummary.totalSharesGranted` | — |
| 3 | מניות שהבשילו | Total Shares Vested | `rsuSummary.totalSharesVested` | — |
| 4 | מניות שטרם הבשילו | Total Shares Unvested | `rsuSummary.totalSharesUnvested` | — |
| 5 | מניות מוחזקות | Total Shares Held | `rsuSummary.totalSharesHeld` | — |
| 6 | מניות שנמכרו | Total Shares Sold | `rsuSummary.totalSharesSold` | — |
| 7 | מניות שאבדו | Total Shares Forfeited | `rsuSummary.totalSharesForfeited` | — |
| 8 | שווי שוק נוכחי | Current Market Value | `rsuSummary.currentMarketValue` | Same as UI |
| 9 | סה"כ תמורה | Total Proceeds To Date | `rsuSummary.totalProceedsToDate` | Same as UI |
| 10 | סה"כ מס ששולם | Total Taxes Paid | `rsuSummary.totalTaxesPaid` | Same as UI |
| 11 | שווי אבוד | Forfeited Value | `rsuSummary.forfeitedValue` | Same as UI |
| 12 | אחוז אבוד | Forfeiture Percentage | `rsuSummary.forfeiturePercentage` (%) | — |

---

## 5. File Format & Compatibility

### 5.1 Primary Format: XLSX

**Rationale:**

- Universal compatibility with Excel, Google Sheets, LibreOffice, Numbers
- Supports multiple sheets
- Supports embedded charts
- Supports Unicode (Hebrew)
- Compact file size with compression
- No external dependencies for viewing

**NOT CSV because:**

- Cannot have multiple sheets
- No chart support
- Character encoding issues with Hebrew
- No formatting/structure

### 5.2 Compatibility Matrix

| Software | Platform | Compatibility | Notes |
|----------|----------|---------------|-------|
| Microsoft Excel 2016+ | Windows | ✅ Full | Primary target |
| Microsoft Excel 2019+ | macOS | ✅ Full | Primary target |
| Microsoft Excel Online | Web | ✅ Full | Via OneDrive/SharePoint |
| Google Sheets | Web | ✅ Full | Upload or Drive integration |
| LibreOffice Calc 7.0+ | Windows/macOS/Linux | ✅ Full | Open source alternative |
| Apple Numbers 11+ | macOS/iOS | ⚠️ Partial | Data and sheets supported; XLSX charts may not render (Numbers converts to native format) |
| WPS Office | Windows/macOS | ✅ Full | Free alternative |

### 5.3 File Naming Convention

**Default filename pattern:**

If a Scenario Name is provided:
```text
FIRE_Plan_{ScenarioName}_{YYYY-MM-DD}_{HH-mm}.xlsx
```

If no Scenario Name:
```text
FIRE_Plan_Export_{YYYY-MM-DD}_{HH-mm}.xlsx
```

**Examples:**

```text
FIRE_Plan_Conservative_4pct_2026-01-28_14-30.xlsx
FIRE_Plan_Export_2026-01-28_14-30.xlsx
```

> **Note:** The Scenario Name in the filename is sanitized: spaces → underscores, special characters removed, truncated to 50 chars.

**User can modify** the filename before saving.

### 5.4 CSV Export Format (Alternative Fallback)

While the primary export format is XLSX, a CSV fallback option may be provided for compatibility with simpler tools. If implemented, the CSV export should follow this specification:

**CSV Export Format Specification:**

| Column | Field | Format | Example |
|--------|-------|--------|---------|
| A | Year | YYYY | 2026 |
| B | Age | Integer | 32 |
| C | Portfolio Value | Decimal (2 places) | 150000.00 |
| D | Contributions (YTD) | Decimal (2 places) | 60000.00 |
| E | Withdrawals | Decimal (2 places) | 0.00 |
| F | Planned Expenses | Decimal (2 places) | 0.00 |
| G | Net Annual Expense | Decimal (2 places) | 0.00 |
| H | Phase | Text | Accumulation/Retirement |
| I | Currency | Code | USD/ILS |

**Example CSV:**
```csv
Year,Age,Portfolio Value,Contributions,Withdrawals,Expenses,Net Expense,Phase,Currency
2026,32,150000.00,60000.00,0.00,0.00,0.00,Accumulation,USD
2027,33,217050.00,120000.00,0.00,0.00,0.00,Accumulation,USD
2045,50,2500000.00,1200000.00,96000.00,0.00,96000.00,Retirement,USD
```

**CSV Format Details:**
- **Date Format:** All dates in ISO 8601 (YYYY-MM-DD)
- **Currency:** Symbol excluded, code only (USD/ILS)
- **Decimal Precision:** 2 places for all monetary values
- **Character Encoding:** UTF-8 with BOM for Excel compatibility
- **Delimiter:** Comma (`,`)
- **Text Qualifier:** Double quotes (`"`) when needed
- **Line Ending:** CRLF (Windows-style) for maximum compatibility

**CSV Limitations:**
- Single sheet only (no multi-sheet support)
- No charts or visualizations
- No Hebrew text (may have encoding issues)
- No cell formatting or colors
- Users must manually import into spreadsheet applications

### 5.5 Encoding & Localization

| Aspect | Specification |
|--------|---------------|
| Text encoding | UTF-8 |
| Sheet names | Hebrew with English fallback |
| Column headers | Bilingual (Hebrew primary, English in parentheses) |
| Number format | Locale-aware with 2 decimal places |
| Currency values | Numeric only — **no currency symbol embedded** in the value cell (e.g., `1234.56` not `$1,234.56`) |
| Currency identification | Each monetary value has a **separate adjacent cell** containing the ISO 4217 currency code (`USD` or `ILS`) |
| Currency source | Every value is exported in the **same currency it appears in the UI** — no implicit conversions |
| Dates | ISO 8601 in data cells, localized in display |
| RTL support | Cell alignment right-to-left for Hebrew text |
| Locale | Number formatting follows locale conventions (thousands separator, decimal point) |

---

## 6. Dynamic Charts in Export

### 6.1 Chart Requirements

Charts must be **embedded in the Excel file** and created from the exported data (not screenshots), allowing users to:

- Modify colors and styles
- Add/remove data series
- Resize and reposition
- Print in high quality

### 6.2 Included Charts

| Chart # | Type | Title (Hebrew) | Data Source | Description |
|---------|------|---------------|-------------|-------------|
| 1 | Line Chart | צמיחת התיק לאורך זמן | Yearly Projections sheet | Portfolio value over time with retirement year marker |
| 2 | Line Chart (overlay) | הפקדות מצטברות | Yearly Projections sheet | Cumulative contributions overlaid on Chart 1 (dashed line) |
| 3 | Bar Chart | משיכות שנתיות | Yearly Projections sheet | Annual withdrawals during retirement phase only |
| 4 | Donut | הרכב תיק צבירה | Accumulation Portfolio sheet | Current portfolio allocation by asset (% of total) |
| 5 | Donut | הרכב תיק פרישה | Retirement Portfolio sheet | Retirement allocation by category (% of total) |
| 6 | Bar Chart | הוצאות מתוכננות | Planned Expenses sheet | Expenses grouped by year (stacked if multiple per year) |
| 7 | Line Chart | שווי RSU לאורך זמן | RSU Details sheet | RSU holdings value over time (only if RSU configured) |

### 6.3 Chart 1+2: Portfolio Growth + Contributions (צמיחת התיק + הפקדות)

```text
Chart Type: Combination (Line + Area)
X-Axis: Years (Column A from Yearly Projections)
Y-Axis: Value (currency as shown in UI; axis label includes currency code)

Series:
1. Portfolio Value (Solid Line, Blue #3b82f6, 2px)
2. Total Contributions (Dashed Line, Green #22c55e, area fill with 20% opacity)

Annotations:
- Vertical dashed line at Early Retirement Year (Red #ef4444)
- Phase labels: "צבירה" (Accumulation) left of line / "פרישה" (Retirement) right of line
```

### 6.4 Chart 3: Annual Withdrawals (משיכות שנתיות)

```text
Chart Type: Bar Chart (vertical)
X-Axis: Years (retirement phase only)
Y-Axis: Withdrawal amount (currency as shown in UI; axis label includes currency code)

Series:
1. Annual Withdrawal (Bar, Orange #f97316)

Note: Only shows years where phase = "Retirement" and annualWithdrawal > 0
```

### 6.5 Chart 4: Accumulation Portfolio Composition (הרכב תיק צבירה)

```text
Chart Type: Donut
Data: Symbol + Market Value from Accumulation Portfolio sheet
Colors: Consistent with app palette (rotating series)

Labels: Symbol + Percentage (e.g., "VOO 45%")
Center Label: Total portfolio value
```

### 6.6 Chart 5: Retirement Portfolio Composition (הרכב תיק פרישה)

```text
Chart Type: Donut
Data: AssetType + Target Percentage from Retirement Portfolio sheet
Colors: Consistent with accumulation donut palette

Labels: Category + Percentage (e.g., "מניות 60%")
Note: Shows allocation-based if no separate retirement portfolio is defined
```

### 6.7 Chart 6: Planned Expenses (הוצאות מתוכננות)

```text
Chart Type: Stacked Bar Chart (vertical)
X-Axis: Years (only years with expenses)
Y-Axis: Expense amount (currency as shown in UI; axis label includes currency code)

Series: One series per expense type (stacked if multiple expenses in same year)
Colors: Different color per expense type

Note: If no expenses configured, chart is omitted
```

### 6.8 Chart 7: RSU Value Over Time (שווי RSU לאורך זמן)

```text
Chart Type: Line Chart
X-Axis: Years (from RSU Timeline section)
Y-Axis: Value (currency as shown in UI; axis label includes currency code)

Series:
1. Market Value (Solid Line, Purple #8b5cf6, 2px)
2. Cumulative Net Proceeds (Dashed Line, Teal #14b8a6, 2px)

Annotations:
- Vertical dashed line at Early Retirement Year

Note: Only included if RSU is configured. Values in same currency as UI.
```

### 6.9 Chart Placement

All charts placed on the **"גרפים" (Charts) sheet** in a grid layout:

```text
┌─────────────────────────────────────────────────────────────┐
│  Chart 1+2: Portfolio Growth +          Chart 4: Accumulation│
│  Contributions (overlay)                Portfolio Donut      │
│  (Wide, 600x400 px)                     (Square, 350x350)   │
├─────────────────────────────────────────────────────────────┤
│  Chart 3: Withdrawals                   Chart 5: Retirement │
│  (Wide, 600x300 px)                     Portfolio Donut     │
├─────────────────────────────────────────────────────────────┤
│  Chart 6: Expenses                      Chart 7: RSU Value  │
│  (Wide, 600x300 px)                     (if applicable)     │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. User Interface

### 7.1 Export Button Location

Primary location: **Results Tab** (after calculation is complete)

```text
┌─────────────────────────────────────────────────────────────────┐
│  שם תרחיש (Scenario Name):  [ _____________________________ ] │
│  הערות (Notes):              [ _____________________________ ] │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  💾 שמור תוכנית  │  │  📊 ייצוא לאקסל │  ← NEW BUTTON        │
│  └─────────────────┘  └─────────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

**Scenario Name Input:**
- Optional text field (max 100 characters)
- Placeholder text: `"למשל: תרחיש שמרני 4%"` (e.g., "Conservative 4%")
- Value is included in the Summary sheet (row 2) and default filename
- Persists across exports during the session (not cleared after export)

**Notes Input:**
- Optional free-text field (max 500 characters)
- Placeholder text: `"הערות לתרחיש זה..."` (Notes for this scenario...)
- Value is included in the Summary sheet (row 3)

**Button States:**

| State | Condition | Appearance |
|-------|-----------|------------|
| Disabled | No calculation has been run yet | Grayed out, `cursor-not-allowed`, tooltip: "נא לבצע חישוב קודם" |
| Enabled | Calculation results exist | Green button, clickable |
| Loading | Export in progress | Spinner, disabled, text: "מייצא..." |

### 7.2 Button Design

```html
<button id="exportToExcel" class="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg flex items-center gap-2">
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <!-- Excel/Spreadsheet icon -->
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
          d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
  </svg>
  ייצוא לאקסל
</button>
```

### 7.3 Export Flow

```text
User clicks "ייצוא לאקסל"
         ↓
    Validation Check
    (Is calculation complete?)
         ↓
    ┌────NO────┐
    ↓          ↓
Show Error   Collect Scenario Name
"נא לבצע     + Notes (from inputs)
 חישוב קודם"       ↓
              Generate XLSX
              (show spinner)
                   ↓
              Browser Download
              Dialog Opens
                   ↓
              User saves file
                   ↓
              Success Toast:
              "הקובץ יוצא בהצלחה"
```

### 7.4 Loading State

```html
<button disabled class="...opacity-50 cursor-not-allowed">
  <svg class="animate-spin w-5 h-5" ...><!-- Spinner --></svg>
  מייצא...
</button>
```

### 7.5 Error States

| Condition | Error Message (Hebrew) |
|-----------|----------------------|
| No calculation run | נא לבצע חישוב לפני הייצוא |
| Export generation failed | שגיאה ביצירת הקובץ. נא לנסות שוב |
| Browser doesn't support download | הדפדפן אינו תומך בהורדת קבצים |

---

## 8. Technical Implementation

### 8.1 Architecture Decision: Server-Side Export

**Decision:** Use a **server-side (.NET) export** for full XLSX generation with charts, falling back to a lightweight client-side data-only export.

**Primary: Server-Side Export (ClosedXML)**

| Criteria | ClosedXML | ExcelJS (client) | SheetJS (client) |
|----------|-----------|-------------------|-------------------|
| Chart support | ✅ Full native Excel charts | ⚠️ Limited (basic) | ❌ No |
| Chart annotations | ✅ Full (FIRE age line, etc.) | ❌ No | ❌ No |
| Dual-axis charts | ✅ Yes | ⚠️ Partial | ❌ No |
| Multiple sheets | ✅ Yes | ✅ Yes | ✅ Yes |
| Styling & RTL | ✅ Full | ✅ Full | ✅ Full |
| Bundle impact | ✅ None (server-side) | ⚠️ 1.2 MB | 400 KB |
| .NET integration | ✅ Native | ❌ N/A | ❌ N/A |

**Rationale:**
- Full Excel chart fidelity (annotations, dual axes, donut center labels) — not achievable with client-side libraries
- No increase in frontend bundle size (package.json has zero runtime dependencies)
- Consistent with existing ASP.NET Core stack
- Charts render natively in Excel, Google Sheets, and LibreOffice
- The server already has all calculation results in memory after `Calculate()`

**Fallback: Client-Side CSV Export**
- If the server endpoint is unreachable, offer a CSV fallback (see Section 5.4)
- No charts, but preserves core data export functionality

### 8.2 Server-Side Implementation

**New NuGet package:** `ClosedXML` (MIT license)

**New files:**
- `src/Services/ExcelExportService.cs` — Core export logic implementing `IExcelExportService`
- `src/Services/IExcelExportService.cs` — Interface
- `src/Controllers/ExportController.cs` — API endpoint

**Frontend integration file:** `wwwroot/ts/services/export-service.ts`

```typescript
import type { FireCalculationResult, FirePlanInput } from '../types/index.js';

export interface ExportOptions {
  filename?: string;
  scenarioName: string;     // User-entered scenario label (FR-13, required)
  scenarioNotes?: string;   // User-entered free-text notes (FR-14)
  includeCharts?: boolean;
  currency: '$' | '₪';
}

/**
 * Exports FIRE plan to Excel via server-side generation.
 * Only sends the plan input + display preference — the backend
 * re-runs the calculation and fetches the live exchange rate itself.
 * Falls back to CSV if server is unreachable.
 */
export async function exportToExcel(
  input: FirePlanInput,
  options: ExportOptions
): Promise<void> {
  try {
    const response = await fetch('/api/Export/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, options })
    });
    
    if (!response.ok) throw new Error(`Export failed: ${response.status}`);
    
    const blob = await response.blob();
    downloadFile(blob, options.filename || generateFilename('.xlsx'));
  } catch (error) {
    console.warn('Server export failed, falling back to CSV:', error);
    exportToCsv(input, options);
  }
}

function generateFilename(ext: string): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5).replace(':', '-');
  return `FIRE_Plan_Export_${date}_${time}${ext}`;
}

function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

### 8.3 API Endpoint

```csharp
// src/Controllers/ExportController.cs
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("ApiPolicy")]
public class ExportController : ControllerBase
{
    private readonly IExcelExportService _exportService;

    [HttpPost("excel")]
    [RequestSizeLimit(5_000_000)]
    public async Task<IActionResult> ExportToExcel([FromBody] ExportRequest request)
    {
        var stream = await _exportService.GenerateExcelAsync(
            request.Input, request.Result, request.Options);
        return File(stream, 
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            request.Options?.Filename ?? GenerateFilename());
    }
}
```

**Request model:**

```csharp
public class ExportRequest
{
    public FirePlanInput Input { get; set; } = null!;
    public FireCalculationResult Result { get; set; } = null!;
    public ExportOptions? Options { get; set; }
}

public class ExportOptions
{
    public string? Filename { get; set; }
    public string ScenarioName { get; set; } = "";   // User-entered scenario label (FR-13, required)
    public string? ScenarioNotes { get; set; }       // User-entered free-text notes (FR-14)
    public bool IncludeCharts { get; set; } = true;
    public string Currency { get; set; } = "$";  // Display currency ('$' or '₪')
    public decimal UsdIlsRate { get; set; } = 3.6m;
}
```

### 8.4 Currency Conversion in Export

> **Critical implementation detail:** All monetary values in `FireCalculationResult` are internally stored in **USD**. The frontend converts these to the user’s display currency (USD or ILS) on-the-fly using `convertToDisplayCurrency()` with the live `usdIlsRate`.
>
> The export service **must replicate this conversion**:
> 1. Read the `currency` and `usdIlsRate` from `ExportOptions`
> 2. For each monetary value, if `currency == '₪'`, multiply by `usdIlsRate`
> 3. Write the ISO 4217 code (`USD` or `ILS`) in the adjacent currency column
> 4. Exception: Per-asset prices (CurrentPrice, AverageCost) remain in the asset’s native currency (from `asset.currentPrice.currency`)
>
> This ensures exported values exactly match what the user sees in the UI.

### 8.5 Sheet Creation (Yearly Projections — Reference Implementation)

This C# pseudocode shows the server-side approach using ClosedXML. The export service
receives the already-calculated `result` and converts values via `ICurrencyConverter`.

```csharp
// Inside ExcelExportService.cs
private void CreateYearlyProjectionsSheet(
    XLWorkbook workbook,
    FirePlanInput input,
    FireCalculationResult result,
    ExportOptions options)
{
    var sheet = workbook.Worksheets.Add("תחזית שנתית");
    sheet.RightToLeft = true;

    // Currency helper
    var isIls = options.Currency == "₪";
    var currencyCode = isIls ? "ILS" : "USD";
    decimal ToDisplay(decimal usdValue) =>
        isIls ? _currencyConverter.Convert(usdValue, "USD", "ILS") : usdValue;

    // Bilingual headers matching Section 4.6 (A–W)
    var headers = new[] {
        "שנה (Year)",                            // A
        "גיל (Age)",                             // B
        "שלב (Phase)",                           // C
        "שווי תיק (Portfolio Value)",           // D
        "מטבע (Currency)",                       // E
        "סה\"כ הפקדות (Total Contributions)",   // F
        "מטבע (Currency)",                       // G
        "משיכה שנתית (Annual Withdrawal)",      // H
        "מטבע (Currency)",                       // I
        "סה\"כ מס רווח הון (Total CGT)",        // J
        "מטבע (Currency)",                       // K
        "הכנסה מפנסיה (Pension Income)",        // L
        "מטבע (Currency)",                       // M
        "הוצאות מתוכננות (Planned Expenses)",   // N
        "מטבע (Currency)",                       // O
        "מניות RSU שהבשילו (Shares Vested)",    // P
        "מניות RSU שנמכרו (Shares Sold)",       // Q
        "תמורת מכירת RSU (Sale Proceeds)",      // R
        "מטבע (Currency)",                       // S
        "מס RSU (RSU Tax Paid)",                // T
        "מטבע (Currency)",                       // U
        "שווי אחזקות RSU (Holdings Value)",     // V
        "מטבע (Currency)",                       // W
    };

    // Header row styling
    for (int col = 1; col <= headers.Length; col++)
    {
        var cell = sheet.Cell(1, col);
        cell.Value = headers[col - 1];
        cell.Style.Font.Bold = true;
        cell.Style.Font.FontColor = XLColor.White;
        cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#4472C4");
    }

    // Data rows
    int row = 2;
    foreach (var year in result.YearlyData)
    {
        int age = year.Year - input.BirthYear;
        string phase = year.Phase == "accumulation" ? "צבירה" : "פרישה";

        sheet.Cell(row, 1).Value = year.Year;                                    // A
        sheet.Cell(row, 2).Value = age;                                           // B
        sheet.Cell(row, 3).Value = phase;                                         // C
        sheet.Cell(row, 4).Value = (double)ToDisplay(year.PortfolioValue);        // D
        sheet.Cell(row, 5).Value = currencyCode;                                  // E
        sheet.Cell(row, 6).Value = (double)ToDisplay(year.TotalContributions);    // F
        sheet.Cell(row, 7).Value = currencyCode;                                  // G
        sheet.Cell(row, 8).Value = (double)ToDisplay(year.AnnualWithdrawal);      // H
        sheet.Cell(row, 9).Value = currencyCode;                                  // I
        sheet.Cell(row, 10).Value = (double)ToDisplay(
            year.FlowData?.CapitalGainsTax ?? 0);                                 // J
        sheet.Cell(row, 11).Value = currencyCode;                                 // K
        sheet.Cell(row, 12).Value = (double)ToDisplay(
            year.FlowData?.PensionIncome ?? 0);                                   // L
        sheet.Cell(row, 13).Value = currencyCode;                                 // M
        sheet.Cell(row, 14).Value = (double)ToDisplay(
            year.FlowData?.PlannedExpenses ?? 0);                                 // N
        sheet.Cell(row, 15).Value = currencyCode;                                 // O
        sheet.Cell(row, 16).Value = year.RsuSharesVested ?? 0;                    // P
        sheet.Cell(row, 17).Value = year.RsuSharesSold ?? 0;                      // Q
        sheet.Cell(row, 18).Value = (double)ToDisplay(year.RsuSaleProceeds ?? 0); // R
        sheet.Cell(row, 19).Value = currencyCode;                                 // S
        sheet.Cell(row, 20).Value = (double)ToDisplay(year.RsuTaxesPaid ?? 0);    // T
        sheet.Cell(row, 21).Value = currencyCode;                                 // U
        sheet.Cell(row, 22).Value = (double)ToDisplay(
            year.RsuHoldingsValue ?? 0);                                          // V
        sheet.Cell(row, 23).Value = currencyCode;                                 // W
        row++;
    }

    // Auto-fit and freeze header
    sheet.Columns().AdjustToContents();
    sheet.SheetView.Freeze(1, 0);
}
```

### 8.5b Chart Creation (ClosedXML)

```csharp
// Inside ExcelExportService.cs
private void CreateChartsSheet(
    XLWorkbook workbook,
    FireCalculationResult result,
    ExportOptions options)
{
    var sheet = workbook.Worksheets.Add("גרפים");
    var dataSheet = workbook.Worksheet("תחזית שנתית");
    int rowCount = result.YearlyData.Count + 1; // +1 for header

    // Portfolio Growth Line Chart
    var chart = sheet.AddChart("A1", "K20", XLChartType.Line);
    chart.SetTitle("צמיחת התיק לאורך זמן");

    chart.AddSeries(
        dataSheet.Range($"D2:D{rowCount}"),  // Portfolio Value
        dataSheet.Range($"A2:A{rowCount}"),  // Year labels
        "שווי תיק");

    chart.AddSeries(
        dataSheet.Range($"F2:F{rowCount}"),  // Total Contributions
        dataSheet.Range($"A2:A{rowCount}"),
        "הפקדות מצטברות");

    // FIRE age vertical annotation line
    if (result.FireAgeReached > 0)
    {
        // Add vertical line at retirement year via chart overlay
        // ClosedXML supports chart annotations for marking FIRE age
    }

    // Additional charts (donut allocation, expense breakdown)
    // follow the same pattern...
}
```

### 8.6 Package Dependencies

Add to `FirePlanningTool.csproj`:

```xml
<PackageReference Include="ClosedXML" Version="0.104.*" />
```

> **Note:** No changes to `package.json` are needed. The frontend `export-service.ts` calls the server endpoint via `fetch()` — no new runtime JS dependencies are required.

---

## 9. Validation & Error Handling

### 9.1 Pre-Export Validation

| Check | Error if False |
|-------|---------------|
| Calculation has been run | "נא לבצע חישוב לפני הייצוא" |
| Result contains yearlyData | "אין נתוני תחזית לייצוא" |
| yearlyData has at least 1 entry | "אין נתוני תחזית לייצוא" |

### 9.2 Empty Data Handling

| Condition | Behavior |
|-----------|----------|
| Empty accumulation portfolio | Include sheet with headers only + note: "לא הוגדרו נכסים בתיק הצבירה" |
| Empty retirement portfolio | Include sheet with headers only + note: "לא הוגדר תיק פרישה נפרד" |
| No planned expenses | Include sheet with headers only + note: "לא הוגדרו הוצאות מתוכננות" |
| No RSU configuration | Omit RSU sheet entirely |
| No pension configured | Pension column shows 0 for all years |

### 9.3 Error Recovery

```typescript
try {
  await exportToExcel(input, result, options);
  showSuccessToast('הקובץ יוצא בהצלחה');
} catch (error) {
  console.error('Export failed:', error);
  showErrorToast('שגיאה ביצירת הקובץ. נא לנסות שוב');
  
  // Fallback: Export as CSV (simpler format)
  if (confirm('האם לנסות לייצא כ-CSV?')) {
    exportToCSV(input, result, options);
  }
}
```

### 9.4 Data Sanitization

- Remove any PII beyond what user entered
- Escape special characters in text fields
- Validate numeric ranges before export
- Handle null/undefined gracefully (export as empty cell or 0)

---

## 10. Testing Requirements

### 10.1 Unit Tests

| Test Case | Description |
|-----------|-------------|
| `exportService.generateFilename()` | Correct date/time format |
| `exportService.formatCurrencyForExcel()` | Currency formatting |
| `exportService.createSummarySheet()` | All summary fields present |
| `exportService.createYearlyProjectionsSheet()` | Correct row count |

### 10.2 Integration Tests

| Test Case | Description |
|-----------|-------------|
| Full export with basic input | Generates valid XLSX |
| Export with RSU data | RSU sheet included |
| Export without RSU | No RSU sheet |
| Export with empty expenses | Empty expenses sheet |
| Export with Hebrew text | UTF-8 encoding correct |

### 10.3 Manual Testing Checklist

- [ ] Export opens in Excel 2016 (Windows)
- [ ] Export opens in Excel 2019 (Mac)
- [ ] Export uploads to Google Sheets
- [ ] Export opens in LibreOffice Calc
- [ ] Export opens in Apple Numbers
- [ ] Hebrew text displays correctly
- [ ] Numbers match UI exactly
- [ ] Charts render correctly
- [ ] File size < 5 MB
- [ ] Export completes in < 3 seconds

### 10.4 Regression Tests

Add to existing calculation tests:

```typescript
test('exported data matches calculation result', async () => {
  const input = TestDataBuilder.createBasicFirePlanInput();
  const result = calculateFirePlan(input);
  
  const exportedWorkbook = await generateWorkbook(input, result);
  const yearlySheet = exportedWorkbook.getWorksheet('תחזית שנתית');
  
  // Verify row count
  expect(yearlySheet.rowCount - 1).toBe(result.yearlyData.length);
  
  // Verify first year data
  const firstRow = yearlySheet.getRow(2);
  expect(firstRow.getCell(1).value).toBe(result.yearlyData[0].year);
  expect(firstRow.getCell(4).value).toBeCloseTo(result.yearlyData[0].portfolioValue, 2);
});
```

---

## 11. Success Criteria

### 11.1 Acceptance Criteria

| # | Criterion | Verification Method |
|---|-----------|---------------------|
| 1 | User can export after calculation | Manual test |
| 2 | File opens in Excel without errors | Manual test |
| 3 | File opens in Google Sheets | Manual test |
| 4 | All user inputs are present | Automated test |
| 5 | All yearly data matches UI | Automated test |
| 6 | Charts display correctly | Manual test |
| 7 | Hebrew text renders correctly | Manual test |
| 8 | Export completes in < 3 seconds | Performance test |

### 11.2 Definition of Done

- [ ] Code implemented and follows project conventions
- [ ] Unit tests written with ≥ 85% coverage
- [ ] Integration tests pass
- [ ] Manual QA completed on Windows + Mac
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] PR merged to main branch

---

## 12. Timeline & Effort

### 12.1 Effort Estimate

| Phase | Tasks | Estimate |
|-------|-------|----------|
| **Phase 0: Backend Prerequisites** | | **1 day** |
| | Add `FireAgeReached` to `FireCalculationResult` | ✅ Done |
| | Add `PensionIncome` to `SankeyFlowData` | ✅ Done |
| | Add `Name` to `PortfolioAsset` (from etf-names.json) | ✅ Done |
| | Split `capitalGainsTax` into withdrawal tax + expense tax on `SankeyFlowData` | 0.5 day |
| | Sync TS types with C# (`FireCalculationResult`, `SankeyFlowData`) | ✅ Done |
| **Phase 1: Core Export (Server-Side)** | | **6 days** |
| | ClosedXML integration + `IExcelExportService` skeleton | 1 day |
| | Summary + Inputs sheets (incl. Scenario Name/Notes + Methodology rows) | 1.5 days |
| | Yearly Projections sheet | 1 day |
| | Portfolio + Expenses + Money Flow sheets | 1 day |
| | UI button + scenario name/notes inputs + `POST /api/Export/excel` + CSV fallback | 1.5 days |
| **Phase 2: RSU + Charts** | | **4 days** |
| | RSU sheet | 1 day |
| | ClosedXML chart generation (line, donut, bar) | 2 days |
| | Chart placement, styling, FIRE age annotation | 1 day |
| **Phase 3: Testing + Polish** | | **3 days** |
| | Unit tests (export service, currency conversion) | 1 day |
| | Integration tests (end-to-end export via API) | 1 day |
| | Cross-platform QA (Excel, Google Sheets, LibreOffice) + fixes | 1 day |
| **Total** | | **~14 days** |

### 12.2 Dependencies

| Dependency | Status | Owner |
|------------|--------|-------|
| ClosedXML NuGet package | Available on NuGet (MIT) | N/A |
| Existing calculation models | ✅ Complete | N/A |
| Existing type definitions | ✅ Complete (synced in Phase 0) | N/A |
| `FireAgeReached` on result | ✅ Complete (Phase 0) | N/A |
| `PensionIncome` on flow data | ✅ Complete (Phase 0) | N/A |
| Asset names in API response | ✅ Complete (Phase 0) | N/A |

### 12.3 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| ClosedXML chart API complexity | Low | Medium | ClosedXML has well-documented chart support; fallback to data-only export |
| Large file size for long timelines | Low | Low | Limit chart count, use streaming |
| Server memory for large exports | Low | Medium | Use streaming `MemoryStream`, set request size limits |
| Hebrew RTL rendering issues | Medium | Medium | Test early in development across Excel/GSheets/LibreOffice |

---

## 13. Open Questions

| # | Question | Options | Recommendation | Decision |
|---|----------|---------|----------------|----------|
| 1 | Include raw JSON backup? | Yes / No | No - adds complexity | TBD |
| 2 | Allow partial export? | Yes / No | No - single complete file | TBD |
| 3 | Server-side as option? | Yes / No | No for MVP, yes for v2 | TBD |
| 4 | Export settings modal? | Yes / No | No - simple one-click | TBD |
| 5 | Track export analytics? | Yes / No | Yes - count exports | TBD |
| 6 | Include Glossary sheet? | Yes / No | No — methodology notes are now included in the Summary sheet (rows 34-39, per FR-15). A separate Glossary sheet can be added in v2 if user feedback indicates the Summary section is insufficient. | No (covered by FR-15) |

---

## Document Metadata

| Property | Value |
|----------|-------|
| **Version** | 1.0 |
| **Status** | Proposed - Awaiting Approval |
| **Author** | Product Team |
| **Target Release** | Q1 2026 |
| **Effort Estimate** | 12 engineering days |
| **Priority** | Medium - User-requested feature |
| **Dependencies** | None (uses existing calculation results) |

---

## Approval Signatures

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Manager | ___________ | ___/___/___ | ⬜ Pending |
| Lead Engineer | ___________ | ___/___/___ | ⬜ Pending |
| QA Lead | ___________ | ___/___/___ | ⬜ Pending |

---

**Next Steps:**

1. Review PRD with stakeholders
2. Approve/reject or request modifications
3. If approved, create implementation GitHub issues
4. Assign engineering resources
5. Begin Phase 1 development

---

*For questions or feedback, contact the Product Team.*

---

## Implementation Status (February 2026)

### ✅ Phase 1: MVP Complete

**Implemented Features:**
- ✅ ClosedXML NuGet package integration (v0.104.1)
- ✅ Backend service layer (`IExcelExportService`, `ExcelExportService`)
- ✅ REST API controller (`ExportController`)
  - ✅ `POST /api/Export/excel` endpoint
  - ✅ `POST /api/Export/csv` endpoint (CSV fallback)
- ✅ Frontend TypeScript API client (`export-api.ts`)
- ✅ UI integration - purple "Export to Excel" button
- ✅ User prompts for scenario name and notes
- ✅ File download handling with blob URL
- ✅ Loading state during export

**Excel Sheets Implemented:**
1. ✅ Sheet 1: Summary - Key metrics, timeline, methodology notes
2. ⏳ Sheet 2: Charts - Deferred to Phase 2
3. ✅ Sheet 3: User Inputs - All input parameters
4. ✅ Sheet 4: Yearly Projections - Year-by-year core data (27 columns)
5. ✅ Sheet 5: Money Flow Details - Sankey flow data
6. ⏳ Sheet 6: Accumulation Portfolio - Deferred to Phase 2
7. ⏳ Sheet 7: Retirement Portfolio - Deferred to Phase 2
8. ⏳ Sheet 8: Planned Expenses - Deferred to Phase 2
9. ⏳ Sheet 9: RSU Details - Deferred to Phase 2

**Testing:**
- ✅ 19 unit tests for ExcelExportService
- ✅ Performance verified (< 1 second, target: < 3 seconds)
- ✅ Hebrew text support verified
- ✅ Currency column generation tested
- ✅ All 2,444 tests passing (940 backend + 1,504 frontend)

**Performance Metrics:**
- Export time: < 1 second ✅
- File size: ~50KB ✅
- Memory usage: Minimal (streaming)

### 📋 Phase 2: Remaining Features

**To Be Implemented:**
- Chart generation (Sheet 2)
- Portfolio detail sheets (Sheets 6-7)
- Expense detail sheet (Sheet 8)
- RSU detail sheet (Sheet 9)
- Split withdrawal tax vs expense tax in backend
- Conditional formatting and data validation

**Estimated Effort:** 8 engineering days

---

## Document Metadata (Updated)

| Property | Value |
|----------|-------|
| **Version** | 1.3 |
| **Status** | MVP Implemented (Phase 1 Complete) |
| **Author** | Product Team |
| **Implementation Date** | February 8, 2026 |
| **Phase 1 Effort** | 6 engineering days |
| **Phase 2 Estimate** | 8 engineering days |
| **Priority** | Medium - User-requested feature |
| **Test Coverage** | 19 unit tests, all passing |

---

**Implementation Notes:**

See `docs/EXCEL_EXPORT_IMPLEMENTATION.md` for detailed technical implementation documentation, including:
- Architecture decisions
- API specifications
- Testing strategy
- Known limitations
- Phase 2 roadmap

**Screenshot:**

![Export Button in UI](https://github.com/user-attachments/assets/1f3ea9ff-40fa-4920-84fc-bf536b7af740)

---

*Phase 1 MVP completed February 8, 2026. Phase 2 scheduled for Q2 2026.*
