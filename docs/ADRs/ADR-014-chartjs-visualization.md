# ADR-014: Chart.js for Data Visualization

**Status**: Accepted

**Date**: 2025-11-18

**Deciders**: Development Team

**Technical Story**: Frontend visualization strategy for portfolio growth, allocation, and expense insights

## Context

The FIRE Planning Tool needs visualizations that make long-horizon financial projections understandable in a single-page browser UI. The frontend must present:
- Year-over-year portfolio growth and withdrawal trends
- Allocation breakdowns for accumulation and retirement portfolios
- Planned expense timing and magnitude
- RSU-specific charts and derived visual summaries
- Hebrew RTL labels and interaction patterns

The visualization layer needed to work without adopting a heavy frontend framework, integrate cleanly with TypeScript ES modules, and support interactive behaviors such as annotations, zooming, panning, and chart re-rendering when users change inputs.

## Decision

Adopt **Chart.js** as the standard visualization library for the browser application.

### Visualization responsibilities

1. **Line and area charts for FIRE projections**
   - Portfolio value over time
   - Contributions, withdrawals, and tax overlays
   - Retirement-year annotations and milestone markers

2. **Donut charts for allocation views**
   - Accumulation portfolio at current year and retirement year
   - Retirement allocation views
   - RSU nested donut summaries

3. **Bar charts for planned expenses**
   - Expense totals grouped by year

4. **Centralized chart lifecycle management**
   - `chart-manager.ts` owns shared chart creation and destruction for the main SPA charts
   - RSU charts are managed in a dedicated `rsu-chart.ts` module
   - Callers update existing chart surfaces through module APIs rather than creating ad hoc chart instances across the app

## Consequences

### Positive
- Provides a proven browser-native charting library that works well with the no-framework TypeScript frontend
- Supports the main visualization types needed by the product without custom canvas infrastructure
- Enables interactive capabilities such as annotations, zoom, and pan with established plugin patterns
- Keeps chart rendering concerns separated from orchestration logic in the frontend modules
- Works well with the existing RTL Hebrew interface because labels and dataset formatting remain application-controlled

### Negative
- Chart configuration objects can become large and verbose for complex financial visualizations
- Rendering-heavy modules are harder to unit test than plain orchestration logic
- Some advanced domain-specific visuals still require custom transformation logic on top of the library

### Neutral
- The project accepts a third-party visualization dependency rather than building custom SVG/canvas rendering
- Chart lifecycle discipline is required to avoid leaks or duplicate canvases during repeated updates

## Alternatives Considered

### Alternative 1: Custom SVG or Canvas Rendering
**Description**: Build all charts directly with browser drawing primitives.

**Pros**:
- Full control over rendering and interactions
- No third-party chart dependency

**Cons**:
- Considerably more implementation and maintenance effort
- Higher risk of inconsistent chart behavior across screens
- More custom accessibility and interaction work

**Why not chosen**: The application needs several standard chart types and interaction patterns that Chart.js already solves well.

### Alternative 2: D3.js
**Description**: Use D3 for highly custom data-driven visualizations.

**Pros**:
- Extremely flexible
- Excellent for custom visual grammars

**Cons**:
- Higher complexity for standard charts
- Steeper maintenance cost for a small SPA
- More rendering logic would move into application code

**Why not chosen**: The project mostly needs standard chart types with reliable interaction, not a bespoke visualization framework.

### Alternative 3: Server-Rendered Static Charts
**Description**: Generate charts on the server and send them as images.

**Pros**:
- Minimal browser-side chart logic
- Predictable rendering output

**Cons**:
- Poor interactivity
- Slower user feedback loop for input changes
- More backend complexity and more data round trips

**Why not chosen**: The product relies on immediate, interactive updates in the browser as users edit plans.

## Implementation Notes

- Main chart lifecycle is centralized in `wwwroot/ts/components/chart-manager.ts`
- Shared chart APIs include `updateMainChart`, `updateDonutChart`, and `updateExpensesBarChart`
- The chart manager explicitly destroys prior instances before rebuilding canvases to keep repeated updates stable
- RSU-specific visualizations are implemented in `wwwroot/ts/components/rsu-chart.ts`
- Frontend coordinators invoke chart APIs while keeping domain orchestration outside the chart modules

## References

- `wwwroot/ts/components/chart-manager.ts`
- `wwwroot/ts/components/rsu-chart.ts`
- `docs/architecture/SYSTEM_DESIGN_DOCUMENT.md`
- [Chart.js Documentation](https://www.chartjs.org/docs/latest/)
