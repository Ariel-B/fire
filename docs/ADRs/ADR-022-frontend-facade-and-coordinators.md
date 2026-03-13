# ADR-022: Frontend Facade, Canonical State Store, and Workflow Coordinators

**Status**: Accepted

**Date**: 2026-03-08

**Deciders**: Development Team

**Technical Story**: Formalize the accepted frontend modularization approach for the TypeScript application shell and workflow coordinators.

## Context

The frontend started with a broad `app.ts` entry module that accumulated startup wiring, DOM listeners, async calculation sequencing, save/load/export behavior, state mutation, and multiple UI subdomain workflows. As the FIRE planner grew, that shape created several risks:
- Too much behavior hidden behind one large entry point
- Weak ownership boundaries between state, orchestration, rendering, and compatibility APIs
- Greater regression risk when changing calculation ordering or save/load flows
- Harder behavior-locking tests because many responsibilities were coupled together

The current codebase has already moved to explicit module boundaries with focused tests, updated contributor guidance, and an architecture review summary. This structure is now a deliberate architectural decision rather than a refactor summary only.

## Decision

Adopt a **thin frontend facade architecture** with a **canonical shared state store** and **workflow-specific coordinator modules**.

### Module ownership model

1. **`app.ts` becomes a thin facade**
   - Imports the canonical shared state
   - Wires together specialized modules
   - Exposes only a small compatibility-safe `window.fireApp` surface

2. **`app-shell.ts` owns startup and top-level DOM wiring**
   - Bootstrap activation
   - Global event listeners
   - Tab switching and activation side effects

3. **`services/state.ts` is the canonical frontend state store**
   - Shared runtime state shape lives in one module
   - Explicit helper functions mutate state in a controlled way

4. **Specialized coordinators own subdomain workflows**
   - `calculation-orchestrator.ts`: input gathering, request sequencing, stale-response rejection, export snapshot coordination
   - `orchestration/portfolio-coordinator.ts`: accumulation portfolio CRUD and summaries
   - `orchestration/expense-coordinator.ts`: planned expense CRUD and chart refreshes
   - `orchestration/retirement-coordinator.ts`: retirement allocation editing and toggle behavior
   - `orchestration/results-coordinator.ts`: result rendering and chart coordination
   - `orchestration/rsu-coordinator.ts`: RSU workflow wiring and synchronization
   - `persistence/plan-persistence.ts`: save/load/export orchestration and legacy-plan normalization

5. **Compatibility API remains intentionally narrow**
   - `window.fireApp` exposes only stable user actions needed by HTML handlers and selected tests
   - Internal helpers and state mutation APIs stay out of the global surface

## Consequences

### Positive
- Establishes clear ownership boundaries in the frontend without introducing a framework
- Makes async calculation safety rules explicit, including stale-response rejection and export snapshot waiting
- Preserves backward-compatible global actions while reducing accidental public API growth
- Improves testability by letting Jest lock behavior around each module seam independently
- Reduces the risk that changes in one UI subdomain destabilize unrelated flows

### Negative
- More modules and dependency wiring increase the amount of structure developers must understand
- Boundaries must be actively maintained or responsibilities can drift back into `app.ts`
- Some state mutations still occur through a shared singleton model, so discipline is still required

### Neutral
- The project keeps its no-framework TypeScript architecture while adopting stronger internal modular boundaries
- The approach favors explicit wiring over framework-managed dependency or component systems

## Alternatives Considered

### Alternative 1: Keep a Large Monolithic `app.ts`
**Description**: Continue growing the original entry module and rely on comments and tests for safety.

**Pros**:
- Fewer files to navigate
- Simple import graph

**Cons**:
- Responsibility creep remains likely
- Higher regression risk in critical flows
- Harder to reason about ownership boundaries

**Why not chosen**: The current refactor already demonstrated the benefit of explicit seams and focused tests.

### Alternative 2: Adopt a Frontend Framework
**Description**: Rebuild the UI around React, Vue, or a similar framework.

**Pros**:
- Stronger component model
- Mature ecosystem for state and rendering

**Cons**:
- Significant migration cost
- New build/runtime complexity
- Misaligned with the repository’s intentional no-framework frontend strategy

**Why not chosen**: The project can get most of the architectural benefit it needs while staying within the existing TypeScript ES module approach.

### Alternative 3: Split Only by File Size
**Description**: Break `app.ts` into smaller utilities without clear ownership rules.

**Pros**:
- Fastest way to reduce file length
- Low up-front design effort

**Cons**:
- Does not create stable domain boundaries
- Public API sprawl and state inconsistencies remain likely

**Why not chosen**: The problem was architectural ownership, not only file length.

## Implementation Notes

- `app.ts` wires `createCalculationOrchestrator`, `createPlanPersistence`, and the focused coordinator modules, then publishes a limited `window.fireApp`
- `calculation-orchestrator.ts` tracks `latestCalculationRequestId` and `pendingCalculation` to reject stale responses and wait for export-safe snapshots
- `services/state.ts` centralizes default state creation, replacement, and shared mutation helpers
- `app-module.test.js`, orchestration unit tests, and tab/persistence integration tests act as the primary safety net for these boundaries

## References

- `wwwroot/ts/app.ts`
- `wwwroot/ts/app-shell.ts`
- `wwwroot/ts/services/state.ts`
- `wwwroot/ts/calculation-orchestrator.ts`
- `wwwroot/ts/persistence/plan-persistence.ts`
- `docs/architecture/SYSTEM_DESIGN_DOCUMENT.md`
