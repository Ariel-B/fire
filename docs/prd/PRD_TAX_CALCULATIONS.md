# Product Requirements Document: Tax & Financial Calculations

**Version:** 1.0  
**Last Updated:** November 2025  
**Owner:** Product Team  
**Status:** Reverse-Engineered from Implementation  
**Parent PRD:** PRD_FIRE_PLANNING_TOOL.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [FIRE Calculation Engine](#2-fire-calculation-engine)
3. [Accumulation Phase Calculations](#3-accumulation-phase-calculations)
4. [Retirement Phase Calculations](#4-retirement-phase-calculations)
5. [Tax Calculations](#5-tax-calculations)
6. [Expense Modeling](#6-expense-modeling)
7. [Currency Conversion](#7-currency-conversion)
8. [Calculation Constants](#8-calculation-constants)
9. [Edge Cases & Validation](#9-edge-cases--validation)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

The Tax & Financial Calculations module is the computational core of the FIRE Planning Tool. It simulates portfolio growth during accumulation, handles tax-efficient withdrawals during retirement, and models expense impacts across the entire timeline.

### 1.2 Key Calculation Components

| Component | Description |
|-----------|-------------|
| Accumulation Simulation | Monthly compounding with contributions |
| Retirement Simulation | Withdrawals with tax and inflation adjustments |
| Capital Gains Tax | Dynamic profit ratio-based taxation |
| Expense Planning | Inflation-adjusted major expenses |
| Currency Conversion | USD/ILS with configurable rate |

### 1.3 Israeli Tax Context

The tool is designed for Israeli residents with these assumptions:
- **Capital Gains Tax**: 25% (configurable)
- **Tax Basis**: Cost basis tracking for gains calculation
- **No Tax-Advantaged Accounts**: All assets treated as taxable (future enhancement)

---

## 2. FIRE Calculation Engine

### 2.1 Calculation Flow

```
Input Validation
      ↓
Calculate Current Portfolio Value
      ↓
Determine Weighted Returns (Accumulation)
      ↓
┌─────────────────────────────────┐
│  ACCUMULATION PHASE LOOP        │
│  For each year until retirement │
│    For each month:              │
│      - Apply monthly growth     │
│      - Add monthly contribution │
│    Apply annual expenses        │
│    Record yearly data           │
└─────────────────────────────────┘
      ↓
Calculate Peak Value & Tax Event (if switching portfolios)
      ↓
Determine Weighted Returns (Retirement)
      ↓
┌─────────────────────────────────┐
│  RETIREMENT PHASE LOOP          │
│  For each year until end        │
│    - Calculate withdrawal       │
│    - Apply tax on gains         │
│    For each month:              │
│      - Apply monthly growth     │
│      - Deduct monthly withdrawal│
│    Apply annual expenses        │
│    Update cost basis            │
│    Record yearly data           │
└─────────────────────────────────┘
      ↓
Return Results
```

### 2.2 Input Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| birthYear | int | User's birth year |
| earlyRetirementYear | int | Target retirement year |
| fullRetirementAge | int | Age until which to simulate |
| monthlyContribution | decimal | Monthly investment amount |
| withdrawalRate | decimal | Annual withdrawal percentage (e.g., 4%) |
| inflationRate | decimal | Expected annual inflation |
| capitalGainsTax | decimal | Tax rate on capital gains |
| usdIlsRate | decimal | Exchange rate for conversions |
| taxBasis | decimal? | Optional override for cost basis |
| useRetirementPortfolio | bool | Whether to switch portfolios at retirement |

### 2.3 Output Results

| Field | Description |
|-------|-------------|
| totalContributions | Sum of all contributions (cost basis) |
| peakValue | Portfolio value at retirement (after tax if applicable) |
| grossPeakValue | Portfolio value before retirement tax |
| retirementTaxToPay | Tax due when switching to retirement portfolio |
| endValue | Portfolio value at end of simulation |
| grossAnnualWithdrawal | Annual withdrawal before tax |
| netMonthlyExpense | Monthly expense after tax |
| yearlyData[] | Year-by-year breakdown |

---

## 3. Accumulation Phase Calculations

### 3.1 Duration Calculation

```csharp
accumulationYears = max(0, earlyRetirementYear - currentYear)
```

### 3.2 Monthly Growth Formula

For each month during accumulation:

```csharp
monthlyReturn = annualReturn / 100 / 12;
portfolioValue *= (1 + monthlyReturn);
portfolioValue += monthlyContribution;
actualContributions += monthlyContribution;
```

### 3.3 Weighted Return Calculation

The portfolio return is weighted by each asset's value:

```csharp
foreach (asset in portfolio) {
    assetValue = quantity × currentPrice;  // Converted to USD
    assetWeight = assetValue / totalValue;
    
    switch (asset.Method) {
        case "CAGR":
        case "צמיחה כוללת":
            annualReturn = asset.Value1;
            break;
        case "מחיר יעד":
            targetPrice = asset.Value2;
            years = yearsToRetirement > 0 ? yearsToRetirement : 10;
            annualReturn = (pow(targetPrice / currentPrice, 1/years) - 1) × 100;
            break;
    }
    
    weightedReturn += assetWeight × annualReturn;
}
```

### 3.4 Expense Handling During Accumulation

At the end of each year:

```csharp
foreach (expense in GetExpensesForYear(year)) {
    yearsFromBase = year - currentYear;
    inflatedAmount = expense.NetAmount × pow(1 + inflationRate/100, yearsFromBase);
    portfolioValue -= inflatedAmount;
}
```

### 3.5 Yearly Data Recording

```csharp
yearlyData.Add(new YearlyData {
    Year = currentYear + year,
    PortfolioValue = portfolioValue,
    TotalContributions = currentPortfolioValue + actualContributions,
    Phase = "accumulation",
    Expenses = yearExpenses
});
```

---

## 4. Retirement Phase Calculations

### 4.1 Duration Calculation

```csharp
retirementEndYear = birthYear + fullRetirementAge;
retirementYears = max(0, retirementEndYear - earlyRetirementYear + 1);
```

### 4.2 Initial Withdrawal Calculation

Based on the 4% Rule (configurable):

```csharp
initialGrossWithdrawal = peakValue × withdrawalRate / 100;
effectiveTaxRate = profitRatio × capitalGainsTax / 100;
initialNetWithdrawal = initialGrossWithdrawal × (1 - effectiveTaxRate);
initialMonthlyNet = initialNetWithdrawal / 12;
```

### 4.3 Monthly Retirement Simulation

```csharp
monthlyReturn = pow(1 + retirementReturn/100, 1/12) - 1;

for (month = 0; month < 12; month++) {
    portfolioValue *= (1 + monthlyReturn);
    monthlyWithdrawal = grossAnnualWithdrawal / 12;
    
    // Update cost basis
    principalPortion = monthlyWithdrawal × (1 - profitRatio);
    remainingCostBasis = max(0, remainingCostBasis - principalPortion);
    
    portfolioValue -= monthlyWithdrawal;
    
    // Update profit ratio
    profitRatio = CalculateProfitRatio(portfolioValue, remainingCostBasis);
}
```

### 4.4 Inflation Adjustment

Annual withdrawals increase with inflation:

```csharp
if (year > 0) {
    netWithdrawal *= (1 + inflationRate / 100);
    effectiveTaxRate = profitRatio × capitalGainsTax / 100;
    grossWithdrawal = netWithdrawal / (1 - effectiveTaxRate);
}
```

### 4.5 Expense Handling During Retirement

```csharp
foreach (expense in GetExpensesForYear(year)) {
    yearsFromBase = year - baseYear;
    inflatedNetAmount = expense.NetAmount × pow(1 + inflationRate/100, yearsFromBase);
    
    // Gross up for tax
    grossAmount = inflatedNetAmount / (1 - effectiveTaxRate);
    
    // Update cost basis
    principalPortion = grossAmount × (1 - profitRatio);
    remainingCostBasis = max(0, remainingCostBasis - principalPortion);
    
    portfolioValue -= grossAmount;
    profitRatio = CalculateProfitRatio(portfolioValue, remainingCostBasis);
}
```

---

## 5. Tax Calculations

### 5.1 Capital Gains Tax Model

The tool uses a **profit ratio approach** where tax is only paid on gains, not principal:

```
Profit Ratio = (Portfolio Value - Cost Basis) / Portfolio Value
Effective Tax Rate = Profit Ratio × Capital Gains Tax Rate
```

### 5.2 Profit Ratio Calculation

```csharp
decimal CalculateProfitRatio(decimal portfolioValue, decimal costBasis) {
    if (portfolioValue <= 0 || costBasis <= 0) return 0;
    if (portfolioValue <= costBasis) return 0;
    return (portfolioValue - costBasis) / portfolioValue;
}
```

### 5.3 Dynamic Profit Ratio

The profit ratio changes over time as:
1. Portfolio grows (increasing profit ratio)
2. Withdrawals reduce both value and cost basis
3. New contributions add to cost basis

**Example:**
- Portfolio: $1,000,000
- Cost Basis: $400,000
- Profit Ratio: 60%
- Tax Rate: 25%
- Effective Rate: 60% * 25% = 15%

### 5.4 Retirement Portfolio Tax Event

When switching from accumulation to retirement portfolio:

```csharp
if (useRetirementPortfolio && peakValue > 0) {
    gains = max(0, peakValue - totalContributions);
    retirementTaxToPay = gains * capitalGainsTax / 100;
    peakValue -= retirementTaxToPay;
    
    // Reset cost basis to new portfolio value
    totalContributions = peakValue;
    remainingCostBasis = peakValue;
    profitRatio = 0;  // No gains after selling
}
```

### 5.5 Withdrawal Tax Calculation

For each withdrawal:

```csharp
// Net amount user needs
netNeeded = grossWithdrawal × (1 - effectiveTaxRate);

// To get net amount, must withdraw:
// gross = net / (1 - effectiveTaxRate)
grossRequired = netNeeded / (1 - effectiveTaxRate);

// Tax paid
taxPaid = grossRequired × effectiveTaxRate;
```

---

## 6. Expense Modeling

### 6.1 Expense Data Model

```csharp
class PlannedExpense {
    long Id;
    string Type;           // Description
    decimal NetAmount;     // After-tax amount needed
    string Currency;       // "$" or "₪"
    int Year;              // First occurrence year
    int FrequencyYears;    // Years between occurrences (1 = one-time)
    int RepetitionCount;   // Total occurrences (1 = one-time)
}
```

### 6.2 Expense Occurrence Logic

```csharp
List<PlannedExpense> GetExpensesForYear(expenses, targetYear) {
    var result = new List<PlannedExpense>();
    
    foreach (expense in expenses) {
        frequencyYears = expense.FrequencyYears > 0 ? expense.FrequencyYears : 1;
        repetitionCount = expense.RepetitionCount > 0 ? expense.RepetitionCount : 1;
        startYear = expense.Year;
        
        for (i = 0; i < repetitionCount; i++) {
            occurrenceYear = startYear + (i × frequencyYears);
            if (occurrenceYear == targetYear) {
                result.Add(expense);
                break;
            }
        }
    }
    return result;
}
```

### 6.3 Inflation Adjustment

All expenses are inflation-adjusted based on years from base:

```csharp
yearsFromBase = targetYear - currentYear;
inflatedAmount = baseAmount × pow(1 + inflationRate/100, yearsFromBase);
```

### 6.4 Example Expense Scenarios

**One-Time Expense:**
```json
{
  "type": "רכישת דירה",
  "netAmount": 500000,
  "currency": "₪",
  "year": 2030,
  "frequencyYears": 1,
  "repetitionCount": 1
}
```

**Recurring Expense:**
```json
{
  "type": "החלפת רכב",
  "netAmount": 150000,
  "currency": "₪",
  "year": 2025,
  "frequencyYears": 5,
  "repetitionCount": 4
}
// Occurs: 2025, 2030, 2035, 2040
```

---

## 7. Currency Conversion

### 7.1 Supported Currencies

| Symbol | Currency | Description |
|--------|----------|-------------|
| $ | USD | US Dollar (calculation base) |
| ₪ | ILS | Israeli New Shekel |

### 7.2 Conversion Logic

All internal calculations use USD. Conversion happens at input/output:

```csharp
decimal ConvertToUsd(decimal amount, string currency, decimal usdIlsRate) {
    if (string.IsNullOrEmpty(currency) || currency == "$")
        return amount;
    if (currency == "₪" && usdIlsRate > 0)
        return amount / usdIlsRate;
    return amount;
}
```

### 7.3 Display Conversion

```csharp
decimal ConvertToDisplayCurrency(decimal amountUsd, string displayCurrency, decimal rate) {
    if (displayCurrency == "$") return amountUsd;
    if (displayCurrency == "₪") return amountUsd × rate;
    return amountUsd;
}
```

### 7.4 Default Exchange Rate

- **Default**: 3.6 USD/ILS
- **User Configurable**: Can be adjusted in settings
- **Live Rate**: Not automatically fetched (future enhancement)

---

## 8. Calculation Constants

### 8.1 Default Values

| Constant | Value | Description |
|----------|-------|-------------|
| DefaultUsdIlsRate | 3.6 | Default exchange rate |
| DefaultTargetPriceYears | 10 | Years for target price calculation |
| MaxSimulationYears | 100 | Maximum simulation duration |
| DefaultStockReturn | 7.0% | Default stock return assumption |
| DefaultBondReturn | 3.0% | Default bond return assumption |
| DefaultCapitalGainsTax | 25% | Default tax rate |
| DefaultWithdrawalRate | 4.0% | Default SWR |
| DefaultInflationRate | 2.0% | Default inflation |

### 8.2 Validation Constants

| Constant | Value | Description |
|----------|-------|-------------|
| MinBirthYear | 1900 | Minimum valid birth year |
| MaxFutureBirthYears | 50 | Max years in future for birth year |
| MinRetirementYear | 1900 | Minimum valid retirement year |
| MaxFutureRetirementYears | 150 | Max years in future for retirement |
| MaxRetirementAge | 150 | Maximum retirement age |

### 8.3 Time Constants

| Constant | Value | Description |
|----------|-------|-------------|
| TwoMonthsInDays | 60 | For historical data validation |
| TwoMonthsInSeconds | 5,184,000 | Same in seconds |

---

## 9. Edge Cases & Validation

### 9.1 Input Validation

| Validation | Rule | Error Message |
|------------|------|---------------|
| Birth Year | 1900 ≤ year ≤ current+50 | "Invalid birth year" |
| Retirement Year | 1900 ≤ year ≤ current+150 | "Invalid early retirement year" |
| Retirement Age | 0 ≤ age ≤ 150 | "Invalid full retirement age" |
| Withdrawal Rate | 0 ≤ rate ≤ 100 | "Withdrawal rate must be between 0 and 100" |
| Inflation Rate | -50 ≤ rate ≤ 100 | "Inflation rate must be between -50 and 100" |
| Capital Gains Tax | 0 ≤ tax ≤ 100 | "Capital gains tax must be between 0 and 100" |
| Monthly Contribution | 0 ≤ amount ≤ 1B | "Invalid monthly contribution" |

### 9.2 Edge Case Handling

**Zero Portfolio Value:**
```csharp
if (portfolioValue <= 0) {
    profitRatio = 0;
    return; // Skip further calculations
}
```

**Negative Profit Ratio:**
```csharp
if (portfolioValue <= costBasis) {
    profitRatio = 0;  // No profit to tax
}
```

**Portfolio Depleted:**
```csharp
portfolioValue = max(0, portfolioValue);  // Never goes negative
```

### 9.3 Rate Limits

| Limit | Value | Purpose |
|-------|-------|---------|
| Request Size | 5 MB | Prevent DoS |
| JSON Depth | 32 levels | Prevent attacks |
| Portfolio Items | 1000 | Performance |
| Expenses | 1000 | Performance |

---

## 10. Future Enhancements

### 10.1 Tax Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Tax-loss harvesting | Medium | Model selling losers to offset gains |
| Tax-advantaged accounts | High | קרנות השתלמות, קופות גמל |
| RSU taxation | High | Section 102 support (separate PRD) |
| Multiple tax rates | Low | Different rates for different gains |

### 10.2 Calculation Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Monte Carlo simulation | Medium | Probabilistic outcomes |
| Variable returns | Medium | Different returns per year |
| Sequence of returns risk | Low | Model bad early years |
| Social Security integration | Low | Include pension benefits |

### 10.3 Expense Enhancements

| Feature | Priority | Description |
|---------|----------|-------------|
| Expense categories | Low | Group expenses by type |
| Income modeling | Medium | Model part-time income |
| Healthcare costs | Medium | Model increasing medical expenses |

---

## Appendix A: Calculation Examples

### A.1 Simple Accumulation Example

**Input:**
- Current portfolio: $100,000
- Monthly contribution: $5,000
- Expected return: 7%
- Years to retirement: 10

**Year 1 Calculation:**
```
Starting: $100,000
Monthly growth: 7% / 12 = 0.583%
Month 1: $100,000 × 1.00583 + $5,000 = $105,583
Month 2: $105,583 × 1.00583 + $5,000 = $111,199
...
Month 12: $165,xxx
```

### A.2 Retirement Withdrawal Example

**Input:**
- Portfolio at retirement: $2,000,000
- Cost basis: $800,000
- Withdrawal rate: 4%
- Capital gains tax: 25%

**Calculation:**
```
Profit ratio: ($2,000,000 - $800,000) / $2,000,000 = 60%
Effective tax rate: 60% × 25% = 15%
Gross withdrawal: $2,000,000 × 4% = $80,000
Tax: $80,000 × 15% = $12,000
Net withdrawal: $80,000 - $12,000 = $68,000
Monthly net: $68,000 / 12 = $5,667
```

### A.3 Expense Impact Example

**Input:**
- Planned expense: ₪500,000 in 2030
- Current year: 2025
- Inflation: 3%
- Exchange rate: 3.6

**Calculation:**
```
Years from base: 2030 - 2025 = 5
Inflation factor: (1.03)^5 = 1.159
Inflated amount: ₪500,000 × 1.159 = ₪579,637
In USD: ₪579,637 / 3.6 = $161,010
```

---

## Appendix B: Backend Implementation Reference

### B.1 Key Files

| File | Purpose |
|------|---------|
| src/Services/FireCalculator.cs | Core calculation engine |
| src/Services/PortfolioCalculator.cs | Portfolio value calculations |
| src/Services/CurrencyConverter.cs | Currency conversion |
| src/Services/CalculationConstants.cs | Shared constants |
| src/Controllers/FirePlanController.cs | API endpoints |

### B.2 Key Methods

| Method | Purpose |
|--------|---------|
| FireCalculator.Calculate() | Main entry point |
| CalculatePortfolioValue() | Sum of asset values |
| CalculatePortfolioCostBasis() | Sum of cost bases |
| CalculateWeightedReturn() | Asset-weighted return |
| GetExpensesForYear() | Expense occurrence lookup |
| CalculateProfitRatio() | Gain ratio calculation |

---

**End of Document**

*This PRD documents the tax and financial calculation algorithms implemented in the FIRE Planning Tool.*
