# Changelog

All notable changes to the FIRE Planning Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Live Exchange Rate Integration**: Automatic USD/ILS currency conversion using external APIs (January 2025)
  - ExchangeRateService with dual API fallback (exchangerate.host → Frankfurter API)
  - 60-minute server-side caching to minimize external API calls
  - New API endpoints:
    - `GET /api/ExchangeRate/usd-ils` - Get USD/ILS exchange rate
    - `GET /api/ExchangeRate/{from}/{to}` - Get any currency pair rate
  - Frontend integration: Automatic rate fetching on app startup and plan loading
  - 8 comprehensive unit tests for exchange rate service
  - Health check integration for monitoring API availability
- Partial-year calculation support for inflation and portfolio returns
- Three new helper methods in CalculationConstants:
  - `GetRemainingFractionOfCurrentYear()` - calculates fraction of year remaining
  - `GetRemainingMonthsInCurrentYear()` - calculates months to simulate in current year
  - `CalculateFractionalYearsFromNow()` - calculates fractional years from current date
- 17 comprehensive tests for partial year calculations
- Result Pattern implementation for improved error handling
- Comprehensive documentation review and enhancement
- CHANGELOG.md for tracking project changes
- **RSU Contribution Tracking**: RSU sales net proceeds now tracked as portfolio contributions (December 2025)
  - 5 comprehensive tests validating RSU contribution tracking behavior
  - Integration test updated to reflect new expected behavior

### Changed
- **Exchange Rates**: Saved plans no longer store exchange rates - they are fetched fresh from external APIs to ensure accuracy
- **Accumulation Phase**: First year now simulates only remaining months in current year
  - Monthly contributions calculated based on actual remaining months
  - Portfolio growth proportional to time remaining in current year
- **Retirement Phase**: Retirement year accounts for partial year if retiring in current year
  - Withdrawals and growth calculations adjusted proportionally
- **Inflation**: Now uses fractional years instead of integer year differences
  - More accurate expense inflation calculations (e.g., 4.03 years instead of 5 full years)
- Updated to .NET 9.0 and C# 13
- Expanded test suite from 241 to 723 tests (5 new RSU contribution tests)
- Improved test coverage: 82.99% line, 69.84% branch, 89.14% method
- **RSU Integration**: RSU net proceeds now increase cost basis for accurate tax calculations
  - Proceeds tracked in `actualContributions` alongside monthly savings
  - Reduces taxable gains when rebalancing portfolio at retirement

### Fixed
- Projection errors when planning starts mid-year (up to 7.7% more accurate)
- Over-estimation of first-year contributions (e.g., $1,000 for December vs $12,000 for full year)
- **Cost basis calculations**: RSU proceeds now properly included in contribution tracking, preventing inflated taxable gains at retirement

## [1.2.0] - 2025-12-18

### Added
- Result Pattern feasibility study and prototype
- Three-phase Result Pattern implementation (validation, services, integration)
- 54 comprehensive Result Pattern tests
- Documentation for Result Pattern migration strategy

### Changed
- Enhanced error handling with Result<T> pattern in validation layer
- Improved performance: 1,000-10,000x for validation scenarios

### Fixed
- Compiler warnings (CS8600, CS8602, CS8605, CS0219)
- CORS configuration security issues
- Deprecated npm package updates

## [1.1.0] - 2025-12-17

### Added
- RSU (Restricted Stock Units) support with Section 102 tax optimization
- RSU grant management and vesting schedule tracking
- Five specialized calculation services extracted from FireCalculator
- Service interaction diagrams and calculation formulas documentation

### Changed
- Refactored FireCalculator from 533 lines to 287 lines (46% reduction)
- Improved modularity with dedicated services:
  - AccumulationPhaseCalculator (129 lines)
  - RetirementPhaseCalculator (184 lines)
  - TaxCalculator (68 lines)
  - ExpenseCalculator (77 lines)
  - PortfolioGrowthCalculator (152 lines)

### Fixed
- Magic numbers extracted to constants
- Improved testability with 44 unit tests

## [1.0.0] - 2025-11-01

### Added
- Core FIRE planning functionality
- Portfolio management (accumulation and retirement phases)
- Real-time stock price integration (Finnhub API)
- Cost basis tracking and profit ratio calculations
- Multiple calculation methods: CAGR, Total Growth, Target Price
- Chart.js visualizations (donut and line charts)
- JSON plan save/load functionality
- Hebrew RTL interface
- Expense planning with inflation adjustments
- Tax calculations (25% capital gains)
- Currency conversion (USD/ILS)
- Target portfolio calculator for monthly expense goals
- Docker support with health checks
- Comprehensive test suite (241 tests initially)
- API endpoints:
  - POST /api/fireplan/calculate
  - POST /api/fireplan/save
  - POST /api/fireplan/load
  - GET /api/assetprices/{symbol}
  - POST /api/assetprices/batch
  - GET /health

### Security
- User secrets for API key management
- CORS configuration
- Security headers (X-Frame-Options, CSP)
- Input validation and sanitization
- Rate limiting for API endpoints

### Documentation
- Comprehensive README.md
- API documentation (API.md)
- Deployment guide (DEPLOYMENT.md)
- System design document
- Product Requirements Documents (PRDs)
- Contributing guidelines
- Testing guide

## [0.1.0] - Initial Development

### Added
- Initial project setup
- Basic ASP.NET Core 9.0 application structure
- TypeScript frontend with ES6 modules
- Tailwind CSS integration
- Chart.js for visualizations

---

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

## Links

- [GitHub Repository](https://github.com/Ariel-B/fire)
- [Documentation](docs/README.md)
- [Contributing Guidelines](docs/CONTRIBUTING.md)
