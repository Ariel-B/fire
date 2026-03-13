# FIRE Planning Tool - Product Requirements Documents

**Last Updated:** December 2025  
**Status:** Active Development

---

## Overview

This folder contains Product Requirements Documents (PRDs) that document the functionality of the FIRE Planning Tool. These documents were reverse-engineered from the implemented application to serve as a comprehensive reference for the current feature set.

## Document Index

### Core PRDs

| Document | Description | Status |
|----------|-------------|--------|
| [PRD_FIRE_PLANNING_TOOL.md](PRD_FIRE_PLANNING_TOOL.md) | **Main PRD** - Complete product overview, features, architecture, and specifications | ✅ Complete |
| [PRD_PORTFOLIO_MANAGEMENT.md](PRD_PORTFOLIO_MANAGEMENT.md) | Portfolio tracking, asset management, real-time price integration | ✅ Complete |
| [PRD_TAX_CALCULATIONS.md](PRD_TAX_CALCULATIONS.md) | FIRE calculation engine, tax implications, expense modeling | ✅ Complete |
| [PRD_VISUALIZATION.md](PRD_VISUALIZATION.md) | Charts, visualizations, summary cards, UI components | ✅ Complete |

### Feature-Specific PRDs

| Document | Description | Status |
|----------|-------------|--------|
| [PRD_RSU_SUPPORT.md](PRD_RSU_SUPPORT.md) | RSU grant management for Israeli residents with Section 102 tax optimization | ✅ MVP Implemented |
| [PRD_RSU_IMPLEMENTATION_STATUS.md](PRD_RSU_IMPLEMENTATION_STATUS.md) | Implementation status review comparing PRD requirements vs actual implementation | ✅ Complete |
| [PRD_EXPORT_TO_SPREADSHEET.md](PRD_EXPORT_TO_SPREADSHEET.md) | Excel/CSV export of complete FIRE simulation results for verification, analysis, and sharing | ✅ MVP Implemented (Phase 1) |
| [PRD_SANKEY_MONEY_FLOW.md](PRD_SANKEY_MONEY_FLOW.md) | Sankey diagram visualization for year-by-year money flow analysis covering accumulation, retirement, taxes, and expenses | 📋 Proposed |

---

## Document Structure

Each PRD follows a consistent structure:

1. **Overview** - Purpose and scope
2. **Features** - Detailed feature specifications
3. **Data Models** - Technical data structures
4. **User Interface** - UI specifications and layouts
5. **Validation Rules** - Input validation requirements
6. **Future Enhancements** - Planned improvements

---

## Product Summary

### What is the FIRE Planning Tool?

The **FIRE Planning Tool** (כלי תכנון פרישה מוקדמת) is a comprehensive web application for Financial Independence, Retire Early planning. It enables Hebrew-speaking users to:

- **Model Investment Portfolios** with real-time asset data
- **Calculate Retirement Projections** across accumulation and withdrawal phases
- **Plan Major Expenses** with inflation adjustments
- **Understand Tax Implications** of Israeli capital gains tax
- **Visualize Growth** through interactive charts
- **Save/Load Plans** as JSON files for iterative planning

### Key Features

```
┌─────────────────────────────────────────────────────────────────┐
│                     FIRE PLANNING TOOL                          │
├─────────────────────────────────────────────────────────────────┤
│  📊 Portfolio Management                                        │
│     • Multi-asset tracking (stocks, ETFs)                       │
│     • Real-time prices (Finnhub API)                            │
│     • Historical CAGR calculations                              │
│     • Cost basis tracking                                       │
│     • Market cap display (current & projected)                  │
│     • Asset value multiplier projections                        │
├─────────────────────────────────────────────────────────────────┤
│  🧮 FIRE Calculations                                           │
│     • Accumulation phase simulation                             │
│     • Retirement withdrawal modeling                            │
│     • Tax-aware calculations (25% capital gains)                │
│     • Inflation adjustments                                     │
├─────────────────────────────────────────────────────────────────┤
│  💸 Expense Planning                                            │
│     • One-time and recurring expenses                           │
│     • Inflation-adjusted amounts                                │
│     • Impact on retirement timeline                             │
├─────────────────────────────────────────────────────────────────┤
│  📈 Visualizations                                              │
│     • Portfolio donut charts                                    │
│     • Growth line charts                                        │
│     • Expense bar charts                                        │
│     • Summary metric cards                                      │
├─────────────────────────────────────────────────────────────────┤
│  💾 Plan Management                                             │
│     • Save plans as JSON                                        │
│     • Load existing plans                                       │
│     • Iterative scenario planning                               │
├─────────────────────────────────────────────────────────────────┤
│  🌍 Localization                                                │
│     • Hebrew RTL interface                                      │
│     • USD/ILS currency support                                  │
│     • Configurable exchange rate                                │
└─────────────────────────────────────────────────────────────────┘
```

### Technical Stack

| Component | Technology |
|-----------|------------|
| Backend | ASP.NET Core 9.0, C# 13 |
| Frontend | HTML5, TypeScript/JavaScript (ES6), Tailwind CSS |
| Charts | Chart.js 4.x |
| External APIs | Finnhub (asset prices) |
| Testing | xUnit (357+ backend tests), Jest (frontend tests) |

### Quality Metrics

| Metric | Value |
|--------|-------|
| Test Count | 357+ tests passing |
| Line Coverage | 82.99% |
| Branch Coverage | 69.84% |
| Method Coverage | 89.14% |
| Build Status | ✅ Clean |

---

## User Personas

### Primary: Israeli Tech Worker

- **Age**: 25-45
- **Income**: High (tech salaries, stock compensation)
- **Goal**: Early retirement (45-55)
- **Needs**: Hebrew interface, Israeli tax context, US stock tracking

### Secondary: Financial Planning Enthusiast

- **Age**: 35-50
- **Income**: Variable
- **Goal**: Comfortable retirement (55-65)
- **Needs**: Detailed projections, expense planning, scenario comparison

---

## Feature Roadmap

### Current (v1.0) ✅

- [x] Portfolio management (accumulation + retirement)
- [x] FIRE calculations with tax implications
- [x] Expense planning with inflation
- [x] Interactive visualizations
- [x] Plan save/load
- [x] Real-time asset prices
- [x] Hebrew RTL interface
- [x] RSU grant management (Section 102 tax optimization) - MVP
- [x] **Excel/CSV export** - Export complete simulation results to spreadsheet (MVP)

### Planned (v2.0) 📋

- [ ] **Sankey Money Flow Visualization** - Interactive diagram showing year-by-year money flows (contributions, growth, taxes, expenses, withdrawals)
- [ ] RSU Strategy 2 (Sell at Retirement)
- [ ] RSU Save/Load integration
- [ ] Monte Carlo simulations
- [ ] Tax-advantaged account support (קרנות השתלמות)
- [ ] Dividend tracking
- [ ] Social Security/pension integration

### Future (v3.0+) 💡

- [ ] Multi-user/family planning
- [ ] Brokerage API integration
- [ ] Mobile app
- [ ] Financial advisor collaboration

---

## How to Use These Documents

### For Product Managers
- Use PRD_FIRE_PLANNING_TOOL.md as the primary reference
- Review feature-specific PRDs for detailed specifications
- Track future enhancements sections for roadmap planning

### For Developers
- Use data models and API specifications for implementation
- Reference validation rules for input handling
- Follow UI specifications for consistent design

### For QA Engineers
- Use feature specifications for test case creation
- Reference edge cases for boundary testing
- Verify calculation accuracy against examples

### For Designers
- Follow UI layout specifications
- Use color palette and typography guidelines
- Reference Chart.js configurations for visualizations

---

## Related Documentation

| Document | Location | Description |
|----------|----------|-------------|
| README.md | /README.md | Project overview and setup |
| API.md | /docs/API.md | REST API documentation |
| SYSTEM_DESIGN_DOCUMENT.md | /docs/SYSTEM_DESIGN_DOCUMENT.md | Technical architecture |
| TESTING.md | /docs/TESTING.md | Test execution guide |
| CONTRIBUTING.md | /docs/CONTRIBUTING.md | Development guidelines |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | November 2025 | Product Team | Initial reverse-engineering of implemented features |
| 1.1 | December 2025 | Product Team | Added RSU Implementation Status PRD, updated RSU feature status to MVP Implemented |

---

**End of Index**

*These PRDs represent the documented functionality of the FIRE Planning Tool as of November 2025.*
