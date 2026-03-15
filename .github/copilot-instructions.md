# FIRE Planning Tool - Copilot Instructions

A production-ready C# ASP.NET Core 9.0 web application for FIRE (Financial Independence, Retire Early) planning with Hebrew RTL interface, real-time market data, and comprehensive financial modeling.

## 🎯 Big Picture Architecture

**Technology Stack:**
- **Backend**: ASP.NET Core 9.0 Web API with dependency injection
- **Frontend**: TypeScript/ES6 modules (compiled to ES2020), Tailwind CSS, Chart.js
- **Testing**: xUnit (backend with FluentAssertions), Jest (frontend)
- **External APIs**: 
  - Finnhub for real-time stock/ETF/bond prices and CAGR data
  - exchangerate.host & Frankfurter API for live USD/ILS exchange rates
- **Deployment**: Docker + docker-compose ready, Kubernetes health checks

**Core Domain Patterns:**
1. **Strategy Pattern**: `IReturnCalculationStrategy` implementations (CAGR, Total Growth, Target Price) injected via factory
2. **Result Pattern**: Controllers use Result<T> for explicit error handling (see `ValidationExtensions.ToResult()`)
3. **Service Orchestration**: `FireCalculator` orchestrates specialized calculators (accumulation, retirement, tax, expense, portfolio growth)
4. **Repository Pattern**: `IAssetDataRepository` abstracts Finnhub API for testability
5. **Validation Pipeline**: FluentValidation with automatic model validation in controllers

**Critical Data Flow:**
```
User Input (Hebrew UI) 
  → TypeScript Validation (wwwroot/ts/utils/validator.ts)
  → API Controller (FirePlanController.Calculate)
  → FluentValidation (FirePlanInputValidator)
  → FireCalculator (orchestrates 6 specialized calculators)
  → AccumulationPhaseCalculator (years before retirement)
    → PortfolioGrowthCalculator (applies strategy pattern for each asset)
  → RetirementPhaseCalculator (withdrawal phase with tax)
  → TaxCalculator (capital gains, RSU Section 102)
  → Result displayed with Chart.js visualizations
```

## 🔧 Essential Developer Workflows

### Setup & Configuration
```bash
# REQUIRED: Set Finnhub API key (free from https://finnhub.io)
dotnet user-secrets init
dotnet user-secrets set "Finnhub:ApiKey" "your_key_here"

# Install dependencies
dotnet restore
npm install

# Compile TypeScript (required before running)
npx tsc                    # or npm run build
npx tsc --watch            # or npm run dev for continuous compilation
```

### Build & Run
```bash
dotnet build               # Verify compilation
dotnet run                 # Runs on http://localhost:5162

# Docker (alternative)
docker-compose up -d       # Includes API key from .env file
```

### Testing Workflow
```bash
# Run ALL tests (recommended before commits)
make test                  # Runs backend + frontend unit/integration tests
make test-e2e              # Runs Playwright end-to-end tests

# Backend only (xUnit tests)
dotnet test fire.sln

# Frontend only (Jest)
npm test

# Coverage reports
make test-coverage
# Backend: artifacts/coverage/backend/coverage.opencover.xml
# Frontend: artifacts/coverage/frontend/index.html
```

**Important for agents:** In this repository, a request to "run all tests" means running the backend xUnit suite, the frontend Jest suite, and the Playwright E2E suite. Do **not** rely only on editor-integrated test runners such as `runTests`, because they may omit the Jest frontend suite and they do not cover the Playwright browser tests.

Use one of these approaches:
- `make test && make test-e2e`
- `dotnet test fire.sln --no-restore`, `npm test -- --runInBand`, and `npm run test:e2e`

> **📊 Test Metrics & Coverage:** See [docs/TEST_COVERAGE_REPORT.md](../docs/TEST_COVERAGE_REPORT.md) for current test counts, coverage percentages, and comprehensive analysis.

### Debugging Tips
- Backend logs use structured logging: `_logger.LogInformation("Processing plan for year {Year}", year)`
- Frontend: Compiled JS is in `wwwroot/js/` with source maps
- Health endpoint: `GET /health` (checks Finnhub API connectivity)
- Rate limiting: 100 req/min default (configurable in `appsettings.json`)

## 📁 Documentation Organization

### Main Documentation Folders

The `docs/` directory is organized into the following main subfolders:

```
docs/
├── ADRs/                    # Architecture Decision Records
├── architecture/            # System architecture and design documents
├── images/                  # Documentation images and diagrams
├── prd/                     # Product Requirements Documents
├── reviews/                 # Code reviews and quality analysis reports
└── security/                # Security documentation and policies
```

**Purpose of Each Folder:**

- **ADRs** (`docs/ADRs/`): Architecture Decision Records documenting important architectural choices
- **architecture** (`docs/architecture/`): System design documents, diagrams, and architecture overviews
- **images** (`docs/images/`): Visual assets used in documentation (diagrams, screenshots, etc.)
- **prd** (`docs/prd/`): Product Requirements Documents and feature specifications
- **reviews** (`docs/reviews/`): Storage location for future code reviews, analysis reports, and improvement plans
- **security** (`docs/security/`): Security policies, threat models, and security-related documentation

### Code Reviews and Analysis Reports

**Location**: All code reviews, quality analysis reports, and improvement plans should be placed in:
```
docs/reviews/YYYY-MM-topic-name/
```

**Structure**:
- Each review gets its own dated folder under `docs/reviews/`
- Use the format `YYYY-MM-topic-name/`
- Include a `README.md` in each review folder summarizing the review and linking to supporting documents

**When creating reviews**:
1. Create a new dated folder under `docs/reviews/`
2. Use format: `YYYY-MM-topic-name`
3. Place all review documents in that folder
4. Create a README.md that links to main documents
5. Reference the review folder from main documentation if needed

## 📐 Project-Specific Conventions

### Backend (C#)

**Service Registration Pattern** (src/Program.cs):
```csharp
// Register ALL strategy implementations from CalculationConstants
foreach (var strategyType in CalculationConstants.GetReturnCalculationStrategyTypes())
{
    builder.Services.AddSingleton(typeof(IReturnCalculationStrategy), strategyType);
}
builder.Services.AddSingleton<IReturnCalculationStrategyFactory, ReturnCalculationStrategyFactory>();
```
**Why?** Strategies are registered dynamically to stay in sync with `CalculationConstants` (single source of truth).

**Error Response Pattern**:
```csharp
// ALWAYS use ApiErrorResponse for consistency
return BadRequest(new ApiErrorResponse("Withdrawal rate must be between 0 and 100"));

// NEVER return plain strings or anonymous objects
// return BadRequest("error message");  // ❌ Wrong
```

**Validation Pattern**:
```csharp
// Controllers inject FluentValidation validators
private readonly IValidator<FirePlanInput> _inputValidator;

// Use extension methods from ValidationExtensions.cs
var validationResult = await _inputValidator.ValidateAsync(input);
if (!validationResult.IsValid)
{
    return validationResult.ToResult<FireCalculationResult>().ToActionResult(this);
}
```

**Constant Synchronization** (CRITICAL):
- `src/Services/CalculationConstants.cs` and `wwwroot/ts/config/calculation-constants.ts` **MUST be kept in sync**
- Both define: tax rates, default returns, validation ranges, currency formats
- Change one → change both

### Frontend (TypeScript)

**Module System** (ES2020):
```typescript
// All imports use .js extension (TypeScript compiles .ts → .js)
import { formatCurrency } from './utils/formatter.js';  // ✅ Correct
import { formatCurrency } from './utils/formatter';     // ❌ Wrong
```

**Global API Surface** (app.ts):
```typescript
// HTML calls into the compatibility-focused global window.fireApp object
(window as any).fireApp = {
    calculateAndUpdate,
    exportPlanToExcel,
    savePlan,
    savePlanAs,
    loadPlan,
    loadPlanFromData,
    switchTab
};
```
**Why?** Single-page app with inline event handlers in HTML needs global access, but the public surface should stay limited to compatibility-safe user actions while the rest of the frontend lives in focused modules.

**Chart Updates** (components/chart-manager.ts):
```typescript
// Charts are singleton instances managed by chart-manager
updateMainChart(labels, datasets, options);  // Re-uses existing chart
// Never: new Chart() in multiple places
```

**RTL Layout**:
- All UI text is Hebrew (right-to-left)
- CSS uses `dir="rtl"` and Tailwind RTL utilities
- Currency symbols: ₪ (ILS) or $ (USD) based on user selection

### Testing Patterns

**Test Data Builders** (Fixtures/TestDataBuilder.cs):
```csharp
// Use builders for consistent test data
var input = TestDataBuilder.CreateBasicFirePlanInput();
var inputWithPortfolio = TestDataBuilder.CreateFirePlanInputWithPortfolio();
```

**FluentAssertions** (standard for all tests):
```csharp
result.Should().NotBeNull();
result.YearlyProjections.Should().HaveCount(expectedYears);
result.FireAgeReached.Should().Be(55);
```

**Jest Frontend Tests** (wwwroot/tests/):
```javascript
// Import from compiled JS (not TS)
import { formatCurrency } from '../js/utils/formatter.js';
```

## 🔌 Integration Points & External Dependencies

### Finnhub API Integration
**Repository**: `src/Repositories/FinnhubAssetDataRepository.cs`
- Implements `IAssetDataRepository` for testability
- Methods: `GetCurrentPriceAsync(symbol)`, `GetHistoricalCAGRAsync(symbol)`
- Rate limited by Finnhub (60 calls/min on free tier)
- Health check: `src/Services/FinnhubHealthCheck.cs` (used by Kubernetes)

**Configuration**:
```json
// appsettings.json
{
  "Finnhub": {
    "BaseUrl": "https://finnhub.io/api/v1",
    "ApiKey": ""  // Set via user secrets in dev, env vars in prod
  }
}
```

**Asset Name Mapping**: `etf-names.json` maps symbols to display names (e.g., "VTI" → "Vanguard Total Stock Market ETF")

### Exchange Rate Service

**Service**: `src/Services/ExchangeRateService.cs`
- Fetches live USD/ILS exchange rates from external APIs
- Dual API fallback: exchangerate.host → Frankfurter API → default rate (3.6)
- 60-minute server-side caching to reduce API calls
- Health check integration for monitoring

**Configuration**:
```json
// appsettings.json
{
  "ExchangeRate": {
    "BaseUrl": "https://api.exchangerate.host/latest",
    "ApiKey": "",  // Optional, using free tier
    "CacheMinutes": 60
  }
}
```

**API Endpoints**:
- `GET /api/ExchangeRate/usd-ils` - Get USD/ILS rate
- `GET /api/ExchangeRate/{from}/{to}` - Get any currency pair rate

**Frontend Integration**: 
- `wwwroot/ts/api/assets-api.ts` - API client functions
- Exchange rates are fetched automatically on app startup and when loading plans
- Saved plans no longer store exchange rates - they are always fetched fresh

### Currency Handling: Money Type

The application uses a **Money value object pattern** for type-safe currency handling:

**Backend (C#):**
```csharp
// Creating Money values
var usd = Money.Usd(100);
var ils = Money.Ils(360);

// Arithmetic (same currency only - throws if mixed)
var total = usd + Money.Usd(50);  // OK
// var bad = usd + ils;           // Throws InvalidOperationException

// Currency conversion (explicit)
var converted = usd.ConvertTo("ILS", currencyConverter);
```

**Frontend (TypeScript):**
```typescript
// Creating Money values
const usd = Money.usd(100);
const ils = Money.ils(360);

// Arithmetic via MoneyMath (throws if currencies differ)
const total = MoneyMath.add(usd, Money.usd(50));  // OK

// Formatting
MoneyDisplay.format(usd);  // "$100.00"
```

**Key Files:**
- `src/ValueObjects/Money.cs` - C# Money struct
- `src/ValueObjects/SupportedCurrencies.cs` - Currency registry
- `wwwroot/ts/types/money.ts` - TypeScript Money type
- `src/Services/CurrencyConverter.cs` - Conversion logic using exchange rates
- `src/Services/ExchangeRateService.cs` - Live exchange rate fetching (exchangerate.host/Frankfurter APIs)

**Important:** Models have dual fields for backward compatibility:
- Legacy: `decimal CurrentPrice` + `string Currency` (for JSON API)
- Typed: `Money CurrentPriceTyped` (for internal calculations, `[JsonIgnore]`)

### Rate Limiting (ASP.NET Core)
```csharp
[EnableRateLimiting("ApiPolicy")]  // Applied to all controllers
// Default: 100 req/min, configurable in appsettings.json
```

## 📋 Code Quality Standards

### When Adding Financial Calculations
1. Add constants to `CalculationConstants.cs` **and** `calculation-constants.ts`
2. Write xUnit tests in appropriate `tests/backend/FirePlanningTool.Tests/` folder
3. Use `Money` type for monetary values (e.g., `Money.Usd(100)` not `100m`)
4. Use `decimal` for rates/percentages (never `double` or `float` for money)
5. Document formulas in XML comments with examples

### When Adding New Assets/Portfolio Features
1. Update `PortfolioAsset` model if schema changes
2. Add validation rules to `PortfolioValidatorWithResult.cs`
3. Update `PortfolioCalculator` service if new calculations needed
4. Test with `TestDataBuilder.CreateFirePlanInputWithPortfolio()`

### When Modifying API Endpoints
1. Update `docs/API.md` with request/response examples
2. Add integration tests in `tests/backend/FirePlanningTool.Tests/API/`
3. Ensure `ApiErrorResponse` is used for all error responses
4. Test rate limiting behavior if endpoint is high-traffic

### Logging Best Practices
```csharp
// ✅ Use structured logging with message templates
_logger.LogInformation("Calculating plan for {YearSpan} years", yearSpan);

// ❌ Never use string interpolation
_logger.LogInformation($"Calculating plan for {yearSpan} years");
```

## 🚫 Git Workflow (CRITICAL)

**Never commit or push automatically**. Follow this exact sequence:
1. Make code changes
2. Run `dotnet build` and tests
3. Show user what changed
4. Wait for explicit "commit" command
5. Only when user says "push" → push to remote

**If request is ambiguous**: Ask for clarification, don't assume.

## 📚 Key Documentation
- **API Reference**: [docs/API.md](../docs/API.md)
- **Test Coverage**: [docs/TEST_COVERAGE_REPORT.md](../docs/TEST_COVERAGE_REPORT.md)
- **Architecture**: [docs/architecture/](../docs/architecture/)
- **Contributing**: [CONTRIBUTING.md](../docs/CONTRIBUTING.md)

## 🐛 Common Pitfalls to Avoid
1. **TypeScript imports without `.js` extension** → Module not found errors
2. **Forgetting to compile TypeScript** → Stale JS in wwwroot/js/
3. **String interpolation in logs** → Breaks structured logging
4. **Desync between C# and TS constants** → Validation mismatches
5. **Using `double` for money** → Rounding errors (use `decimal` or `Money` type)
6. **Directly instantiating services** → Breaks DI and testability (inject via constructor)
7. **Mixing currencies without conversion** → Use `Money` type and explicit `ConvertTo()`
8. **Adding Money values directly** → Use `MoneyMath.add()` in TypeScript, `+` operator in C# (same currency only)

---

**App URL**: http://localhost:5162  
**Health Check**: http://localhost:5162/health
