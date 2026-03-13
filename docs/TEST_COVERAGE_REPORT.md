# Test Coverage Report

**Last Updated:** March 9, 2026  
**Project:** FIRE Planning Tool  
**Framework:** .NET 9.0, C# 13

---

## Summary

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **Total Tests** | 2,470 (954 backend + 1,501 frontend + 15 Playwright tests across desktop/mobile projects) | N/A | ✅ Comprehensive |
| **Line Coverage (Backend)** | 87.79% | 80% | ✅ Above Target |
| **Branch Coverage (Backend)** | 76.29% | 80% | 🎯 Close to Target |
| **Method Coverage (Backend)** | 92.98% | 85% | ✅ Above Target |
| **Statement Coverage (Frontend)** | 59.16% | 50% | ✅ Above Target |
| **Browser E2E Coverage** | Full critical-path Playwright suite (see note below) | Establish baseline | ✅ Added |
| **Build Status** | Passing | Passing | ✅ Clean |

---

## Test Breakdown

### Backend Tests (xUnit)

| Category | Test Count | Status |
|----------|------------|--------|
| **API Controllers** | 45+ | ✅ |
| **Calculation Logic** | 120+ | ✅ |
| **Currency Conversion** | 30+ | ✅ |
| **Expense Calculations** | 25+ | ✅ |
| **File I/O** | 15+ | ✅ |
| **Input Validation** | 40+ | ✅ |
| **Models** | 20+ | ✅ |
| **Performance** | 10+ | ✅ |
| **Portfolio Calculations** | 35+ | ✅ |
| **Security** | 8+ | ✅ |
| **Services** | 50+ | ✅ |
| **Tax Calculations** | 30+ | ✅ |
| **Result Pattern** | 54+ | ✅ |
| **Value Objects (Money)** | 788+ | ✅ |

**Total Backend Tests:** 954

### Frontend Tests (Jest)

| Category | Test Count | Status |
|----------|------------|--------|
| **UI Components** | 200+ | ✅ |
| **API Clients** | 100+ | ✅ |
| **Utilities** | 150+ | ✅ |
| **Integration Tests** | 300+ | ✅ |
| **Money Type Tests** | 250+ | ✅ |

**Total Frontend Tests:** 1,501

### Browser E2E Tests (Playwright)

| Category | Coverage | Status |
|----------|----------|--------|
| **Smoke & navigation** | App load, six tabs, calculation render | ✅ |
| **Form wiring** | Slider/input sync, spinners, currencies, date/toggles | ✅ |
| **Accumulation / RSU / Expenses / Retirement** | CRUD workflows, charts, and strategy coverage | ✅ |
| **Results / Money flow** | Summary cards, charts, Sankey, PNG/CSV export | ✅ |
| **Persistence / Export** | Save, save as, load, and Excel download | ✅ |
| **Accessibility / Responsive** | RTL, keyboard navigation, zero critical axe violations, mobile viewport | ✅ |

**Total Playwright Tests Executed in CI:** 15 (13 desktop Chromium + 2 mobile Chromium; 11 desktop-only scenarios are intentionally skipped in the mobile viewport project)

> **Note:** The repository's numeric coverage gate currently measures backend Coverlet output plus frontend Jest/Istanbul output. The Playwright suite contributes browser-level workflow confidence and is required to pass in CI, but it is not included in the line/branch/function percentages because the browser bundle is not instrumented for source coverage collection in the Playwright job.

---

## Coverage by Component

### Core Services

| Service | Line Coverage | Branch Coverage | Method Coverage |
|---------|---------------|-----------------|-----------------|
| **FireCalculator** | 95%+ | 85%+ | 100% |
| **AccumulationPhaseCalculator** | 92%+ | 80%+ | 100% |
| **RetirementPhaseCalculator** | 93%+ | 82%+ | 100% |
| **TaxCalculator** | 90%+ | 75%+ | 100% |
| **ExpenseCalculator** | 94%+ | 85%+ | 100% |
| **PortfolioGrowthCalculator** | 91%+ | 78%+ | 100% |
| **FinnhubService** | 85%+ | 70%+ | 95% |
| **CurrencyConverter** | 100% | 100% | 100% |
| **PortfolioCalculator** | 96%+ | 88%+ | 100% |

### Controllers

| Controller | Line Coverage | Branch Coverage | Method Coverage |
|------------|---------------|-----------------|-----------------|
| **FirePlanController** | 88%+ | 75%+ | 100% |
| **AssetPricesController** | 86%+ | 72%+ | 100% |

### Models & Validation

| Component | Line Coverage | Branch Coverage | Method Coverage |
|-----------|---------------|-----------------|-----------------|
| **FirePlanModels** | 98%+ | 95%+ | 100% |
| **Input Validators** | 93%+ | 88%+ | 100% |
| **Result Pattern** | 100% | 100% | 100% |

---

## Areas Requiring Improvement

### Priority 1: Reach 80% Branch Coverage Target

**Current:** 76.29% branch coverage  
**Target:** 80%  
**Gap:** 3.71% below target

**Contributing Factors:**
1. Complex conditional logic in calculation services
2. Multiple error handling paths not fully tested
3. Edge cases in portfolio allocation logic

**Recommended Actions:**
- Add tests for complex conditional branches in calculation services
- Test all error handling paths explicitly
- Add edge case tests for portfolio calculations (negative flows, boundary conditions)
- Focus on switch statements and nested conditionals

### Priority 2: Frontend Critical-Path Expansion

**Current:** 59.16% statement coverage overall, with dedicated behavior-locking coverage now protecting the highest-risk `app.ts` seams  
**Target:** Maintain 50%+ overall coverage while continuing to expand UI confidence  
**Gap:** Remaining work is now concentrated in lower-risk UI branches, chart rendering details, and broader DOM interaction paths

**Current Status:** 
- Critical calculation logic remains well-tested
- `app.ts` now has dedicated behavior-locking safety-net tests for the highest-risk seams: calculation ordering, export snapshotting, native file-handle save/load, display-currency refreshes, startup wiring, tab side effects, and key UI failure recovery paths
- Overall frontend coverage is above the current threshold, but broader UI rendering paths are still less exercised than service-level code

**Recommended Actions:**
- Add tests for UI components (portfolio tables, expense tables, charts)
- Test app lifecycle and initialization
- Add integration tests for user workflows
- Test DOM manipulation functions
- Add visual regression tests for charts

---

## Recent Improvements

### March 2026 Enhancements

1. **Phase 0 app.ts Refactor Safety Net**
   - Added behavior-locking frontend coverage before structural extraction work
   - Locked down request ordering and stale-response protection in `app-module.test.js`
   - Added dedicated `calculation-orchestrator.test.js` coverage for rapid consecutive calculations, latest-failure cleanup, and export snapshot waiting
   - Locked down export snapshot and failed-calculation behavior in `export-flow-critical-path.test.js`
   - Locked down native file-handle save/load flows and fallback browser flows in `file-io-critical-path.test.js`
   - Locked down display-currency refresh side effects in `currency-switching-critical-path.test.js`
   - Locked down startup event wiring plus RSU/money-flow tab side effects in `tab-switching.test.js`

2. **Phases 1-7 Extraction Coverage**
   - `tab-switching.test.js` verifies `app-shell.ts` startup wiring, DOMContentLoaded registration, and cross-tab activation side effects
   - `portfolio-coordinator.test.js` and `expense-coordinator.test.js` lock down the extracted portfolio and planned-expense subdomains
   - `retirement-coordinator.test.js` and `results-coordinator.test.js` cover retirement allocation orchestration plus results/chart coordination
   - `rsu-coordinator.test.js` and `rsu-save-load.test.js` lock down extracted RSU orchestration and persistence compatibility
   - `load-plan-from-data.test.js` and `load-plan-money-type.test.js` cover the compatibility facade plus saved-plan normalization in `plan-persistence.ts`
   - `app-module.test.js` verifies that `window.fireApp` remains a compatibility-only surface with the intentionally slim public API

3. **Contributor Guidance Updated**
   - `README.md` and `CONTRIBUTING.md` now document the post-refactor frontend ownership boundaries
   - `TESTING.md` documents the focused refactor safety-net suites and the recommended targeted Jest command for iterating without tripping the global coverage gate on partial runs

4. **Playwright Browser Coverage**
   - Added a Playwright suite under `tests/e2e/` with shared fixtures, route-based API mocks, and focused page objects
   - Added deterministic coverage for persistence flows, Excel/Sankey exports, responsive behavior, and accessibility regressions
   - Added desktop Chromium plus a mobile Chromium viewport project started automatically through Playwright `webServer`

### January 2025 Enhancements

1. **Money Type Migration** (Major)
   - Added 788+ tests for Money value object (backend)
   - Backend test count: 357 → 835 tests (134% increase)
   - Frontend test count: expanded to 1,006 tests
   - Total: 1,841 tests passing

2. **Money Type Test Categories**
   - Decimal precision tests (repeating decimals, sub-cent values)
   - Large number handling (billion/trillion portfolio values)
   - JSON serialization round-trip verification
   - Currency conversion with Money types
   - Frontend MoneyMath and MoneyDisplay tests

3. **Legacy Format Compatibility Tests**
   - `averageCostPerShare` → `averageCost` migration
   - Backward compatibility for loading old saved plans
   - JSON deserialization with symbol normalization

### December 2025 Enhancements

1. **Test Count Increase**
   - From 241 tests to 357+ tests (48% increase)
   - Added Result Pattern test suite (54 tests)
   - Enhanced service extraction tests (44 tests)

2. **Coverage Improvements**
   - Line coverage: 78% → 82.99% (+4.99%)
   - Branch coverage: 64% → 69.84% (+5.84%)
   - Method coverage: 85% → 89.14% (+4.14%)

3. **Quality Enhancements**
   - Fixed all compiler warnings
   - Improved error handling patterns
   - Enhanced input validation tests
   - Added performance benchmarks

---

## Running Tests

### Quick Start

```bash
# All tests (recommended)
make test

# Backend tests only
make test-backend
# or
dotnet test fire.sln

# Frontend tests only
make test-frontend
# or
npm test

# Browser end-to-end tests
npm run test:e2e
# or
make test-e2e

# With coverage reports
make test-coverage
```

### Coverage Report Generation

```bash
# Backend coverage (generates HTML report)
dotnet test fire.sln /p:CollectCoverage=true /p:CoverletOutputFormat=cobertura

# Frontend coverage
npm run test:coverage

# View backend coverage artifact
open artifacts/coverage/backend/coverage.opencover.xml

# View frontend report
open artifacts/coverage/frontend/index.html
```

### CI/CD Integration

Tests run automatically on:
- All pushes to `main` and `develop` branches
- All pull requests
- Scheduled nightly builds

**Coverage Enforcement:**
- Builds fail if line coverage drops below 75%
- PRs require approval if coverage decreases
- Codecov integration for coverage tracking

---

## Test Execution Performance

| Test Suite | Execution Time | Status |
|------------|----------------|--------|
| Backend Unit Tests | ~3-5 seconds | ✅ Fast |
| Backend Integration Tests | ~8-12 seconds | ✅ Acceptable |
| Frontend Tests | ~2-4 seconds | ✅ Fast |
| Full Test Suite | ~15-20 seconds + Playwright E2E time | ✅ Acceptable |

---

## Quality Gates

### Required for PR Approval

- [x] All tests pass
- [x] Line coverage ≥ 75%
- [x] No new compiler warnings
- [ ] Branch coverage ≥ 80% (⚠️ Current: 69.84%)
- [x] Method coverage ≥ 85%

### Best Practices Followed

- ✅ Arrange-Act-Assert (AAA) pattern
- ✅ Descriptive test method names
- ✅ Independent test cases (no shared state)
- ✅ Fast execution (< 20 seconds for full suite)
- ✅ Comprehensive edge case testing
- ✅ Integration tests for critical workflows
- ✅ Performance benchmarks for calculations

---

## Next Steps

### Short-term (Next Sprint)

1. **Increase Branch Coverage to 80%**
   - Add 15-20 targeted tests for complex conditionals
   - Focus on calculation service edge cases
   - Test error handling paths comprehensively

2. **Expand Frontend Test Suite**
   - Add component tests for UI elements
   - Test API client error scenarios
   - Add integration tests for user workflows

3. **Improve Test Documentation**
   - Document test naming conventions
   - Add test fixtures documentation
   - Create test data builder patterns

### Long-term Goals

- Achieve 90%+ line coverage
- Achieve 85%+ branch coverage
- Add end-to-end (E2E) tests with Playwright
- Implement mutation testing for test quality validation
- Add visual regression testing for UI components

---

## Related Documentation

- [TESTING.md](TESTING.md) - Test execution guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines
- [Technical Debt Backlog](TECHNICAL_DEBT_BACKLOG.md) - Known issues and improvements

---

## Appendix: Test Categories Explained

### Unit Tests
Focus on individual methods and functions in isolation with mocked dependencies.

### Integration Tests
Test interactions between multiple components (e.g., controller → service → calculator).

### Performance Tests
Benchmark critical calculation paths to ensure acceptable performance.

### Security Tests
Verify input validation, rate limiting, and security controls.

---

**For questions about test coverage or to report testing issues, please open a GitHub issue.**
