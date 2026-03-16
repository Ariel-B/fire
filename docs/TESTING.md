# Testing Guide

> **📊 Coverage details:** See [TEST_COVERAGE_REPORT.md](docs/TEST_COVERAGE_REPORT.md) for the latest published coverage report and supporting analysis.

## Build Freshness (No Stale Frontend)

`dotnet build`, `dotnet run`, and `dotnet publish` automatically compile TypeScript (`wwwroot/ts` → `wwwroot/js`) via MSBuild.

Prerequisite (one time):
```bash
npm install
```

To skip the automatic frontend build (advanced):
```bash
dotnet build fire.sln /p:SkipFrontendBuild=true
```

## Backend (C# xUnit)

```bash
# Run all tests (specify solution file)
dotnet test fire.sln

# Run with coverage reporting
dotnet test fire.sln /p:CollectCoverage=true /p:CoverletOutputFormat=json

# Run specific test class
dotnet test fire.sln --filter "ClassName=FirePlanningTool.Tests.Sample.SampleTests"

# Run with verbose output
dotnet test fire.sln --verbosity detailed

# List all tests
dotnet test fire.sln --list-tests
```

**Note**: You must specify `fire.sln` because the folder contains multiple project files.

## Frontend (JavaScript Jest)

```bash
# Install dependencies (one time)
npm install

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run in watch mode (re-runs on file changes)
npm run test:watch

# Run only frontend tests
npm run test:frontend
```

## Both Together

```bash
# Run both backend and frontend
make test
```

## Browser E2E (Playwright)

```bash
# Install the Chromium browser binary once per machine / CI image
npx playwright install chromium

# Run the full Playwright suite (desktop Chromium + mobile Chromium viewport)
npm run test:e2e

# Run through Make
make test-e2e

# Run a single spec while iterating
npx playwright test tests/e2e/tests/03-accumulation.spec.ts --project=chromium

# Run headed for local debugging
npm run test:e2e:headed
```

The Playwright suite automatically starts the local ASP.NET Core app through `playwright.config.ts`, uses both `window.fireApp.loadPlanFromData(...)` for rich fixture loading and true from-scratch UI interactions, and mocks asset-price plus exchange-rate traffic so the tests are deterministic and do not require a Finnhub key.

By default, Playwright now starts a fresh local app instance for each run instead of reusing whatever server is already bound to `http://127.0.0.1:5162`. This avoids false failures caused by stale frontend bundles during local development. If you intentionally want to run against an already-running local app, set `PLAYWRIGHT_REUSE_EXISTING_SERVER=1` before invoking Playwright.

Playwright is currently enforced as a separate pass/fail browser suite. The numeric coverage gate in CI only evaluates backend Coverlet metrics and frontend Jest/Istanbul metrics; it does **not** fold Playwright runs into the line/branch/function percentages because the browser bundle is not instrumented for source coverage collection in that job.

### E2E Conventions

When adding or modifying Playwright E2E tests, follow these conventions:

#### Locator Preference Order

Use the most resilient locator strategy available, in this priority order:

1. **Semantic / accessible selectors** – `getByRole`, `getByLabel`, `getByText` when the element has a meaningful accessible name.
2. **`data-testid` attributes** – `getByTestId('portfolio-remove-asset')` for elements that lack accessible semantics (dynamic rows, repeated controls, chart-adjacent buttons).
3. **Semantic `data-*` attributes** – `[data-portfolio-action="update-symbol"]`, `[data-expense-field="type"]` when they express intent rather than implementation.
4. **`#id` selectors** – acceptable for stable structural IDs such as tab buttons (`#tab-accumulation`), content panels (`#content-results`), and well-known form fields (`#birthDate`). Avoid adding new IDs solely for test coupling.

Avoid CSS class selectors for assertions or interactions; classes change frequently with styling updates.

#### Fixtures

All E2E tests import from `tests/e2e/fixtures/index.ts`, which provides:

- **`firePlanPage`** – the main page object.
- **`apiMocks`** – deterministic API mocking (exchange rates, asset prices). File-picker APIs are also disabled for stable download paths.
- **`consoleErrors`** – automatically records `console.error` output during each test and **fails the test** if any unexpected error is logged. An allowlist in `index.ts` covers known benign messages (fetch failures from deliberate mocks, rate-limit responses). Tests that intentionally trigger errors should clear the array at the end of the test: `consoleErrors.length = 0;`.

#### Desktop-Only Tests

Tests that only exercise desktop workflows (hover interactions, file downloads, desktop-specific chart controls) should be wrapped in a `test.describe` block using the `desktopOnly()` helper:

```typescript
import { test, expect, desktopOnly } from '../fixtures';

test.describe('my desktop feature', () => {
  desktopOnly();

  test('does something', async ({ firePlanPage }) => {
    // ...
  });
});
```

Do **not** use inline `test.skip(test.info().project.name === 'mobile-chromium', ...)` in individual tests.

**Currently running on mobile:** `01-smoke`, `02-personal-market-form`, `07-results`, `10-currency-switching`, `12-accessibility`.

**Deliberately desktop-only:** `03-accumulation`, `04-rsu`, `05-expenses`, `06-retirement`, `08-money-flow` (hover/pan), `09-persistence-export` (file downloads), `11-validation-failure`, `13-from-scratch-journey`, `14-async-race-conditions`.

#### test.step for Long Workflows

Multi-action tests should wrap logical phases in `test.step(...)` blocks to improve HTML report readability and trace debugging:

```typescript
await test.step('load plan and switch tab', async () => {
  await firePlanPage.loadPlan(cloneDemoPlan());
  await firePlanPage.switchToTab('results');
});
```

#### Chart Assertions

Go beyond `toBeVisible()` when verifying charts. A `<canvas>` has non-zero default dimensions (300×150) even when blank, so checking `width > 0` does not prove Chart.js actually rendered. Instead, verify that Chart.js registered an instance on the canvas:

```typescript
await expect.poll(async () => {
  return chart.evaluate((el) => typeof (window as any).Chart?.getChart(el) !== 'undefined');
}).toBe(true);
```

For SVG-based charts (Sankey), assert that rendered paths exist:

```typescript
await expect.poll(async () => await page.locator('#sankey-chart path').count()).toBeGreaterThan(0);
```

#### Timeouts

The global test timeout (60 s) and expect timeout (15 s) in `playwright.config.ts` are intentionally high enough for CI. Do not add per-test `test.setTimeout(...)` overrides as a workaround for flakes — instead fix the underlying timing issue or use `expect.poll()` / `toPass()` for async assertions.

#### E2E Coverage Categories

The Playwright suite covers these distinct areas:

- **From-scratch journeys** (`13-from-scratch-journey`): Build a plan entirely through the UI without `loadPlanFromData()`, exercising app wiring, tab activation, and form sync.
- **Correctness assertions** (`07-results`, `08-money-flow`, `10-currency-switching`): Validate that displayed values are numerically correct, properly bounded, and use the correct currency symbol — not just that elements are visible.
- **Persistence integrity** (`09-persistence-export`): Save → load round-trips verify that key plan fields (personal info, assets, expenses, currency) are faithfully preserved.
- **Async/race-condition coverage** (`14-async-race-conditions`): Route interception tests for stale response rejection and tab-switch-during-calculation resilience.
- **Chart interaction** (`07-results`, `08-money-flow`): Verify that the results chart defaults to the focused 30-year viewport (or full-range fallback for shorter plans), wheel zoom stays disabled, button controls remain visible below the chart, reset restores the focused default view, and SVG charts have non-zero rendered dimensions.
- **Mobile coverage** (`01-smoke`, `02-personal-market-form`, `07-results`, `10-currency-switching`, `12-accessibility`): These specs run on the `mobile-chromium` project with Pixel 7 viewport. Desktop-only steps (hover, increment buttons) are conditionally skipped.

## Using Makefile (Recommended)

```bash
# Run backend + frontend unit/integration tests
make test

# Run browser end-to-end tests
make test-e2e

# Run the full test suite
make test && make test-e2e

# Run backend tests only
make test-backend

# Run frontend tests only
make test-frontend

# Run all tests with coverage
make test-coverage

# View help
make help
```

## View Coverage Reports

### Backend
```bash
open artifacts/coverage/backend/coverage.opencover.xml
```

### Frontend
```bash
open artifacts/coverage/frontend/index.html
```

## CI/CD Pipeline

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests

View results in GitHub Actions tab

The GitHub Actions workflow now includes a dedicated Playwright E2E job that runs both the `chromium` and `mobile-chromium` projects and uploads Playwright artifacts on every run.

The GitHub Actions pipeline now enforces separate thresholds for backend and frontend coverage metrics using `tools/coverage-thresholds.json`.
Playwright E2E runs are required in CI, but they are reported separately from the numeric coverage gate.

## Test Organization

| Location | Framework | Tests | Coverage |
|----------|-----------|-------|----------|
| `tests/backend/FirePlanningTool.Tests/` | xUnit | Active suite | See latest coverage report |
| `wwwroot/tests/unit/` | Jest | Active suite | See latest coverage report |
| `wwwroot/tests/integration/` | Jest | Active suite | See latest coverage report |
| `tests/e2e/tests/` | Playwright | Active suite | Playwright report / CI artifacts |

### Test Categories

The backend tests are organized by feature:
- **API Tests** - API endpoint functionality
- **Calculations** - FIRE calculation logic
- **CurrencyConversion** - USD/ILS conversion
- **Expenses** - Expense calculations
- **FileIO** - JSON save/load
- **InputValidation** - Input validation
- **Models** - Model behavior
- **Performance** - Performance benchmarks
- **Portfolio** - Portfolio calculations
- **Services** - Service methods
- **Taxes** - Tax calculations

### Frontend app.ts Refactor Safety Net

Before changing `wwwroot/ts/app.ts`, `wwwroot/ts/app-shell.ts`, any coordinator under `wwwroot/ts/orchestration/`, or `wwwroot/ts/persistence/plan-persistence.ts`, run the behavior-locking suites that cover the highest-risk UI seams:

- `wwwroot/tests/integration/app-module.test.js` - calculation ordering, stale response protection, and UI error recovery
- `wwwroot/tests/unit/orchestration/calculation-orchestrator.test.js` - dedicated request sequencing, export snapshot waiting, and latest-failure cleanup in the extracted orchestration module
- `wwwroot/tests/integration/file-io-critical-path.test.js` - native file-handle save/load flows and fallback download/input flows
- `wwwroot/tests/integration/load-plan-from-data.test.js` - automation hook coverage for loading plans through the compatibility facade
- `wwwroot/tests/unit/file-io/load-plan-money-type.test.js` - saved-plan normalization and legacy Money-field compatibility coverage
- `wwwroot/tests/integration/currency-switching-critical-path.test.js` - full display-currency refresh side effects and exchange-rate refresh behavior
- `wwwroot/tests/integration/export-flow-critical-path.test.js` - export snapshot behavior while calculations are pending or failing
- `wwwroot/tests/unit/orchestration/portfolio-coordinator.test.js` - extracted accumulation-portfolio CRUD orchestration, summaries, and sorting behavior
- `wwwroot/tests/unit/orchestration/expense-coordinator.test.js` - extracted planned-expense orchestration, totals, and chart refresh behavior
- `wwwroot/tests/unit/ui/tab-switching.test.js` - startup event wiring plus RSU and money-flow tab side effects
- `wwwroot/tests/unit/orchestration/rsu-coordinator.test.js` - extracted RSU form wiring, stock-price fetching, save/load UI restoration, and RSU tab activation behavior
- `wwwroot/tests/integration/rsu-save-load.test.js` - RSU persistence behavior across save/load cycles
- `wwwroot/tests/unit/orchestration/retirement-coordinator.test.js` - extracted retirement allocation and toggle orchestration behavior
- `wwwroot/tests/unit/orchestration/results-coordinator.test.js` - extracted results rendering and chart coordination behavior

For quick local iteration on just these suites, disable coverage thresholds so the partial run does not fail the global coverage gate:

```bash
npm test -- --runInBand --coverage=false \
  wwwroot/tests/integration/app-module.test.js \
  wwwroot/tests/unit/orchestration/calculation-orchestrator.test.js \
  wwwroot/tests/integration/file-io-critical-path.test.js \
  wwwroot/tests/integration/load-plan-from-data.test.js \
  wwwroot/tests/unit/file-io/load-plan-money-type.test.js \
  wwwroot/tests/integration/currency-switching-critical-path.test.js \
  wwwroot/tests/integration/export-flow-critical-path.test.js \
  wwwroot/tests/unit/orchestration/portfolio-coordinator.test.js \
  wwwroot/tests/unit/orchestration/expense-coordinator.test.js \
  wwwroot/tests/unit/orchestration/retirement-coordinator.test.js \
  wwwroot/tests/unit/orchestration/results-coordinator.test.js \
  wwwroot/tests/unit/orchestration/rsu-coordinator.test.js \
  wwwroot/tests/integration/rsu-save-load.test.js \
  wwwroot/tests/unit/ui/tab-switching.test.js
```

Use the normal `make test` / `npm test` commands before opening or merging a PR.

## Key Test Files

- `tests/backend/FirePlanningTool.Tests/Fixtures/TestDataBuilder.cs` - Reusable test data
- `wwwroot/tests/unit/currency/currency-conversion.test.js` - Currency tests
- `wwwroot/tests/integration/app-module.test.js` - app.ts safety net for calculation and error-handling behavior
- `wwwroot/tests/unit/orchestration/calculation-orchestrator.test.js` - extracted calculation sequencing safety net
- `wwwroot/tests/integration/file-io-critical-path.test.js` - app.ts save/load critical-path coverage
- `wwwroot/tests/integration/load-plan-from-data.test.js` - compatibility facade plan-loading coverage
- `wwwroot/tests/unit/file-io/load-plan-money-type.test.js` - saved-plan normalization and legacy Money compatibility coverage
- `wwwroot/tests/integration/currency-switching-critical-path.test.js` - app.ts currency refresh critical-path coverage
- `wwwroot/tests/integration/export-flow-critical-path.test.js` - app.ts export snapshot critical-path coverage
- `wwwroot/tests/unit/orchestration/portfolio-coordinator.test.js` - extracted portfolio coordinator coverage
- `wwwroot/tests/unit/orchestration/expense-coordinator.test.js` - extracted expense coordinator coverage
- `wwwroot/tests/unit/orchestration/rsu-coordinator.test.js` - extracted RSU orchestration safety net
- `wwwroot/tests/integration/rsu-save-load.test.js` - RSU save/load persistence integration coverage
- `wwwroot/tests/unit/ui/tab-switching.test.js` - app.ts startup wiring and tab side effects
- `wwwroot/tests/unit/orchestration/retirement-coordinator.test.js` - retirement allocation/toggle coordinator coverage
- `wwwroot/tests/unit/orchestration/results-coordinator.test.js` - results rendering/chart coordinator coverage
- `tests/e2e/tests/01-smoke.spec.ts` through `tests/e2e/tests/14-async-race-conditions.spec.ts` - browser-level UI, workflow, persistence, responsive, race-condition, and accessibility coverage
- `playwright.config.ts` - Playwright webServer/bootstrap configuration
- `.github/workflows/tests.yml` - CI/CD configuration
- `codecov.yml` - Coverage reporting configuration
- `tools/check-coverage.mjs` - CI coverage gate
- `tools/coverage-thresholds.json` - Per-metric thresholds used by CI

## Coverage Status

Coverage changes over time. Use the generated reports and [TEST_COVERAGE_REPORT.md](docs/TEST_COVERAGE_REPORT.md) as the source of truth instead of relying on hard-coded numbers in this guide.

## Troubleshooting

### Tests won't run
```bash
# Rebuild solution
dotnet build

# Clear caches
dotnet clean && dotnet build
```

### Coverage not collecting
```bash
# Verify Coverlet is installed
dotnet add FirePlanningTool.Tests package coverlet.msbuild
```

### Jest not found
```bash
# Reinstall npm dependencies
rm -rf node_modules package-lock.json
npm install
```
