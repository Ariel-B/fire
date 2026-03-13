# Product Requirements Document: FIRE Planning Tool

**Version:** 1.0  
**Last Updated:** November 2025  
**Owner:** Product Team  
**Status:** Reverse-Engineered from Implementation

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Goals](#2-product-vision--goals)
3. [Target Users](#3-target-users)
4. [Core Features](#4-core-features)
5. [User Interface Requirements](#5-user-interface-requirements)
6. [Technical Architecture](#6-technical-architecture)
7. [Data Model](#7-data-model)
8. [API Specifications](#8-api-specifications)
9. [Non-Functional Requirements](#9-non-functional-requirements)
10. [Success Metrics](#10-success-metrics)

---

## 1. Executive Summary

### 1.1 Product Overview

The **FIRE Planning Tool** (כלי תכנון פרישה מוקדמת) is a comprehensive web application designed to help users plan for Financial Independence and Retire Early (FIRE). The tool enables Israeli residents (with Hebrew RTL interface) to:

- Model investment portfolios with real-time asset prices
- Calculate retirement projections across accumulation and withdrawal phases
- Account for Israeli tax implications (capital gains tax)
- Plan major expenses with inflation adjustments
- Save and load financial plans for iterative planning

### 1.2 Product Tagline

> **"Achieve Financial Independence, Retire Early"** 🔥

### 1.3 Key Differentiators

| Feature | Description |
|---------|-------------|
| **Hebrew RTL Interface** | Complete right-to-left interface for Israeli users |
| **Real-time Asset Data** | Integration with Finnhub API for live prices and historical CAGR |
| **Dual-Phase Simulation** | Separate modeling for accumulation and retirement phases |
| **Tax-Aware Calculations** | Built-in Israeli capital gains tax calculations |
| **Multi-Currency Support** | USD/ILS with configurable exchange rates |
| **Plan Persistence** | Save/load plans as JSON files |

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

To be the go-to financial planning tool for Hebrew-speaking users pursuing FIRE, providing accurate projections with real market data and Israeli tax considerations.

### 2.2 Business Goals

1. **Empower Users**: Enable individuals to make informed decisions about retirement planning
2. **Accuracy**: Provide reliable projections based on actual market data
3. **Accessibility**: Make complex financial calculations accessible to non-experts
4. **Localization**: Serve the Israeli market with native Hebrew support

### 2.3 User Goals

| User Goal | How the Tool Addresses It |
|-----------|---------------------------|
| Know when I can retire | Calculates years to financial independence |
| Understand portfolio growth | Visualizes accumulation over time |
| Plan for major expenses | Models expense impact on retirement timeline |
| Minimize tax burden | Shows tax-efficient withdrawal strategies |
| Track progress | Save/load plans to monitor changes over time |

---

## 3. Target Users

### 3.1 Primary Persona: Israeli Tech Worker

**Name:** Yael (age 32)  
**Occupation:** Software Engineer at a multinational tech company  
**Income:** ₪35,000/month + stock options  
**Financial Goal:** Retire by age 50

**Characteristics:**
- Comfortable with technology
- Basic understanding of investments
- Needs Hebrew language interface
- Has investments in US stocks (VOO, VTI, etc.)
- Wants to understand Israeli tax implications

### 3.2 Secondary Persona: Financial Planning Enthusiast

**Name:** Avi (age 45)  
**Occupation:** Small business owner  
**Income:** Variable ₪50,000-80,000/month  
**Financial Goal:** Ensure comfortable retirement at 60

**Characteristics:**
- More conservative investment approach
- Already has significant portfolio
- Planning for multiple major expenses (children's education, property)
- Wants detailed year-by-year projections

### 3.3 User Skill Requirements

- **Technical Level**: Intermediate
- **Financial Knowledge**: Basic understanding of stocks, ETFs, returns
- **Language**: Hebrew (primary), English familiarity
- **Device**: Desktop/Tablet (responsive design supported)

---

## 4. Core Features

### 4.1 Feature Overview

```
FIRE Planning Tool
├── F1: Personal Information Management
├── F2: Portfolio Management (Accumulation)
├── F3: Portfolio Management (Retirement)  
├── F4: Expense Planning
├── F5: FIRE Calculations
├── F6: Results Visualization
├── F7: Plan Management (Save/Load)
└── F8: Real-time Asset Data Integration
```

### 4.2 Feature Details

#### F1: Personal Information Management

**Purpose:** Capture user's basic financial parameters for calculations

**Input Fields:**
| Field | Hebrew Label | Type | Default | Validation |
|-------|--------------|------|---------|------------|
| Birth Year | שנת לידה | Number | 1990 | 1900 - current+50 |
| Early Retirement Age | גיל פרישה מוקדמת | Number | 50 | 0 - 150 |
| Full Retirement Age | גיל פרישה מלאה | Number | 67 | 0-150 |
| Monthly Contribution | הפקדה חודשית | Currency | 10,000 | 0 - 1B |
| Display Currency | מטבע תצוגה | Select | ₪ | $/₪ |
| USD/ILS Rate | שער חליפין | Decimal | 3.6 | > 0 |
| Withdrawal Rate | אחוז משיכה שנתי | Select | 4% | 3%/4%/5% |
| Inflation Rate | אינפלציה שנתית | Decimal | 3% | -50% to 100% |
| Capital Gains Tax | מס רווחי הון | Decimal | 25% | 0-100% |
| Target Monthly Expense | הוצאה חודשית יעד (נטו) | Currency | 20,000 | 0 - 1B |

**Note:** The UI collects *early retirement age* and derives `earlyRetirementYear = birthYear + earlyRetirementAge` for calculations and API payloads.

#### F2: Portfolio Management (Accumulation Phase)

**Purpose:** Define assets held during wealth-building years

**Asset Properties:**
| Field | Hebrew Label | Description |
|-------|--------------|-------------|
| Symbol | נכס | Stock ticker (e.g., VOO, AAPL) |
| Quantity | כמות | Number of shares owned |
| Current Price | מחיר נוכחי | Current share price (auto-fetch available) |
| Price Currency | מטבע מחיר | USD or ILS |
| Average Cost | מחיר עלות ממוצע | Cost basis per share |
| Cost Currency | מטבע עלות | USD or ILS |
| Method | שיטת חישוב | CAGR / Total Growth / Target Price |
| Value1 | פרמטר 1 | Expected annual return (%) |
| Value2 | פרמטר 2 | Target price (for Target Price method) |

**Return Calculation Methods:**
1. **CAGR (Compound Annual Growth Rate)**: User specifies expected annual return
2. **Total Growth (צמיחה כוללת)**: Same as CAGR
3. **Target Price (מחיר יעד)**: User specifies target price, system calculates implied return based on years to retirement

**Calculated Fields:**
- Cost Basis = Quantity × Average Cost
- Market Value = Quantity × Current Price
- Unrealized Gain/Loss = Market Value - Cost Basis
- Exposure (%) = Market Value / Total Portfolio Value

#### F3: Portfolio Management (Retirement Phase)

**Purpose:** Define asset allocation for withdrawal years (optional)

**Allocation Properties:**
| Field | Hebrew Label | Description |
|-------|--------------|-------------|
| Asset Type | סוג נכס | Asset class name (e.g., מניות, אגרות חוב) |
| Target Percentage | אחוז הקצאה | Target allocation (%) |
| Expected Return | תשואה צפויה | Expected annual return (%) |

**Toggle Feature:**
- Checkbox "Use Retirement Portfolio" enables separate retirement allocation
- When disabled, accumulation portfolio continues into retirement
- When enabled, tax event occurs at retirement (selling accumulation assets)

#### F4: Expense Planning

**Purpose:** Model major expenses that impact retirement timeline

**Expense Properties:**
| Field | Hebrew Label | Description |
|-------|--------------|-------------|
| Type | סוג הוצאה | Expense description |
| Net Amount | סכום (נטו) | Post-tax amount needed |
| Currency | מטבע | USD or ILS |
| Year | שנה ראשונה | Calendar year of expense |
| Frequency | תדירות | Years between occurrences |
| Repetitions | מספר חזרות | Total number of times |

**Calculated Fields:**
- First Inflation-Adjusted Amount
- Last Inflation-Adjusted Amount  
- Grand Total (including all repetitions with inflation)

#### F5: FIRE Calculations Engine

**Purpose:** Core simulation of portfolio growth and withdrawal

**Accumulation Phase Logic:**
```
For each year until retirement:
  For each month:
    1. Apply monthly growth: value *= (1 + annual_return/12)
    2. Add monthly contribution
  At year end:
    3. Deduct any planned expenses (inflation-adjusted)
```

**Retirement Phase Logic:**
```
For each year from retirement to life expectancy:
  1. Calculate withdrawal: peak_value × withdrawal_rate × inflation_factor
  2. Apply effective tax rate: profit_ratio × capital_gains_rate
  3. Deduct gross withdrawal from portfolio
  4. Apply portfolio growth
  5. Deduct any planned expenses
  6. Update cost basis and profit ratio
```

**Key Calculations:**
- **Weighted Return**: Sum of (asset_weight × asset_return) across all assets
- **Profit Ratio**: (Portfolio Value - Cost Basis) / Portfolio Value
- **Effective Tax Rate**: Profit Ratio × Capital Gains Tax Rate
- **Net Withdrawal**: Gross Withdrawal × (1 - Effective Tax Rate)
- **Target Portfolio for Monthly Expense**: Portfolio value needed to support a target net monthly expense
  ```
  Formula: Target Portfolio = (12 × Monthly Expense) / (1 - Tax Rate) / Withdrawal Rate
  
  Example with ₪20,000/month target, 25% tax, 4% withdrawal:
    Net Annual = 20,000 × 12 = 240,000
    Gross Annual = 240,000 / 0.75 = 320,000
    Target Portfolio = 320,000 / 0.04 = 8,000,000
  
  Each year applies inflation: Target × (1 + Inflation Rate)^years_from_base
  ```

#### F6: Results Visualization

**Purpose:** Display projections through charts and summary cards

**Summary Cards:**
1. Total Contributions (סה"כ הפקדות)
2. Annual Withdrawal - Net (משיכה שנתית)
3. Monthly Expense - Net (הוצאה חודשית)

**Charts:**
1. **Portfolio Distribution (Donut Charts):**
   - Start of Accumulation
   - Before Retirement
   - End of Retirement

2. **Growth & Withdrawal Chart (Line):**
   - X-axis: Years (bottom), Age (top)
   - Y-axis: Portfolio Value
   - Lines:
     - **Portfolio Value** (blue): Total portfolio value over time
     - **Total Contributions** (gray dashed): Cumulative contributions
     - **Withdrawals + Expenses** (red dashed): Annual withdrawal amounts including planned expenses
     - **Taxes Paid** (orange dashed): Tax amounts paid each year
     - **Target Portfolio for Monthly Expense** (green dashed): Portfolio value needed to support target monthly expense, accounting for withdrawal rate, taxes, and inflation

3. **Expenses Chart (Bar):
   - X-axis: Years
   - Y-axis: Expense Amount
   - Bars: Planned expenses by year

#### F7: Plan Management

**Purpose:** Persist and restore financial plans

**Save Plan:**
- Generates JSON file with all inputs, portfolios, and expenses
- Downloads to user's device
- Filename: user-specified or auto-generated

**Load Plan:**
- Accepts JSON file upload
- Validates structure and data
- Restores all inputs, portfolios, expenses
- Recalculates results automatically

**JSON Schema Version:** 1.0

#### F8: Real-time Asset Data Integration

**Purpose:** Fetch current market data for accurate projections

**Finnhub API Integration:**
| Endpoint | Purpose |
|----------|---------|
| `/quote` | Current asset price |
| `/stock/profile2` | Asset name from symbol |
| `/stock/candle` | Historical prices for CAGR calculation |

**Yahoo Finance Fallback:**
- Used when Finnhub fails or for historical data
- `/v8/finance/chart` endpoint

**CAGR Timeframes:**
- 1 Year, 3 Years, 5 Years, 10 Years, 15 Years, 20 Years

---

## 5. User Interface Requirements

### 5.1 Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header: כלי תכנון פרישה מוקדמת (FIRE)    [Save] [Load]     │
├─────────────────┬───────────────────────────────────────────┤
│                 │                                           │
│  Settings Panel │         Tab Content Area                  │
│  (Fixed Width)  │         (Flexible Width)                  │
│                 │                                           │
│  - General      │  [Accumulation] [Expenses] [Retirement]   │
│  - Retirement   │         [Results]                         │
│                 │                                           │
│                 │         Content varies by selected tab    │
│                 │                                           │
└─────────────────┴───────────────────────────────────────────┘
```

### 5.2 Navigation Tabs

| Tab | Hebrew Label | Icon | Content |
|-----|--------------|------|---------|
| Accumulation | תיק צבירה | 📈 | Portfolio table, donut charts |
| Expenses | הוצאות מתוכננות | 💸 | Expense table, bar chart |
| Retirement | תיק פרישה | 🏖️ | Allocation table (when enabled) |
| Results | תוצאות וגרפים | ✨ | Summary cards, all charts |

### 5.3 RTL Support Requirements

- **Direction:** All text and layout flows right-to-left
- **Font:** 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif
- **Date Format:** DD/MM/YYYY
- **Number Format:** 1,234.56 (comma thousands separator)
- **Currency Display:** ₪1,234 or $1,234 (symbol before number)

### 5.4 Responsive Design

| Breakpoint | Layout |
|------------|--------|
| Mobile (<768px) | Single column, stacked |
| Tablet (768-1024px) | Two column with overflow |
| Desktop (>1024px) | Full two-column layout |

### 5.5 Interaction Patterns

- **Tables:** Sortable columns, click header to sort
- **Inputs:** Real-time validation, immediate feedback
- **Calculations:** Automatic recalculation on input change
- **Charts:** Hover tooltips with data details
- **Buttons:** Visual feedback on hover/click

---

## 6. Technical Architecture

### 6.1 System Context

```
┌──────────────┐     HTTPS      ┌──────────────┐
│    User      │ ◄────────────► │  Web Browser │
│              │                │  (SPA)       │
└──────────────┘                └──────┬───────┘
                                       │ REST/JSON
                                       ▼
                                ┌──────────────┐
                                │  ASP.NET     │
                                │  Core API    │
                                └──────┬───────┘
                                       │ HTTPS
                          ┌────────────┼────────────┐
                          ▼            ▼            ▼
                    ┌──────────┐ ┌──────────┐ ┌──────────┐
                    │ Finnhub  │ │  Yahoo   │ │   File   │
                    │   API    │ │ Finance  │ │  System  │
                    └──────────┘ └──────────┘ └──────────┘
```

### 6.2 Technology Stack

**Backend:**
- Runtime: .NET 9.0
- Framework: ASP.NET Core 9.0
- Language: C# 13
- Web Server: Kestrel

**Frontend:**
- HTML5, JavaScript (ES6 Modules)
- CSS: Tailwind CSS (CDN)
- Charts: Chart.js 4.x (CDN)
- No build step required

**Testing:**
- Backend: xUnit, FluentAssertions
- Frontend: Jest
- Coverage: Coverlet

### 6.3 Component Structure

**Backend Services:**
| Service | Responsibility |
|---------|----------------|
| FireCalculator | Core FIRE calculation engine |
| PortfolioCalculator | Portfolio value calculations |
| CurrencyConverter | USD/ILS conversion |
| FinnhubService | External API integration |

**Frontend Modules:**
| Module | Responsibility |
|--------|----------------|
| app.js | Main entry point, state management |
| fire-plan-api.js | API client for calculations |
| assets-api.js | API client for asset prices |
| chart-manager.js | Chart.js configuration |
| state.js | Application state |

---

## 7. Data Model

### 7.1 Input Model (FirePlanInput)

```csharp
{
  birthYear: int,
  earlyRetirementYear: int,
  fullRetirementAge: int,
  monthlyContribution: decimal,
  monthlyContributionCurrency: string,
  currency: string,
  usdIlsRate: decimal,
  withdrawalRate: decimal,
  inflationRate: decimal,
  capitalGainsTax: decimal,
  taxBasis: decimal?,
  expenses: PlannedExpense[],
  accumulationPortfolio: PortfolioAsset[],
  retirementPortfolio: PortfolioAsset[],
  accumulationAllocation: PortfolioAllocation[],
  retirementAllocation: PortfolioAllocation[],
  investmentStrategy: string,
  currentPortfolioValue: decimal,
  useRetirementPortfolio: bool
}
```

### 7.2 Output Model (FireCalculationResult)

```csharp
{
  totalContributions: decimal,
  peakValue: decimal,
  grossPeakValue: decimal,
  retirementTaxToPay: decimal,
  endValue: decimal,
  grossAnnualWithdrawal: decimal,
  netMonthlyExpense: decimal,
  yearlyData: YearlyData[],
  accumulationPortfolio: PortfolioAsset[],
  retirementPortfolio: PortfolioAsset[],
  currentValue: decimal,
  accumulationAllocation: PortfolioAllocation[],
  retirementAllocation: PortfolioAllocation[],
  accumulationWeightedReturn: decimal,
  retirementWeightedReturn: decimal
}
```

### 7.3 Yearly Data Model

```csharp
{
  year: int,
  portfolioValue: decimal,
  totalContributions: decimal,
  annualWithdrawal: decimal?,
  phase: string, // "accumulation" | "retirement"
  expenses: PlannedExpense[]
}
```

---

## 8. API Specifications

### 8.1 Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fireplan/calculate` | Calculate FIRE projections |
| POST | `/api/fireplan/save` | Serialize plan to JSON |
| POST | `/api/fireplan/load` | Deserialize plan from JSON |
| GET | `/api/assetprices/{symbol}` | Get single asset price |
| POST | `/api/assetprices/batch` | Get multiple asset prices |
| GET | `/api/assetprices/{symbol}/name` | Get company name |
| GET | `/api/assetprices/{symbol}/cagr` | Get historical CAGRs |

### 8.2 Error Response Format

```json
{
  "error": "Human-readable error message"
}
```

### 8.3 Rate Limits & Security

- Request size limit: 5MB
- JSON depth limit: 32 levels
- Portfolio items limit: 1000
- Symbol validation: Alphanumeric, dots, hyphens only

---

## 9. Non-Functional Requirements

### 9.1 Performance

| Metric | Target | Current |
|--------|--------|---------|
| API Response Time | < 500ms | ~200ms |
| Calculation Time (20 years) | < 100ms | ~50ms |
| Frontend Load | < 2s | ~1.5s |
| External API (uncached) | < 1s | 500-1000ms |

### 9.2 Reliability

- Test Coverage: 82.99% line, 69.84% branch, 89.14% method
- Total Tests: 241 (xUnit + Jest)
- Error Handling: Centralized exception handling

### 9.3 Security

| Control | Implementation |
|---------|----------------|
| API Key Storage | User Secrets (dev), Environment Variables (prod) |
| CORS | Restricted to localhost (dev), configurable (prod) |
| Input Validation | Regex validation, size limits |
| Security Headers | X-Frame-Options, X-Content-Type-Options, X-XSS-Protection |
| CSP | Content Security Policy configured |

### 9.4 Maintainability

- Modular service architecture
- Comprehensive documentation
- Well-structured test suites
- Externalized configuration

### 9.5 Accessibility

- Semantic HTML
- Keyboard navigation support
- High contrast colors
- Screen reader compatible labels

---

## 10. Success Metrics

### 10.1 Functional Completeness

- [x] Portfolio management with multiple assets
- [x] Two-phase simulation (accumulation + retirement)
- [x] Tax-aware calculations
- [x] Expense planning with inflation
- [x] Save/load plans
- [x] Real-time asset prices
- [x] Historical CAGR
- [x] Multi-currency support
- [x] Hebrew RTL interface
- [x] Interactive charts

### 10.2 Quality Metrics

| Metric | Status |
|--------|--------|
| Build Status | ✅ Clean compilation |
| Test Suite | ✅ 241 tests passing |
| Line Coverage | ✅ 82.99% |
| Branch Coverage | ✅ 69.84% |
| Method Coverage | ✅ 89.14% |

### 10.3 Future Enhancements

See companion PRD documents:
- **PRD_PORTFOLIO_MANAGEMENT.md** - Enhanced portfolio features
- **PRD_TAX_CALCULATIONS.md** - Advanced tax planning
- **PRD_VISUALIZATION.md** - Additional visualizations
- **[../PRD_RSU_SUPPORT.md](../PRD_RSU_SUPPORT.md)** - RSU grant management (proposal)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| FIRE | Financial Independence, Retire Early |
| CAGR | Compound Annual Growth Rate |
| SWR | Safe Withdrawal Rate (typically 4%) |
| RTL | Right-to-Left (text direction) |
| Cost Basis | Total amount invested (for tax calculations) |
| Profit Ratio | Gains as percentage of portfolio value |

## Appendix B: References

- [FIRE Movement Overview](https://en.wikipedia.org/wiki/FIRE_movement)
- [4% Rule Research](https://www.investopedia.com/terms/f/four-percent-rule.asp)
- [Israeli Capital Gains Tax](https://www.gov.il/en/departments/general/capital_gains_tax)
- [Finnhub API Documentation](https://finnhub.io/docs/api)
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)

---

**End of Document**

*This PRD was reverse-engineered from the implemented application and represents the current state of functionality.*
