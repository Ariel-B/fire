# Product Requirements Document: Portfolio Management

**Version:** 1.1  
**Last Updated:** December 2025  
**Owner:** Product Team  
**Status:** Reverse-Engineered from Implementation  
**Parent PRD:** PRD_FIRE_PLANNING_TOOL.md

---

## Table of Contents

1. [Overview](#1-overview)
2. [Accumulation Portfolio](#2-accumulation-portfolio)
3. [Retirement Portfolio](#3-retirement-portfolio)
4. [Asset Data Model](#4-asset-data-model)
5. [Return Calculation Methods](#5-return-calculation-methods)
6. [Real-Time Price Integration](#6-real-time-price-integration)
7. [Portfolio Analytics](#7-portfolio-analytics)
8. [User Interface Specifications](#8-user-interface-specifications)
9. [Validation Rules](#9-validation-rules)
10. [Future Enhancements](#10-future-enhancements)

---

## 1. Overview

### 1.1 Purpose

The Portfolio Management module enables users to define, track, and analyze their investment portfolios for FIRE planning. It supports two distinct portfolio types:

1. **Accumulation Portfolio**: Assets held during wealth-building years
2. **Retirement Portfolio**: Asset allocation strategy for withdrawal phase

### 1.2 Key Features

| Feature | Description |
|---------|-------------|
| Multi-asset tracking | Track unlimited number of assets with different properties |
| Real-time prices | Auto-fetch current prices from Finnhub API |
| Multiple return methods | CAGR, Total Growth, Target Price |
| Cost basis tracking | Track purchase costs for tax calculations |
| Exposure analysis | Calculate portfolio concentration by asset |
| Currency flexibility | Support USD and ILS with conversion |

---

## 2. Accumulation Portfolio

### 2.1 Purpose

The Accumulation Portfolio represents the user's current holdings that will grow during the wealth-building phase until retirement. Each asset contributes to the overall portfolio return based on its weight.

### 2.2 Portfolio Table Structure

| Column | Hebrew Label | Type | Sortable | Description |
|--------|--------------|------|----------|-------------|
| Asset | נכס | Text | No | Stock symbol with company name |
| Quantity | כמות | Number | No | Shares owned |
| Currency | מטבע | Select | No | Price currency ($/₪) |
| Current Price | מחיר נוכחי | Decimal | No | Current share price |
| Average Cost | מחיר עלות ממוצע | Decimal | No | Cost basis per share |
| Cost Basis | בסיס עלות | Calculated | Yes | Quantity × Average Cost |
| Market Value | שווי שוק | Calculated | Yes | Quantity × Current Price |
| **Current Market Cap** | **שווי שוק חברה (נוכחי)** | **Calculated** | **No** | **Company market capitalization (from API)** |
| **Projected Market Cap** | **שווי חברה בפרישה** | **Calculated** | **No** | **Projected market cap at retirement year** |
| Gain/Loss | רווח/הפסד | Calculated | Yes | Market Value - Cost Basis |
| Exposure | חשיפה (%) | Calculated | Yes | % of total portfolio |
| **Value Multiplier** | **פי כמה הנכס בפרישה** | **Calculated** | **No** | **Asset value multiplier by retirement (e.g., 6.73×)** |
| Method | שיטת חישוב | Select | No | Return calculation method |
| Parameters | פרמטרים | Inputs | No | Method-specific values |
| Actions | פעולות | Buttons | No | Edit, Delete |

### 2.3 Portfolio Summary Section

**Location:** Above the asset table

**Components:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  📊 סקירת תיק הצבירה                                               │
├────────────────────────────────────┬────────────────────────────────┤
│                                    │  📋 סיכום התיק                 │
│  [Donut Chart: Start]  [Donut: End]│  ─────────────────            │
│                                    │  מספר נכסים: 5                │
│  Start Value: ₪X                   │  שווי כולל: ₪XXX,XXX          │
│  End Value: ₪Y                     │  בסיס עלות: ₪XXX,XXX          │
│                                    │  רווח/הפסד: ₪XX,XXX           │
└────────────────────────────────────┴────────────────────────────────┘
```

### 2.4 Donut Charts

**Chart 1: Portfolio at Start of Accumulation**
- Shows current asset allocation by market value
- Each slice represents one asset
- Center displays total value

**Chart 2: Portfolio Before Retirement**
- Shows projected asset allocation
- Based on expected returns and contributions
- Accounts for planned expenses

---

## 3. Retirement Portfolio

### 3.1 Purpose

The Retirement Portfolio defines a separate asset allocation strategy for the withdrawal phase. When enabled, it triggers a tax event at retirement (selling accumulation assets) and switches to a typically more conservative allocation.

### 3.2 Enable/Disable Toggle

**Location:** Tab navigation, checkbox next to "תיק פרישה" tab

**Behavior:**
- **Disabled (Default)**: Accumulation portfolio continues into retirement
- **Enabled**: Switches to retirement allocation at retirement year, triggering tax event

### 3.3 Allocation-Based Model

Unlike the accumulation portfolio (specific assets), the retirement portfolio uses allocation percentages:

| Column | Hebrew Label | Type | Description |
|--------|--------------|------|-------------|
| Asset Type | סוג נכס | Text | Asset class name |
| Target % | אחוז הקצאה | Number | Target allocation percentage |
| Expected Return | תשואה צפויה | Number | Expected annual return |
| Actions | פעולות | Buttons | Edit, Delete |

### 3.4 Default Allocations

The system can generate age-based allocations:

```
Stock Percentage = max(30%, 100 - Current Age)  // for retirement
Bond Percentage = 100% - Stock Percentage
```

**Example (Age 50 at retirement):**
| Asset Type | Target % | Expected Return |
|------------|----------|-----------------|
| מניות | 50% | 7.0% |
| אגרות חוב | 50% | 3.0% |

### 3.5 Weighted Return Calculation

```
Weighted Return = Σ (Target% × Expected Return) / Σ Target%
```

### 3.6 Tax Event at Retirement

When `useRetirementPortfolio = true`:

1. Calculate gains on accumulation portfolio
2. Apply capital gains tax to gains
3. Net proceeds become cost basis for retirement portfolio
4. Profit ratio resets to 0

---

## 4. Asset Data Model

### 4.1 PortfolioAsset Model

```typescript
interface PortfolioAsset {
  id: number;              // Unique identifier
  symbol: string;          // Stock ticker (e.g., "VOO")
  quantity: number;        // Number of shares
  currentPrice: number;    // Current price per share
  currentPriceCurrency: string;  // "$" or "₪"
  averageCostPerShare: number;   // Cost basis per share
  averageCostCurrency: string;   // "$" or "₪"
  method: string;          // "CAGR" | "צמיחה כוללת" | "מחיר יעד"
  value1: number;          // Expected return % or growth %
  value2: number;          // Target price (for target method)
  assetName?: string;      // Company name (fetched from API)
  marketCapUsd?: number | null;  // Company market cap in USD (from API)
  historicalCAGRs?: Record<number, number>;  // Historical CAGR values by year
  cagrSource?: string;     // Source of CAGR value ("manual" or year number)
  priceSource?: string;    // "api" | "manual"
  loadingCAGR?: boolean;   // Whether CAGR data is being fetched
}
```

### 4.2 PortfolioAllocation Model

```typescript
interface PortfolioAllocation {
  id: number;              // Unique identifier
  assetType: string;       // Asset class name
  targetPercentage: number; // Allocation percentage (0-100)
  expectedAnnualReturn: number; // Expected return percentage
  description?: string;    // Optional description
}
```

---

## 5. Return Calculation Methods

### 5.1 Method Overview

| Method | Hebrew | Use Case | Parameters |
|--------|--------|----------|------------|
| CAGR | CAGR | Historical average return | Value1 = Annual % |
| Total Growth | צמיחה כוללת | Same as CAGR | Value1 = Annual % |
| Target Price | מחיר יעד | Analyst price targets | Value1 = ignored, Value2 = Target |

### 5.2 CAGR Method

**Formula:**
```
Future Value = Current Value × (1 + Annual Return)^Years
```

**Input:** User specifies expected annual return percentage

**Usage:** Most common for index funds and ETFs with known historical returns

### 5.3 Target Price Method

**Formula:**
```
Annual Return = ((Target Price / Current Price)^(1/Years) - 1) × 100
```

**Input:** User specifies a target price

**Usage:** For individual stocks with analyst price targets

**Years:** Uses years to retirement or defaults to 10 years

### 5.4 Weighted Portfolio Return

The overall portfolio return is weighted by asset value:

```csharp
foreach (asset in portfolio) {
  assetWeight = assetValue / totalPortfolioValue;
  weightedReturn += assetWeight × assetAnnualReturn;
}
```

---

## 6. Real-Time Price Integration

### 6.1 Finnhub API Integration

**Endpoints Used:**

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /quote?symbol={symbol}` | Current price | `{ c: price, d: change, ... }` |
| `GET /stock/profile2?symbol={symbol}` | Company name | `{ name: "Company Inc." }` |
| `GET /stock/candle?symbol={symbol}&resolution=M` | Historical prices | `{ c: [prices], t: [timestamps] }` |

### 6.2 Price Fetch Flow

```
User enters symbol
       ↓
Click "Fetch Price" or auto-trigger
       ↓
Frontend calls: GET /api/assetprices/{symbol}
       ↓
Backend validates symbol (regex: ^[A-Za-z0-9.\-]+$)
       ↓
Backend calls Finnhub API
       ↓
Returns price to frontend
       ↓
Updates current price field
       ↓
Recalculates portfolio values
```

### 6.3 Historical CAGR Fetch

**Timeframes:** 1Y, 3Y, 5Y, 10Y, 15Y, 20Y

**Formula:**
```
CAGR = ((Current Price / Historical Price)^(1/Years) - 1) × 100
```

**Fallback Chain:**
1. Try Finnhub `/stock/candle` endpoint
2. If fails, try Yahoo Finance `/v8/finance/chart`

### 6.4 Error Handling

| Error | User Experience |
|-------|-----------------|
| Symbol not found | Display "Symbol not found" message |
| API rate limit | Graceful degradation, use manual entry |
| Network error | Continue without price, allow manual input |

---

## 7. Portfolio Analytics

### 7.1 Calculated Metrics

| Metric | Hebrew | Formula |
|--------|--------|---------|
| Total Cost Basis | בסיס עלות כולל | Σ (Quantity × Average Cost) |
| Total Market Value | שווי שוק כולל | Σ (Quantity × Current Price) |
| Total Gain/Loss | רווח/הפסד כולל | Market Value - Cost Basis |
| Gain/Loss % | אחוז רווח/הפסד | (Gain/Loss / Cost Basis) × 100 |
| Weighted Return | תשואה משוקללת | Σ (Weight × Return) |
| Asset Count | מספר נכסים | Number of assets in portfolio |

### 7.2 Exposure Calculation

```
Exposure(asset) = (Quantity × Current Price) / Total Portfolio Value × 100
```

### 7.3 Market Cap Calculations

**Current Market Cap:**
- Fetched from Finnhub API `/stock/profile2` endpoint
- Value in `MarketCapitalization` field (scaled from millions to full USD)
- Displayed in asset's selected currency
- Format: B (billions) or T (trillions) with compact notation

**Projected Market Cap:**
```
Projected Market Cap = Current Market Cap × (1 + Annual Return)^Years To Retirement
```

**Value Multiplier:**
```
Value Multiplier = (1 + Annual Return)^Years To Retirement
```

For Target Price method:
```
Value Multiplier = Target Price / Current Price
```

**Display Format:** Shows as `X.XX×` (e.g., `6.73×` for 10% CAGR over 20 years)

### 7.4 Currency Conversion

All calculations internally use USD. Conversion applies:

```csharp
if (currency == "₪") {
  amountUSD = amount / usdIlsRate;
} else {
  amountUSD = amount;
}
```

---

## 8. User Interface Specifications

### 8.1 Add Asset Flow

```
1. Click "➕ הוסף נכס חדש" button
2. New row appears in table
3. Fill in required fields:
   - Symbol (text input)
   - Quantity (number input)
   - Current Price (auto-fetch available)
   - Average Cost (number input)
   - Method (dropdown)
   - Return parameters (based on method)
4. Press Enter or click outside to save
5. Portfolio recalculates automatically
```

### 8.2 Edit Asset Flow

```
1. Direct inline editing in table cells
2. Changes save on blur or Enter
3. Automatic recalculation after each change
```

### 8.3 Delete Asset Flow

```
1. Click trash icon (🗑️) in Actions column
2. Confirmation not required (undo not available)
3. Asset removed from portfolio
4. Portfolio recalculates
```

### 8.4 Sort Table Flow

```
1. Click sortable column header
2. First click: Sort ascending
3. Second click: Sort descending
4. Third click: Return to original order
5. Visual indicator (↕) shows sort direction
```

### 8.5 Price Fetch UI

**In Table:**
- Small refresh icon next to price field
- Click to fetch latest price
- Spinner while loading

**Batch Fetch:**
- "Refresh All Prices" button above table
- Updates all assets with valid symbols

---

## 9. Validation Rules

### 9.1 Symbol Validation

| Rule | Error Message (Hebrew) |
|------|------------------------|
| Required | "יש להזין סימול נכס" |
| Format (alphanumeric, dots, hyphens) | "סימול לא תקין" |
| Max length 100 | "סימול ארוך מדי" |

### 9.2 Quantity Validation

| Rule | Error Message |
|------|---------------|
| Required | "יש להזין כמות" |
| Positive number | "כמות חייבת להיות חיובית" |
| Reasonable range | "כמות חורגת מטווח סביר" |

### 9.3 Price Validation

| Rule | Error Message |
|------|---------------|
| Non-negative | "מחיר לא יכול להיות שלילי" |
| Reasonable range (0-1M) | "מחיר חורג מטווח סביר" |

### 9.4 Allocation Validation

| Rule | Error Message |
|------|---------------|
| Percentages 0-100 | "אחוז חייב להיות בין 0 ל-100" |
| Total = 100% (warning only) | "סה״כ ההקצאה אינו 100%" |
| Return rate -100 to 100 | "תשואה חייבת להיות בין -100 ל-100" |

---

## 10. Future Enhancements

### 10.1 Planned Features

| Feature | Priority | Description |
|---------|----------|-------------|
| Dividend tracking | Medium | Track dividend income and reinvestment |
| Lot tracking | Medium | FIFO/LIFO/Specific lot selection for tax |
| Rebalancing alerts | Low | Notify when allocation drifts |
| Import from broker | Low | CSV/API import from brokerage accounts |
| Asset correlation | Low | Analyze portfolio diversification |

### 10.2 RSU Support

Full RSU (Restricted Stock Unit) support is documented in separate PRD:
**[../PRD_RSU_SUPPORT.md](../PRD_RSU_SUPPORT.md)**

### 10.3 Multi-Account Support

Future enhancement to support:
- Multiple brokerage accounts
- Tax-advantaged accounts (קרנות השתלמות, קופות גמל)
- Separate tracking per account type

---

## Appendix A: Sample Portfolio Data

### A.1 Example Accumulation Portfolio

```json
{
  "accumulationPortfolio": [
    {
      "id": 1,
      "symbol": "VOO",
      "quantity": 100,
      "currentPrice": 450.25,
      "currentPriceCurrency": "$",
      "averageCostPerShare": 380.00,
      "averageCostCurrency": "$",
      "method": "CAGR",
      "value1": 10,
      "value2": 0
    },
    {
      "id": 2,
      "symbol": "VTI",
      "quantity": 50,
      "currentPrice": 280.50,
      "currentPriceCurrency": "$",
      "averageCostPerShare": 220.00,
      "averageCostCurrency": "$",
      "method": "CAGR",
      "value1": 9.5,
      "value2": 0
    },
    {
      "id": 3,
      "symbol": "AAPL",
      "quantity": 25,
      "currentPrice": 185.00,
      "currentPriceCurrency": "$",
      "averageCostPerShare": 150.00,
      "averageCostCurrency": "$",
      "method": "מחיר יעד",
      "value1": 0,
      "value2": 250.00
    }
  ]
}
```

### A.2 Example Retirement Allocation

```json
{
  "retirementAllocation": [
    {
      "id": 1,
      "assetType": "מניות",
      "targetPercentage": 50,
      "expectedAnnualReturn": 7.0,
      "description": "מדדי מניות רחבים"
    },
    {
      "id": 2,
      "assetType": "אגרות חוב",
      "targetPercentage": 40,
      "expectedAnnualReturn": 3.0,
      "description": "אגרות חוב ממשלתיות"
    },
    {
      "id": 3,
      "assetType": "מזומן",
      "targetPercentage": 10,
      "expectedAnnualReturn": 1.5,
      "description": "קרנות כספיות"
    }
  ]
}
```

---

## Appendix B: Related Components

### B.1 Backend Services

| Service | File | Role |
|---------|------|------|
| PortfolioCalculator | src/Services/PortfolioCalculator.cs | Value calculations |
| CurrencyConverter | src/Services/CurrencyConverter.cs | USD/ILS conversion |
| FireCalculator | src/Services/FireCalculator.cs | Weighted return calculation |
| FinnhubService | src/Services/FinnhubService.cs | Price fetching |

### B.2 API Endpoints

| Endpoint | Method | Purpose | Response Fields |
|----------|--------|----------|----------------|
| /api/assetprices/{symbol} | GET | Single price | `symbol`, `price`, `currency`, `timestamp` |
| /api/assetprices/batch | POST | Multiple prices | `prices[]`, `requestedCount`, `foundCount` |
| /api/assetprices/{symbol}/name | GET | Company name + market cap | `symbol`, `name`, `marketCapUsd`, `timestamp` |
| /api/assetprices/{symbol}/cagr | GET | Historical CAGRs | `symbol`, `cagrs[]`, `timestamp` |

### B.3 Frontend Components

| Component | Location | Role |
|-----------|----------|------|
| Accumulation Table | index.html #accumulationTable | Asset management |
| Retirement Table | index.html #retirementAllocationTable | Allocation management |
| Portfolio Charts | Chart.js instances | Visualization |

---

**End of Document**

*This PRD represents the current implementation of portfolio management features in the FIRE Planning Tool.*
