# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FIRE Planning Tool is a C# ASP.NET Core 9.0 web application for Financial Independence, Retire Early (FIRE) planning. It features a Hebrew RTL interface, real-time market data from Finnhub, portfolio simulation, tax-aware retirement calculations, and interactive Chart.js visualizations.

## Build & Development Commands

```bash
# Setup (one-time)
dotnet user-secrets init
dotnet user-secrets set "Finnhub:ApiKey" "your_key_from_finnhub.io"
dotnet restore && npm install

# Build & run (TypeScript compiles automatically via dotnet build)
dotnet build
dotnet run                    # http://localhost:5162

# Testing
make test                     # Backend + frontend unit/integration tests
make test-e2e                 # Playwright end-to-end tests
make test-backend             # xUnit only
make test-frontend            # Jest only
dotnet test fire.sln          # Backend directly
npm test                      # Frontend directly
make test-coverage            # With coverage reports

# IMPORTANT: for this repo, "run all tests" means backend + frontend + Playwright E2E.
# Do not rely solely on editor-integrated test runners because they may omit Jest and Playwright.
dotnet test fire.sln --no-restore
npm test -- --runInBand
npm run test:e2e

# TypeScript watch mode for development
npx tsc --watch
```

## Architecture

### Layered Architecture
```
Frontend (SPA)  →  Controllers  →  Services  →  Repositories  →  External APIs
wwwroot/ts/        src/Controllers/ src/Services/ src/Repositories/  Finnhub
```

### Calculation Data Flow
```
FirePlanController.Calculate()
  → FluentValidation (FirePlanInputValidator)
  → FireCalculator (orchestrator)
      → PortfolioGrowthCalculator (per-asset growth via Strategy pattern)
      → AccumulationPhaseCalculator (pre-retirement years)
      → RetirementPhaseCalculator (withdrawal phase with dynamic taxes)
      → TaxCalculator (capital gains, RSU Section 102, cost basis tracking)
      → ExpenseCalculator (inflation-adjusted expenses)
```

### Key Design Patterns
- **Strategy Pattern**: `IReturnCalculationStrategy` with CAGR, TotalGrowth, TargetPrice strategies - factory selects based on asset configuration
- **Repository Pattern**: `IAssetDataRepository` → `FinnhubAssetDataRepository` abstracts external API
- **Money Value Object**: Type-safe currency via `Money.Usd(100)` / `Money.Ils(360)` instead of raw decimals
- **Service Orchestration**: `FireCalculator` coordinates 5 specialized calculators via DI

### Critical Synchronized Files
These files define shared constants (tax rates, validation ranges, defaults) and **MUST be kept in sync**:
- `src/Services/CalculationConstants.cs` (C#)
- `wwwroot/ts/config/calculation-constants.ts` (TypeScript)

### Key Service Responsibilities
| Service | Purpose |
|---------|---------|
| `FireCalculator` | Orchestrator - coordinates all calculations, handles RSU timeline |
| `AccumulationPhaseCalculator` | Monthly simulation before retirement with contributions |
| `RetirementPhaseCalculator` | Withdrawal phase with dynamic tax and cost basis updates |
| `PortfolioGrowthCalculator` | Per-asset returns using strategy pattern |
| `TaxCalculator` | Profit ratios, tax rates, cost basis tracking |
| `ExpenseCalculator` | Planned expenses with inflation adjustment |
| `CurrencyConverter` | USD/ILS conversion (default rate: 3.6) |

## Project-Specific Conventions

### TypeScript Imports (Critical)
```typescript
// Always use .js extension (TypeScript compiles .ts → .js)
import { formatCurrency } from './utils/formatter.js';  // Correct
import { formatCurrency } from './utils/formatter';     // Wrong - module not found
```

### Error Responses
```csharp
// Always use ApiErrorResponse for consistency
return BadRequest(new ApiErrorResponse("error message"));  // Correct
return BadRequest("error message");                        // Wrong
```

### Logging
```csharp
// Use structured logging with message templates
_logger.LogInformation("Calculating for {YearSpan} years", yearSpan);  // Correct
_logger.LogInformation($"Calculating for {yearSpan} years");           // Wrong
```

### Money Type Usage
```csharp
// Backend: Use Money value object for monetary values
var amount = Money.Usd(100);
var total = amount + Money.Usd(50);  // Same currency only - throws if mixed

// Use decimal only for rates/percentages
decimal taxRate = 0.25m;
```

```typescript
// Frontend: Use MoneyMath for operations
const total = MoneyMath.add(usd, Money.usd(50));
MoneyDisplay.format(usd);  // "$100.00"
```

### Testing
```csharp
// Use TestDataBuilder for consistent fixtures
var input = TestDataBuilder.CreateBasicFirePlanInput();
var inputWithPortfolio = TestDataBuilder.CreateFirePlanInputWithPortfolio();

// Use FluentAssertions
result.Should().NotBeNull();
result.FireAgeReached.Should().Be(55);
```

### Frontend Global API
```typescript
// HTML event handlers call via the compatibility-focused window.fireApp object
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

### Charts
Charts are singleton instances in `chart-manager.ts` - never instantiate `new Chart()` directly.

### Frontend Entry Points
- `wwwroot/ts/services/state.ts` is the canonical shared frontend state store
- `wwwroot/ts/app.ts` is the thin facade that wires the shell/runtime and exposes the limited compatibility `window.fireApp` API
- `wwwroot/ts/app-shell.ts` owns startup wiring, top-level listeners, and tab activation
- `wwwroot/ts/calculation-orchestrator.ts` owns input gathering, request sequencing, stale-response rejection, and export snapshot coordination
- `wwwroot/ts/orchestration/*.ts` modules own the extracted portfolio, expense, retirement, results, and RSU UI workflows
- `wwwroot/ts/persistence/plan-persistence.ts` owns save/load/export orchestration and legacy saved-plan normalization

## Common Pitfalls

1. **Constants desync** - `CalculationConstants.cs` and `calculation-constants.ts` must match exactly
2. **Missing .js extension** in TypeScript imports causes runtime module errors
3. **Stale compiled JS** - Run `npx tsc` or restart watch mode after TypeScript changes
4. **Using double/float for money** - Always use `decimal` or `Money` type to avoid rounding errors
5. **Direct service instantiation** - Use DI injection; never `new ServiceName()`
6. **Mixing currencies** - Use `Money` type and explicit `ConvertTo()` for currency conversion

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/fireplan/calculate` | Calculate FIRE projection |
| POST | `/api/fireplan/save` | Serialize plan to JSON |
| POST | `/api/fireplan/load` | Deserialize plan from JSON |
| GET | `/api/assetprices/{symbol}` | Get single stock price |
| POST | `/api/assetprices/batch` | Get multiple stock prices |
| GET | `/api/assetprices/{symbol}/cagr` | Get historical CAGRs |
| GET | `/health` | Kubernetes health check |

## Documentation

- Architecture decisions: [docs/ADRs/](docs/ADRs/) (18 ADRs covering all major patterns)
- API details: [docs/API.md](docs/API.md)
- System design: [docs/architecture/SYSTEM_DESIGN_DOCUMENT.md](docs/architecture/SYSTEM_DESIGN_DOCUMENT.md)
- Test coverage: [docs/TEST_COVERAGE_REPORT.md](docs/TEST_COVERAGE_REPORT.md)
