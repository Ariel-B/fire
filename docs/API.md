# FIRE Planning Tool - API Documentation

This document describes the REST API endpoints for the FIRE Planning Tool backend.

## Base URL
```
http://localhost:5162/api
```

## Authentication
Currently, the API has no authentication. This may be added in future versions for cloud-based plan storage.

## Rate Limiting

All API endpoints are protected by rate limiting to prevent abuse and ensure fair access:

- **Default Limit**: 100 requests per minute per IP address
- **Rate Limit Response**: `429 Too Many Requests`
- **Configuration**: Configurable via `appsettings.json`

When rate limited, clients will receive a `429 Too Many Requests` response. Implement appropriate retry logic with exponential backoff.

### Rate Limiting by Endpoint

While the global limit is 100 requests per minute, different endpoints have varying resource requirements:

| Endpoint | Typical Use Case | Notes |
|----------|------------------|-------|
| `/api/fireplan/calculate` | Heavy computation | Calculation-intensive, may take 1-2 seconds |
| `/api/fireplan/save` | File serialization | I/O-intensive operation |
| `/api/fireplan/load` | File deserialization | I/O-intensive operation |
| `/api/assetprices/*` | External API calls | Limited by Finnhub API rate limits (60/min on free tier) |
| `/api/ExchangeRate/*` | Cached external calls | Cached for 60 minutes, rarely hits external API |
| `/health` | Health checks | No rate limiting applied (exempt for monitoring) |
| `/api/inflation/israel/historical` | Cached CBS CPI data | Cached for 24 hours |

**Override Mechanism:** Currently none. Future enhancement may allow authenticated users to have higher limits.

**Response Headers:** When rate limiting is active, responses include:
- `X-RateLimit-Limit`: Maximum requests allowed in the window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit window resets (Unix timestamp)

**Best Practices:**
- Implement exponential backoff when receiving 429 responses
- Cache calculation results on the client side when possible
- Use batch endpoints (e.g., `/api/assetprices/batch`) to reduce request count

See [Rate Limiting Documentation](security/RATE_LIMITING.md) for detailed information.

---

## Health Check

### Health Endpoint

**Endpoint:** `GET /health`

**Description:** Returns the health status of the application and its dependencies (e.g., Finnhub API).

**Response:**
- `200 OK` with `"Healthy"` - All services are operating normally
- `200 OK` with `"Degraded"` - Application is running but some dependencies are unavailable (e.g., Finnhub API key not configured or API not responding properly)
- `503 Service Unavailable` with `"Unhealthy"` - Critical services are not functioning

**Example:**
```bash
curl http://localhost:5162/health
```

**Response:**
```
Healthy
```

**Usage in Kubernetes/Docker:**

For Kubernetes deployments, use this endpoint for liveness and readiness probes:

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 5162
  initialDelaySeconds: 10
  periodSeconds: 30
  timeoutSeconds: 5
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health
    port: 5162
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 2
```

For Docker health checks, add to your `Dockerfile`:

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:5162/health || exit 1
```

---

## Endpoints

### 1. Calculate FIRE Plan

**Endpoint:** `POST /api/fireplan/calculate`

**Description:** Calculates a complete FIRE (Financial Independence, Retire Early) plan based on the provided inputs.

**How Monthly Contributions Work:**

Monthly contributions are **immediately invested** in the portfolio and earn market returns starting the next month. This is **dollar-cost averaging with compound growth**, not a savings account:

1. Each month, the existing portfolio grows by the monthly return rate
2. The monthly contribution is then added to the portfolio
3. Next month, both the old portfolio AND the previous contribution earn returns together

This means earlier contributions have more time to compound, which is why starting early makes such a dramatic difference in FIRE planning.

**Optional Inflation-Indexed Contributions:**

When `adjustContributionsForInflation` is `true`, the entered monthly contribution is treated as the **current calendar-year amount**:

1. The contribution remains fixed within the same calendar year
2. The first increase happens on the next **January 1** after the plan start date
3. Each January 1 increase uses the configured `inflationRate`
4. When omitted or `false`, the contribution remains nominally fixed for the full accumulation phase

**RSU Sales Integration (December 2025):**

RSU (Restricted Stock Unit) sales net proceeds are now integrated into the accumulation portfolio contributions:

1. When RSU shares vest and are sold, the net proceeds (after taxes) are added to the portfolio
2. These proceeds are treated like monthly contributions - they increase your cost basis
3. The cost basis affects tax calculations when switching investment strategies at retirement
4. RSU proceeds are tracked in `totalContributions` for accurate unrealized gains reporting

This ensures that RSU compensation is properly accounted for in your FIRE calculations and tax planning. See [RSU PRD](./prd/PRD_RSU_SUPPORT.md) for more details on RSU features.

**Request Body:**
```json
{
  "birthDate": "1994-06-15",
  "birthYear": 1994,
  "earlyRetirementYear": 2045,
  "fullRetirementAge": 67,
  "monthlyContribution": 5000,
  "adjustContributionsForInflation": true,
  "monthlyContributionCurrency": "$",
  "currency": "$",
  "usdIlsRate": 3.6,
  "withdrawalRate": 0.04,
  "inflationRate": 3,
  "capitalGainsTax": 20,
  "pensionNetMonthlyAmount": 2000,
  "pensionCurrency": "$",
  "targetMonthlyExpense": 20000,
  "targetMonthlyExpenseCurrency": "₪",
  "taxBasis": null,
  "expenses": [
    {
      "id": 1,
      "type": "Home Purchase",
      "netAmount": 100000,
      "currency": "$",
      "year": 5,
      "frequencyYears": 1,
      "repetitionCount": 1
    }
  ],
  "accumulationPortfolio": [
    {
      "id": 1,
      "symbol": "VOO",
      "quantity": 100,
      "currentPrice": 450.25,
      "currentPriceCurrency": "$",
      "averageCostPerShare": 400.00,
      "averageCostCurrency": "$",
      "method": "CAGR",
      "value1": 7,
      "value2": 0
    }
  ],
  "retirementPortfolio": [],
  "accumulationAllocation": [],
  "retirementAllocation": [],
  "investmentStrategy": "fixed",
  "currentPortfolioValue": 45025
}
```

**Response (Success - 200 OK):**
```json
{
  "totalContributions": 600000,
  "totalAccumulationContributions": 420000,
  "totalMonthlyContributions": 420000,
  "peakValue": 2500000,
  "grossPeakValue": 2500000,
  "retirementTaxToPay": 0,
  "endValue": 2400000,
  "grossAnnualWithdrawal": 96000,
  "netAnnualWithdrawal": 90000,
  "grossMonthlyExpense": 8000,
  "netMonthlyExpense": 8000,
  "currentValue": 45025,
  "currentCostBasis": 40000,
  "formulaMetadata": {
    "totalContributions": {
      "currentCostBasis": 40000,
      "accumulationContributions": 560000,
      "computedTotalContributions": 600000,
      "usesManualTaxBasis": false,
      "manualTaxBasis": null
    },
    "annualWithdrawal": {
      "peakValueForWithdrawal": 2500000,
      "withdrawalRate": 4,
      "effectiveTaxRate": 6.25
    },
    "peakValue": {
      "usesRetirementPortfolio": false,
      "displayedValueIsGross": false,
      "taxAdjustedPeakValue": 2500000,
      "retirementTaxToPay": 0
    }
  },
  "yearlyData": [
    {
      "year": 2025,
      "portfolioValue": 145025,
      "totalContributions": 60000,
      "annualWithdrawal": 0,
      "phase": "Accumulation",
      "expenses": []
    },
    {
      "year": 2045,
      "portfolioValue": 2500000,
      "totalContributions": 600000,
      "annualWithdrawal": 96000,
      "phase": "Retirement",
      "expenses": []
    }
  ],
  "accumulationPortfolio": [
    {
      "id": 1,
      "symbol": "VOO",
      "quantity": 100,
      "currentPrice": 450.25,
      "currentPriceCurrency": "$",
      "averageCostPerShare": 400.00,
      "averageCostCurrency": "$",
      "method": "CAGR",
      "value1": 7,
      "value2": 0
    }
  ],
  "retirementPortfolio": [],
  "accumulationAllocation": [],
  "retirementAllocation": [],
  "accumulationWeightedReturn": 7,
  "retirementWeightedReturn": 0
}
```

**Response (Error - 400 Bad Request):**
```json
{
  "error": "Invalid birth year"
}
```

### 2. Save FIRE Plan

**Endpoint:** `POST /api/fireplan/save`

**Description:** Saves a FIRE plan to JSON format for later retrieval.

**Frontend behavior notes:**
- The browser UI save workflow is implemented in `wwwroot/ts/persistence/plan-persistence.ts`.
- When the File System Access API is available, repeated **Save** operations reuse the last selected file handle instead of reopening the save picker.
- Browsers without native file-handle support automatically fall back to downloading a JSON file.

**Request Body:**
```json
{
  "inputs": {
    "birthDate": "1994-06-15",
    "birthYear": 1994,
    "earlyRetirementYear": 2045,
    "fullRetirementAge": 67,
    "monthlyContribution": 5000,
    "pensionNetMonthlyAmount": 2000,
    "pensionCurrency": "$",
    "currency": "$",
    ...
  },
  "accumulationPortfolio": [...],
  "retirementPortfolio": [...],
  "expenses": [...]
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": "{ ... JSON string ... }"
}
```

### 3. Load FIRE Plan

**Endpoint:** `POST /api/fireplan/load`

**Description:** Loads a previously saved FIRE plan from JSON format.

**Frontend behavior notes:**
- The browser UI accepts both current flat saved plans and older payloads that wrap user fields under `inputs`.
- Legacy money fields such as `averageCostPerShare`, `averageCostCurrency`, numeric `currentPrice`, and legacy expense `amount` values are normalized during load.
- Saved display currency is restored, but saved exchange rates are ignored; the frontend fetches a fresh USD/ILS rate after loading for current-market accuracy.
- If native open-file support is unavailable or the picker is cancelled, the UI falls back to a temporary `<input type="file">` flow.

**Request Body:**
```json
{
  "jsonData": "{ ... JSON string ... }"
}
```

**Response (Success - 200 OK):**
```json
{
  "success": true,
  "data": {
    "inputs": { ... },
    "accumulationPortfolio": [...],
    ...
  }
}
```

### 4. Export FIRE Plan to Excel

**Endpoint:** `POST /api/Export/excel`

**Description:** Generates an Excel workbook for the latest FIRE plan scenario.

**Frontend behavior notes:**
- The export workflow is orchestrated by `wwwroot/ts/persistence/plan-persistence.ts`.
- Before posting to this endpoint, the browser waits for the latest pending calculation snapshot so the export matches the newest user inputs.
- The export modal requires a scenario name, supports optional notes, and aborts cleanly if the user cancels.
- The export button enters a spinner/disabled state for the duration of the request and is restored on success or failure.

### 5. Get Asset Price

**Endpoint:** `GET /api/assetprices/{symbol}`

**Description:** Retrieves current price for a specific asset symbol from Finnhub.

**Parameters:**
- `symbol` (path parameter, required): Asset ticker symbol (e.g., "AAPL", "MSFT", "IBIT")

**Response (Success - 200 OK):**
```json
{
  "symbol": "AAPL",
  "price": 185.50,
  "currency": "USD",
  "timestamp": "2024-11-18T15:30:00Z"
}
```

**Response (Error - 404 Not Found):**
```json
{
  "error": "Price not found for symbol INVALID"
}
```

### 6. Get Batch Asset Prices

**Endpoint:** `POST /api/assetprices/batch`

**Description:** Retrieves current prices for multiple asset symbols at once.

**Request Body:**
```json
{
  "symbols": ["AAPL", "MSFT", "GOOGL"]
}
```

**Response (Success - 200 OK):**
```json
{
  "prices": [
    {
      "symbol": "AAPL",
      "price": 185.50,
      "currency": "USD",
      "timestamp": "2024-11-18T15:30:00Z"
    },
    {
      "symbol": "MSFT",
      "price": 378.25,
      "currency": "USD",
      "timestamp": "2024-11-18T15:30:00Z"
    }
  ],
  "errors": []
}
```

### 7. Get USD/ILS Exchange Rate

**Endpoint:** `GET /api/ExchangeRate/usd-ils`

**Description:** Retrieves the current USD to ILS exchange rate from external APIs (exchangerate.host with Frankfurter fallback). Results are cached for 60 minutes to reduce API calls.

**Response (Success - 200 OK):**
```json
{
  "baseCurrency": "USD",
  "targetCurrency": "ILS",
  "rate": 3.65,
  "timestamp": "2025-01-18T10:30:00Z",
  "source": "exchangerate.host"
}
```

**Response (Degraded - 200 OK with default rate):**
When all external APIs fail, a default rate of 3.6 is returned:
```json
{
  "baseCurrency": "USD",
  "targetCurrency": "ILS",
  "rate": 3.6,
  "timestamp": "2025-01-18T10:30:00Z",
  "source": "default"
}
```

**Note:** Exchange rates are automatically fetched when:
- The application starts
- A saved plan is loaded
- The user refreshes exchange rate data

The application **no longer saves** exchange rates in plan JSON files. All rates are fetched fresh from external APIs to ensure accuracy.

### 8. Get Exchange Rate (Any Currency Pair)

**Endpoint:** `GET /api/ExchangeRate/{from}/{to}`

**Description:** Retrieves exchange rate between any two currency codes.

**Parameters:**
- `from` (path parameter, required): Base currency code (e.g., "USD", "EUR")
- `to` (path parameter, required): Target currency code (e.g., "ILS", "GBP")

**Example:**
```
GET /api/ExchangeRate/usd/ils
GET /api/ExchangeRate/EUR/USD
```

**Response (Success - 200 OK):**
```json
{
  "baseCurrency": "USD",
  "targetCurrency": "ILS",
  "rate": 3.65,
  "timestamp": "2025-01-18T10:30:00Z",
  "source": "exchangerate.host"
}
```

---

### 9. Get Israel Historical Inflation

**Endpoint:** `GET /api/inflation/israel/historical`

**Description:** Returns Israel CPI historical December values and compound average inflation statistics (CAGR) for common periods (1, 5, 10, 15, 20, 30 years). Data is sourced from the official Israel Central Bureau of Statistics (CBS) CPI index id=120010 and cached on the server for 24 hours.

**Response (Success - 200 OK):**
```json
{
  "dataPoints": [
    { "year": 2024, "inflationRate": 3.2, "indexValue": 108.4 },
    { "year": 2023, "inflationRate": 3.0, "indexValue": 105.0 }
  ],
  "stats": [
    { "periodYears": 1, "averageInflation": 0.032, "startYear": 2023, "endYear": 2024 }
  ],
  "source": "CBS",
  "lastUpdated": "2025-01-18T10:30:00Z"
}
```

**Response (Degraded - 503 Service Unavailable):**
```json
{ "error": "Failed to fetch Israel inflation data from CBS" }
```


---

## Request/Response Details

### Currency Support
- **USD**: US Dollar (default)
- **ILS**: Israeli Shekel

The API accepts currency specifications in request bodies and returns values in the requested currency.

**Money Type (January 2025):**
The backend uses a `Money` value object for type-safe currency handling. The API maintains backward compatibility:
- **Legacy format:** `"averageCostPerShare": 400.00, "averageCostCurrency": "$"` (still supported for loading old plans)
- **New format:** `"averageCost": { "amount": 400.00, "currency": "USD" }` (recommended)

Both formats are accepted when loading plans. The API responses may include both formats for compatibility.

### Calculation Fields Explained

#### Input Parameters

- **birthDate**: Your full birth date in ISO format (e.g., "1994-06-15") - used for precise pension timing
- **birthYear**: Your birth year (e.g., 1994) - derived from birthDate for backward compatibility
- **earlyRetirementYear**: Target year for early retirement
- **fullRetirementAge**: Your full retirement age (e.g., 67)
- **monthlyContribution**: Monthly investment amount
- **monthlyContributionCurrency**: Currency for contributions ("$" or "₪")
- **currency**: Display currency ("$" or "₪")
- **usdIlsRate**: USD to ILS exchange rate - **automatically fetched** from external APIs (exchangerate.host/Frankfurter) on app startup and when loading plans. Default fallback: 3.6 if APIs are unavailable. This field is maintained for backward compatibility when loading old saved plans, but new plans will fetch rates dynamically.
- **withdrawalRate**: Safe withdrawal rate (typically 0.04 for 4% rule)
- **inflationRate**: Expected annual inflation in percentage (e.g., 3 for 3%)
- **capitalGainsTax**: Capital gains tax rate in percentage (e.g., 20 for 20%)
- **pensionNetMonthlyAmount**: Net monthly pension amount (fixed nominal, not inflation-indexed)
- **pensionCurrency**: Currency for pension ("$" or "₪")
- **targetMonthlyExpense**: Target net monthly expense in retirement (e.g., 20000)
- **targetMonthlyExpenseCurrency**: Currency for target expense ("$" or "₪")
- **taxBasis**: Optional - specify contribution basis for tax calculation
- **currentPortfolioValue**: Current total portfolio value for calculations

**Pension Calculation:**
The pension offset is applied monthly starting the calendar month after the user reaches full retirement age:
```
Pension Start = BirthDate + FullRetirementAge years → next calendar month
Monthly Withdrawal = max(0, Base Withdrawal - Pension Net Amount)
```
The pension is fixed nominal (not inflation-indexed) and reduces the required withdrawal from the investment portfolio.

**Target Portfolio Calculation:**
The target monthly expense is used to calculate the portfolio value needed to sustain that expense level:
```
Target Portfolio = 12 × monthlyExpense / (1 - taxRate) / withdrawalRate
```
This line is displayed on the growth chart with inflation adjustment for each year.

#### Assets
- **symbol**: Asset ticker symbol (e.g., "AAPL", "IBIT", "BND")
- **quantity**: Number of shares owned
- **currentPrice**: Current price per share (fetched from Finnhub)
- **currency**: Currency of the asset

#### Planned Expenses

- **type**: Description of the expense (e.g., "Home Purchase")
- **netAmount**: Amount of the expense
- **currency**: Currency of the expense ("$" or "₪")
- **year**: Which year the expense occurs (relative to current)
- **frequencyYears**: How often the expense repeats (1 = yearly, etc.)
- **repetitionCount**: How many times it repeats (1 = one-time event)

### Output Metrics
- **portfolioValue**: Total investment portfolio value
- **safeWithdrawalRate**: 4% rule withdrawal amount
- **yearsToRetirement**: Time until financial independence achieved

---

## Error Handling

All error responses follow this standardized format using `ApiErrorResponse`:
```json
{
  "error": "Human-readable error description"
}
```

### Common Error Codes
- **400 Bad Request**: Invalid input parameters
- **404 Not Found**: Resource not found (e.g., unknown asset symbol)
- **500 Internal Server Error**: Server-side calculation or data fetch error

---

## Examples

### Example 1: Basic FIRE Calculation
```bash
curl -X POST http://localhost:5162/api/fireplan/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "initialCapital": 100000,
    "monthlyContribution": 5000,
    "currentAge": 30,
    "retirementAge": 50,
    "lifeExpectancy": 95,
    "annualExpense": 50000,
    "plannedExpenses": [],
    "assets": [],
    "inflationRate": 0.03,
    "investmentReturnRate": 0.07,
    "baseCurrency": "USD"
  }'
```

### Example 2: Get Asset Price
```bash
curl http://localhost:5162/api/assetprices/AAPL
```

---

## Future API Enhancements

- [ ] User authentication and plan storage
- [ ] Plan sharing and collaboration features
- [ ] Historical plan comparisons
- [ ] Real-time portfolio updates
- [ ] Tax optimization recommendations
- [ ] API rate limiting and quotas

---

## Support

For questions or issues with the API, please open an issue on the [GitHub repository](https://github.com/Ariel-B/fire).
